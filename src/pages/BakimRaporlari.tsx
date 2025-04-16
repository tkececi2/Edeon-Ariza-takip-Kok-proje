import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { format, parseISO, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { tr } from 'date-fns/locale';
import { 
  FileText, 
  Calendar, 
  Download,
  Building,
  CheckCircle,
  AlertTriangle,
  Wrench,
  Zap,
  Filter,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  PieChart,
  BarChart2
} from 'lucide-react';
import { Card, Title, Text, DonutChart, BarChart, ProgressBar, Flex, Metric, BadgeDelta } from '@tremor/react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import toast from 'react-hot-toast';

interface BakimRaporu {
  id: string;
  sahaId: string;
  tarih: Timestamp;
  kontrolEden: {
    id: string;
    ad: string;
    rol: string;
  };
  fotograflar?: string[];
  durumlar: any;
  genelNotlar?: string;
  olusturmaTarihi: Timestamp;
  tip: 'mekanik' | 'elektrik';
}

export const BakimRaporlari: React.FC = () => {
  const { kullanici } = useAuth();
  const [yukleniyor, setYukleniyor] = useState(true);
  const [secilenAy, setSecilenAy] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [secilenSaha, setSecilenSaha] = useState<string>('');
  const [sahalar, setSahalar] = useState<Array<{id: string, ad: string}>>([]);
  const [bakimRaporlari, setBakimRaporlari] = useState<BakimRaporu[]>([]);
  const [detayliGorunumAcik, setDetayliGorunumAcik] = useState(false);
  const [yenileniyor, setYenileniyor] = useState(false);
  const [secilenBakimTipi, setSecilenBakimTipi] = useState<'hepsi' | 'mekanik' | 'elektrik'>('hepsi');

  // Özet istatistikler
  const [istatistikler, setIstatistikler] = useState({
    toplamBakim: 0,
    mekanikBakim: 0,
    elektrikBakim: 0,
    sorunluBakim: 0,
    sorunsuzBakim: 0,
    bakimYapilmaSuresi: 0,
    sahaBasinaBakim: [] as {saha: string, bakim: number}[],
    sorunDagilimi: [] as {kategori: string, sayi: number}[]
  });

  useEffect(() => {
    const sahalariGetir = async () => {
      if (!kullanici) return;

      try {
        let sahaQuery;
        if (kullanici.rol === 'musteri' && kullanici.sahalar) {
          sahaQuery = query(
            collection(db, 'sahalar'),
            where('__name__', 'in', kullanici.sahalar)
          );
        } else {
          sahaQuery = query(collection(db, 'sahalar'), orderBy('ad'));
        }
        
        const sahaSnapshot = await getDocs(sahaQuery);
        const sahaListesi = sahaSnapshot.docs.map(doc => ({
          id: doc.id,
          ad: doc.data().ad
        }));
        setSahalar(sahaListesi);
      } catch (error) {
        console.error('Sahalar getirilemedi:', error);
        toast.error('Sahalar yüklenirken bir hata oluştu');
      }
    };

    sahalariGetir();
  }, [kullanici]);

  const fetchBakimRaporlari = async () => {
    if (!kullanici) return;

    try {
      setYukleniyor(true);

      const ayBaslangic = startOfMonth(parseISO(secilenAy + '-01'));
      const ayBitis = endOfMonth(parseISO(secilenAy + '-01'));
      const ayBaslangicTimestamp = Timestamp.fromDate(ayBaslangic);
      const ayBitisTimestamp = Timestamp.fromDate(ayBitis);

      // Mekanik bakım raporlarını getir
      let mekanikBakimQuery;
      if (secilenSaha) {
        mekanikBakimQuery = query(
          collection(db, 'mekanikBakimlar'),
          where('sahaId', '==', secilenSaha),
          where('tarih', '>=', ayBaslangicTimestamp),
          where('tarih', '<=', ayBitisTimestamp),
          orderBy('tarih', 'desc')
        );
      } else if (kullanici.rol === 'musteri' && kullanici.sahalar) {
        mekanikBakimQuery = query(
          collection(db, 'mekanikBakimlar'),
          where('sahaId', 'in', kullanici.sahalar),
          where('tarih', '>=', ayBaslangicTimestamp),
          where('tarih', '<=', ayBitisTimestamp),
          orderBy('tarih', 'desc')
        );
      } else {
        mekanikBakimQuery = query(
          collection(db, 'mekanikBakimlar'),
          where('tarih', '>=', ayBaslangicTimestamp),
          where('tarih', '<=', ayBitisTimestamp),
          orderBy('tarih', 'desc')
        );
      }

      const mekanikBakimSnapshot = await getDocs(mekanikBakimQuery);
      const mekanikBakimlar = mekanikBakimSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        tip: 'mekanik' as const
      }));

      // Elektrik bakım raporlarını getir
      let elektrikBakimQuery;
      if (secilenSaha) {
        elektrikBakimQuery = query(
          collection(db, 'elektrikBakimlar'),
          where('sahaId', '==', secilenSaha),
          where('tarih', '>=', ayBaslangicTimestamp),
          where('tarih', '<=', ayBitisTimestamp),
          orderBy('tarih', 'desc')
        );
      } else if (kullanici.rol === 'musteri' && kullanici.sahalar) {
        elektrikBakimQuery = query(
          collection(db, 'elektrikBakimlar'),
          where('sahaId', 'in', kullanici.sahalar),
          where('tarih', '>=', ayBaslangicTimestamp),
          where('tarih', '<=', ayBitisTimestamp),
          orderBy('tarih', 'desc')
        );
      } else {
        elektrikBakimQuery = query(
          collection(db, 'elektrikBakimlar'),
          where('tarih', '>=', ayBaslangicTimestamp),
          where('tarih', '<=', ayBitisTimestamp),
          orderBy('tarih', 'desc')
        );
      }

      const elektrikBakimSnapshot = await getDocs(elektrikBakimQuery);
      const elektrikBakimlar = elektrikBakimSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        tip: 'elektrik' as const
      }));

      // Tüm bakım raporlarını birleştir
      let tumBakimlar = [...mekanikBakimlar, ...elektrikBakimlar];
      
      // Bakım tipine göre filtrele
      if (secilenBakimTipi !== 'hepsi') {
        tumBakimlar = tumBakimlar.filter(bakim => bakim.tip === secilenBakimTipi);
      }
      
      // Tarihe göre sırala
      tumBakimlar.sort((a, b) => b.tarih.toDate().getTime() - a.tarih.toDate().getTime());
      
      setBakimRaporlari(tumBakimlar);

      // İstatistikleri hesapla
      const sorunluMekanikBakimlar = mekanikBakimlar.filter(bakim => 
        Object.values(bakim.durumlar).some(kategori => 
          Object.values(kategori).some(durum => durum === false)
        )
      );

      const sorunluElektrikBakimlar = elektrikBakimlar.filter(bakim => 
        Object.values(bakim.durumlar).some(kategori => 
          Object.values(kategori).some(durum => durum === false)
        )
      );

      const sorunluBakimSayisi = sorunluMekanikBakimlar.length + sorunluElektrikBakimlar.length;
      const toplamBakimSayisi = tumBakimlar.length;

      // Saha başına bakım sayısı
      const sahaBasinaBakim = sahalar.map(saha => {
        const bakimSayisi = tumBakimlar.filter(bakim => bakim.sahaId === saha.id).length;
        return {
          saha: saha.ad,
          bakim: bakimSayisi
        };
      }).sort((a, b) => b.bakim - a.bakim);

      // Sorun dağılımı
      const sorunDagilimi: {kategori: string, sayi: number}[] = [];
      
      // Mekanik bakım sorunları
      const mekanikSorunlar = {
        'Çevresel Durum': 0,
        'Arazi ve Toprak': 0,
        'Taşıyıcı Yapılar': 0,
        'Kazıklar ve Kirişler': 0,
        'PV Modülleri': 0,
        'Elektrik Sistemleri': 0
      };
      
      sorunluMekanikBakimlar.forEach(bakim => {
        if (bakim.durumlar.cevreselDurum && Object.values(bakim.durumlar.cevreselDurum).some(durum => durum === false)) {
          mekanikSorunlar['Çevresel Durum']++;
        }
        if (bakim.durumlar.araziDurumu && Object.values(bakim.durumlar.araziDurumu).some(durum => durum === false)) {
          mekanikSorunlar['Arazi ve Toprak']++;
        }
        if (bakim.durumlar.tasiyiciYapilar && Object.values(bakim.durumlar.tasiyiciYapilar).some(durum => durum === false)) {
          mekanikSorunlar['Taşıyıcı Yapılar']++;
        }
        if (bakim.durumlar.kazikVeKirisler && Object.values(bakim.durumlar.kazikVeKirisler).some(durum => durum === false)) {
          mekanikSorunlar['Kazıklar ve Kirişler']++;
        }
        if (bakim.durumlar.pvModulleri && Object.values(bakim.durumlar.pvModulleri).some(durum => durum === false)) {
          mekanikSorunlar['PV Modülleri']++;
        }
        if (bakim.durumlar.elektrikSistemleri && Object.values(bakim.durumlar.elektrikSistemleri).some(durum => durum === false)) {
          mekanikSorunlar['Elektrik Sistemleri']++;
        }
      });
      
      // Elektrik bakım sorunları
      const elektrikSorunlar = {
        'OG Sistemleri': 0,
        'Trafolar': 0,
        'AG Dağıtım Panosu': 0,
        'İnvertörler': 0,
        'Toplama Kutuları': 0,
        'PV Modülleri': 0,
        'Kablolar': 0,
        'Aydınlatma ve Güvenlik': 0,
        'Topraklama Sistemleri': 0
      };
      
      sorunluElektrikBakimlar.forEach(bakim => {
        if (bakim.durumlar.ogSistemleri && Object.values(bakim.durumlar.ogSistemleri).some(durum => durum === false)) {
          elektrikSorunlar['OG Sistemleri']++;
        }
        if (bakim.durumlar.trafolar && Object.values(bakim.durumlar.trafolar).some(durum => durum === false)) {
          elektrikSorunlar['Trafolar']++;
        }
        if (bakim.durumlar.agDagitimPanosu && Object.values(bakim.durumlar.agDagitimPanosu).some(durum => durum === false)) {
          elektrikSorunlar['AG Dağıtım Panosu']++;
        }
        if (bakim.durumlar.invertorler && Object.values(bakim.durumlar.invertorler).some(durum => durum === false)) {
          elektrikSorunlar['İnvertörler']++;
        }
        if (bakim.durumlar.toplamaKutulari && Object.values(bakim.durumlar.toplamaKutulari).some(durum => durum === false)) {
          elektrikSorunlar['Toplama Kutuları']++;
        }
        if (bakim.durumlar.pvModulleri && Object.values(bakim.durumlar.pvModulleri).some(durum => durum === false)) {
          elektrikSorunlar['PV Modülleri']++;
        }
        if (bakim.durumlar.kabloTasima && Object.values(bakim.durumlar.kabloTasima).some(durum => durum === false)) {
          elektrikSorunlar['Kablolar']++;
        }
        if (bakim.durumlar.aydinlatmaGuvenlik && Object.values(bakim.durumlar.aydinlatmaGuvenlik).some(durum => durum === false)) {
          elektrikSorunlar['Aydınlatma ve Güvenlik']++;
        }
        if (bakim.durumlar.topraklamaSistemleri && Object.values(bakim.durumlar.topraklamaSistemleri).some(durum => durum === false)) {
          elektrikSorunlar['Topraklama Sistemleri']++;
        }
      });
      
      // Mekanik sorunlar
      Object.entries(mekanikSorunlar).forEach(([kategori, sayi]) => {
        if (sayi > 0) {
          sorunDagilimi.push({ kategori: `Mekanik: ${kategori}`, sayi });
        }
      });
      
      // Elektrik sorunlar
      Object.entries(elektrikSorunlar).forEach(([kategori, sayi]) => {
        if (sayi > 0) {
          sorunDagilimi.push({ kategori: `Elektrik: ${kategori}`, sayi });
        }
      });
      
      // Sorun sayısına göre sırala
      sorunDagilimi.sort((a, b) => b.sayi - a.sayi);

      setIstatistikler({
        toplamBakim: toplamBakimSayisi,
        mekanikBakim: mekanikBakimlar.length,
        elektrikBakim: elektrikBakimlar.length,
        sorunluBakim: sorunluBakimSayisi,
        sorunsuzBakim: toplamBakimSayisi - sorunluBakimSayisi,
        bakimYapilmaSuresi: 0, // Bu veri şu an için mevcut değil
        sahaBasinaBakim,
        sorunDagilimi
      });

    } catch (error) {
      console.error('Bakım raporları getirilemedi:', error);
      toast.error('Raporlar yüklenirken bir hata oluştu');
    } finally {
      setYukleniyor(false);
    }
  };

  useEffect(() => {
    fetchBakimRaporlari();
  }, [kullanici, secilenAy, secilenSaha, secilenBakimTipi]);

  const handleRaporIndir = () => {
    try {
      const doc = new jsPDF();
      const sahaAdi = secilenSaha 
        ? sahalar.find(s => s.id === secilenSaha)?.ad 
        : 'Tüm Sahalar';
      
      // Başlık
      doc.setFontSize(18);
      doc.text(`Bakım Raporu - ${format(parseISO(secilenAy + '-01'), 'MMMM yyyy', { locale: tr })}`, 105, 15, { align: 'center' });
      
      doc.setFontSize(12);
      doc.text(`Saha: ${sahaAdi}`, 105, 25, { align: 'center' });
      doc.text(`Oluşturma Tarihi: ${format(new Date(), 'dd MMMM yyyy', { locale: tr })}`, 105, 35, { align: 'center' });
      
      // Özet Bilgiler
      doc.setFontSize(14);
      doc.text('1. Bakım Özeti', 14, 50);
      
      doc.setFontSize(10);
      doc.text(`Toplam Bakım: ${istatistikler.toplamBakim}`, 20, 60);
      doc.text(`Mekanik Bakım: ${istatistikler.mekanikBakim}`, 20, 65);
      doc.text(`Elektrik Bakım: ${istatistikler.elektrikBakim}`, 20, 70);
      doc.text(`Sorunlu Bakım: ${istatistikler.sorunluBakim}`, 20, 75);
      doc.text(`Sorunsuz Bakım: ${istatistikler.sorunsuzBakim}`, 20, 80);
      
      // Saha Bazlı Bakım Sayıları
      doc.setFontSize(14);
      doc.text('2. Saha Bazlı Bakım Sayıları', 14, 95);
      
      const sahaData = istatistikler.sahaBasinaBakim.map((item, i) => [
        i + 1,
        item.saha,
        item.bakim.toString()
      ]);
      
      doc.autoTable({
        startY: 100,
        head: [['#', 'Saha', 'Bakım Sayısı']],
        body: sahaData,
        theme: 'grid',
        headStyles: { fillColor: [255, 193, 7] }
      });
      
      // Sorun Dağılımı
      const yPosition = doc.lastAutoTable?.finalY || 130;
      doc.setFontSize(14);
      doc.text('3. Sorun Dağılımı', 14, yPosition + 15);
      
      const sorunData = istatistikler.sorunDagilimi.map((item, i) => [
        i + 1,
        item.kategori,
        item.sayi.toString()
      ]);
      
      if (sorunData.length > 0) {
        doc.autoTable({
          startY: yPosition + 20,
          head: [['#', 'Kategori', 'Sorun Sayısı']],
          body: sorunData,
          theme: 'grid',
          headStyles: { fillColor: [255, 193, 7] }
        });
      } else {
        doc.text('Sorun bulunmamaktadır.', 20, yPosition + 25);
      }
      
      // Bakım Detayları
      const yPosition2 = doc.lastAutoTable?.finalY || (yPosition + 30);
      doc.setFontSize(14);
      doc.text('4. Bakım Detayları', 14, yPosition2 + 15);
      
      const bakimData = bakimRaporlari.map((bakim, i) => [
        i + 1,
        bakim.tip === 'mekanik' ? 'Mekanik' : 'Elektrik',
        sahalar.find(s => s.id === bakim.sahaId)?.ad || 'Bilinmeyen Saha',
        format(bakim.tarih.toDate(), 'dd.MM.yyyy'),
        bakim.kontrolEden.ad,
        Object.values(bakim.durumlar).some(kategori => 
          Object.values(kategori).some(durum => durum === false)
        ) ? 'Sorunlu' : 'Sorunsuz'
      ]);
      
      doc.autoTable({
        startY: yPosition2 + 20,
        head: [['#', 'Tip', 'Saha', 'Tarih', 'Kontrol Eden', 'Durum']],
        body: bakimData,
        theme: 'grid',
        headStyles: { fillColor: [255, 193, 7] }
      });
      
      // Raporu indir
      doc.save(`bakim-raporu-${secilenAy}-${sahaAdi.replace(/\s+/g, '-')}.pdf`);
      toast.success('Rapor başarıyla indirildi');
    } catch (error) {
      console.error('Rapor indirme hatası:', error);
      toast.error('Rapor indirilirken bir hata oluştu');
    }
  };

  const handleYenile = async () => {
    setYenileniyor(true);
    await fetchBakimRaporlari();
    setYenileniyor(false);
    toast.success('Veriler yenilendi');
  };

  if (yukleniyor) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bakım Raporları</h1>
          <p className="mt-1 text-sm text-gray-500">
            {format(parseISO(secilenAy + '-01'), 'MMMM yyyy', { locale: tr })} dönemi bakım özeti
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleYenile}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            disabled={yenileniyor}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${yenileniyor ? 'animate-spin' : ''}`} />
            Yenile
          </button>
          <button
            onClick={handleRaporIndir}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700"
          >
            <Download className="h-5 w-5 mr-2" />
            PDF İndir
          </button>
        </div>
      </div>

      {/* Filtreler */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="w-full md:w-1/3">
            <label className="block text-sm font-medium text-gray-700 mb-2">Saha Seçimi</label>
            <select
              value={secilenSaha}
              onChange={(e) => setSecilenSaha(e.target.value)}
              className="rounded-lg border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 w-full"
            >
              <option value="">Tüm Sahalar</option>
              {sahalar.map(saha => (
                <option key={saha.id} value={saha.id}>{saha.ad}</option>
              ))}
            </select>
          </div>
          
          <div className="w-full md:w-1/3">
            <label className="block text-sm font-medium text-gray-700 mb-2">Tarih Seçimi</label>
            <input
              type="month"
              value={secilenAy}
              onChange={(e) => setSecilenAy(e.target.value)}
              className="rounded-lg border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 w-full"
            />
          </div>
          
          <div className="w-full md:w-1/3">
            <label className="block text-sm font-medium text-gray-700 mb-2">Bakım Tipi</label>
            <select
              value={secilenBakimTipi}
              onChange={(e) => setSecilenBakimTipi(e.target.value as 'hepsi' | 'mekanik' | 'elektrik')}
              className="rounded-lg border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 w-full"
            >
              <option value="hepsi">Tüm Bakım Tipleri</option>
              <option value="mekanik">Mekanik Bakım</option>
              <option value="elektrik">Elektrik Bakım</option>
            </select>
          </div>
        </div>
      </div>

      {/* Özet Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card decoration="top" decorationColor="yellow" className="shadow-md hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <Text className="text-sm text-yellow-600 font-medium">Toplam Bakım</Text>
              <Metric className="text-2xl">{istatistikler.toplamBakim}</Metric>
              <Text className="text-xs text-gray-500">
                {format(parseISO(secilenAy + '-01'), 'MMMM yyyy', { locale: tr })}
              </Text>
            </div>
            <div className="rounded-full p-3 bg-yellow-100">
              <FileText className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </Card>

        <Card decoration="top" decorationColor="blue" className="shadow-md hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <Text className="text-sm text-blue-600 font-medium">Mekanik Bakım</Text>
              <Metric className="text-2xl">{istatistikler.mekanikBakim}</Metric>
              <Text className="text-xs text-gray-500">
                {((istatistikler.mekanikBakim / istatistikler.toplamBakim) * 100 || 0).toFixed(1)}% oranında
              </Text>
            </div>
            <div className="rounded-full p-3 bg-blue-100">
              <Wrench className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card decoration="top" decorationColor="indigo" className="shadow-md hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <Text className="text-sm text-indigo-600 font-medium">Elektrik Bakım</Text>
              <Metric className="text-2xl">{istatistikler.elektrikBakim}</Metric>
              <Text className="text-xs text-gray-500">
                {((istatistikler.elektrikBakim / istatistikler.toplamBakim) * 100 || 0).toFixed(1)}% oranında
              </Text>
            </div>
            <div className="rounded-full p-3 bg-indigo-100">
              <Zap className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
        </Card>

        <Card decoration="top" decorationColor="green" className="shadow-md hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <Text className="text-sm text-green-600 font-medium">Sorunsuz Bakım</Text>
              <div className="flex items-center">
                <Metric className="text-2xl">{istatistikler.sorunsuzBakim}</Metric>
                <BadgeDelta 
                  deltaType={istatistikler.sorunsuzBakim > istatistikler.sorunluBakim ? "increase" : "decrease"}
                  className="ml-2"
                >
                  {((istatistikler.sorunsuzBakim / istatistikler.toplamBakim) * 100 || 0).toFixed(1)}%
                </BadgeDelta>
              </div>
              <Text className="text-xs text-gray-500">
                {istatistikler.sorunluBakim} sorunlu bakım
              </Text>
            </div>
            <div className="rounded-full p-3 bg-green-100">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Bakım Dağılımı Grafiği */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-md">
          <div className="flex justify-between items-center mb-4">
            <div>
              <Title className="text-lg font-bold text-gray-900">Bakım Tipi Dağılımı</Title>
              <Text className="text-gray-600">
                {format(parseISO(secilenAy + '-01'), 'MMMM yyyy', { locale: tr })}
              </Text>
            </div>
            <div className="p-2 bg-yellow-100 rounded-full">
              <PieChart className="h-5 w-5 text-yellow-600" />
            </div>
          </div>
          
          <DonutChart
            className="mt-6"
            data={[
              { name: 'Mekanik Bakım', value: istatistikler.mekanikBakim },
              { name: 'Elektrik Bakım', value: istatistikler.elektrikBakim }
            ]}
            category="value"
            index="name"
            colors={["blue", "indigo"]}
            valueFormatter={(value) => `${value} bakım`}
            showLabel={true}
          />
        </Card>

        <Card className="shadow-md">
          <div className="flex justify-between items-center mb-4">
            <div>
              <Title className="text-lg font-bold text-gray-900">Saha Bazlı Bakım Sayıları</Title>
              <Text className="text-gray-600">
                En çok bakım yapılan sahalar
              </Text>
            </div>
            <div className="p-2 bg-blue-100 rounded-full">
              <BarChart2 className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          
          <BarChart
            className="mt-6"
            data={istatistikler.sahaBasinaBakim.slice(0, 10)}
            index="saha"
            categories={["bakim"]}
            colors={["blue"]}
            valueFormatter={(value) => `${value} bakım`}
            yAxisWidth={80}
          />
        </Card>
      </div>

      {/* Sorun Dağılımı */}
      {istatistikler.sorunluBakim > 0 && (
        <Card className="shadow-md">
          <div className="flex justify-between items-center mb-4">
            <div>
              <Title className="text-lg font-bold text-gray-900">Sorun Dağılımı</Title>
              <Text className="text-gray-600">
                Tespit edilen sorunların kategorilere göre dağılımı
              </Text>
            </div>
            <div className="p-2 bg-red-100 rounded-full">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
          </div>
          
          <BarChart
            className="mt-6"
            data={istatistikler.sorunDagilimi.slice(0, 10)}
            index="kategori"
            categories={["sayi"]}
            colors={["red"]}
            valueFormatter={(value) => `${value} sorun`}
            yAxisWidth={120}
          />
        </Card>
      )}

      {/* Bakım Raporları Detaylı Liste */}
      <Card className="shadow-md">
        <div className="flex justify-between items-center mb-4">
          <div>
            <Title className="text-lg font-bold text-gray-900">Bakım Raporları</Title>
            <Text className="text-gray-600">
              {format(parseISO(secilenAy + '-01'), 'MMMM yyyy', { locale: tr })} dönemi bakım listesi
            </Text>
          </div>
          <button
            onClick={() => setDetayliGorunumAcik(!detayliGorunumAcik)}
            className="text-sm text-yellow-600 hover:text-yellow-800 flex items-center"
          >
            {detayliGorunumAcik ? 'Listeyi Daralt' : 'Detaylı Görünüm'}
            {detayliGorunumAcik ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
          </button>
        </div>

        {bakimRaporlari.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <Text className="text-gray-500 font-medium">Bu dönemde bakım raporu bulunmuyor</Text>
            <Text className="text-gray-400 text-sm mt-1">Farklı bir ay veya saha seçin</Text>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bakım Tipi
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Saha
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tarih
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kontrol Eden
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Durum
                  </th>
                  {detayliGorunumAcik && (
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sorunlar
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {bakimRaporlari.map((bakim) => {
                  const sorunluDurumlar = Object.entries(bakim.durumlar).reduce((acc, [kategori, durumlar]) => {
                    Object.entries(durumlar).forEach(([durum, deger]) => {
                      if (deger === false) {
                        acc.push(`${kategori} - ${durum}`);
                      }
                    });
                    return acc;
                  }, [] as string[]);
                  
                  const sorunVar = sorunluDurumlar.length > 0;
                  
                  return (
                    <tr key={bakim.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {bakim.tip === 'mekanik' ? (
                            <div className="flex items-center">
                              <div className="p-1.5 bg-blue-100 rounded-full mr-2">
                                <Wrench className="h-4 w-4 text-blue-600" />
                              </div>
                              <span className="text-sm font-medium text-blue-900">Mekanik</span>
                            </div>
                          ) : (
                            <div className="flex items-center">
                              <div className="p-1.5 bg-indigo-100 rounded-full mr-2">
                                <Zap className="h-4 w-4 text-indigo-600" />
                              </div>
                              <span className="text-sm font-medium text-indigo-900">Elektrik</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Building className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900">
                            {sahalar.find(s => s.id === bakim.sahaId)?.ad || 'Bilinmeyen Saha'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900">
                            {format(bakim.tarih.toDate(), 'dd MMMM yyyy', { locale: tr })}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {bakim.kontrolEden.ad}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {sorunVar ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <AlertTriangle className="h-4 w-4 mr-1" />
                            Sorunlu
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Sorunsuz
                          </span>
                        )}
                      </td>
                      {detayliGorunumAcik && (
                        <td className="px-6 py-4">
                          {sorunVar ? (
                            <ul className="text-xs text-gray-600 space-y-1">
                              {sorunluDurumlar.slice(0, 3).map((sorun, index) => (
                                <li key={index} className="flex items-start">
                                  <AlertTriangle className="h-3 w-3 text-red-500 mr-1 mt-0.5 flex-shrink-0" />
                                  <span>{sorun}</span>
                                </li>
                              ))}
                              {sorunluDurumlar.length > 3 && (
                                <li className="text-gray-500">+{sorunluDurumlar.length - 3} daha...</li>
                              )}
                            </ul>
                          ) : (
                            <span className="text-xs text-green-600">Sorun tespit edilmedi</span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Bakım Performansı */}
      <Card className="shadow-md">
        <Title className="text-lg font-bold text-gray-900">Bakım Performansı</Title>
        <Text className="text-gray-600">
          {format(parseISO(secilenAy + '-01'), 'MMMM yyyy', { locale: tr })} dönemi bakım performansı
        </Text>
        
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Text className="font-medium text-gray-700">Sorunsuz Bakım Oranı</Text>
            <div className="mt-2">
              <Flex>
                <Text>%{((istatistikler.sorunsuzBakim / istatistikler.toplamBakim) * 100 || 0).toFixed(1)}</Text>
                <Text>{istatistikler.sorunsuzBakim} / {istatistikler.toplamBakim} bakım</Text>
              </Flex>
              <ProgressBar 
                value={(istatistikler.sorunsuzBakim / istatistikler.toplamBakim) * 100 || 0} 
                color="green" 
                className="mt-2" 
              />
            </div>
          </div>
          
          <div>
            <Text className="font-medium text-gray-700">Bakım Tipi Dağılımı</Text>
            <div className="mt-2">
              <Flex>
                <Text>Mekanik: %{((istatistikler.mekanikBakim / istatistikler.toplamBakim) * 100 || 0).toFixed(1)}</Text>
                <Text>Elektrik: %{((istatistikler.elektrikBakim / istatistikler.toplamBakim) * 100 || 0).toFixed(1)}</Text>
              </Flex>
              <div className="w-full h-2 bg-gray-200 rounded-full mt-2 overflow-hidden">
                <div 
                  className="h-full bg-blue-500 rounded-full" 
                  style={{ width: `${(istatistikler.mekanikBakim / istatistikler.toplamBakim) * 100 || 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};