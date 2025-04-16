import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, where, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { format, subDays, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { 
  Sun, 
  Battery,
  Thermometer,
  CloudSun,
  DollarSign,
  Leaf,
  TrendingUp,
  BarChart2,
  Clock,
  Zap,
  Calendar,
  Download
} from 'lucide-react';
import { Card, Title, BarChart, DonutChart, ProgressBar, Flex, Text, LineChart, AreaChart, Grid, Col } from '@tremor/react';
import { LoadingSpinner } from './LoadingSpinner';
import toast from 'react-hot-toast';
import type { GesVerisi, GesDetay } from '../types';

interface GesDashboardProps {
  santralId: string;
  dateRange: 'week' | 'month' | 'year';
  secilenAy?: string;
}

export const GesDashboard: React.FC<GesDashboardProps> = ({ 
  santralId, 
  dateRange, 
  secilenAy = format(new Date(), 'yyyy-MM')
}) => {
  const { kullanici } = useAuth();
  const [uretimVerileri, setUretimVerileri] = useState<GesVerisi[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [santralDetay, setSantralDetay] = useState<GesDetay | null>(null);

  // İstatistikler
  const [istatistikler, setIstatistikler] = useState({
    toplamUretim: 0,
    ortalamaGunlukUretim: 0,
    toplamGelir: 0,
    toplamCO2Tasarrufu: 0,
    performansOrani: 0,
    hedefGerceklesme: 0
  });

  useEffect(() => {
    const verileriGetir = async () => {
      if (!santralId) return;

      try {
        setYukleniyor(true);
        
        // Santral detaylarını getir
        const santralDoc = await getDocs(query(
          collection(db, 'santraller'),
          where('__name__', '==', santralId)
        ));
        
        if (!santralDoc.empty) {
          setSantralDetay({
            id: santralDoc.docs[0].id,
            ...santralDoc.docs[0].data()
          } as GesDetay);
        }
        
        // Üretim verilerini getir
        const verilerQuery = query(
          collection(db, 'uretimVerileri'),
          where('santralId', '==', santralId),
          orderBy('tarih', 'desc')
        );

        const snapshot = await getDocs(verilerQuery);
        const veriler = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as GesVerisi[];

        // Tarih filtreleme
        let filtrelenmisVeriler = veriler;
        
        if (dateRange === 'month') {
          const ayBaslangic = startOfMonth(parseISO(secilenAy + '-01'));
          const ayBitis = endOfMonth(parseISO(secilenAy + '-01'));
          
          filtrelenmisVeriler = veriler.filter(veri => {
            const veriTarihi = veri.tarih.toDate();
            return veriTarihi >= ayBaslangic && veriTarihi <= ayBitis;
          });
        } else if (dateRange === 'week') {
          const birHaftaOnce = subDays(new Date(), 7);
          filtrelenmisVeriler = veriler.filter(veri => {
            return veri.tarih.toDate() >= birHaftaOnce;
          });
        }

        setUretimVerileri(filtrelenmisVeriler);
        
        // İstatistikleri hesapla
        if (filtrelenmisVeriler.length > 0 && santralDoc.docs[0]) {
          const santral = santralDoc.docs[0].data() as GesDetay;
          
          const toplamUretim = filtrelenmisVeriler.reduce((acc, veri) => acc + veri.gunlukUretim, 0);
          const toplamGelir = filtrelenmisVeriler.reduce((acc, veri) => acc + (veri.gelir || 0), 0);
          const toplamCO2 = filtrelenmisVeriler.reduce((acc, veri) => acc + (veri.tasarrufEdilenCO2 || 0), 0);
          
          // Aylık hedef üretim (yıllık hedefin 1/12'si)
          const aylikHedef = (santral.yillikHedefUretim || 0) / 12;
          
          // Hedef gerçekleşme oranı
          const hedefGerceklesme = aylikHedef > 0 ? (toplamUretim / aylikHedef) * 100 : 0;
          
          // Performans oranı (kurulu güce göre)
          const gunSayisi = filtrelenmisVeriler.length;
          const teorikUretim = santral.kapasite * 5 * gunSayisi; // 5 saat/gün ortalama verimli çalışma
          const performansOrani = teorikUretim > 0 ? (toplamUretim / teorikUretim) * 100 : 0;
          
          setIstatistikler({
            toplamUretim,
            ortalamaGunlukUretim: gunSayisi > 0 ? toplamUretim / gunSayisi : 0,
            toplamGelir,
            toplamCO2Tasarrufu: toplamCO2,
            performansOrani,
            hedefGerceklesme
          });
        }
      } catch (error) {
        console.error('Üretim verileri getirilemedi:', error);
        toast.error('Veriler yüklenirken bir hata oluştu');
      } finally {
        setYukleniyor(false);
      }
    };

    verileriGetir();
  }, [santralId, dateRange, secilenAy]);

  const handleRaporIndir = () => {
    try {
      const headers = ['Tarih', 'Günlük Üretim (kWh)', 'Gelir (₺)', 'CO2 Tasarrufu (kg)', 'Performans (%)'];
      const rows = uretimVerileri.map(veri => [
        format(veri.tarih.toDate(), 'dd.MM.yyyy'),
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
      link.download = `uretim-raporu-${santralId}-${secilenAy}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);

      toast.success('Rapor başarıyla indirildi');
    } catch (error) {
      console.error('Rapor indirme hatası:', error);
      toast.error('Rapor indirilirken bir hata oluştu');
    }
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
      {/* Santral Bilgileri */}
      {santralDetay && (
        <Card className="bg-gradient-to-r from-yellow-50 to-orange-50">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="flex items-center mb-4 md:mb-0">
              <div className="p-3 bg-yellow-100 rounded-full mr-4">
                <Sun className="h-8 w-8 text-yellow-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{santralDetay.ad}</h2>
                <p className="text-sm text-gray-600">{santralDetay.konum.adres}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-xs text-gray-500">Kurulu Güç</p>
                <p className="text-lg font-semibold text-gray-900">{santralDetay.kapasite} kWp</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500">Panel Sayısı</p>
                <p className="text-lg font-semibold text-gray-900">{santralDetay.panelSayisi}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500">İnvertör Sayısı</p>
                <p className="text-lg font-semibold text-gray-900">{santralDetay.inverterSayisi}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500">Sistem Verimi</p>
                <p className="text-lg font-semibold text-gray-900">%{santralDetay.teknikOzellikler.sistemVerimi}</p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Ana İstatistikler */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card decoration="top" decorationColor="yellow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Toplam Üretim</p>
              <h3 className="text-xl font-bold text-gray-900">
                {istatistikler.toplamUretim.toFixed(1)} kWh
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Ortalama: {istatistikler.ortalamaGunlukUretim.toFixed(1)} kWh/gün
              </p>
            </div>
            <div className="rounded-full p-3 bg-green-100">
              <Battery className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card decoration="top" decorationColor="green">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Toplam Gelir</p>
              <h3 className="text-xl font-bold text-gray-900">
                {istatistikler.toplamGelir.toFixed(2)} ₺
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Birim Fiyat: 2.5 ₺/kWh
              </p>
            </div>
            <div className="rounded-full p-3 bg-yellow-100">
              <DollarSign className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </Card>

        <Card decoration="top" decorationColor="blue">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">CO2 Tasarrufu</p>
              <h3 className="text-xl font-bold text-gray-900">
                {istatistikler.toplamCO2Tasarrufu.toFixed(1)} kg
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                {(istatistikler.toplamCO2Tasarrufu / 1000).toFixed(2)} ton CO2
              </p>
            </div>
            <div className="rounded-full p-3 bg-green-100">
              <Leaf className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card decoration="top" decorationColor="orange">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Performans</p>
              <h3 className="text-xl font-bold text-gray-900">
                %{istatistikler.performansOrani.toFixed(1)}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Hedef Gerçekleşme: %{istatistikler.hedefGerceklesme.toFixed(1)}
              </p>
            </div>
            <div className="rounded-full p-3 bg-blue-100">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Grafikler */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Üretim Grafiği */}
        <Card>
          <Title>Günlük Üretim Grafiği</Title>
          <AreaChart
            className="mt-4 h-72"
            data={uretimVerileri.slice().reverse().map(veri => ({
              date: format(veri.tarih.toDate(), 'dd MMM', { locale: tr }),
              "Üretim": veri.gunlukUretim
            }))}
            index="date"
            categories={["Üretim"]}
            colors={["yellow"]}
            valueFormatter={(value) => `${value} kWh`}
          />
        </Card>

        {/* Gelir Grafiği */}
        <Card>
          <Title>Günlük Gelir Grafiği</Title>
          <AreaChart
            className="mt-4 h-72"
            data={uretimVerileri.slice().reverse().map(veri => ({
              date: format(veri.tarih.toDate(), 'dd MMM', { locale: tr }),
              "Gelir": veri.gelir || 0
            }))}
            index="date"
            categories={["Gelir"]}
            colors={["green"]}
            valueFormatter={(value) => `${value.toFixed(2)} ₺`}
          />
        </Card>
      </div>

      {/* Performans Göstergeleri */}
      <Card>
        <Title>Performans Göstergeleri</Title>
        <Grid numItemsMd={2} numItemsLg={3} className="mt-6 gap-6">
          <Col>
            <Text>Hedef Gerçekleşme</Text>
            <div className="mt-2">
              <Flex>
                <Text>%{istatistikler.hedefGerceklesme.toFixed(1)}</Text>
                <Text>{dateRange === 'month' ? 'Aylık' : dateRange === 'week' ? 'Haftalık' : 'Yıllık'} Hedef</Text>
              </Flex>
              <ProgressBar value={Math.min(istatistikler.hedefGerceklesme, 100)} color="yellow" className="mt-2" />
            </div>
          </Col>
          <Col>
            <Text>Sistem Verimi</Text>
            <div className="mt-2">
              <Flex>
                <Text>%{istatistikler.performansOrani.toFixed(1)}</Text>
                <Text>Teorik Maksimuma Göre</Text>
              </Flex>
              <ProgressBar value={Math.min(istatistikler.performansOrani, 100)} color="blue" className="mt-2" />
            </div>
          </Col>
          <Col>
            <Text>Çevresel Etki</Text>
            <div className="mt-2">
              <Flex>
                <Text>{istatistikler.toplamCO2Tasarrufu.toFixed(1)} kg</Text>
                <Text>CO2 Tasarrufu</Text>
              </Flex>
              <ProgressBar value={100} color="green" className="mt-2" />
            </div>
          </Col>
        </Grid>
      </Card>
    </div>
  );
};