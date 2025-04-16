import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, where, doc, deleteDoc, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { YapilanIsForm } from '../components/YapilanIsForm';
import { IsRaporDetayModal } from '../components/IsRaporDetayModal';
import { SearchInput } from '../components/SearchInput';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Building, Calendar, Clock, ImageIcon, Plus, Trash2 } from 'lucide-react';
import { SilmeOnayModal } from '../components/SilmeOnayModal';
import { Card } from '@tremor/react';
import toast from 'react-hot-toast';
import type { IsRaporu } from '../types';

interface Props {
  onClose: () => void;
  sahalar: Array<{
    id: string;
    ad: string;
  }>;
}

export const YapilanIsler: React.FC = () => {
  const { kullanici } = useAuth();
  const [raporlar, setRaporlar] = useState<IsRaporu[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [formAcik, setFormAcik] = useState(false);
  const [aramaMetni, setAramaMetni] = useState('');
  const [seciliRapor, setSeciliRapor] = useState<IsRaporu | null>(null);
  const [sahalar, setSahalar] = useState<Array<{id: string, ad: string}>>([]);
  const [secilenAy, setSecilenAy] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [secilenSaha, setSecilenSaha] = useState<string>('');
  const [silinecekRapor, setSilinecekRapor] = useState<string | null>(null);
  const [istatistikler, setIstatistikler] = useState({
    aylikDagilim: [] as { date: string; yapilan: number }[]
  });

  // Yıl seçeneklerini oluştur (son 5 yıl)
  const yilSecenekleri = Array.from({ length: 5 }, (_, i) => {
    const yil = new Date().getFullYear() - i;
    return format(new Date(yil, 0), 'yyyy');
  });

  const canAdd = kullanici?.rol && ['yonetici', 'tekniker', 'muhendis'].includes(kullanici.rol);
  const canDelete = kullanici?.rol === 'yonetici' || 
    (kullanici?.rol && ['tekniker', 'muhendis'].includes(kullanici.rol));

  useEffect(() => {
    const sahalariGetir = async () => {
      if (!kullanici) return;

      try {
        const snapshot = await getDocs(collection(db, 'sahalar'));
        const tumSahalar = snapshot.docs.map(doc => ({
          id: doc.id,
          ad: doc.data().ad
        }));

        if (kullanici.rol === 'musteri' && kullanici.sahalar) {
          setSahalar(tumSahalar.filter(saha => kullanici.sahalar?.includes(saha.id)));
        } else {
          setSahalar(tumSahalar);
        }
      } catch (error) {
        console.error('Sahalar getirilemedi:', error);
        toast.error('Sahalar yüklenirken bir hata oluştu');
      }
    };

    sahalariGetir();
  }, [kullanici]);

  useEffect(() => {
    const raporlariGetir = async () => {
      if (!kullanici) return;

      try {
        setYukleniyor(true);

        const raporQuery = query(
          collection(db, 'isRaporlari'),
          orderBy('tarih', 'desc')
        );

        const snapshot = await getDocs(raporQuery);
        const tumRaporlar = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as IsRaporu[];

        const ayBaslangic = startOfMonth(parseISO(secilenAy + '-01'));
        const ayBitis = endOfMonth(parseISO(secilenAy + '-01'));

        let filtrelenmisRaporlar = tumRaporlar.filter(rapor => {
          const raporTarihi = rapor.tarih.toDate();
          return raporTarihi >= ayBaslangic && raporTarihi <= ayBitis;
        });

        if (secilenSaha) {
          filtrelenmisRaporlar = filtrelenmisRaporlar.filter(rapor => 
            rapor.saha === secilenSaha
          );
        }

        if (kullanici.rol === 'musteri' && kullanici.sahalar) {
          filtrelenmisRaporlar = filtrelenmisRaporlar.filter(rapor => 
            kullanici.sahalar?.includes(rapor.saha)
          );
        }

        setRaporlar(filtrelenmisRaporlar);
        setIstatistikler({
          aylikDagilim: Array.from({ length: 30 }, (_, i) => {
            const tarih = new Date(ayBaslangic);
            tarih.setDate(tarih.getDate() + i);
            return {
              date: format(tarih, 'dd MMM'),
              yapilan: filtrelenmisRaporlar.filter(r => 
                format(r.tarih.toDate(), 'yyyy-MM-dd') === format(tarih, 'yyyy-MM-dd')
              ).length
            };
          })
        });
      } catch (error) {
        console.error('Veri getirme hatası:', error);
        toast.error('Veriler yüklenirken bir hata oluştu');
      } finally {
        setYukleniyor(false);
      }
    };

    raporlariGetir();
  }, [kullanici, secilenAy, secilenSaha]);

  const handleRaporSil = async (id: string) => {
    if (!canDelete) {
      toast.error('Bu işlem için yetkiniz yok');
      return;
    }

    try {
      setYukleniyor(true);
      await deleteDoc(doc(db, 'isRaporlari', id));
      toast.success('Rapor başarıyla silindi');
      setSilinecekRapor(null);
      setRaporlar(prev => prev.filter(rapor => rapor.id !== id));
    } catch (error) {
      console.error('Rapor silme hatası:', error);
      toast.error('Rapor silinirken bir hata oluştu');
    } finally {
      setYukleniyor(false);
    }
  };

  const filtrelenmisRaporlar = raporlar.filter(rapor => {
    if (!aramaMetni) return true;
    const aramaMetniKucuk = aramaMetni.toLowerCase();
    return (
      rapor.baslik.toLowerCase().includes(aramaMetniKucuk) ||
      rapor.yapilanIsler.toLowerCase().includes(aramaMetniKucuk)
    );
  });

  const getSahaAdi = (sahaId: string) => {
    return sahalar.find(s => s.id === sahaId)?.ad || 'Bilinmeyen Saha';
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
          <h1 className="text-2xl font-bold text-gray-900">Yapılan İşler</h1>
          <p className="mt-1 text-sm text-gray-500">
            Toplam {filtrelenmisRaporlar.length} rapor
          </p>
        </div>
        {canAdd && (
          <button
            onClick={() => setFormAcik(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700"
          >
            <Plus className="h-5 w-5 mr-2" />
            Yeni İş Raporu
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <SearchInput
            value={aramaMetni}
            onChange={setAramaMetni}
            placeholder="Rapor ara..."
          />
        </div>
        <div className="flex gap-4">
          <select
            value={secilenSaha}
            onChange={(e) => setSecilenSaha(e.target.value)}
            className="rounded-lg border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
          >
            <option value="">Tüm Sahalar</option>
            {sahalar.map(saha => (
              <option key={saha.id} value={saha.id}>{saha.ad}</option>
            ))}
          </select>
          <input
            type="month"
            value={secilenAy}
            onChange={(e) => setSecilenAy(e.target.value)}
            className="rounded-lg border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
            min={`${yilSecenekleri[yilSecenekleri.length - 1]}-01`}
            max={`${yilSecenekleri[0]}-12`}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filtrelenmisRaporlar.map((rapor) => (
          <div
            key={rapor.id}
            className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-200 cursor-pointer overflow-hidden hover:scale-[1.02] relative"
          >
            <div 
              className="flex h-32"
              onClick={() => setSeciliRapor(rapor)}
            >
              <div className="w-1/4 relative bg-gray-100">
                {rapor.fotograflar?.[0] ? (
                  <img
                    src={rapor.fotograflar[0]}
                    alt={rapor.baslik}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/placeholder-image.png';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-gray-400" />
                  </div>
                )}
                {rapor.fotograflar && rapor.fotograflar.length > 1 && (
                  <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-1.5 py-0.5 rounded-full">
                    +{rapor.fotograflar.length - 1}
                  </div>
                )}
              </div>

              <div className="w-3/4 p-4 flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-1">
                    {rapor.baslik}
                  </h3>
                  
                  <div className="space-y-1">
                    <div className="flex items-center text-sm text-gray-600">
                      <Building className="h-4 w-4 mr-2 text-gray-400" />
                      <span className="truncate">{getSahaAdi(rapor.saha)}</span>
                    </div>
                    
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                      <span>{format(rapor.tarih.toDate(), 'dd MMMM yyyy', { locale: tr })}</span>
                    </div>
                    
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="h-4 w-4 mr-2 text-gray-400" />
                      <span>{rapor.baslangicSaati} - {rapor.bitisSaati}</span>
                    </div>

                    <p className="text-sm text-gray-500 line-clamp-1 mt-1">
                      {rapor.yapilanIsler}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Silme Butonu */}
            {canDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSilinecekRapor(rapor.id);
                }}
                className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-lg hover:bg-red-50 transition-colors duration-200"
              >
                <Trash2 className="h-4 w-4 text-red-600" />
              </button>
            )}
          </div>
        ))}
      </div>

      {formAcik && (
        <YapilanIsForm
          onClose={() => setFormAcik(false)}
          sahalar={sahalar}
        />
      )}

      {seciliRapor && (
        <IsRaporDetayModal
          rapor={seciliRapor}
          sahaAdi={getSahaAdi(seciliRapor.saha)}
          onClose={() => setSeciliRapor(null)}
        />
      )}

      {silinecekRapor && (
        <SilmeOnayModal
          onConfirm={() => handleRaporSil(silinecekRapor)}
          onCancel={() => setSilinecekRapor(null)}
          mesaj="Bu raporu silmek istediğinizden emin misiniz? Bu işlem geri alınamaz."
        />
      )}
    </div>
  );
};