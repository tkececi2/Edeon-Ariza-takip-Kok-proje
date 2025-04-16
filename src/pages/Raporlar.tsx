import React, { useState, useEffect, useRef } from 'react';
import { collection, query, getDocs, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { 
  Download,
  LayoutGrid,
  List,
  BarChart2,
  Calendar,
  FileText,
  Filter,
  ChevronDown,
  Printer,
  RefreshCw,
  Clock,
  CheckCircle,
  AlertTriangle,
  Building,
  MapPin,
  User,
  Search,
  ArrowRight,
  ArrowDown,
  Image as ImageIcon,
  Timer
} from 'lucide-react';
import { Card, Title, DonutChart, ProgressBar, Flex, Text, BarChart, AreaChart } from '@tremor/react';
import { format, subDays, startOfDay, endOfDay, parseISO, differenceInDays, differenceInHours, differenceInMinutes } from 'date-fns';
import { tr } from 'date-fns/locale';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { SearchInput } from '../components/SearchInput';
import { ArizaDetayModal } from '../components/ArizaDetayModal';
import type { Ariza } from '../types';
import toast from 'react-hot-toast';

type DateFilter = 'all' | 'today' | 'week' | 'month' | 'custom';
type ViewMode = 'list' | 'grid' | 'analytics' | 'summary';

export const Raporlar: React.FC = () => {
  const { kullanici } = useAuth();
  const [arizalar, setArizalar] = useState<Ariza[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [yenileniyor, setYenileniyor] = useState(false);
  const [secilenSaha, setSecilenSaha] = useState<string>('');
  const [sahalar, setSahalar] = useState<Record<string, string>>({});
  const [seciliAriza, setSeciliAriza] = useState<Ariza | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('analytics');
  const [dateFilter, setDateFilter] = useState<DateFilter>('month');
  const [customDateRange, setCustomDateRange] = useState({
    start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });
  const [aramaMetni, setAramaMetni] = useState('');
  const [durumFilter, setDurumFilter] = useState<string>('');
  const [oncelikFilter, setOncelikFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('tarih');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [istatistikler, setIstatistikler] = useState({
    toplamAriza: 0,
    cozulenAriza: 0,
    acikAriza: 0,
    bekleyenAriza: 0,
    devamEdenAriza: 0,
    ortCozumSuresi: 0,
    gunlukArizaDagilimi: [] as {date: string, count: number}[],
    durumDagilimi: [] as {name: string, value: number}[],
    oncelikDagilimi: [] as {name: string, value: number}[],
    sahaDagilimi: [] as {name: string, value: number}[],
    cozumSuresiDagilimi: [] as {name: string, value: number}[]
  });
  
  const printRef = useRef<HTMLDivElement>(null);

  const getDateFilterQuery = () => {
    const now = new Date();
    let startDate: Date;

    switch (dateFilter) {
      case 'today':
        startDate = startOfDay(now);
        break;
      case 'week':
        startDate = subDays(now, 7);
        break;
      case 'month':
        startDate = subDays(now, 30);
        break;
      case 'custom':
        return {
          start: startOfDay(new Date(customDateRange.start)),
          end: endOfDay(new Date(customDateRange.end))
        };
      default:
        return null;
    }

    return dateFilter === 'all' ? null : {
      start: startDate,
      end: endOfDay(now)
    };
  };

  const fetchData = async () => {
    if (!kullanici) return;

    try {
      setYukleniyor(true);
      
      // Sahaları getir
      let sahaQuery;
      if (kullanici.rol === 'musteri' && kullanici.sahalar) {
        sahaQuery = query(
          collection(db, 'sahalar'),
          where('__name__', 'in', kullanici.sahalar)
        );
      } else {
        sahaQuery = query(collection(db, 'sahalar'));
      }
      
      const sahaSnapshot = await getDocs(sahaQuery);
      const sahaMap: Record<string, string> = {};
      sahaSnapshot.docs.forEach(doc => {
        sahaMap[doc.id] = doc.data().ad;
      });
      setSahalar(sahaMap);

      // Arızaları getir
      let baseQuery = collection(db, 'arizalar');
      let constraints: any[] = [orderBy('olusturmaTarihi', 'desc')];

      // Saha filtresi
      if (kullanici.rol === 'musteri' && kullanici.sahalar) {
        if (secilenSaha) {
          if (!kullanici.sahalar.includes(secilenSaha)) {
            setArizalar([]);
            return;
          }
          constraints.push(where('saha', '==', secilenSaha));
        } else {
          constraints.push(where('saha', 'in', kullanici.sahalar));
        }
      } else if (secilenSaha) {
        constraints.push(where('saha', '==', secilenSaha));
      }

      // Tarih filtresi
      const dateRange = getDateFilterQuery();
      if (dateRange) {
        constraints.push(
          where('olusturmaTarihi', '>=', Timestamp.fromDate(dateRange.start)),
          where('olusturmaTarihi', '<=', Timestamp.fromDate(dateRange.end))
        );
      }

      const arizaQuery = query(baseQuery, ...constraints);
      const snapshot = await getDocs(arizaQuery);
      const arizaVerileri = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        sahaAdi: sahaMap[doc.data().saha] || 'Bilinmeyen Saha'
      })) as Ariza[];
      
      setArizalar(arizaVerileri);
      
      // İstatistikleri hesapla
      calculateStatistics(arizaVerileri, sahaMap);
    } catch (error) {
      console.error('Veri getirme hatası:', error);
      toast.error('Veriler yüklenirken bir hata oluştu');
    } finally {
      setYukleniyor(false);
      setYenileniyor(false);
    }
  };

  const calculateStatistics = (arizaVerileri: Ariza[], sahaMap: Record<string, string>) => {
    // Temel istatistikler
    const toplamAriza = arizaVerileri.length;
    const cozulenAriza = arizaVerileri.filter(a => a.durum === 'cozuldu').length;
    const acikAriza = arizaVerileri.filter(a => a.durum === 'acik').length;
    const bekleyenAriza = arizaVerileri.filter(a => a.durum === 'beklemede').length;
    const devamEdenAriza = arizaVerileri.filter(a => a.durum === 'devam-ediyor').length;
    
    // Ortalama çözüm süresi (saat cinsinden)
    const cozulenArizalar = arizaVerileri.filter(a => a.durum === 'cozuldu' && a.cozum);
    let toplamCozumSuresi = 0;
    
    cozulenArizalar.forEach(ariza => {
      const baslangic = ariza.olusturmaTarihi.toDate();
      const bitis = ariza.cozum!.tamamlanmaTarihi.toDate();
      const sureSaat = (bitis.getTime() - baslangic.getTime()) / (1000 * 60 * 60);
      toplamCozumSuresi += sureSaat;
    });
    
    const ortCozumSuresi = cozulenArizalar.length > 0 ? toplamCozumSuresi / cozulenArizalar.length : 0;
    
    // Günlük arıza dağılımı
    const dateRange = getDateFilterQuery();
    let gunlukArizaDagilimi: {date: string, count: number}[] = [];
    
    if (dateRange) {
      const startDate = dateRange.start;
      const endDate = dateRange.end;
      const dayCount = Math.min(30, differenceInDays(endDate, startDate) + 1);
      
      gunlukArizaDagilimi = Array.from({ length: dayCount }, (_, i) => {
        const date = subDays(endDate, dayCount - i - 1);
        const count = arizaVerileri.filter(ariza => {
          const arizaDate = ariza.olusturmaTarihi.toDate();
          return format(arizaDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
        }).length;
        
        return {
          date: format(date, 'dd MMM', { locale: tr }),
          count
        };
      });
    }
    
    // Durum dağılımı
    const durumDagilimi = [
      { name: 'Çözüldü', value: cozulenAriza },
      { name: 'Açık', value: acikAriza },
      { name: 'Beklemede', value: bekleyenAriza },
      { name: 'Devam Eden', value: devamEdenAriza }
    ];
    
    // Öncelik dağılımı
    const oncelikDagilimi = [
      { name: 'Düşük', value: arizaVerileri.filter(a => a.oncelik === 'dusuk').length },
      { name: 'Orta', value: arizaVerileri.filter(a => a.oncelik === 'orta').length },
      { name: 'Yüksek', value: arizaVerileri.filter(a => a.oncelik === 'yuksek').length },
      { name: 'Acil', value: arizaVerileri.filter(a => a.oncelik === 'acil').length }
    ];
    
    // Saha dağılımı
    const sahaSayilari: Record<string, number> = {};
    arizaVerileri.forEach(ariza => {
      const sahaAdi = sahaMap[ariza.saha] || 'Bilinmeyen Saha';
      sahaSayilari[sahaAdi] = (sahaSayilari[sahaAdi] || 0) + 1;
    });
    
    const sahaDagilimi = Object.entries(sahaSayilari)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    
    // Çözüm süresi dağılımı
    const cozumSuresiDagilimi = [
      { name: '0-2 saat', value: 0 },
      { name: '2-8 saat', value: 0 },
      { name: '8-24 saat', value: 0 },
      { name: '1-3 gün', value: 0 },
      { name: '3+ gün', value: 0 }
    ];
    
    cozulenArizalar.forEach(ariza => {
      const baslangic = ariza.olusturmaTarihi.toDate();
      const bitis = ariza.cozum!.tamamlanmaTarihi.toDate();
      const sureSaat = (bitis.getTime() - baslangic.getTime()) / (1000 * 60 * 60);
      
      if (sureSaat <= 2) {
        cozumSuresiDagilimi[0].value++;
      } else if (sureSaat <= 8) {
        cozumSuresiDagilimi[1].value++;
      } else if (sureSaat <= 24) {
        cozumSuresiDagilimi[2].value++;
      } else if (sureSaat <= 72) {
        cozumSuresiDagilimi[3].value++;
      } else {
        cozumSuresiDagilimi[4].value++;
      }
    });
    
    setIstatistikler({
      toplamAriza,
      cozulenAriza,
      acikAriza,
      bekleyenAriza,
      devamEdenAriza,
      ortCozumSuresi,
      gunlukArizaDagilimi,
      durumDagilimi,
      oncelikDagilimi,
      sahaDagilimi,
      cozumSuresiDagilimi
    });
  };

  useEffect(() => {
    fetchData();
  }, [kullanici, secilenSaha, dateFilter, customDateRange]);

  const handleRefresh = () => {
    setYenileniyor(true);
    fetchData();
  };

  const handleRaporIndir = () => {
    try {
      const doc = new jsPDF();
      
      // Başlık
      doc.setFontSize(18);
      doc.text('Arıza Raporu', 105, 15, { align: 'center' });
      
      // Alt başlık
      doc.setFontSize(12);
      doc.text(`Tarih: ${format(new Date(), 'dd MMMM yyyy', { locale: tr })}`, 105, 25, { align: 'center' });
      
      if (secilenSaha) {
        doc.text(`Saha: ${sahalar[secilenSaha]}`, 105, 32, { align: 'center' });
      }
      
      // Tarih aralığı
      const dateRange = getDateFilterQuery();
      if (dateRange) {
        doc.text(
          `Tarih Aralığı: ${format(dateRange.start, 'dd.MM.yyyy')} - ${format(dateRange.end, 'dd.MM.yyyy')}`,
          105, 39, { align: 'center' }
        );
      }
      
      // Özet istatistikler
      doc.setFontSize(14);
      doc.text('Özet İstatistikler', 14, 50);
      
      doc.setFontSize(10);
      doc.text(`Toplam Arıza: ${istatistikler.toplamAriza}`, 14, 60);
      doc.text(`Çözülen Arıza: ${istatistikler.cozulenAriza}`, 14, 65);
      doc.text(`Açık Arıza: ${istatistikler.acikAriza}`, 14, 70);
      doc.text(`Bekleyen Arıza: ${istatistikler.bekleyenAriza}`, 14, 75);
      doc.text(`Devam Eden Arıza: ${istatistikler.devamEdenAriza}`, 14, 80);
      doc.text(`Ortalama Çözüm Süresi: ${istatistikler.ortCozumSuresi.toFixed(1)} saat`, 14, 85);
      
      // Arıza listesi
      doc.setFontSize(14);
      doc.text('Arıza Listesi', 14, 100);
      
      const tableColumn = ["Arıza No", "Başlık", "Saha", "Durum", "Öncelik", "Oluşturma Tarihi", "Çözüm Tarihi"];
      const tableRows = filteredArizalar.map(ariza => [
        ariza.id.slice(-6).toUpperCase(),
        ariza.baslik,
        ariza.sahaAdi,
        ariza.durum.charAt(0).toUpperCase() + ariza.durum.slice(1).replace('-', ' '),
        ariza.oncelik.charAt(0).toUpperCase() + ariza.oncelik.slice(1),
        format(ariza.olusturmaTarihi.toDate(), 'dd.MM.yyyy HH:mm'),
        ariza.cozum ? format(ariza.cozum.tamamlanmaTarihi.toDate(), 'dd.MM.yyyy HH:mm') : '-'
      ]);
      
      doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 105,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [14, 165, 233], textColor: [255, 255, 255] }
      });
      
      // Dosyayı indir
      doc.save(`ariza-raporu-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('Rapor PDF olarak indirildi');
    } catch (error) {
      console.error('PDF oluşturma hatası:', error);
      toast.error('Rapor oluşturulurken bir hata oluştu');
    }
  };

  const handleCSVIndir = () => {
    try {
      const headers = ['Arıza No', 'Başlık', 'Saha', 'Durum', 'Öncelik', 'Oluşturma Tarihi', 'Çözüm Tarihi', 'Çözüm Süresi', 'Açıklama'];
      const rows = filteredArizalar.map(ariza => [
        ariza.id.slice(-6).toUpperCase(),
        ariza.baslik,
        ariza.sahaAdi,
        ariza.durum.charAt(0).toUpperCase() + ariza.durum.slice(1).replace('-', ' '),
        ariza.oncelik.charAt(0).toUpperCase() + ariza.oncelik.slice(1),
        format(ariza.olusturmaTarihi.toDate(), 'dd.MM.yyyy HH:mm'),
        ariza.cozum ? format(ariza.cozum.tamamlanmaTarihi.toDate(), 'dd.MM.yyyy HH:mm') : '-',
        getCozumSuresi(ariza),
        ariza.aciklama
      ]);

      // UTF-8 BOM ekleyerek Türkçe karakterlerin doğru görüntülenmesini sağla
      const BOM = "\uFEFF";
      const csvContent = BOM + [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `ariza-raporu-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);

      toast.success('Rapor CSV olarak indirildi');
    } catch (error) {
      console.error('CSV oluşturma hatası:', error);
      toast.error('Rapor oluşturulurken bir hata oluştu');
    }
  };

  const handlePrint = () => {
    if (printRef.current) {
      const printContents = printRef.current.innerHTML;
      const originalContents = document.body.innerHTML;
      
      document.body.innerHTML = `
        <html>
          <head>
            <title>Arıza Raporu</title>
            <style>
              body { font-family: Arial, sans-serif; }
              .print-header { text-align: center; margin-bottom: 20px; }
              table { width: 100%; border-collapse: collapse; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
              .print-footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
              @media print {
                body { -webkit-print-color-adjust: exact; }
              }
            </style>
          </head>
          <body>
            <div class="print-header">
              <h1>Arıza Raporu</h1>
              <p>Tarih: ${format(new Date(), 'dd MMMM yyyy', { locale: tr })}</p>
              ${secilenSaha ? `<p>Saha: ${sahalar[secilenSaha]}</p>` : ''}
            </div>
            ${printContents}
            <div class="print-footer">
              <p>EDEON ENERJİ © ${new Date().getFullYear()}</p>
            </div>
          </body>
        </html>
      `;
      
      window.print();
      document.body.innerHTML = originalContents;
      window.location.reload();
    }
  };

  const getCozumSuresi = (ariza: Ariza): string => {
    const baslangic = ariza.olusturmaTarihi.toDate();
    const bitis = ariza.cozum ? ariza.cozum.tamamlanmaTarihi.toDate() : new Date();
    
    const dakikaFarki = differenceInMinutes(bitis, baslangic);
    const saatFarki = differenceInHours(bitis, baslangic);
    const gunFarki = differenceInDays(bitis, baslangic);
    const kalanSaat = saatFarki % 24;

    if (ariza.cozum) {
      if (gunFarki === 0) {
        if (saatFarki === 0) {
          return `${dakikaFarki} dakikada çözüldü`;
        }
        return kalanSaat === 0 ? '1 saatte çözüldü' : `${kalanSaat} saatte çözüldü`;
      } else {
        return `${gunFarki} gün ${kalanSaat} saatte çözüldü`;
      }
    } else {
      if (gunFarki === 0) {
        if (saatFarki === 0) {
          return `${dakikaFarki} dakika`;
        }
        return kalanSaat === 0 ? '1 saat' : `${kalanSaat} saat`;
      } else {
        return `${gunFarki} gün ${kalanSaat} saat`;
      }
    }
  };

  // Filtreleme ve sıralama
  const filteredArizalar = arizalar.filter(ariza => {
    // Arama metni filtresi
    const searchMatch = !aramaMetni || 
      ariza.baslik.toLowerCase().includes(aramaMetni.toLowerCase()) ||
      ariza.aciklama.toLowerCase().includes(aramaMetni.toLowerCase()) ||
      ariza.sahaAdi.toLowerCase().includes(aramaMetni.toLowerCase());
    
    // Durum filtresi
    const statusMatch = !durumFilter || ariza.durum === durumFilter;
    
    // Öncelik filtresi
    const priorityMatch = !oncelikFilter || ariza.oncelik === oncelikFilter;
    
    return searchMatch && statusMatch && priorityMatch;
  });

  // Sıralama
  const sortedArizalar = [...filteredArizalar].sort((a, b) => {
    let aValue, bValue;
    
    switch (sortBy) {
      case 'tarih':
        aValue = a.olusturmaTarihi.toDate().getTime();
        bValue = b.olusturmaTarihi.toDate().getTime();
        break;
      case 'durum':
        aValue = a.durum;
        bValue = b.durum;
        break;
      case 'oncelik':
        aValue = a.oncelik;
        bValue = b.oncelik;
        break;
      case 'saha':
        aValue = a.sahaAdi;
        bValue = b.sahaAdi;
        break;
      default:
        aValue = a.olusturmaTarihi.toDate().getTime();
        bValue = b.olusturmaTarihi.toDate().getTime();
    }
    
    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  if (yukleniyor && arizalar.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Başlık ve Filtreler */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Arıza Raporları</h1>
          <p className="mt-1 text-sm text-gray-500">
            {dateFilter === 'all' ? 'Tüm zamanlar' : 
             dateFilter === 'today' ? 'Bugün' : 
             dateFilter === 'week' ? 'Son 7 gün' : 
             dateFilter === 'month' ? 'Son 30 gün' : 
             `${format(new Date(customDateRange.start), 'dd MMM yyyy', { locale: tr })} - ${format(new Date(customDateRange.end), 'dd MMM yyyy', { locale: tr })}`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleRefresh}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            disabled={yenileniyor}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${yenileniyor ? 'animate-spin' : ''}`} />
            Yenile
          </button>
          
          <div className="relative">
            <button
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              onClick={() => document.getElementById('export-dropdown')?.classList.toggle('hidden')}
            >
              <Download className="h-4 w-4 mr-2" />
              Dışa Aktar
              <ChevronDown className="h-4 w-4 ml-1" />
            </button>
            <div id="export-dropdown" className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-10 hidden">
              <button
                onClick={handleRaporIndir}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                PDF İndir
              </button>
              <button
                onClick={handleCSVIndir}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                CSV İndir
              </button>
              <button
                onClick={handlePrint}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <Printer className="h-4 w-4 inline mr-2" />
                Yazdır
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filtreler */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Saha</label>
            <select
              value={secilenSaha}
              onChange={(e) => setSecilenSaha(e.target.value)}
              className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="">Tüm Sahalar</option>
              {Object.entries(sahalar).map(([id, ad]) => (
                <option key={id} value={id}>{ad}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tarih Aralığı</label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as DateFilter)}
              className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="all">Tüm Zamanlar</option>
              <option value="today">Bugün</option>
              <option value="week">Son 7 Gün</option>
              <option value="month">Son 30 Gün</option>
              <option value="custom">Özel Tarih Aralığı</option>
            </select>
          </div>
          
          {dateFilter === 'custom' && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Özel Tarih Aralığı</label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customDateRange.start}
                  onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                />
                <span className="text-gray-500">-</span>
                <input
                  type="date"
                  value={customDateRange.end}
                  onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                />
              </div>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Durum</label>
            <select
              value={durumFilter}
              onChange={(e) => setDurumFilter(e.target.value)}
              className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="">Tüm Durumlar</option>
              <option value="acik">Açık</option>
              <option value="devam-ediyor">Devam Ediyor</option>
              <option value="beklemede">Beklemede</option>
              <option value="cozuldu">Çözüldü</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Öncelik</label>
            <select
              value={oncelikFilter}
              onChange={(e) => setOncelikFilter(e.target.value)}
              className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="">Tüm Öncelikler</option>
              <option value="dusuk">Düşük</option>
              <option value="orta">Orta</option>
              <option value="yuksek">Yüksek</option>
              <option value="acil">Acil</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sıralama</label>
            <select
              value={`${sortBy}-${sortDirection}`}
              onChange={(e) => {
                const [field, direction] = e.target.value.split('-');
                setSortBy(field);
                setSortDirection(direction as 'asc' | 'desc');
              }}
              className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="tarih-desc">Tarih (Yeni-Eski)</option>
              <option value="tarih-asc">Tarih (Eski-Yeni)</option>
              <option value="durum-asc">Durum (A-Z)</option>
              <option value="durum-desc">Durum (Z-A)</option>
              <option value="oncelik-desc">Öncelik (Yüksek-Düşük)</option>
              <option value="oncelik-asc">Öncelik (Düşük-Yüksek)</option>
              <option value="saha-asc">Saha (A-Z)</option>
              <option value="saha-desc">Saha (Z-A)</option>
            </select>
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Arama</label>
            <SearchInput
              value={aramaMetni}
              onChange={setAramaMetni}
              placeholder="Başlık, açıklama veya saha adı ile arayın..."
            />
          </div>
          
          <div className="flex items-end">
            <div className="flex rounded-lg shadow-sm">
              <button
                onClick={() => setViewMode('analytics')}
                className={`p-2 text-sm font-medium rounded-l-lg border ${
                  viewMode === 'analytics'
                    ? 'bg-primary-50 text-primary-600 border-primary-500'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
                title="Analiz Görünümü"
              >
                <BarChart2 className="h-5 w-5" />
              </button>
              <button
                onClick={() => setViewMode('summary')}
                className={`p-2 text-sm font-medium border-t border-b ${
                  viewMode === 'summary'
                    ? 'bg-primary-50 text-primary-600 border-primary-500'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
                title="Özet Görünümü"
              >
                <FileText className="h-5 w-5" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 text-sm font-medium border-t border-b ${
                  viewMode === 'grid'
                    ? 'bg-primary-50 text-primary-600 border-primary-500'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
                title="Kart Görünümü"
              >
                <LayoutGrid className="h-5 w-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 text-sm font-medium rounded-r-lg border-t border-r border-b ${
                  viewMode === 'list'
                    ? 'bg-primary-50 text-primary-600 border-primary-500'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
                title="Liste Görünümü"
              >
                <List className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sonuç Sayısı */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Toplam <span className="font-medium">{filteredArizalar.length}</span> arıza kaydı bulundu
        </p>
        {filteredArizalar.length > 0 && (
          <p className="text-sm text-gray-500">
            Çözüm oranı: <span className="font-medium text-green-600">
              %{((filteredArizalar.filter(a => a.durum === 'cozuldu').length / filteredArizalar.length) * 100).toFixed(1)}
            </span>
          </p>
        )}
      </div>

      {/* Analiz Görünümü */}
      {viewMode === 'analytics' && (
        <div className="space-y-6" ref={printRef}>
          {/* Özet Kartlar */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card decoration="top" decorationColor="blue">
              <div className="flex items-center justify-between">
                <div>
                  <Text className="text-sm text-gray-500">Toplam Arıza</Text>
                  <p className="text-2xl font-bold text-gray-900">{istatistikler.toplamAriza}</p>
                </div>
                <div className="p-2 bg-blue-100 rounded-full">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </Card>
            
            <Card decoration="top" decorationColor="green">
              <div className="flex items-center justify-between">
                <div>
                  <Text className="text-sm text-gray-500">Çözülen</Text>
                  <p className="text-2xl font-bold text-green-600">{istatistikler.cozulenAriza}</p>
                </div>
                <div className="p-2 bg-green-100 rounded-full">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </Card>
            
            <Card decoration="top" decorationColor="yellow">
              <div className="flex items-center justify-between">
                <div>
                  <Text className="text-sm text-gray-500">Devam Eden</Text>
                  <p className="text-2xl font-bold text-yellow-600">{istatistikler.devamEdenAriza}</p>
                </div>
                <div className="p-2 bg-yellow-100 rounded-full">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
              </div>
            </Card>
            
            <Card decoration="top" decorationColor="red">
              <div className="flex items-center justify-between">
                <div>
                  <Text className="text-sm text-gray-500">Açık</Text>
                  <p className="text-2xl font-bold text-red-600">{istatistikler.acikAriza}</p>
                </div>
                <div className="p-2 bg-red-100 rounded-full">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
              </div>
            </Card>
            
            <Card decoration="top" decorationColor="indigo">
              <div className="flex items-center justify-between">
                <div>
                  <Text className="text-sm text-gray-500">Ort. Çözüm Süresi</Text>
                  <p className="text-2xl font-bold text-indigo-600">{istatistikler.ortCozumSuresi.toFixed(1)} saat</p>
                </div>
                <div className="p-2 bg-indigo-100 rounded-full">
                  <Clock className="h-5 w-5 text-indigo-600" />
                </div>
              </div>
            </Card>
          </div>
          
          {/* Grafikler */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Günlük Arıza Dağılımı */}
            <Card>
              <Title>Günlük Arıza Dağılımı</Title>
              <AreaChart
                className="mt-4 h-72"
                data={istatistikler.gunlukArizaDagilimi}
                index="date"
                categories={["count"]}
                colors={["blue"]}
                valueFormatter={(value) => `${value} arıza`}
                showLegend={false}
                showAnimation={true}
              />
            </Card>
            
            {/* Durum Dağılımı */}
            <Card>
              <Title>Durum Dağılımı</Title>
              <DonutChart
                className="mt-4 h-72"
                data={istatistikler.durumDagilimi}
                category="value"
                index="name"
                colors={["green", "red", "blue", "yellow"]}
                valueFormatter={(value) => `${value} arıza`}
                showAnimation={true}
              />
            </Card>
            
            {/* Öncelik Dağılımı */}
            <Card>
              <Title>Öncelik Dağılımı</Title>
              <DonutChart
                className="mt-4 h-72"
                data={istatistikler.oncelikDagilimi}
                category="value"
                index="name"
                colors={["gray", "blue", "orange", "red"]}
                valueFormatter={(value) => `${value} arıza`}
                showAnimation={true}
              />
            </Card>
            
            {/* Çözüm Süresi Dağılımı */}
            <Card>
              <Title>Çözüm Süresi Dağılımı</Title>
              <BarChart
                className="mt-4 h-72"
                data={istatistikler.cozumSuresiDagilimi}
                index="name"
                categories={["value"]}
                colors={["primary"]}
                valueFormatter={(value) => `${value} arıza`}
                showAnimation={true}
              />
            </Card>
          </div>
          
          {/* Saha Bazlı Dağılım */}
          <Card>
            <Title>Saha Bazlı Arıza Dağılımı</Title>
            <div className="mt-4 space-y-4">
              {istatistikler.sahaDagilimi.map((saha) => (
                <div key={saha.name}>
                  <Flex>
                    <Text>{saha.name}</Text>
                    <Text>{saha.value} arıza</Text>
                  </Flex>
                  <ProgressBar 
                    value={(saha.value / Math.max(1, istatistikler.toplamAriza)) * 100} 
                    color="blue" 
                    className="mt-2" 
                  />
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Özet Görünümü */}
      {viewMode === 'summary' && (
        <div className="space-y-6" ref={printRef}>
          <Card>
            <Title>Arıza Özeti</Title>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Arıza No
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Başlık
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Saha
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Durum
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Öncelik
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Oluşturma Tarihi
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Çözüm Tarihi
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Çözüm Süresi
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedArizalar.map((ariza) => (
                    <tr 
                      key={ariza.id} 
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSeciliAriza(ariza)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{ariza.id.slice(-6).toUpperCase()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {ariza.baslik}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {ariza.sahaAdi}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          ariza.durum === 'cozuldu' ? 'bg-green-100 text-green-800' :
                          ariza.durum === 'devam-ediyor' ? 'bg-yellow-100 text-yellow-800' :
                          ariza.durum === 'beklemede' ? 'bg-blue-100 text-blue-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {ariza.durum === 'cozuldu' && <CheckCircle className="h-3.5 w-3.5 mr-1" />}
                          {ariza.durum === 'devam-ediyor' && <Clock className="h-3.5 w-3.5 mr-1" />}
                          {ariza.durum === 'beklemede' && <Clock className="h-3.5 w-3.5 mr-1" />}
                          {ariza.durum === 'acik' && <AlertTriangle className="h-3.5 w-3.5 mr-1" />}
                          {ariza.durum.charAt(0).toUpperCase() + ariza.durum.slice(1).replace('-', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {ariza.oncelik.charAt(0).toUpperCase() + ariza.oncelik.slice(1)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(ariza.olusturmaTarihi.toDate(), 'dd.MM.yyyy HH:mm', { locale: tr })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {ariza.cozum ? format(ariza.cozum.tamamlanmaTarihi.toDate(), 'dd.MM.yyyy HH:mm', { locale: tr }) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={ariza.cozum ? 'text-green-600' : 'text-gray-500'}>
                          {getCozumSuresi(ariza)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Kart Görünümü */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sortedArizalar.map((ariza) => (
            <div 
              key={ariza.id}
              onClick={() => setSeciliAriza(ariza)}
              className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer border border-gray-100"
            >
              <div className="relative h-40 bg-gray-100">
                {ariza.fotograflar && ariza.fotograflar.length > 0 ? (
                  <img 
                    src={ariza.fotograflar[0]} 
                    alt={ariza.baslik} 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/placeholder-image.png';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="h-12 w-12 text-gray-300" />
                  </div>
                )}
                
                <div className="absolute top-2 left-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    ariza.durum === 'cozuldu' ? 'bg-green-100 text-green-800' :
                    ariza.durum === 'devam-ediyor' ? 'bg-yellow-100 text-yellow-800' :
                    ariza.durum === 'beklemede' ? 'bg-blue-100 text-blue-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {ariza.durum === 'cozuldu' && <CheckCircle className="h-3.5 w-3.5 mr-1" />}
                    {ariza.durum === 'devam-ediyor' && <Clock className="h-3.5 w-3.5 mr-1" />}
                    {ariza.durum === 'beklemede' && <Clock className="h-3.5 w-3.5 mr-1" />}
                    {ariza.durum === 'acik' && <AlertTriangle className="h-3.5 w-3.5 mr-1" />}
                    {ariza.durum.charAt(0).toUpperCase() + ariza.durum.slice(1).replace('-', ' ')}
                  </span>
                </div>
                
                {ariza.fotograflar && ariza.fotograflar.length > 1 && (
                  <div className="absolute bottom-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded-full">
                    {ariza.fotograflar.length} Fotoğraf
                  </div>
                )}
              </div>
              
              <div className="p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-2">{ariza.baslik}</h3>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center text-gray-600">
                    <Building className="h-4 w-4 mr-2 text-gray-400" />
                    {ariza.sahaAdi}
                  </div>
                  
                  <div className="flex items-center text-gray-600">
                    <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                    {ariza.konum}
                  </div>
                  
                  <div className="flex items-center text-gray-600">
                    <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                    {format(ariza.olusturmaTarihi.toDate(), 'dd MMMM yyyy', { locale: tr })}
                  </div>
                  
                  <div className="flex items-center text-gray-600">
                    <Timer className="h-4 w-4 mr-2 text-gray-400" />
                    <span className={ariza.cozum ? 'text-green-600' : ''}>
                      {getCozumSuresi(ariza)}
                    </span>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    ariza.oncelik === 'acil' ? 'bg-red-100 text-red-800' :
                    ariza.oncelik === 'yuksek' ? 'bg-orange-100 text-orange-800' :
                    ariza.oncelik === 'orta' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {ariza.oncelik.charAt(0).toUpperCase() + ariza.oncelik.slice(1)} Öncelik
                  </span>
                  
                  <button className="text-primary-600 hover:text-primary-800">
                    <ArrowRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Liste Görünümü */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fotoğraf
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Arıza No
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Başlık
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Saha
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Durum
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Öncelik
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Oluşturma Tarihi
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Çözüm Süresi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedArizalar.map((ariza) => (
                  <tr 
                    key={ariza.id} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSeciliAriza(ariza)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-10 w-10 rounded-lg overflow-hidden bg-gray-100">
                        {ariza.fotograflar && ariza.fotograflar.length > 0 ? (
                          <img
                            src={ariza.fotograflar[0]}
                            alt="Arıza fotoğrafı"
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = '/placeholder-image.png';
                            }}
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <ImageIcon className="h-5 w-5 text-gray-400" />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{ariza.id.slice(-6).toUpperCase()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {ariza.baslik}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {ariza.sahaAdi}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        ariza.durum === 'cozuldu' ? 'bg-green-100 text-green-800' :
                        ariza.durum === 'devam-ediyor' ? 'bg-yellow-100 text-yellow-800' :
                        ariza.durum === 'beklemede' ? 'bg-blue-100 text-blue-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {ariza.durum === 'cozuldu' && <CheckCircle className="h-3.5 w-3.5 mr-1" />}
                        {ariza.durum === 'devam-ediyor' && <Clock className="h-3.5 w-3.5 mr-1" />}
                        {ariza.durum === 'beklemede' && <Clock className="h-3.5 w-3.5 mr-1" />}
                        {ariza.durum === 'acik' && <AlertTriangle className="h-3.5 w-3.5 mr-1" />}
                        {ariza.durum.charAt(0).toUpperCase() + ariza.durum.slice(1).replace('-', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {ariza.oncelik.charAt(0).toUpperCase() + ariza.oncelik.slice(1)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(ariza.olusturmaTarihi.toDate(), 'dd.MM.yyyy HH:mm', { locale: tr })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center">
                        <Timer className="h-4 w-4 mr-1 text-gray-400" />
                        <span className={ariza.cozum ? 'text-green-600' : 'text-gray-500'}>
                          {getCozumSuresi(ariza)}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Arıza Detay Modalı */}
      {seciliAriza && (
        <ArizaDetayModal
          ariza={seciliAriza}
          sahaAdi={seciliAriza.sahaAdi}
          onClose={() => setSeciliAriza(null)}
        />
      )}
    </div>
  );
};