import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, getDocs, where, limit, Timestamp, getDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { format, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { tr } from 'date-fns/locale';
import { 
  AlertTriangle, 
  CheckCircle,
  Clock,
  Plus,
  Building,
  MapPin,
  User,
  Calendar,
  Package,
  Zap,
  Wrench,
  BarChart2,
  TrendingUp,
  Sun,
  Battery,
  Leaf,
  Activity,
  FileText,
  Bolt,
  PanelTop,
  ArrowRight,
  FileBarChart
} from 'lucide-react';
import { StatsCard } from '../components/StatsCard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ArizaDetayModal } from '../components/ArizaDetayModal';
import { Card, Title, BarChart, DonutChart, AreaChart, ProgressBar, Text } from '@tremor/react';
import type { Ariza } from '../types';
import toast from 'react-hot-toast';

export const Anasayfa: React.FC = () => {
  const { kullanici } = useAuth();
  const navigate = useNavigate();
  const [arizalar, setArizalar] = useState<Ariza[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [sahalar, setSahalar] = useState<Record<string, string>>({});
  const [seciliAriza, setSeciliAriza] = useState<Ariza | null>(null);
  const [istatistikler, setIstatistikler] = useState({
    toplamAriza: 0,
    acikArizalar: 0,
    devamEdenArizalar: 0,
    cozulenArizalar: 0,
    kritikStoklar: 0,
    planliBakimlar: 0,
    performansSkoru: 0,
    haftalikArizalar: [] as { date: string; arizaSayisi: number }[],
    arizaDagilimi: [] as { durum: string; sayi: number }[],
    sahaPerformansi: [] as { saha: string; performans: number }[],
    uretimVerileri: [] as { date: string; uretim: number }[],
    toplamUretim: 0,
    aylikUretim: 0,
    yillikUretim: 0,
    toplamCO2Tasarrufu: 0
  });

  // Boş istatistikler oluştur
  const createEmptyStats = () => {
    return {
      toplamAriza: 0,
      acikArizalar: 0,
      devamEdenArizalar: 0,
      cozulenArizalar: 0,
      kritikStoklar: 0,
      planliBakimlar: 0,
      performansSkoru: 0,
      haftalikArizalar: Array.from({ length: 7 }, (_, i) => ({
        date: format(subDays(new Date(), 6 - i), 'dd MMM', { locale: tr }),
        arizaSayisi: 0
      })),
      arizaDagilimi: [
        { durum: 'Açık', sayi: 0 },
        { durum: 'Devam Eden', sayi: 0 },
        { durum: 'Çözülen', sayi: 0 }
      ],
      sahaPerformansi: [],
      uretimVerileri: [],
      toplamUretim: 0,
      aylikUretim: 0,
      yillikUretim: 0,
      toplamCO2Tasarrufu: 0
    };
  };

  useEffect(() => {
    const veriGetir = async () => {
      if (!kullanici) return;

      try {
        setYukleniyor(true);
        
        // Kullanıcının sahalarını kontrol et
        const userSahalar = kullanici.sahalar || [];
        
        // Sahaları getir
        let sahaMap: Record<string, string> = {};
        
        try {
          let sahaQuery;
          if (kullanici.rol === 'musteri' && userSahalar.length > 0) {
            sahaQuery = query(
              collection(db, 'sahalar'),
              where('__name__', 'in', userSahalar)
            );
          } else if (kullanici.rol !== 'musteri') {
            sahaQuery = query(collection(db, 'sahalar'));
          } else {
            // Müşteri rolü ve sahası yoksa boş veriler göster
            setArizalar([]);
            setIstatistikler(createEmptyStats());
            setSahalar({});
            setYukleniyor(false);
            return;
          }
          
          const sahaSnapshot = await getDocs(sahaQuery);
          sahaMap = {};
          sahaSnapshot.docs.forEach(doc => {
            sahaMap[doc.id] = doc.data().ad;
          });
          setSahalar(sahaMap);
        } catch (error) {
          console.error('Sahalar getirilemedi:', error);
          setSahalar({});
          // Sahalar getirilemezse devam et, diğer verileri almaya çalış
        }

        // Müşteri rolü ve sahası yoksa boş veriler göster
        if (kullanici.rol === 'musteri' && userSahalar.length === 0) {
          setArizalar([]);
          setIstatistikler(createEmptyStats());
          setYukleniyor(false);
          return;
        }

        // Arızaları getir
        let sonArizalar: Ariza[] = [];
        let butunArizalar: Ariza[] = [];
        
        try {
          let arizaQuery;
          if (kullanici.rol === 'musteri' && userSahalar.length > 0) {
            arizaQuery = query(
              collection(db, 'arizalar'),
              where('saha', 'in', userSahalar),
              orderBy('olusturmaTarihi', 'desc'),
              limit(5)
            );
          } else if (kullanici.rol !== 'musteri') {
            arizaQuery = query(
              collection(db, 'arizalar'),
              orderBy('olusturmaTarihi', 'desc'),
              limit(5)
            );
          } else {
            setArizalar([]);
            setIstatistikler(createEmptyStats());
            setYukleniyor(false);
            return;
          }

          const snapshot = await getDocs(arizaQuery);
          sonArizalar = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Ariza[];
          
          setArizalar(sonArizalar);

          // Tüm arızaları getir (istatistikler için)
          let tumArizalarQuery;
          if (kullanici.rol === 'musteri' && userSahalar.length > 0) {
            tumArizalarQuery = query(
              collection(db, 'arizalar'),
              where('saha', 'in', userSahalar)
            );
          } else if (kullanici.rol !== 'musteri') {
            tumArizalarQuery = query(collection(db, 'arizalar'));
          } else {
            setIstatistikler(createEmptyStats());
            setYukleniyor(false);
            return;
          }
          
          const tumArizalarSnapshot = await getDocs(tumArizalarQuery);
          butunArizalar = tumArizalarSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Ariza[];
        } catch (error) {
          console.error('Arızalar getirilemedi:', error);
          setArizalar([]);
          butunArizalar = [];
          // Arızalar getirilemezse devam et, diğer verileri almaya çalış
        }

        // İstatistikleri hesapla
        const acik = butunArizalar.filter(a => a.durum === 'acik').length;
        const devamEden = butunArizalar.filter(a => a.durum === 'devam-ediyor').length;
        const cozulen = butunArizalar.filter(a => a.durum === 'cozuldu').length;
        const toplam = butunArizalar.length;

        // Kritik stok sayısını getir
        let kritikStokSayisi = 0;
        try {
          let stokQuery;
          if (kullanici.rol === 'musteri' && userSahalar.length > 0) {
            stokQuery = query(
              collection(db, 'stoklar'),
              where('sahaId', 'in', userSahalar)
            );
          } else if (kullanici.rol !== 'musteri') {
            stokQuery = query(collection(db, 'stoklar'));
          } else {
            // Müşteri rolü ve sahası yoksa bu kısmı atla
            kritikStokSayisi = 0;
          }
          
          if (stokQuery) {
            const stokSnapshot = await getDocs(stokQuery);
            kritikStokSayisi = stokSnapshot.docs.filter(doc => {
              const stok = doc.data();
              return stok.miktar <= stok.kritikSeviye;
            }).length;
          }
        } catch (error) {
          console.error('Stoklar getirilemedi:', error);
          kritikStokSayisi = 0;
          // Stoklar getirilemezse devam et, diğer verileri almaya çalış
        }

        // Planlı bakım sayısını getir
        let planlanmisBakimlar = 0;
        try {
          let bakimQuery;
          if (kullanici.rol === 'musteri' && userSahalar.length > 0) {
            bakimQuery = query(
              collection(db, 'mekanikBakimlar'),
              where('sahaId', 'in', userSahalar)
            );
          } else if (kullanici.rol !== 'musteri') {
            bakimQuery = query(collection(db, 'mekanikBakimlar'));
          } else {
            // Müşteri rolü ve sahası yoksa bu kısmı atla
            planlanmisBakimlar = 0;
          }
          
          if (bakimQuery) {
            const bakimSnapshot = await getDocs(bakimQuery);
            planlanmisBakimlar = bakimSnapshot.docs.length;
          }
        } catch (error) {
          console.error('Bakımlar getirilemedi:', error);
          planlanmisBakimlar = 0;
          // Bakımlar getirilemezse devam et, diğer verileri almaya çalış
        }

        // Performans skoru hesapla (0-100 arası)
        const performans = toplam > 0 ? Math.round((cozulen / toplam) * 100) : 0;

        // Son 7 günün arızaları
        const sonYediGun = Array.from({ length: 7 }, (_, i) => {
          const tarih = subDays(new Date(), 6 - i);
          const gunlukArizalar = butunArizalar.filter(ariza => {
            const arizaTarihi = ariza.olusturmaTarihi.toDate();
            return format(arizaTarihi, 'yyyy-MM-dd') === format(tarih, 'yyyy-MM-dd');
          });
          return {
            date: format(tarih, 'dd MMM', { locale: tr }),
            arizaSayisi: gunlukArizalar.length
          };
        });

        // Arıza durumu dağılımı
        const durumDagilimi = [
          { durum: 'Açık', sayi: acik },
          { durum: 'Devam Eden', sayi: devamEden },
          { durum: 'Çözülen', sayi: cozulen }
        ];

        // Saha bazlı performans
        const sahaPerformansi = Object.entries(sahaMap).map(([sahaId, sahaAdi]) => {
          const sahaArizalari = butunArizalar.filter(a => a.saha === sahaId);
          const sahaCozulen = sahaArizalari.filter(a => a.durum === 'cozuldu').length;
          const sahaPerformans = sahaArizalari.length > 0 
            ? (sahaCozulen / sahaArizalari.length) * 100 
            : 100;
          return {
            saha: sahaAdi,
            performans: Math.round(sahaPerformans)
          };
        });

        // Üretim verilerini getir
        let uretimGrafigi: { date: string; uretim: number }[] = [];
        let toplamUretim = 0;
        let aylikUretim = 0;
        let yillikUretim = 0;
        let toplamCO2Tasarrufu = 0;
        
        try {
          let uretimQuery;
          if (kullanici.rol === 'musteri' && userSahalar.length > 0) {
            uretimQuery = query(
              collection(db, 'uretimVerileri'),
              where('santralId', 'in', userSahalar),
              orderBy('tarih', 'desc'),
              limit(30)
            );
          } else if (kullanici.rol !== 'musteri') {
            uretimQuery = query(
              collection(db, 'uretimVerileri'),
              orderBy('tarih', 'desc'),
              limit(30)
            );
          } else {
            // Müşteri rolü ve sahası yoksa bu kısmı atla
            uretimGrafigi = [];
            toplamUretim = 0;
            aylikUretim = 0;
            yillikUretim = 0;
            toplamCO2Tasarrufu = 0;
          }
          
          if (uretimQuery) {
            const uretimSnapshot = await getDocs(uretimQuery);
            const uretimVerileri = uretimSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));

            // Üretim istatistikleri
            const bugun = new Date();
            const ayBaslangic = startOfMonth(bugun);
            const ayBitis = endOfMonth(bugun);
            const yilBaslangic = startOfYear(bugun);
            const yilBitis = endOfYear(bugun);
            
            toplamUretim = uretimVerileri.reduce((acc, veri) => acc + veri.gunlukUretim, 0);
            
            aylikUretim = uretimVerileri.filter(veri => {
              const veriTarihi = veri.tarih.toDate();
              return veriTarihi >= ayBaslangic && veriTarihi <= ayBitis;
            }).reduce((acc, veri) => acc + veri.gunlukUretim, 0);
            
            yillikUretim = uretimVerileri.filter(veri => {
              const veriTarihi = veri.tarih.toDate();
              return veriTarihi >= yilBaslangic && veriTarihi <= yilBitis;
            }).reduce((acc, veri) => acc + veri.gunlukUretim, 0);
            
            toplamCO2Tasarrufu = uretimVerileri.reduce((acc, veri) => acc + (veri.tasarrufEdilenCO2 || 0), 0);
            
            // Üretim grafiği için verileri hazırla
            uretimGrafigi = uretimVerileri
              .slice(0, 14)
              .sort((a, b) => a.tarih.toDate().getTime() - b.tarih.toDate().getTime())
              .map(veri => ({
                date: format(veri.tarih.toDate(), 'dd MMM', { locale: tr }),
                uretim: veri.gunlukUretim
              }));
          }
        } catch (error) {
          console.error('Üretim verileri getirilemedi:', error);
          uretimGrafigi = [];
          toplamUretim = 0;
          aylikUretim = 0;
          yillikUretim = 0;
          toplamCO2Tasarrufu = 0;
          // Üretim verileri getirilemezse devam et
        }

        setIstatistikler({
          toplamAriza: toplam,
          acikArizalar: acik,
          devamEdenArizalar: devamEden,
          cozulenArizalar: cozulen,
          kritikStoklar: kritikStokSayisi,
          planliBakimlar: planlanmisBakimlar,
          performansSkoru: performans,
          haftalikArizalar: sonYediGun,
          arizaDagilimi: durumDagilimi,
          sahaPerformansi,
          uretimVerileri: uretimGrafigi,
          toplamUretim,
          aylikUretim,
          yillikUretim,
          toplamCO2Tasarrufu
        });

      } catch (error) {
        console.error('Veri getirme hatası:', error);
        // Hata durumunda boş veriler göster
        setArizalar([]);
        setIstatistikler(createEmptyStats());
        setSahalar({});
        toast.error('Veriler yüklenirken bir hata oluştu');
      } finally {
        setYukleniyor(false);
      }
    };

    veriGetir();
  }, [kullanici]);

  if (yukleniyor) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hoş Geldiniz Kartı */}
      <Card className="bg-gradient-to-r from-primary-50 to-primary-100 border-none shadow-md">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="flex items-center mb-4 md:mb-0">
            <div className="p-3 bg-primary-100 rounded-full mr-4">
              <Sun className="h-8 w-8 text-primary-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Hoş Geldiniz, {kullanici?.ad}</h2>
              <p className="text-sm text-gray-600">
                {format(new Date(), 'dd MMMM yyyy, EEEE', { locale: tr })}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="bg-white px-4 py-2 rounded-lg shadow-sm flex items-center">
              <Battery className="h-5 w-5 text-green-500 mr-2" />
              <div>
                <p className="text-xs text-gray-500">Aylık Üretim</p>
                <p className="text-sm font-semibold">{istatistikler.aylikUretim.toLocaleString('tr-TR')} kWh</p>
              </div>
            </div>
            <div className="bg-white px-4 py-2 rounded-lg shadow-sm flex items-center">
              <Battery className="h-5 w-5 text-blue-500 mr-2" />
              <div>
                <p className="text-xs text-gray-500">Yıllık Üretim</p>
                <p className="text-sm font-semibold">{istatistikler.yillikUretim.toLocaleString('tr-TR')} kWh</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Hızlı Erişim Kartları */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div 
          className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 hover:shadow-md transition-all duration-200 cursor-pointer hover:bg-primary-50"
          onClick={() => navigate('/arizalar')}
        >
          <div className="flex flex-col items-center text-center">
            <div className="p-3 bg-red-100 rounded-full mb-3">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-900">Arızalar</h3>
            <p className="text-xs text-gray-500 mt-1">Arıza takibi ve yönetimi</p>
          </div>
        </div>
        
        <div 
          className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 hover:shadow-md transition-all duration-200 cursor-pointer hover:bg-primary-50"
          onClick={() => navigate('/uretim-verileri')}
        >
          <div className="flex flex-col items-center text-center">
            <div className="p-3 bg-green-100 rounded-full mb-3">
              <Sun className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-900">Üretim Verileri</h3>
            <p className="text-xs text-gray-500 mt-1">Enerji üretim takibi</p>
          </div>
        </div>
        
        <div 
          className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 hover:shadow-md transition-all duration-200 cursor-pointer hover:bg-primary-50"
          onClick={() => navigate('/bakim-raporlari')}
        >
          <div className="flex flex-col items-center text-center">
            <div className="p-3 bg-primary-100 rounded-full mb-3">
              <FileBarChart className="h-6 w-6 text-primary-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-900">Bakım Raporları</h3>
            <p className="text-xs text-gray-500 mt-1">Bakım ve kontrol raporları</p>
          </div>
        </div>
        
        <div 
          className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 hover:shadow-md transition-all duration-200 cursor-pointer hover:bg-primary-50"
          onClick={() => navigate('/stok-kontrol')}
        >
          <div className="flex flex-col items-center text-center">
            <div className="p-3 bg-blue-100 rounded-full mb-3">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-900">Stok Kontrol</h3>
            <p className="text-xs text-gray-500 mt-1">Malzeme ve envanter yönetimi</p>
          </div>
        </div>
      </div>

      {/* Ana İstatistik Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Toplam Arıza"
          value={istatistikler.toplamAriza}
          icon={AlertTriangle}
          color="blue"
          trend={{
            value: istatistikler.performansSkoru,
            isPositive: true,
            label: 'çözüm oranı'
          }}
        />
        <StatsCard
          title="Açık Arızalar"
          value={istatistikler.acikArizalar}
          icon={AlertTriangle}
          color="red"
        />
        <StatsCard
          title="Kritik Stoklar"
          value={istatistikler.kritikStoklar}
          icon={Package}
          color="orange"
        />
        <StatsCard
          title="Planlı Bakımlar"
          value={istatistikler.planliBakimlar}
          icon={Wrench}
          color="green"
        />
      </div>

      {/* Üretim ve Arıza Grafikleri */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Üretim Grafiği */}
        {istatistikler.uretimVerileri.length > 0 && (
          <Card className="shadow-md hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <Title>Günlük Üretim Trendi</Title>
              <button 
                onClick={() => navigate('/uretim-verileri')}
                className="text-sm text-primary-600 hover:text-primary-800 flex items-center"
              >
                Detaylar <ArrowRight className="h-4 w-4 ml-1" />
              </button>
            </div>
            <AreaChart
              className="h-72"
              data={istatistikler.uretimVerileri}
              index="date"
              categories={["uretim"]}
              colors={["emerald"]}
              valueFormatter={(value) => `${value.toLocaleString('tr-TR')} kWh`}
              showLegend={false}
            />
          </Card>
        )}

        {/* Haftalık Arıza Trendi */}
        <Card className="shadow-md hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <Title>Haftalık Arıza Trendi</Title>
            <button 
              onClick={() => navigate('/arizalar')}
              className="text-sm text-primary-600 hover:text-primary-800 flex items-center"
            >
              Detaylar <ArrowRight className="h-4 w-4 ml-1" />
            </button>
          </div>
          <BarChart
            className="h-72"
            data={istatistikler.haftalikArizalar}
            index="date"
            categories={["arizaSayisi"]}
            colors={["amber"]}
            valueFormatter={(value) => `${value} arıza`}
            showLegend={false}
          />
        </Card>
      </div>

      {/* Bakım ve Kontrol Durumu */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Arıza Durumu Dağılımı */}
        <Card className="shadow-md hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <Title>Arıza Durumu Dağılımı</Title>
            <button 
              onClick={() => navigate('/istatistikler')}
              className="text-sm text-primary-600 hover:text-primary-800 flex items-center"
            >
              Detaylar <ArrowRight className="h-4 w-4 ml-1" />
            </button>
          </div>
          <DonutChart
            className="h-60"
            data={istatistikler.arizaDagilimi}
            category="sayi"
            index="durum"
            colors={["rose", "amber", "emerald"]}
            valueFormatter={(value) => `${value} arıza`}
          />
        </Card>

        {/* Bakım Kontrol Durumu */}
        <Card className="shadow-md hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <Title>Bakım Kontrol Durumu</Title>
            <div className="flex space-x-2">
              <button 
                onClick={() => navigate('/mekanik-bakim')}
                className="text-xs text-primary-600 hover:text-primary-800"
              >
                Mekanik
              </button>
              <span className="text-gray-300">|</span>
              <button 
                onClick={() => navigate('/elektrik-bakim')}
                className="text-xs text-primary-600 hover:text-primary-800"
              >
                Elektrik
              </button>
            </div>
          </div>
          <div className="space-y-6 mt-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <PanelTop className="h-4 w-4 text-gray-500 mr-2" />
                  <span className="text-sm text-gray-700">Mekanik Bakım</span>
                </div>
                <span className="text-xs font-medium text-green-600">Son 30 gün</span>
              </div>
              <ProgressBar value={75} color="blue" />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <Zap className="h-4 w-4 text-gray-500 mr-2" />
                  <span className="text-sm text-gray-700">Elektrik Bakım</span>
                </div>
                <span className="text-xs font-medium text-green-600">Son 30 gün</span>
              </div>
              <ProgressBar value={60} color="amber" />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <Activity className="h-4 w-4 text-gray-500 mr-2" />
                  <span className="text-sm text-gray-700">İnvertör Kontrol</span>
                </div>
                <span className="text-xs font-medium text-green-600">Son 30 gün</span>
              </div>
              <ProgressBar value={85} color="emerald" />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <Bolt className="h-4 w-4 text-gray-500 mr-2" />
                  <span className="text-sm text-gray-700">Elektrik Kesintileri</span>
                </div>
                <span className="text-xs font-medium text-red-600">Son 30 gün</span>
              </div>
              <ProgressBar value={15} color="rose" />
            </div>
          </div>
        </Card>

        {/* Saha Performansı */}
        <Card className="shadow-md hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <Title>Saha Performansı</Title>
            <button 
              onClick={() => navigate('/sahalar')}
              className="text-sm text-primary-600 hover:text-primary-800 flex items-center"
            >
              Detaylar <ArrowRight className="h-4 w-4 ml-1" />
            </button>
          </div>
          <div className="mt-6 space-y-4">
            {istatistikler.sahaPerformansi.length > 0 ? (
              <>
                {istatistikler.sahaPerformansi.slice(0, 5).map((saha) => (
                  <div key={saha.saha}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-gray-700">{saha.saha}</span>
                      <span className="text-sm text-gray-600">%{saha.performans}</span>
                    </div>
                    <ProgressBar value={saha.performans} color="emerald" />
                  </div>
                ))}
                {istatistikler.sahaPerformansi.length > 5 && (
                  <div className="text-center mt-2">
                    <button 
                      onClick={() => navigate('/sahalar')}
                      className="text-sm text-primary-600 hover:text-primary-800"
                    >
                      {istatistikler.sahaPerformansi.length - 5} saha daha göster
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-6">
                <Building className="h-8 w-8 text-gray-300 mb-2" />
                <p className="text-gray-500 text-center">Henüz saha performans verisi bulunmuyor</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Son Arızalar */}
      <Card className="shadow-md hover:shadow-lg transition-all duration-300">
        <div className="flex items-center justify-between mb-4">
          <Title>Son Arızalar</Title>
          <button 
            onClick={() => navigate('/arizalar')}
            className="text-sm text-primary-600 hover:text-primary-800 flex items-center"
          >
            Tümünü Görüntüle <ArrowRight className="h-4 w-4 ml-1" />
          </button>
        </div>
        <div className="divide-y divide-gray-100">
          {arizalar.length === 0 ? (
            <div className="py-6 text-center">
              <AlertTriangle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">Henüz arıza kaydı bulunmuyor</p>
            </div>
          ) : (
            arizalar.map((ariza) => (
              <div
                key={ariza.id}
                onClick={() => setSeciliAriza(ariza)}
                className="p-4 hover:bg-gray-50 cursor-pointer transition-colors duration-150 rounded-lg"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      ariza.durum === 'cozuldu' ? 'bg-green-100 text-green-800' :
                      ariza.durum === 'devam-ediyor' ? 'bg-amber-100 text-amber-800' :
                      'bg-rose-100 text-rose-800'
                    }`}>
                      {ariza.durum === 'cozuldu' && <CheckCircle className="h-3.5 w-3.5 mr-1" />}
                      {ariza.durum === 'devam-ediyor' && <Clock className="h-3.5 w-3.5 mr-1" />}
                      {ariza.durum === 'acik' && <AlertTriangle className="h-3.5 w-3.5 mr-1" />}
                      {ariza.durum.charAt(0).toUpperCase() + ariza.durum.slice(1).replace('-', ' ')}
                    </span>
                    <h3 className="text-sm font-medium text-gray-900">{ariza.baslik}</h3>
                  </div>
                  <span className="text-xs text-gray-500">
                    {format(ariza.olusturmaTarihi.toDate(), 'dd MMM yyyy', { locale: tr })}
                  </span>
                </div>
                <div className="mt-2 sm:flex sm:justify-between">
                  <div className="sm:flex">
                    <p className="flex items-center text-xs text-gray-500">
                      <Building className="flex-shrink-0 mr-1.5 h-3.5 w-3.5 text-gray-400" />
                      {sahalar[ariza.saha] || 'Bilinmeyen Saha'}
                    </p>
                    <p className="mt-2 flex items-center text-xs text-gray-500 sm:mt-0 sm:ml-6">
                      <MapPin className="flex-shrink-0 mr-1.5 h-3.5 w-3.5 text-gray-400" />
                      {ariza.konum}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        {arizalar.length > 0 && kullanici?.rol !== 'musteri' && (
          <div className="mt-4 text-center">
            <button
              onClick={() => navigate('/arizalar')}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Yeni Arıza Kaydı
            </button>
          </div>
        )}
      </Card>

      {/* Çevre Etkisi */}
      {istatistikler.toplamCO2Tasarrufu > 0 && (
        <Card className="bg-gradient-to-r from-emerald-50 to-emerald-100 border-none shadow-md">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center mb-4 md:mb-0">
              <div className="p-3 bg-emerald-100 rounded-full mr-4">
                <Leaf className="h-8 w-8 text-emerald-600" />
              </div>
              <div>
                <Text className="text-sm text-emerald-700">Çevresel Etki</Text>
                <div className="flex items-center">
                  <span className="text-xl font-bold text-emerald-800">
                    {istatistikler.toplamCO2Tasarrufu.toLocaleString('tr-TR', {maximumFractionDigits: 0})} kg
                  </span>
                  <span className="ml-2 text-sm text-emerald-600">
                    CO₂ tasarrufu
                  </span>
                </div>
              </div>
            </div>
            <div className="text-sm text-emerald-700">
              Bu, yaklaşık {Math.round(istatistikler.toplamCO2Tasarrufu / 21)} ağacın yıllık CO₂ emilimine eşdeğerdir.
            </div>
          </div>
        </Card>
      )}

      {seciliAriza && (
        <ArizaDetayModal
          ariza={seciliAriza}
          sahaAdi={sahalar[seciliAriza.saha] || 'Bilinmeyen Saha'}
          onClose={() => setSeciliAriza(null)}
        />
      )}
    </div>
  );
}