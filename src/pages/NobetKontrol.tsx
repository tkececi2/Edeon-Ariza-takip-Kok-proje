import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, addDoc, where, Timestamp } from 'firebase/firestore';
import { db, storage } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { 
  Shield, 
  Camera, 
  CheckCircle, 
  AlertTriangle,
  MapPin,
  Clock,
  Calendar,
  Building
} from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { FileUploadZone } from '../components/FileUploadZone';
import { Card, Title, Text } from '@tremor/react';
import toast from 'react-hot-toast';

const KONTROL_SAATLERI = {
  gunduz: ['08:00', '12:00', '18:00'],
  gece: ['00:00', '03:00', '07:00']
};

interface Kontrol {
  id: string;
  bekciId: string;
  bekciAdi: string;
  sahaId: string;
  sahaAdi: string;
  tarih: Timestamp;
  saat: string;
  durum: 'normal' | 'anormal';
  aciklama: string;
  fotograflar: string[];
  konum: {
    lat: number;
    lng: number;
  };
}

export const NobetKontrol: React.FC = () => {
  const { kullanici } = useAuth();
  const [yukleniyor, setYukleniyor] = useState(true);
  const [kontrolListesi, setKontrolListesi] = useState<Kontrol[]>([]);
  const [sahalar, setSahalar] = useState<Record<string, string>>({});
  const [secilenSaha, setSecilenSaha] = useState('');
  const [fotograflar, setFotograflar] = useState<File[]>([]);
  const [form, setForm] = useState({
    durum: 'normal' as 'normal' | 'anormal',
    aciklama: '',
    konum: null as GeolocationPosition | null
  });

  // Konum al
  const konumAl = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setForm(prev => ({ ...prev, konum: position }));
          toast.success('Konum alındı');
        },
        (error) => {
          console.error('Konum alınamadı:', error);
          toast.error('Konum alınamadı');
        }
      );
    } else {
      toast.error('Tarayıcınız konum özelliğini desteklemiyor');
    }
  };

  // Şu anki kontrol saatini kontrol et
  const getAktifKontrolSaati = () => {
    const now = new Date();
    const saat = format(now, 'HH:mm');
    
    const tumSaatler = [...KONTROL_SAATLERI.gunduz, ...KONTROL_SAATLERI.gece];
    return tumSaatler.find(kontrolSaati => {
      const [kontrolSaat, kontrolDakika] = kontrolSaati.split(':').map(Number);
      const [suankiSaat, suankiDakika] = saat.split(':').map(Number);
      
      // 30 dakikalık kontrol penceresi
      const kontrolZamani = kontrolSaat * 60 + kontrolDakika;
      const suankiZaman = suankiSaat * 60 + suankiDakika;
      
      return Math.abs(kontrolZamani - suankiZaman) <= 30;
    });
  };

  const handleKontrolKaydet = async () => {
    if (!kullanici || !secilenSaha || !form.konum) {
      toast.error('Lütfen tüm alanları doldurun');
      return;
    }

    const aktifSaat = getAktifKontrolSaati();
    if (!aktifSaat) {
      toast.error('Şu an kontrol saati değil');
      return;
    }

    setYukleniyor(true);
    try {
      // Fotoğrafları yükle
      const fotografURLleri = await Promise.all(
        fotograflar.map(async (foto) => {
          const ref = ref(storage, `kontroller/${Date.now()}_${foto.name}`);
          await uploadBytes(ref, foto);
          return await getDownloadURL(ref);
        })
      );

      // Kontrolü kaydet
      await addDoc(collection(db, 'kontroller'), {
        bekciId: kullanici.id,
        bekciAdi: kullanici.ad,
        sahaId: secilenSaha,
        sahaAdi: sahalar[secilenSaha],
        tarih: Timestamp.now(),
        saat: aktifSaat,
        durum: form.durum,
        aciklama: form.aciklama,
        fotograflar: fotografURLleri,
        konum: {
          lat: form.konum.coords.latitude,
          lng: form.konum.coords.longitude
        }
      });

      toast.success('Kontrol kaydedildi');
      setFotograflar([]);
      setForm({
        durum: 'normal',
        aciklama: '',
        konum: null
      });
    } catch (error) {
      console.error('Kontrol kaydetme hatası:', error);
      toast.error('Kontrol kaydedilirken bir hata oluştu');
    } finally {
      setYukleniyor(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nöbet Kontrolleri</h1>
          <p className="mt-1 text-sm text-gray-500">
            Günlük saha kontrol kayıtları
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kontrol Formu */}
        <Card className="lg:col-span-2">
          <Title>Yeni Kontrol Kaydı</Title>
          <div className="mt-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Saha Seçin
              </label>
              <select
                value={secilenSaha}
                onChange={(e) => setSecilenSaha(e.target.value)}
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              >
                <option value="">Saha Seçin</option>
                {Object.entries(sahalar).map(([id, ad]) => (
                  <option key={id} value={id}>{ad}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Durum
              </label>
              <select
                value={form.durum}
                onChange={(e) => setForm(prev => ({ ...prev, durum: e.target.value as 'normal' | 'anormal' }))}
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              >
                <option value="normal">Normal</option>
                <option value="anormal">Anormal Durum</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Açıklama
              </label>
              <textarea
                value={form.aciklama}
                onChange={(e) => setForm(prev => ({ ...prev, aciklama: e.target.value }))}
                rows={3}
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                placeholder="Kontrol sırasında gözlemlediğiniz durumları yazın..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fotoğraflar
              </label>
              <FileUploadZone
                onFileSelect={setFotograflar}
                selectedFiles={fotograflar}
                onFileRemove={(index) => {
                  setFotograflar(prev => prev.filter((_, i) => i !== index));
                }}
                maxFiles={5}
              />
            </div>

            <div>
              <button
                type="button"
                onClick={konumAl}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <MapPin className="h-5 w-5 mr-2 text-gray-400" />
                Konum Al
              </button>
              {form.konum && (
                <p className="mt-2 text-sm text-green-600">
                  Konum başarıyla alındı
                </p>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleKontrolKaydet}
                disabled={yukleniyor || !secilenSaha || !form.konum}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
              >
                {yukleniyor ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span className="ml-2">Kaydediliyor...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Kontrolü Kaydet
                  </>
                )}
              </button>
            </div>
          </div>
        </Card>

        {/* Kontrol Saatleri */}
        <Card>
          <Title>Kontrol Saatleri</Title>
          <div className="mt-6 space-y-6">
            <div>
              <Text className="font-medium">Gündüz Kontrolleri</Text>
              <div className="mt-2 space-y-2">
                {KONTROL_SAATLERI.gunduz.map((saat) => (
                  <div key={saat} className="flex items-center text-sm">
                    <Clock className="h-4 w-4 mr-2 text-primary-500" />
                    <span>{saat}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Text className="font-medium">Gece Kontrolleri</Text>
              <div className="mt-2 space-y-2">
                {KONTROL_SAATLERI.gece.map((saat) => (
                  <div key={saat} className="flex items-center text-sm">
                    <Clock className="h-4 w-4 mr-2 text-primary-500" />
                    <span>{saat}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};