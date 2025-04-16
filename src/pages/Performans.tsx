import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Card, Title, BarChart, DonutChart, ProgressBar, Flex, Text } from '@tremor/react';
import toast from 'react-hot-toast';

interface Calisan {
  id: string;
  ad: string;
  rol: string;
  olusturmaTarihi: Timestamp;
}

export const Performans = () => {
  const { kullanici } = useAuth();
  const [arizalar, setArizalar] = useState<any[]>([]);
  const [calisanlar, setCalisanlar] = useState<Calisan[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);

  useEffect(() => {
    const veriGetir = async () => {
      if (!kullanici) return;

      try {
        // Çalışanları getir
        const calisanQuery = query(
          collection(db, 'kullanicilar'),
          where('rol', 'in', ['tekniker', 'muhendis', 'yonetici'])
        );
        const calisanSnapshot = await getDocs(calisanQuery);
        const calisanListesi = calisanSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Calisan[];
        setCalisanlar(calisanListesi);

        // Arızaları getir
        const arizaQuery = query(
          collection(db, 'arizalar'),
          orderBy('olusturmaTarihi', 'desc')
        );
        const arizaSnapshot = await getDocs(arizaQuery);
        const arizaListesi = arizaSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setArizalar(arizaListesi);
      } catch (error) {
        console.error('Veri getirme hatası:', error);
        toast.error('Veriler yüklenirken bir hata oluştu');
      } finally {
        setYukleniyor(false);
      }
    };

    veriGetir();
  }, [kullanici]);

  // Çalışan bazlı performans metrikleri
  const calisanPerformansi = calisanlar
    .filter(calisan => calisan.rol !== 'yonetici') // Yöneticileri performans hesaplamalarından çıkar
    .map(calisan => {
      const atananArizalar = arizalar.filter(a => a.atananKisi === calisan.id);
      const cozulenArizalar = atananArizalar.filter(a => a.durum === 'cozuldu');
      const toplamSure = cozulenArizalar.reduce((acc, ariza) => {
        if (ariza.cozum) {
          const baslangic = ariza.olusturmaTarihi.toDate();
          const bitis = ariza.cozum.tamamlanmaTarihi.toDate();
          return acc + (bitis.getTime() - baslangic.getTime()) / (1000 * 60 * 60);
        }
        return acc;
      }, 0);

      return {
        id: calisan.id,
        ad: calisan.ad,
        rol: calisan.rol,
        atananArizaSayisi: atananArizalar.length,
        cozulenArizaSayisi: cozulenArizalar.length,
        cozumOrani: atananArizalar.length > 0 ? (cozulenArizalar.length / atananArizalar.length) * 100 : 0,
        ortalamaYanitSuresi: cozulenArizalar.length > 0 ? toplamSure / cozulenArizalar.length : 0
      };
    });

  // Ortalama performans metriklerini sadece tekniker ve mühendisler için hesapla
  const performansMetrikleri = {
    ortCozumOrani: calisanPerformansi.length > 0 
      ? calisanPerformansi.reduce((acc, t) => acc + t.cozumOrani, 0) / calisanPerformansi.length 
      : 0,
    ortYanitSuresi: calisanPerformansi.length > 0
      ? calisanPerformansi.reduce((acc, t) => acc + t.ortalamaYanitSuresi, 0) / calisanPerformansi.length
      : 0
  };

  // Detaylı tablo için tüm çalışanları göster ama yöneticileri ayrı bir bölümde listele
  const teknisyenlerVeMuhendisler = calisanlar.filter(c => c.rol !== 'yonetici');
  const yoneticiler = calisanlar.filter(c => c.rol === 'yonetici');

  if (yukleniyor) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Performans Analizi</h1>
        <p className="mt-1 text-sm text-gray-500">
          Ekip performans metrikleri ve çözüm istatistikleri
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <Title>Çözüm Oranları</Title>
          <DonutChart
            className="mt-6"
            data={calisanPerformansi}
            category="cozumOrani"
            index="ad"
            valueFormatter={(value) => `%${value.toFixed(1)}`}
            colors={["blue", "cyan", "indigo"]}
          />
        </Card>

        <Card>
          <Title>Ortalama Yanıt Süreleri</Title>
          <BarChart
            className="mt-6"
            data={calisanPerformansi}
            index="ad"
            categories={["ortalamaYanitSuresi"]}
            colors={["blue"]}
            valueFormatter={(value) => `${value.toFixed(1)} saat`}
          />
        </Card>
      </div>

      <Card>
        <Title>Detaylı Ekip Performansı</Title>
        <div className="mt-6">
          {/* Tekniker ve Mühendisler */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Teknik Ekip</h3>
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Çalışan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Atanan Arıza
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Çözülen Arıza
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Çözüm Oranı
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ort. Yanıt Süresi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {calisanPerformansi.map((calisan) => (
                  <tr key={calisan.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{calisan.ad}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 capitalize">{calisan.rol}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{calisan.atananArizaSayisi}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{calisan.cozulenArizaSayisi}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">%{calisan.cozumOrani.toFixed(1)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{calisan.ortalamaYanitSuresi.toFixed(1)} saat</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Yöneticiler */}
          {yoneticiler.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Yönetim Ekibi</h3>
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Yönetici
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rol
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Görev Başlangıcı
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {yoneticiler.map((yonetici) => (
                    <tr key={yonetici.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{yonetici.ad}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 capitalize">{yonetici.rol}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {yonetici.olusturmaTarihi ? 
                            format(yonetici.olusturmaTarihi.toDate(), 'dd MMMM yyyy', { locale: tr }) :
                            'Belirtilmemiş'
                          }
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};