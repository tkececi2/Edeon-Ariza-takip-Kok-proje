import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, where, doc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { 
  Plus, 
  LayoutGrid, 
  List,
  Building,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Zap
} from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { InvertorKontrolForm } from '../components/InvertorKontrolForm';
import { InvertorKontrolDetay } from '../components/InvertorKontrolDetay';
import { InvertorKontrolListesi } from '../components/InvertorKontrolListesi';
import { StatsCard } from '../components/StatsCard';
import { SilmeOnayModal } from '../components/SilmeOnayModal';
import type { InvertorKontrol } from '../types';
import toast from 'react-hot-toast';

export const InvertorKontrol: React.FC = () => {
  const { kullanici } = useAuth();
  const [kontroller, setKontroller] = useState<InvertorKontrol[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [formAcik, setFormAcik] = useState(false);
  const [secilenSaha, setSecilenSaha] = useState<string>('');
  const [secilenAy, setSecilenAy] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [gorunumTipi, setGorunumTipi] = useState<'kart' | 'liste'>('kart');
  const [seciliKontrol, setSeciliKontrol] = useState<InvertorKontrol | null>(null);
  const [silinecekKontrol, setSilinecekKontrol] = useState<string | null>(null);
  const [sahalar, setSahalar] = useState<Array<{id: string, ad: string}>>([]);

  const [istatistikler, setIstatistikler] = useState({
    toplamKontrol: 0,
    calisanDize: 0,
    arizaliDize: 0,
    kontrolOrani: 0
  });

  const canAdd = kullanici?.rol && ['yonetici', 'tekniker', 'muhendis'].includes(kullanici.rol);
  const canDelete = kullanici?.rol === 'yonetici' || 
    (kullanici?.rol && ['tekniker', 'muhendis'].includes(kullanici.rol));

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

  useEffect(() => {
    const kontrolleriGetir = async () => {
      if (!kullanici) return;

      try {
        setYukleniyor(true);

        const kontrolQuery = query(
          collection(db, 'invertorKontroller'),
          orderBy('tarih', 'desc')
        );

        const snapshot = await getDocs(kontrolQuery);
        let kontrolVerileri = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as InvertorKontrol[];

        const ayBaslangic = startOfMonth(parseISO(secilenAy + '-01'));
        const ayBitis = endOfMonth(parseISO(secilenAy + '-01'));

        kontrolVerileri = kontrolVerileri.filter(kontrol => {
          const kontrolTarihi = kontrol.tarih.toDate();
          return kontrolTarihi >= ayBaslangic && kontrolTarihi <= ayBitis;
        });

        if (kullanici.rol === 'musteri' && kullanici.sahalar) {
          if (secilenSaha) {
            if (!kullanici.sahalar.includes(secilenSaha)) {
              setKontroller([]);
              setYukleniyor(false);
              return;
            }
            kontrolVerileri = kontrolVerileri.filter(
              kontrol => kontrol.sahaId === secilenSaha
            );
          } else {
            kontrolVerileri = kontrolVerileri.filter(
              kontrol => kullanici.sahalar?.includes(kontrol.sahaId)
            );
          }
        } else if (secilenSaha) {
          kontrolVerileri = kontrolVerileri.filter(
            kontrol => kontrol.sahaId === secilenSaha
          );
        }

        setKontroller(kontrolVerileri);

        // İstatistikleri hesapla
        const toplamDize = kontrolVerileri.reduce((acc, kontrol) => 
          acc + kontrol.invertorler.length, 0);
        
        const calisanDize = kontrolVerileri.reduce((acc, kontrol) => 
          acc + kontrol.invertorler.filter(inv => inv.dizeCalisiyor).length, 0);

        setIstatistikler({
          toplamKontrol: kontrolVerileri.length,
          calisanDize,
          arizaliDize: toplamDize - calisanDize,
          kontrolOrani: toplamDize > 0 ? (calisanDize / toplamDize) * 100 : 0
        });

      } catch (error) {
        console.error('Kontroller getirilemedi:', error);
        toast.error('Kontroller yüklenirken bir hata oluştu');
      } finally {
        setYukleniyor(false);
      }
    };

    kontrolleriGetir();
  }, [kullanici, secilenSaha, secilenAy]);

  const handleKontrolSil = async (id: string) => {
    if (!canDelete) {
      toast.error('Bu işlem için yetkiniz yok');
      return;
    }

    try {
      setYukleniyor(true);
      await deleteDoc(doc(db, 'invertorKontroller', id));
      toast.success('Kontrol kaydı başarıyla silindi');
      setSilinecekKontrol(null);
      setKontroller(prev => prev.filter(kontrol => kontrol.id !== id));
    } catch (error) {
      console.error('Kontrol silme hatası:', error);
      toast.error('Kontrol silinirken bir hata oluştu');
    } finally {
      setYukleniyor(false);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">İnvertör Kontrolleri</h1>
          <p className="mt-1 text-sm text-gray-500">
            Toplam {kontroller.length} kontrol kaydı
          </p>
        </div>
        {canAdd && (
          <button
            onClick={() => setFormAcik(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700"
          >
            <Plus className="h-5 w-5 mr-2" />
            Yeni Kontrol Kaydı
          </button>
        )}
      </div>

      {/* İstatistikler */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Toplam Kontrol"
          value={istatistikler.toplamKontrol}
          icon={CheckCircle}
          color="blue"
        />
        <StatsCard
          title="Çalışan Dizeler"
          value={istatistikler.calisanDize}
          icon={Zap}
          color="green"
        />
        <StatsCard
          title="Arızalı Dizeler"
          value={istatistikler.arizaliDize}
          icon={AlertTriangle}
          color="red"
        />
        <StatsCard
          title="Çalışma Oranı"
          value={`%${istatistikler.kontrolOrani.toFixed(1)}`}
          icon={CheckCircle}
          color="yellow"
          progress={istatistikler.kontrolOrani}
        />
      </div>

      {/* Filtreler */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <select
            value={secilenSaha}
            onChange={(e) => setSecilenSaha(e.target.value)}
            className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
          >
            <option value="">Tüm Sahalar</option>
            {sahalar.map(saha => (
              <option key={saha.id} value={saha.id}>{saha.ad}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-4">
          <input
            type="month"
            value={secilenAy}
            onChange={(e) => setSecilenAy(e.target.value)}
            className="rounded-lg border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
          />

          <div className="flex rounded-lg shadow-sm">
            <button
              onClick={() => setGorunumTipi('kart')}
              className={`p-2 text-sm font-medium rounded-l-lg border ${
                gorunumTipi === 'kart'
                  ? 'bg-yellow-50 text-yellow-700 border-yellow-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <LayoutGrid className="h-5 w-5" />
            </button>
            <button
              onClick={() => setGorunumTipi('liste')}
              className={`p-2 text-sm font-medium rounded-r-lg border-t border-b border-r ${
                gorunumTipi === 'liste'
                  ? 'bg-yellow-50 text-yellow-700 border-yellow-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <List className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Kontrol Listesi */}
      {gorunumTipi === 'liste' ? (
        <InvertorKontrolListesi
          kontroller={kontroller}
          sahalar={sahalar}
          onKontrolTikla={(kontrol) => setSeciliKontrol(kontrol)}
          onKontrolSil={canDelete ? (id) => setSilinecekKontrol(id) : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {kontroller.map((kontrol) => {
            const calisanDizeSayisi = kontrol.invertorler.filter(inv => inv.dizeCalisiyor).length;
            const toplamDizeSayisi = kontrol.invertorler.length;
            const calismaOrani = (calisanDizeSayisi / toplamDizeSayisi) * 100;

            return (
              <div
                key={kontrol.id}
                onClick={() => setSeciliKontrol(kontrol)}
                className="bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-200 cursor-pointer p-6 relative"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center">
                    <Building className="h-5 w-5 text-gray-400 mr-2" />
                    <h3 className="text-lg font-medium text-gray-900">
                      {sahalar.find(s => s.id === kontrol.sahaId)?.ad}
                    </h3>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    calismaOrani >= 90 ? 'bg-green-100 text-green-800' :
                    calismaOrani >= 70 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    %{calismaOrani.toFixed(1)} Çalışma Oranı
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center text-sm text-gray-500">
                    <Calendar className="h-4 w-4 mr-2" />
                    {format(kontrol.tarih.toDate(), 'dd MMMM yyyy HH:mm', { locale: tr })}
                  </div>

                  <div className="text-sm text-gray-500">
                    <span className="font-medium">İnvertörler:</span>{' '}
                    {kontrol.invertorler.length} adet
                  </div>

                  <div className="text-sm text-gray-500">
                    <span className="font-medium">Çalışan Dizeler:</span>{' '}
                    {calisanDizeSayisi} / {toplamDizeSayisi}
                  </div>

                  {kontrol.aciklama && (
                    <p className="text-sm text-gray-600 line-clamp-2">{kontrol.aciklama}</p>
                  )}
                </div>

                {/* Silme Butonu */}
                {canDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSilinecekKontrol(kontrol.id);
                    }}
                    className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-lg hover:bg-red-50 transition-colors duration-200"
                  >
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {formAcik && (
        <InvertorKontrolForm
          onClose={() => setFormAcik(false)}
          sahalar={sahalar}
        />
      )}

      {seciliKontrol && (
        <InvertorKontrolDetay
          kontrol={seciliKontrol}
          sahaAdi={sahalar.find(s => s.id === seciliKontrol.sahaId)?.ad || 'Bilinmeyen Saha'}
          onClose={() => setSeciliKontrol(null)}
        />
      )}

      {silinecekKontrol && (
        <SilmeOnayModal
          onConfirm={() => handleKontrolSil(silinecekKontrol)}
          onCancel={() => setSilinecekKontrol(null)}
          mesaj="Bu kontrol kaydını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz."
        />
      )}
    </div>
  );
};