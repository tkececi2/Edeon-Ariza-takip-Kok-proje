import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, getDocs, where, addDoc, Timestamp, doc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { format, subDays, startOfMonth, endOfMonth, parseISO, subMonths, startOfYear, endOfYear, getMonth, getYear } from 'date-fns';
import { tr } from 'date-fns/locale';
import { 
  Sun, 
  Battery,
  DollarSign,
  Leaf,
  Plus,
  Calendar,
  X as XIcon,
  TrendingUp,
  Clock,
  Save,
  Download,
  RefreshCw,
  Trash2,
  ChevronDown,
  ChevronUp,
  Upload,
  AlertTriangle,
  Target
} from 'lucide-react';
import { Card, Title, BarChart, DonutChart, ProgressBar, Flex, Text, AreaChart, LineChart, Legend, Metric, BadgeDelta } from '@tremor/react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { BulkImportModal } from '../components/BulkImportModal';
import toast from 'react-hot-toast';
import type { GesVerisi, GesDetay } from '../types';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

// Sabit değerler
const ELEKTRIK_BIRIM_FIYATI = 2.5; // TL/kWh
const DAGITIM_BEDELI_ORANI = 0.2; // %20

// Ay isimleri
const AYLAR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

// Ay kısaltmaları
const AYLAR_KISA = [
  'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 
  'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'
];

export const UretimVerileri: React.FC = () => {
  const { kullanici } = useAuth();
  const [uretimVerileri, setUretimVerileri] = useState<GesVerisi[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [formAcik, setFormAcik] = useState(false);
  const [bulkImportModalAcik, setBulkImportModalAcik] = useState(false);
  const [secilenSantral, setSecilenSantral] = useState<string>('');
  const [santraller, setSantraller] = useState<Array<{id: string, ad: string, kapasite: number}>>([]);
  const [secilenTarih, setSecilenTarih] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [santralDetay, setSantralDetay] = useState<GesDetay | null>(null);
  const [dateRange, setDateRange] = useState<'month' | 'year' | 'all'>('month');
  const [yenileniyor, setYenileniyor] = useState(false);
  const [silmeOnayModalAcik, setSilmeOnayModalAcik] = useState(false);
  const [silinecekVeriId, setSilinecekVeriId] = useState<string | null>(null);
  const [silmeSantralModalAcik, setSilmeSantralModalAcik] = useState(false);
  const [silinecekSantralId, setSilinecekSantralId] = useState<string | null>(null);
  const [showDetailedTable, setShowDetailedTable] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showComparison, setShowComparison] = useState(true);

  const [form, setForm] = useState({
    gunlukUretim: 0,
    tarih: format(new Date(), "yyyy-MM-dd")
  });

  // İstatistikler
  const [istatistikler, setIstatistikler] = useState({
    toplamUretim: 0,
    ortalamaGunlukUretim: 0,
    toplamGelir: 0,
    toplamCO2Tasarrufu: 0,
    performansOrani: 0,
    hedefGerceklesme: 0,
    buAyUretim: 0,
    buYilUretim: 0,
    tumZamanUretim: 0,
    buAyGelir: 0,
    buYilGelir: 0,
    tumZamanGelir: 0,
    buAyHedefGerceklesme: 0,
    buYilHedefGerceklesme: 0
  });

  const canAdd = kullanici?.rol && ['yonetici', 'tekniker', 'muhendis'].includes(kullanici.rol);
  const canDelete = kullanici?.rol === 'yonetici' || 
    (kullanici?.rol && ['tekniker', 'muhendis'].includes(kullanici.rol));

  const fetchSantraller = async () => {
    if (!kullanici) return;

    try {
      setYukleniyor(true);
      let santralQuery;
      if (kullanici.rol === 'musteri') {
        if (!kullanici.sahalar || kullanici.sahalar.length === 0) {
          setSantraller([]);
          setYukleniyor(false);
          return;
        }
        
        santralQuery = query(
          collection(db, 'santraller'),
          where('__name__', 'in', kullanici.sahalar)
        );
      } else {
        santralQuery = query(collection(db, 'santraller'), orderBy('ad'));
      }

      const snapshot = await getDocs(santralQuery);
      const santralListesi = snapshot.docs.map(doc => ({
        id: doc.id,
        ad: doc.data().ad,
        kapasite: doc.data().kapasite || 0
      }));
      
      setSantraller(santralListesi);

      if (santralListesi.length > 0) {
        // Eğer seçilen santral artık mevcut değilse, ilk santralı seç
        if (!secilenSantral || !santralListesi.some(s => s.id === secilenSantral)) {
          setSecilenSantral(santralListesi[0].id);
        }
        
        // Seçilen santral detaylarını getir
        const santralDoc = snapshot.docs.find(doc => doc.id === (secilenSantral || santralListesi[0].id));
        if (santralDoc) {
          setSantralDetay({
            id: santralDoc.id,
            ...santralDoc.data()
          } as GesDetay);
        } else {
          setSantralDetay(null);
        }
      } else {
        // Santral yoksa üretim verilerini temizle
        setUretimVerileri([]);
        setSantralDetay(null);
        setSecilenSantral('');
      }
    } catch (error) {
      console.error('Santraller getirilemedi:', error);
      toast.error('Santraller yüklenirken bir hata oluştu');
    } finally {
      setYukleniyor(false);
    }
  };

  useEffect(() => {
    fetchSantraller();
  }, [kullanici]);

  const fetchUretimVerileri = async () => {
    if (!secilenSantral) {
      setUretimVerileri([]);
      setIstatistikler({
        toplamUretim: 0,
        ortalamaGunlukUretim: 0,
        toplamGelir: 0,
        toplamCO2Tasarrufu: 0,
        performansOrani: 0,
        hedefGerceklesme: 0,
        buAyUretim: 0,
        buYilUretim: 0,
        tumZamanUretim: 0,
        buAyGelir: 0,
        buYilGelir: 0,
        tumZamanGelir: 0,
        buAyHedefGerceklesme: 0,
        buYilHedefGerceklesme: 0
      });
      return;
    }

    try {
      setYukleniyor(true);
      
      // Santral detaylarını getir
      const santralDoc = await getDocs(query(
        collection(db, 'santraller'),
        where('__name__', '==', secilenSantral)
      ));
      
      if (!santralDoc.empty) {
        setSantralDetay({
          id: santralDoc.docs[0].id,
          ...santralDoc.docs[0].data()
        } as GesDetay);
      } else {
        setSantralDetay(null);
        setUretimVerileri([]);
        await fetchSantraller();
        return;
      }
      
      // Tüm üretim verilerini getir
      const tumVerilerQuery = query(
        collection(db, 'uretimVerileri'),
        where('santralId', '==', secilenSantral),
        orderBy('tarih', 'desc')
      );

      const tumVerilerSnapshot = await getDocs(tumVerilerQuery);
      const tumVeriler = tumVerilerSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as GesVerisi[];

      // Tarih filtreleme
      const now = new Date();
      const buAyBaslangic = startOfMonth(now);
      const buAyBitis = endOfMonth(now);
      const buYilBaslangic = startOfYear(now);
      const buYilBitis = endOfYear(now);
      
      // Seçilen tarih aralığına göre filtreleme
      let filtrelenmisVeriler: GesVerisi[] = [];
      
      switch (dateRange) {
        case 'month':
          const ayBaslangic = startOfMonth(parseISO(secilenTarih + '-01'));
          const ayBitis = endOfMonth(parseISO(secilenTarih + '-01'));
          
          filtrelenmisVeriler = tumVeriler.filter(veri => {
            const veriTarihi = veri.tarih.toDate();
            return veriTarihi >= ayBaslangic && veriTarihi <= ayBitis;
          });
          break;
        
        case 'year':
          const yilBaslangic = new Date(parseInt(secilenTarih.split('-')[0]), 0, 1);
          const yilBitis = new Date(parseInt(secilenTarih.split('-')[0]), 11, 31, 23, 59, 59);
          
          filtrelenmisVeriler = tumVeriler.filter(veri => {
            const veriTarihi = veri.tarih.toDate();
            return veriTarihi >= yilBaslangic && veriTarihi <= yilBitis;
          });
          break;
        
        case 'all':
          filtrelenmisVeriler = tumVeriler;
          break;
      }

      setUretimVerileri(filtrelenmisVeriler);
      
      // İstatistikleri hesapla
      if (santralDetay) {
        const toplamUretim = filtrelenmisVeriler.reduce((acc, veri) => acc + veri.gunlukUretim, 0);
        const toplamGelir = filtrelenmisVeriler.reduce((acc, veri) => acc + (veri.gelir || 0), 0);
        const toplamCO2 = filtrelenmisVeriler.reduce((acc, veri) => acc + (veri.tasarrufEdilenCO2 || 0), 0);
        
        const buAyVerileri = tumVeriler.filter(veri => {
          const veriTarihi = veri.tarih.toDate();
          return veriTarihi >= buAyBaslangic && veriTarihi <= buAyBitis;
        });
        
        const buYilVerileri = tumVeriler.filter(veri => {
          const veriTarihi = veri.tarih.toDate();
          return veriTarihi >= buYilBaslangic && veriTarihi <= buYilBitis;
        });
        
        const buAyUretim = buAyVerileri.reduce((acc, veri) => acc + veri.gunlukUretim, 0);
        const buYilUretim = buYilVerileri.reduce((acc, veri) => acc + veri.gunlukUretim, 0);
        const tumZamanUretim = tumVeriler.reduce((acc, veri) => acc + veri.gunlukUretim, 0);
        
        const buAyGelir = buAyVerileri.reduce((acc, veri) => acc + (veri.gelir || 0), 0);
        const buYilGelir = buYilVerileri.reduce((acc, veri) => acc + (veri.gelir || 0), 0);
        const tumZamanGelir = tumVeriler.reduce((acc, veri) => acc + (veri.gelir || 0), 0);
        
        let buAyHedefGerceklesme = 0;
        let buYilHedefGerceklesme = 0;
        let hedefGerceklesme = 0;
        
        const currentMonth = getMonth(now);
        const selectedMonth = parseInt(secilenTarih.split('-')[1]) - 1;
        
        if (santralDetay.aylikHedefler) {
          const aylar = ['ocak', 'subat', 'mart', 'nisan', 'mayis', 'haziran', 'temmuz', 'agustos', 'eylul', 'ekim', 'kasim', 'aralik'];
          
          const buAyHedef = santralDetay.aylikHedefler[aylar[currentMonth]];
          if (buAyHedef > 0) {
            buAyHedefGerceklesme = (buAyUretim / buAyHedef) * 100;
          }
          
          const secilenAyHedef = santralDetay.aylikHedefler[aylar[selectedMonth]];
          if (secilenAyHedef > 0 && dateRange === 'month') {
            hedefGerceklesme = (toplamUretim / secilenAyHedef) * 100;
          }
          
          const buYilHedef = Object.values(santralDetay.aylikHedefler).reduce((acc, val) => acc + val, 0);
          if (buYilHedef > 0) {
            buYilHedefGerceklesme = (buYilUretim / buYilHedef) * 100;
          }
          
          if (dateRange === 'year') {
            const yillikHedef = santralDetay.yillikHedefUretim;
            if (yillikHedef > 0) {
              hedefGerceklesme = (toplamUretim / yillikHedef) * 100;
            }
          }
        } else {
          const yillikHedef = santralDetay.yillikHedefUretim || 0;
          
          if (yillikHedef > 0) {
            const aylikHedef = yillikHedef / 12;
            buAyHedefGerceklesme = aylikHedef > 0 ? (buAyUretim / aylikHedef) * 100 : 0;
            buYilHedefGerceklesme = yillikHedef > 0 ? (buYilUretim / yillikHedef) * 100 : 0;
            
            if (dateRange === 'month') {
              hedefGerceklesme = aylikHedef > 0 ? (toplamUretim / aylikHedef) * 100 : 0;
            } else if (dateRange === 'year') {
              hedefGerceklesme = yillikHedef > 0 ? (toplamUretim / yillikHedef) * 100 : 0;
            }
          }
        }
        
        const gunSayisi = filtrelenmisVeriler.length;
        const teorikUretim = santralDetay.kapasite * 5 * gunSayisi;
        const performansOrani = teorikUretim > 0 ? (toplamUretim / teorikUretim) * 100 : 0;
        
        setIstatistikler({
          toplamUretim,
          ortalamaGunlukUretim: gunSayisi > 0 ? toplamUretim / gunSayisi : 0,
          toplamGelir,
          toplamCO2Tasarrufu: toplamCO2,
          performansOrani,
          hedefGerceklesme,
          buAyUretim,
          buYilUretim,
          tumZamanUretim,
          buAyGelir,
          buYilGelir,
          tumZamanGelir,
          buAyHedefGerceklesme,
          buYilHedefGerceklesme
        });
      }
    } catch (error) {
      console.error('Üretim verileri getirilemedi:', error);
      toast.error('Veriler yüklenirken bir hata oluştu');
    } finally {
      setYukleniyor(false);
    }
  };

  useEffect(() => {
    fetchUretimVerileri();
  }, [secilenSantral, secilenTarih, dateRange]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kullanici || !secilenSantral) return;

    if (form.gunlukUretim <= 0) {
      toast.error('Günlük üretim değeri sıfırdan büyük olmalıdır');
      return;
    }

    try {
      setYukleniyor(true);
      const gelir = form.gunlukUretim * ELEKTRIK_BIRIM_FIYATI;
      const dagitimBedeli = gelir * DAGITIM_BEDELI_ORANI;
      const netGelir = gelir - dagitimBedeli;
      const co2Tasarrufu = form.gunlukUretim * 0.5;

      let performansOrani = 0;
      
      if (santralDetay && santralDetay.kapasite > 0) {
        const teorikMaksimum = santralDetay.kapasite * 5;
        performansOrani = (form.gunlukUretim / teorikMaksimum) * 100;
      }

      await addDoc(collection(db, 'uretimVerileri'), {
        santralId: secilenSantral,
        tarih: Timestamp.fromDate(new Date(form.tarih)),
        gunlukUretim: form.gunlukUretim,
        anlikGuc: santralDetay?.kapasite || 0,
        performansOrani: performansOrani,
        gelir: netGelir,
        dagitimBedeli: dagitimBedeli,
        tasarrufEdilenCO2: co2Tasarrufu,
        hava: {
          sicaklik: 0,
          nem: 0,
          radyasyon: 0
        },
        olusturanKisi: {
          id: kullanici.id,
          ad: kullanici.ad
        },
        olusturmaTarihi: Timestamp.now()
      });

      toast.success('Üretim verisi başarıyla kaydedildi');
      setFormAcik(false);
      setForm({
        gunlukUretim: 0,
        tarih: format(new Date(), "yyyy-MM-dd")
      });
      
      fetchUretimVerileri();
    } catch (error) {
      console.error('Veri kaydetme hatası:', error);
      toast.error('Veri kaydedilirken bir hata oluştu');
    } finally {
      setYukleniyor(false);
    }
  };

  const handleRaporIndir = () => {
    try {
      const headers = ['Tarih', 'Günlük Üretim (kWh)', 'Gelir (₺)', 'CO2 Tasarrufu (kg)', 'Performans (%)'];
      const rows = uretimVerileri.map(veri => [        format(veri.tarih.toDate(), 'dd.MM.yyyy'),
        veri.gunlukUretim.toString(),
        (veri.gelir || 0).toFixed(2),
        (veri.tasarrufEdilenCO2 || 0).toFixed(1),
        (veri.performansOrani || 0).toFixed(1)
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `uretim-raporu-${secilenSantral}-${secilenTarih}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);

      toast.success('Rapor başarıyla indirildi');
    } catch (error) {
      console.error('Rapor indirme hatası:', error);
      toast.error('Rapor indirilirken bir hata oluştu');
    }
  };

  const handleYenile = async () => {
    setYenileniyor(true);
    await fetchSantraller();
    await fetchUretimVerileri();
    setYenileniyor(false);
    toast.success('Veriler yenilendi');
  };

  const handleSilmeOnayAc = (id: string) => {
    if (!canDelete) {
      toast.error('Bu işlem için yetkiniz yok');
      return;
    }
    
    setSilinecekVeriId(id);
    setSilmeOnayModalAcik(true);
  };

  const handleSantralSilmeOnayAc = (id: string) => {
    if (!canDelete) {
      toast.error('Bu işlem için yetkiniz yok');
      return;
    }
    
    setSilinecekSantralId(id);
    setSilmeSantralModalAcik(true);
  };

  const handleDelete = async () => {
    if (!canDelete || !silinecekVeriId) {
      toast.error('Bu işlem için yetkiniz yok');
      return;
    }

    try {
      setYukleniyor(true);
      await deleteDoc(doc(db, 'uretimVerileri', silinecekVeriId));
      setUretimVerileri(prev => prev.filter(veri => veri.id !== silinecekVeriId));
      toast.success('Üretim verisi başarıyla silindi');
      setSilmeOnayModalAcik(false);
      setSilinecekVeriId(null);
      fetchUretimVerileri();
    } catch (error) {
      console.error('Veri silme hatası:', error);
      toast.error('Veri silinirken bir hata oluştu');
    } finally {
      setYukleniyor(false);
    }
  };

  const handleSantralDelete = async () => {
    if (!canDelete || !silinecekSantralId) {
      toast.error('Bu işlem için yetkiniz yok');
      return;
    }

    try {
      setYukleniyor(true);
      const uretimVerileriQuery = query(
        collection(db, 'uretimVerileri'),
        where('santralId', '==', silinecekSantralId)
      );
      
      const uretimVerileriSnapshot = await getDocs(uretimVerileriQuery);
      const batch = writeBatch(db);
      batch.delete(doc(db, 'santraller', silinecekSantralId));
      
      uretimVerileriSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      
      setSantraller(prev => prev.filter(santral => santral.id !== silinecekSantralId));
      
      if (secilenSantral === silinecekSantralId) {
        setSecilenSantral('');
        setUretimVerileri([]);
        setSantralDetay(null);
      }
      
      toast.success(`Santral ve ${uretimVerileriSnapshot.size} üretim verisi başarıyla silindi`);
      setSilmeSantralModalAcik(false);
      setSilinecekSantralId(null);
      fetchSantraller();
    } catch (error) {
      console.error('Santral silme hatası:', error);
      toast.error('Santral silinirken bir hata oluştu');
    } finally {
      setYukleniyor(false);
    }
  };

  // Pagination için
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return uretimVerileri.slice(startIndex, startIndex + itemsPerPage);
  }, [uretimVerileri, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(uretimVerileri.length / itemsPerPage);

  // Grafik verilerini hazırla
  const prepareChartData = () => {
    if (dateRange === 'month') {
      // Günlük veriler
      const dailyData = Array.from({ length: 31 }, (_, i) => {
        const day = i + 1;
        const dayStr = day < 10 ? `0${day}` : `${day}`;
        const dateStr = `${secilenTarih}-${dayStr}`;
        
        // O güne ait veri var mı kontrol et
        const veri = uretimVerileri.find(v => 
          format(v.tarih.toDate(), 'yyyy-MM-dd') === dateStr
        );
        
        // Hedef üretim (aylık hedefin güne bölünmüş hali)
        let hedefUretim = 0;
        
        if (santralDetay) {
          if (santralDetay.aylikHedefler) {
            const ayIndex = parseInt(secilenTarih.split('-')[1]) - 1;
            const ayAdi = ['ocak', 'subat', 'mart', 'nisan', 'mayis', 'haziran', 'temmuz', 'agustos', 'eylul', 'ekim', 'kasim', 'aralik'][ayIndex];
            const aylikHedef = santralDetay.aylikHedefler[ayAdi] || 0;
            
            // Ayın gün sayısı
            const ayinSonGunu = new Date(parseInt(secilenTarih.split('-')[0]), parseInt(secilenTarih.split('-')[1]), 0).getDate();
            hedefUretim = aylikHedef / ayinSonGunu;
          } else if (santralDetay.yillikHedefUretim) {
            // Yıllık hedefin güne bölünmüş hali
            hedefUretim = santralDetay.yillikHedefUretim / 365;
          }
        }
        
        return {
          date: format(new Date(dateStr), 'dd MMM', { locale: tr }),
          "Gerçekleşen": veri ? veri.gunlukUretim : 0,
          "Hedef": hedefUretim
        };
      });
      
      // Geçerli ayın son gününe kadar olan verileri filtrele
      const ayinSonGunu = new Date(parseInt(secilenTarih.split('-')[0]), parseInt(secilenTarih.split('-')[1]), 0).getDate();
      return dailyData.slice(0, ayinSonGunu);
    } else if (dateRange === 'year') {
      // Aylık veriler
      const yearlyData = AYLAR.map((ay, index) => {
        // O aya ait veriler
        const ayVerileri = uretimVerileri.filter(veri => {
          const veriTarihi = veri.tarih.toDate();
          return getMonth(veriTarihi) === index;
        });
        
        const toplamUretim = ayVerileri.reduce((acc, veri) => acc + veri.gunlukUretim, 0);
        
        // Hedef üretim
        let hedefUretim = 0;
        
        if (santralDetay) {
          if (santralDetay.aylikHedefler) {
            const ayAdi = ['ocak', 'subat', 'mart', 'nisan', 'mayis', 'haziran', 'temmuz', 'agustos', 'eylul', 'ekim', 'kasim', 'aralik'][index];
            hedefUretim = santralDetay.aylikHedefler[ayAdi] || 0;
          } else if (santralDetay.yillikHedefUretim) {
            // Yıllık hedefin aya bölünmüş hali (basit olarak 1/12)
            hedefUretim = santralDetay.yillikHedefUretim / 12;
          }
        }
        
        return {
          date: AYLAR_KISA[index],
          "Gerçekleşen": toplamUretim,
          "Hedef": hedefUretim
        };
      });
      
      return yearlyData;
    } else {
      // Diğer tarih aralıkları için
      return uretimVerileri
        .slice()
        .sort((a, b) => a.tarih.toDate().getTime() - b.tarih.toDate().getTime())
        .map(veri => {
          // Günlük hedef üretim
          let hedefUretim = 0;
          
          if (santralDetay) {
            if (santralDetay.aylikHedefler) {
              const veriTarihi = veri.tarih.toDate();
              const ayIndex = getMonth(veriTarihi);
              const ayAdi = ['ocak', 'subat', 'mart', 'nisan', 'mayis', 'haziran', 'temmuz', 'agustos', 'eylul', 'ekim', 'kasim', 'aralik'][ayIndex];
              const aylikHedef = santralDetay.aylikHedefler[ayAdi] || 0;
              
              // Ayın gün sayısı
              const ayinSonGunu = new Date(veriTarihi.getFullYear(), veriTarihi.getMonth() + 1, 0).getDate();
              hedefUretim = aylikHedef / ayinSonGunu;
            } else if (santralDetay.yillikHedefUretim) {
              // Yıllık hedefin güne bölünmüş hali
              hedefUretim = santralDetay.yillikHedefUretim / 365;
            }
          }
          
          return {
            date: format(veri.tarih.toDate(), 'dd.MM.yyyy'),
            "Gerçekleşen": veri.gunlukUretim,
            "Hedef": hedefUretim
          };
        });
    }
  };

  const chartData = useMemo(() => prepareChartData(), [uretimVerileri, dateRange, secilenTarih, santralDetay]);

  // Aylık karşılaştırma verileri
  const aylikKarsilastirmaVerileri = useMemo(() => {
    if (!santralDetay) return [];
    
    return AYLAR.map((ay, index) => {
      // O aya ait veriler
      const ayVerileri = uretimVerileri.filter(veri => {
        const veriTarihi = veri.tarih.toDate();
        return getMonth(veriTarihi) === index && 
               getYear(veriTarihi) === parseInt(secilenTarih.split('-')[0]);
      });
      
      const toplamUretim = ayVerileri.reduce((acc, veri) => acc + veri.gunlukUretim, 0);
      
      // Hedef üretim
      let hedefUretim = 0;
      
      if (santralDetay.aylikHedefler) {
        const ayAdi = ['ocak', 'subat', 'mart', 'nisan', 'mayis', 'haziran', 'temmuz', 'agustos', 'eylul', 'ekim', 'kasim', 'aralik'][index];
        hedefUretim = santralDetay.aylikHedefler[ayAdi] || 0;
      } else if (santralDetay.yillikHedefUretim) {
        // Yıllık hedefin aya bölünmüş hali (basit olarak 1/12)
        hedefUretim = santralDetay.yillikHedefUretim / 12;
      }
      
      // Gerçekleşme oranı
      const gerceklesmeOrani = hedefUretim > 0 ? (toplamUretim / hedefUretim) * 100 : 0;
      
      return {
        ay: AYLAR[index],
        hedef: hedefUretim,
        gerceklesen: toplamUretim,
        oran: gerceklesmeOrani
      };
    });
  }, [uretimVerileri, secilenTarih, santralDetay]);

  // Yıllık üretim özeti
  const yillikUretimOzeti = useMemo(() => {
    if (!santralDetay) return { toplam: 0, hedef: 0, oran: 0 };
    
    const yil = parseInt(secilenTarih.split('-')[0]);
    
    // O yıla ait tüm veriler
    const yilVerileri = uretimVerileri.filter(veri => {
      const veriTarihi = veri.tarih.toDate();
      return getYear(veriTarihi) === yil;
    });
    
    const toplamUretim = yilVerileri.reduce((acc, veri) => acc + veri.gunlukUretim, 0);
    
    // Yıllık hedef
    const yillikHedef = santralDetay.yillikHedefUretim || 0;
    
    // Gerçekleşme oranı
    const gerceklesmeOrani = yillikHedef > 0 ? (toplamUretim / yillikHedef) * 100 : 0;
    
    return {
      toplam: toplamUretim,
      hedef: yillikHedef,
      oran: gerceklesmeOrani
    };
  }, [uretimVerileri, secilenTarih, santralDetay]);

  // Seçili ayın toplam verileri
  const secilenAyOzeti = useMemo(() => {
    if (!santralDetay) return { uretim: 0, hedef: 0, oran: 0, fark: 0 };
    
    const ayBaslangic = startOfMonth(parseISO(secilenTarih + '-01'));
    const ayBitis = endOfMonth(parseISO(secilenTarih + '-01'));
    
    // O aya ait veriler
    const ayVerileri = uretimVerileri.filter(veri => {
      const veriTarihi = veri.tarih.toDate();
      return veriTarihi >= ayBaslangic && veriTarihi <= ayBitis;
    });
    
    const toplamUretim = ayVerileri.reduce((acc, veri) => acc + veri.gunlukUretim, 0);
    
    // Hedef üretim
    let hedefUretim = 0;
    
    if (santralDetay.aylikHedefler) {
      const ayIndex = getMonth(ayBaslangic);
      const ayAdi = ['ocak', 'subat', 'mart', 'nisan', 'mayis', 'haziran', 'temmuz', 'agustos', 'eylul', 'ekim', 'kasim', 'aralik'][ayIndex];
      hedefUretim = santralDetay.aylikHedefler[ayAdi] || 0;
    } else if (santralDetay.yillikHedefUretim) {
      // Yıllık hedefin aya bölünmüş hali
      hedefUretim = santralDetay.yillikHedefUretim / 12;
    }
    
    // Gerçekleşme oranı
    const gerceklesmeOrani = hedefUretim > 0 ? (toplamUretim / hedefUretim) * 100 : 0;
    
    return {
      uretim: toplamUretim,
      hedef: hedefUretim,
      oran: gerceklesmeOrani,
      fark: toplamUretim - hedefUretim
    };
  }, [uretimVerileri, secilenTarih, santralDetay]);

  // Tarih değişikliğini tek bir yerden yönet
  const handleTarihDegisikligi = (yeniTarih: string) => {
    setSecilenTarih(yeniTarih);
    
    // Tarih değiştiğinde uygun sekmeyi otomatik seç
    if (yeniTarih.includes('-')) {
      // Ay-yıl formatı (yyyy-MM)
      setDateRange('month');
    } else {
      // Sadece yıl formatı (yyyy)
      setDateRange('year');
    }
  };

  if (yukleniyor && uretimVerileri.length === 0 && !santraller.length) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">
              <Skeleton width={200} />
            </h1>
            <Skeleton width={300} height={20} />
          </div>
          <div className="flex space-x-2">
            <Skeleton width={100} height={40} />
            <Skeleton width={120} height={40} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton height={120} />
          <Skeleton height={120} />
          <Skeleton height={120} />
        </div>

        <Skeleton height={300} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Santral Seçimi - En Üstte */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-100">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="w-full md:w-1/2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Santral Seçimi</label>
            <div className="flex items-center">
              <select
                value={secilenSantral}
                onChange={(e) => setSecilenSantral(e.target.value)}
                className="rounded-lg border-neutral-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 w-full"
              >
                {santraller.length === 0 ? (
                  <option value="">Santral Bulunamadı</option>
                ) : (
                  santraller.map(santral => (
                    <option key={santral.id} value={santral.id}>{santral.ad}</option>
                  ))
                )}
              </select>
              
              {canDelete && secilenSantral && (
                <button
                  onClick={() => handleSantralSilmeOnayAc(secilenSantral)}
                  className="ml-2 p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-full transition-colors duration-200"
                  title="Santralı Sil"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          
          <div className="w-full md:w-1/2 flex justify-end space-x-2">
            <button
              onClick={handleYenile}
              className="inline-flex items-center px-3 py-2 border border-blue-300 rounded-lg shadow-sm text-sm font-medium text-blue-700 bg-white hover:bg-blue-50"
              disabled={yenileniyor}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${yenileniyor ? 'animate-spin' : ''}`} />
              Yenile
            </button>
            
            <button
              onClick={handleRaporIndir}
              className="inline-flex items-center px-3 py-2 border border-blue-300 rounded-lg shadow-sm text-sm font-medium text-blue-700 bg-white hover:bg-blue-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Rapor İndir
            </button>
            
            {canAdd && (
              <div className="relative group">
                <button
                  onClick={() => setFormAcik(true)}
                  disabled={!secilenSantral}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Veri Ekle
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 hidden group-hover:block">
                  <button
                    onClick={() => setBulkImportModalAcik(true)}
                    disabled={!secilenSantral}
                    className="w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100 disabled:opacity-50 disabled:hover:bg-white"
                  >
                    <Upload className="h-4 w-4 inline mr-2" />
                    Toplu Veri Yükle
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Santral Bilgileri - Dinamik */}
      {santralDetay && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-sm border border-blue-100 p-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            <div className="col-span-2 md:col-span-1 flex items-center">
              <div className="p-3 bg-white rounded-xl shadow-sm mr-4">
                <Sun className="h-8 w-8 text-amber-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">{santralDetay.ad}</h2>
                <p className="text-sm text-gray-600">{santralDetay.konum?.adres?.split(',').pop()?.trim() || "Konum bilgisi yok"}</p>
              </div>
            </div>
            
            <div className="text-center bg-white p-3 rounded-xl shadow-sm">
              <p className="text-xs text-gray-500 font-medium">Kurulu Güç</p>
              <p className="text-lg font-bold text-gray-900">{santralDetay.kapasite || 0} kWp</p>
            </div>
            
            <div className="text-center bg-white p-3 rounded-xl shadow-sm">
              <p className="text-xs text-gray-500 font-medium">Panel Sayısı</p>
              <p className="text-lg font-bold text-gray-900">{santralDetay.panelSayisi || 0}</p>
            </div>
            
            <div className="text-center bg-white p-3 rounded-xl shadow-sm">
              <p className="text-xs text-gray-500 font-medium">İnvertör Sayısı</p>
              <p className="text-lg font-bold text-gray-900">{santralDetay.inverterSayisi || 0}</p>
            </div>
            
            <div className="text-center bg-white p-3 rounded-xl shadow-sm">
              <p className="text-xs text-gray-500 font-medium">Sistem Verimi</p>
              <p className="text-lg font-bold text-gray-900">%{santralDetay.teknikOzellikler?.sistemVerimi || 0}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tarih Filtreleri */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-100">
        <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
          {/* Tarih Seçimi */}
          <div className="w-full md:w-1/3">
            <label className="block text-sm font-medium text-gray-700 mb-2">Tarih Seçimi</label>
            <div className="flex items-center">
              <input
                type="month"
                value={secilenTarih}
                onChange={(e) => handleTarihDegisikligi(e.target.value)}
                className="rounded-lg border-neutral-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 w-full"
              />
            </div>
          </div>
          
          {/* Veri Aralığı Seçimi */}
          <div className="w-full md:w-2/3 flex justify-center">
            <div className="inline-flex rounded-md shadow-sm">
              <button
                onClick={() => setDateRange('month')}
                className={`px-6 py-3 text-sm font-medium rounded-l-md border ${
                  dateRange === 'month'
                    ? 'bg-blue-600 text-white border-blue-700'
                    : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50'
                }`}
              >
                Aylık Görünüm
              </button>
              <button
                onClick={() => setDateRange('year')}
                className={`px-6 py-3 text-sm font-medium border-t border-b border-r ${
                  dateRange === 'year'
                    ? 'bg-blue-600 text-white border-blue-700'
                    : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50'
                }`}
              >
                Yıllık Görünüm
              </button>
              <button
                onClick={() => setDateRange('all')}
                className={`px-6 py-3 text-sm font-medium rounded-r-md border-t border-b border-r ${
                  dateRange === 'all'
                    ? 'bg-blue-600 text-white border-blue-700'
                    : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50'
                }`}
              >
                Tüm Zamanlar
              </button>
            </div>
          </div>
        </div>
      </div>

      {santraller.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-12">
            <Sun className="h-16 w-16 text-blue-300 mb-4" />
            <h3 className="text-xl font-medium text-neutral-900 mb-2">Santral Bulunamadı</h3>
            <p className="text-neutral-500 text-center max-w-md">
              Henüz hiç santral kaydı bulunmuyor. Üretim verilerini görmek için önce GES Yönetimi sayfasından bir santral eklemelisiniz.
            </p>
          </div>
        </Card>
      ) : (
        <>
          {/* Özet Metrikler */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card decoration="top" decorationColor="blue" className="shadow-md hover:shadow-lg transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <Text className="text-sm text-blue-600 font-medium">Toplam Üretim</Text>
                  <Metric className="text-2xl">{istatistikler.toplamUretim.toLocaleString('tr-TR', {maximumFractionDigits: 1})} kWh</Metric>
                  <Text className="text-xs text-neutral-500">
                    Ortalama: {istatistikler.ortalamaGunlukUretim.toLocaleString('tr-TR', {maximumFractionDigits: 1})} kWh/gün
                  </Text>
                </div>
                <div className="rounded-full p-3 bg-blue-100">
                  <Battery className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </Card>

            <Card decoration="top" decorationColor="green" className="shadow-md hover:shadow-lg transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <Text className="text-sm text-green-600 font-medium">Toplam Gelir</Text>
                  <Metric className="text-2xl">{istatistikler.toplamGelir.toLocaleString('tr-TR', {maximumFractionDigits: 2})} ₺</Metric>
                  <Text className="text-xs text-neutral-500">
                    Birim Fiyat: {ELEKTRIK_BIRIM_FIYATI.toLocaleString('tr-TR')} ₺/kWh
                  </Text>
                </div>
                <div className="rounded-full p-3 bg-green-100">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </Card>

            <Card decoration="top" decorationColor="indigo" className="shadow-md hover:shadow-lg transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <Text className="text-sm text-indigo-600 font-medium">CO2 Tasarrufu</Text>
                  <Metric className="text-2xl">{istatistikler.toplamCO2Tasarrufu.toLocaleString('tr-TR', {maximumFractionDigits: 1})} kg</Metric>
                  <Text className="text-xs text-neutral-500">
                    {(istatistikler.toplamCO2Tasarrufu / 1000).toFixed(2)} ton CO2
                  </Text>
                </div>
                <div className="rounded-full p-3 bg-indigo-100">
                  <Leaf className="h-6 w-6 text-indigo-600" />
                </div>
              </div>
            </Card>

            <Card decoration="top" decorationColor="amber" className="shadow-md hover:shadow-lg transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <Text className="text-sm text-amber-600 font-medium">Hedef Gerçekleşme</Text>
                  <div className="flex items-center">
                    <Metric className="text-2xl">%{istatistikler.hedefGerceklesme.toFixed(1)}</Metric>
                    <BadgeDelta 
                      deltaType={istatistikler.hedefGerceklesme >= 100 ? "increase" : "decrease"}
                      className="ml-2"
                    >
                      {istatistikler.hedefGerceklesme >= 100 ? "Hedef Aşıldı" : "Hedefin Altında"}
                    </BadgeDelta>
                  </div>
                  <Text className="text-xs text-neutral-500">
                    Performans: %{istatistikler.performansOrani.toFixed(1)}
                  </Text>
                </div>
                <div className="rounded-full p-3 bg-amber-100">
                  <Target className="h-6 w-6 text-amber-600" />
                </div>
              </div>
            </Card>
          </div>

          {/* Ana Grafik */}
          <Card className="shadow-md">
            <div className="flex justify-between items-center mb-4">
              <div>
                <Title className="text-lg font-bold text-blue-900">
                  {dateRange === 'month' 
                    ? format(parseISO(`${secilenTarih}-01`), 'MMMM yyyy', { locale: tr }) + ' Üretim Grafiği' 
                    : dateRange === 'year' 
                      ? secilenTarih.split('-')[0] + ' Yılı Üretim Grafiği'
                      : 'Tüm Zamanlar Üretim Grafiği'}
                </Title>
                <Text className="text-blue-600">
                  Gerçekleşen vs Hedef Üretim Karşılaştırması
                </Text>
              </div>
              <div className="flex items-center">
                <button
                  onClick={() => setShowComparison(!showComparison)}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                >
                  {showComparison ? 'Hedefi Gizle' : 'Hedefi Göster'}
                  <ChevronDown className={`h-4 w-4 ml-1 transition-transform ${showComparison ? 'rotate-180' : ''}`} />
                </button>
              </div>
            </div>

            <AreaChart
              className="mt-4 h-80"
              data={chartData}
              index="date"
              categories={showComparison ? ["Gerçekleşen", "Hedef"] : ["Gerçekleşen"]}
              colors={["blue", "amber"]}
              valueFormatter={(value) => `${value.toLocaleString('tr-TR', {maximumFractionDigits: 1})} kWh`}
              yAxisWidth={80}
              showLegend={true}
              showGridLines={false}
              showAnimation={true}
            />
          </Card>

          {/* Özet Kartlar */}
          {dateRange === 'month' && (
            <Card className="shadow-md">
              <Title className="text-blue-900">Aylık Üretim Özeti</Title>
              <Text className="text-blue-600">{format(parseISO(`${secilenTarih}-01`), 'MMMM yyyy', { locale: tr })}</Text>
              
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <Text className="text-blue-700 font-medium">Gerçekleşen Üretim</Text>
                  <Metric className="text-blue-900">{secilenAyOzeti.uretim.toLocaleString('tr-TR', {maximumFractionDigits: 1})} kWh</Metric>
                </div>
                
                <div className="bg-amber-50 p-4 rounded-lg">
                  <Text className="text-amber-700 font-medium">Hedef Üretim</Text>
                  <Metric className="text-amber-900">{secilenAyOzeti.hedef.toLocaleString('tr-TR', {maximumFractionDigits: 1})} kWh</Metric>
                </div>
                
                <div className={`p-4 rounded-lg ${
                  secilenAyOzeti.oran >= 100 ? 'bg-green-50' : 
                  secilenAyOzeti.oran >= 80 ? 'bg-amber-50' : 
                  'bg-red-50'
                }`}>
                  <Text className={`font-medium ${
                    secilenAyOzeti.oran >= 100 ? 'text-green-700' : 
                    secilenAyOzeti.oran >= 80 ? 'text-amber-700' : 
                    'text-red-700'
                  }`}>
                    Gerçekleşme Oranı
                  </Text>
                  <Metric className={
                    secilenAyOzeti.oran >= 100 ? 'text-green-900' : 
                    secilenAyOzeti.oran >= 80 ? 'text-amber-900' : 
                    'text-red-900'
                  }>
                    %{secilenAyOzeti.oran.toFixed(1)}
                  </Metric>
                  <Text className={`text-sm ${
                    secilenAyOzeti.fark >= 0 ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {secilenAyOzeti.fark >= 0 ? 'Hedefin üzerinde: ' : 'Hedefin altında: '}
                    {Math.abs(secilenAyOzeti.fark).toLocaleString('tr-TR', {maximumFractionDigits: 1})} kWh
                  </Text>
                </div>
              </div>
              
              {/* Günlük Üretim Tablosu */}
              <div className="mt-8">
                <div className="flex justify-between items-center mb-4">
                  <Title className="text-blue-900">Günlük Üretim Detayları</Title>
                  <button
                    onClick={() => setShowDetailedTable(!showDetailedTable)}
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                  >
                    {showDetailedTable ? 'Tabloyu Daralt' : 'Tabloyu Genişlet'}
                    <ChevronDown className={`h-4 w-4 ml-1 transition-transform ${showDetailedTable ? 'rotate-180' : ''}`} />
                  </button>
                </div>
                
                {showDetailedTable && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-neutral-200 rounded-lg overflow-hidden">
                      <thead className="bg-blue-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider">
                            Tarih
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider">
                            Gerçekleşen (kWh)
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider">
                            Hedef (kWh)
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider">
                            Fark (kWh)
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider">
                            Gerçekleşme (%)
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-neutral-200">
                        {paginatedData.map((veri) => {
                          // Günlük hedef üretim
                          let hedefUretim = 0;
                          
                          if (santralDetay) {
                            if (santralDetay.aylikHedefler) {
                              const veriTarihi = veri.tarih.toDate();
                              const ayIndex = getMonth(veriTarihi);
                              const ayAdi = ['ocak', 'subat', 'mart', 'nisan', 'mayis', 'haziran', 'temmuz', 'agustos', 'eylul', 'ekim', 'kasim', 'aralik'][ayIndex];
                              const aylikHedef = santralDetay.aylikHedefler[ayAdi] || 0;
                              
                              // Ayın gün sayısı
                              const ayinSonGunu = new Date(veriTarihi.getFullYear(), veriTarihi.getMonth() + 1, 0).getDate();
                              hedefUretim = aylikHedef / ayinSonGunu;
                            } else if (santralDetay.yillikHedefUretim) {
                              // Yıllık hedefin güne bölünmüş hali
                              hedefUretim = santralDetay.yillikHedefUretim / 365;
                            }
                          }
                          
                          const fark = veri.gunlukUretim - hedefUretim;
                          const oran = hedefUretim > 0 ? (veri.gunlukUretim / hedefUretim) * 100 : 0;
                          
                          return (
                            <tr key={veri.id} className="hover:bg-blue-50 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900">
                                {format(veri.tarih.toDate(), 'dd MMMM yyyy', { locale: tr })}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                                {veri.gunlukUretim.toLocaleString('tr-TR', {maximumFractionDigits: 1})}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                                {hedefUretim.toLocaleString('tr-TR', {maximumFractionDigits: 1})}
                              </td>
                              <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                                fark >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {fark >= 0 ? '+' : ''}{fark.toLocaleString('tr-TR', {maximumFractionDigits: 1})}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <span className={`text-sm font-medium ${
                                    oran >= 100 ? 'text-green-600' : 
                                    oran >= 80 ? 'text-amber-600' : 
                                    'text-red-600'
                                  }`}>
                                    %{oran.toFixed(1)}
                                  </span>
                                  <div className="ml-2 w-16 bg-neutral-200 rounded-full h-2">
                                    <div 
                                      className={`h-2 rounded-full ${
                                        oran >= 100 ? 'bg-green-500' : 
                                        oran >= 80 ? 'bg-amber-500' : 
                                        'bg-red-500'
                                      }`}
                                      style={{ width: `${Math.min(oran, 100)}%` }}
                                    />
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Yıllık Görünüm */}
          {dateRange === 'year' && (
            <Card className="shadow-md">
              <Title className="text-blue-900">Yıllık Üretim Özeti</Title>
              <Text className="text-blue-600">{secilenTarih.split('-')[0]} yılı</Text>
              
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <Text className="text-blue-700 font-medium">Gerçekleşen Üretim</Text>
                  <Metric className="text-blue-900">{yillikUretimOzeti.toplam.toLocaleString('tr-TR', {maximumFractionDigits: 1})} kWh</Metric>
                </div>
                
                <div className="bg-amber-50 p-4 rounded-lg">
                  <Text className="text-amber-700 font-medium">Hedef Üretim</Text>
                  <Metric className="text-amber-900">{yillikUretimOzeti.hedef.toLocaleString('tr-TR', {maximumFractionDigits: 1})} kWh</Metric>
                </div>
                
                <div className={`p-4 rounded-lg ${
                  yillikUretimOzeti.oran >= 100 ? 'bg-green-50' : 
                  yillikUretimOzeti.oran >= 80 ? 'bg-amber-50' : 
                  'bg-red-50'
                }`}>
                  <Text className={`font-medium ${
                    yillikUretimOzeti.oran >= 100 ? 'text-green-700' : 
                    yillikUretimOzeti.oran >= 80 ? 'text-amber-700' : 
                    'text-red-700'
                  }`}>
                    Gerçekleşme Oranı
                  </Text>
                  <Metric className={
                    yillikUretimOzeti.oran >= 100 ? 'text-green-900' : 
                    yillikUretimOzeti.oran >= 80 ? 'text-amber-900' : 
                    'text-red-900'
                  }>
                    %{yillikUretimOzeti.oran.toFixed(1)}
                  </Metric>
                </div>
              </div>
            </Card>
          )}

          {/* Tüm Zamanlar Görünümü */}
          {dateRange === 'all' && (
            <Card className="shadow-md">
              <Title className="text-blue-900">Tüm Zamanlar Üretim Özeti</Title>
              <Text className="text-blue-600">Santral kurulumundan itibaren</Text>
              
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <Text className="text-blue-700 font-medium">Toplam Üretim</Text>
                  <Metric className="text-blue-900">{istatistikler.tumZamanUretim.toLocaleString('tr-TR', {maximumFractionDigits: 1})} kWh</Metric>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <Text className="text-green-700 font-medium">Toplam Gelir</Text>
                  <Metric className="text-green-900">{istatistikler.tumZamanGelir.toLocaleString('tr-TR', {maximumFractionDigits: 2})} ₺</Metric>
                </div>
                
                <div className="bg-indigo-50 p-4 rounded-lg">
                  <Text className="text-indigo-700 font-medium">CO2 Tasarrufu</Text>
                  <Metric className="text-indigo-900">{(istatistikler.tumZamanUretim * 0.5).toLocaleString('tr-TR', {maximumFractionDigits: 1})} kg</Metric>
                  <Text className="text-xs text-indigo-600">
                    {((istatistikler.tumZamanUretim * 0.5) / 1000).toFixed(2)} ton CO2
                  </Text>
                </div>
              </div>
            </Card>
          )}

          {/* Beklenen vs Gerçekleşen Karşılaştırma Kartı */}
          <Card className="shadow-md">
            <Title className="text-blue-900">Beklenen vs Gerçekleşen Üretim</Title>
            <Text className="text-blue-600">
              {dateRange === 'month' 
                ? format(parseISO(`${secilenTarih}-01`), 'MMMM yyyy', { locale: tr })
                : dateRange === 'year'
                  ? secilenTarih.split('-')[0] + ' yılı'
                  : 'Tüm zamanlar'}
            </Text>
            
            <div className="mt-6 bg-gradient-to-r from-blue-50 to-amber-50 p-6 rounded-xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <Text className="text-blue-700 font-medium">Gerçekleşen Üretim</Text>
                  <div className="flex items-center mt-2">
                    <div className="p-3 bg-blue-100 rounded-lg mr-3">
                      <Battery className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <Metric className="text-blue-900">{istatistikler.toplamUretim.toLocaleString('tr-TR', {maximumFractionDigits: 1})} kWh</Metric>
                      <Text className="text-xs text-blue-600">
                        {dateRange === 'month' 
                          ? 'Aylık toplam üretim'
                          : dateRange === 'year'
                            ? 'Yıllık toplam üretim'
                            : 'Toplam üretim'}
                      </Text>
                    </div>
                  </div>
                </div>
                
                <div>
                  <Text className="text-amber-700 font-medium">Beklenen Üretim</Text>
                  <div className="flex items-center mt-2">
                    <div className="p-3 bg-amber-100 rounded-lg mr-3">
                      <Target className="h-6 w-6 text-amber-600" />
                    </div>
                    <div>
                      <Metric className="text-amber-900">
                        {dateRange === 'month' 
                          ? secilenAyOzeti.hedef.toLocaleString('tr-TR', {maximumFractionDigits: 1})
                          : dateRange === 'year'
                            ? yillikUretimOzeti.hedef.toLocaleString('tr-TR', {maximumFractionDigits: 1})
                            : (santralDetay?.yillikHedefUretim || 0).toLocaleString('tr-TR', {maximumFractionDigits: 1})
                        } kWh
                      </Metric>
                      <Text className="text-xs text-amber-600">
                        {dateRange === 'month' 
                          ? 'Aylık hedef üretim'
                          : dateRange === 'year'
                            ? 'Yıllık hedef üretim'
                            : 'Toplam hedef üretim'}
                      </Text>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-8">
                <div className="flex justify-between items-center mb-2">
                  <Text className="font-medium">Gerçekleşme Oranı</Text>
                  <Text className={`font-bold ${
                    istatistikler.hedefGerceklesme >= 100 ? 'text-green-600' : 
                    istatistikler.hedefGerceklesme >= 80 ? 'text-amber-600' : 
                    'text-red-600'
                  }`}>
                    %{istatistikler.hedefGerceklesme.toFixed(1)}
                  </Text>
                </div>
                <ProgressBar 
                  value={Math.min(istatistikler.hedefGerceklesme, 100)} 
                  color={
                    istatistikler.hedefGerceklesme >= 100 ? 'green' : 
                    istatistikler.hedefGerceklesme >= 80 ? 'amber' : 
                    'red'
                  } 
                  className="h-3"
                />
              </div>
            </div>
          </Card>
        </>
      )}

      {/* Veri Ekleme Modalı */}
      {formAcik && (
        <div className="fixed inset-0 bg-neutral-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
              <h2 className="text-lg font-medium text-neutral-900">
                Yeni Üretim Verisi Ekle
              </h2>
              <button
                onClick={() => setFormAcik(false)}
                className="text-neutral-400 hover:text-neutral-500"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700">
                  Tarih
                </label>
                <input
                  type="date"
                  required
                  value={form.tarih}
                  onChange={e => setForm(prev => ({ ...prev, tarih: e.target.value }))}
                  className="mt-1 block w-full rounded-lg border-neutral-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700">
                  Günlük Üretim (kWh)
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={form.gunlukUretim}
                  onChange={e => setForm(prev => ({ ...prev, gunlukUretim: parseFloat(e.target.value) }))}
                  className="mt-1 block w-full rounded-lg border-neutral-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div className="pt-4">
                <div className="flex items-center justify-between text-sm text-neutral-500 mb-2">
                  <span>Hesaplanan Değerler:</span>
                </div>
                <div className="bg-neutral-50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span>Gelir:</span>
                    <span className="font-medium">{(form.gunlukUretim * ELEKTRIK_BIRIM_FIYATI * (1 - DAGITIM_BEDELI_ORANI)).toLocaleString('tr-TR', {maximumFractionDigits: 2})} ₺</span>
                  </div>
                  <div className="flex justify-between">
                    <span>CO2 Tasarrufu:</span>
                    <span className="font-medium">{(form.gunlukUretim * 0.5).toLocaleString('tr-TR', {maximumFractionDigits: 1})} kg</span>
                  </div>
                  {santralDetay && (
                    <div className="flex justify-between">
                      <span>Performans Oranı:</span>
                      <span className="font-medium">
                        %{santralDetay.kapasite > 0 
                          ? ((form.gunlukUretim / (santralDetay.kapasite * 5)) * 100).toFixed(1) 
                          : '0.0'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setFormAcik(false)}
                  className="px-4 py-2 border border-neutral-300 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={yukleniyor}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {yukleniyor ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span className="ml-2">Kaydediliyor...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Kaydet
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toplu Veri Yükleme Modalı */}
      {bulkImportModalAcik && santralDetay && (
        <BulkImportModal
          onClose={() => setBulkImportModalAcik(false)}
          santralId={santralDetay.id}
          santralKapasite={santralDetay.kapasite}
          onSuccess={() => {
            fetchUretimVerileri();
            setBulkImportModalAcik(false);
          }}
        />
      )}

      {/* Silme Onay Modalı */}
      {silmeOnayModalAcik && (
        <div className="fixed inset-0 bg-neutral-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-neutral-900">Üretim Verisi Silme</h3>
                <div className="mt-2">
                  <p className="text-sm text-neutral-500">
                    Bu üretim verisini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setSilmeOnayModalAcik(false)}
                className="px-4 py-2 border border-neutral-300 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
              >
                Sil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Santral Silme Onay Modalı */}
      {silmeSantralModalAcik && (
        <div className="fixed inset-0 bg-neutral-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-neutral-900">Santral Silme</h3>
                <div className="mt-2">
                  <p className="text-sm text-neutral-500">
                    Bu santralı ve tüm üretim verilerini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setSilmeSantralModalAcik(false)}
                className="px-4 py-2 border border-neutral-300 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleSantralDelete}
                className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
              >
                Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};