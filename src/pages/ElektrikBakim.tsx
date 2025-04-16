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
  Search,
  Zap
} from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ElektrikBakimForm } from '../components/ElektrikBakimForm';
import { ElektrikBakimKart } from '../components/ElektrikBakimKart';
import { ElektrikBakimListesi } from '../components/ElektrikBakimListesi';
import { ElektrikBakimDetay } from '../components/ElektrikBakimDetay';
import { StatsCard } from '../components/StatsCard';
import { SearchInput } from '../components/SearchInput';
import { SilmeOnayModal } from '../components/SilmeOnayModal';
import type { ElektrikBakim } from '../types';
import toast from 'react-hot-toast';

export const ElektrikBakim: React.FC = () => {
  const { kullanici } = useAuth();
  const [bakimlar, setBakimlar] = useState<ElektrikBakim[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [formAcik, setFormAcik] = useState(false);
  const [secilenSaha, setSecilenSaha] = useState<string>('');
  const [secilenAy, setSecilenAy] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [gorunumTipi, setGorunumTipi] = useState<'kart' | 'liste'>('kart');
  const [seciliBakim, setSeciliBakim] = useState<ElektrikBakim | null>(null);
  const [silinecekBakim, setSilinecekBakim] = useState<string | null>(null);
  const [sahalar, setSahalar] = useState<Array<{id: string, ad: string}>>([]);
  const [aramaMetni, setAramaMetni] = useState('');

  const [istatistikler, setIstatistikler] = useState({
    toplamBakim: 0,
    sorunluBakim: 0,
    sorunsuzBakim: 0,
    kontrolOrani: 0
  });

  // Yetki kontrolleri
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
    const bakimlariGetir = async () => {
      if (!kullanici) return;

      try {
        setYukleniyor(true);

        const bakimQuery = query(
          collection(db, 'elektrikBakimlar'),
          orderBy('tarih', 'desc')
        );

        const snapshot = await getDocs(bakimQuery);
        let bakimVerileri = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as ElektrikBakim[];

        const ayBaslangic = startOfMonth(parseISO(secilenAy + '-01'));
        const ayBitis = endOfMonth(parseISO(secilenAy + '-01'));

        // Tarih filtresi uygula
        bakimVerileri = bakimVerileri.filter(bakim => {
          const bakimTarihi = bakim.tarih.toDate();
          return bakimTarihi >= ayBaslangic && bakimTarihi <= ayBitis;
        });

        // Müşteri ise sadece kendi sahalarına ait bakımları göster
        if (kullanici.rol === 'musteri' && kullanici.sahalar) {
          if (secilenSaha) {
            if (!kullanici.sahalar.includes(secilenSaha)) {
              setBakimlar([]);
              setYukleniyor(false);
              return;
            }
            bakimVerileri = bakimVerileri.filter(
              bakim => bakim.sahaId === secilenSaha
            );
          } else {
            bakimVerileri = bakimVerileri.filter(
              bakim => kullanici.sahalar?.includes(bakim.sahaId)
            );
          }
        } else if (secilenSaha) {
          // Seçili saha varsa filtrele
          bakimVerileri = bakimVerileri.filter(
            bakim => bakim.sahaId === secilenSaha
          );
        }
        
        setBakimlar(bakimVerileri);

        // İstatistikleri hesapla
        const sorunluBakimSayisi = bakimVerileri.filter(bakim => 
          Object.values(bakim.durumlar).some(kategori => 
            Object.values(kategori).some(durum => durum === false)
          )
        ).length;

        setIstatistikler({
          toplamBakim: bakimVerileri.length,
          sorunluBakim: sorunluBakimSayisi,
          sorunsuzBakim: bakimVerileri.length - sorunluBakimSayisi,
          kontrolOrani: bakimVerileri.length > 0 
            ? ((bakimVerileri.length - sorunluBakimSayisi) / bakimVerileri.length) * 100 
            : 0
        });

      } catch (error) {
        console.error('Bakımlar getirilemedi:', error);
        toast.error('Bakımlar yüklenirken bir hata oluştu');
      } finally {
        setYukleniyor(false);
      }
    };

    bakimlariGetir();
  }, [kullanici, secilenSaha, secilenAy]);

  const handleBakimSil = async (id: string) => {
    if (!canDelete) {
      toast.error('Bu işlem için yetkiniz yok');
      return;
    }

    try {
      setYukleniyor(true);
      await deleteDoc(doc(db, 'elektrikBakimlar', id));
      toast.success('Bakım kaydı başarıyla silindi');
      setSilinecekBakim(null);
      setBakimlar(prev => prev.filter(bakim => bakim.id !== id));
    } catch (error) {
      console.error('Bakım silme hatası:', error);
      toast.error('Bakım silinirken bir hata oluştu');
    } finally {
      setYukleniyor(false);
    }
  };

  const filtrelenmisVeriler = bakimlar.filter(bakim => {
    if (!aramaMetni) return true;
    
    const aramaMetniKucuk = aramaMetni.toLowerCase();
    const sahaAdi = sahalar.find(s => s.id === bakim.sahaId)?.ad.toLowerCase() || '';
    const kontrolEdenAdi = bakim.kontrolEden.ad.toLowerCase();
    
    return (
      sahaAdi.includes(aramaMetniKucuk) ||
      kontrolEdenAdi.includes(aramaMetniKucuk) ||
      (bakim.genelNotlar && bakim.genelNotlar.toLowerCase().includes(aramaMetniKucuk))
    );
  });

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
          <h1 className="text-2xl font-bold text-gray-900">Elektrik Bakım Kontrolleri</h1>
          <p className="mt-1 text-sm text-gray-500">
            {kullanici?.rol === 'musteri' 
              ? 'Size ait sahaların bakım kayıtları'
              : `Toplam ${filtrelenmisVeriler.length} bakım kaydı`}
          </p>
        </div>
        {canAdd && (
          <button
            onClick={() => setFormAcik(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700"
          >
            <Plus className="h-5 w-5 mr-2" />
            Yeni Bakım Kaydı
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Toplam Bakım"
          value={istatistikler.toplamBakim}
          icon={Zap}
          color="blue"
        />
        <StatsCard
          title="Sorunlu Bakım"
          value={istatistikler.sorunluBakim}
          icon={AlertTriangle}
          color="red"
        />
        <StatsCard
          title="Sorunsuz Bakım"
          value={istatistikler.sorunsuzBakim}
          icon={CheckCircle}
          color="green"
        />
        <StatsCard
          title="Sorunsuz Oranı"
          value={`%${istatistikler.kontrolOrani.toFixed(1)}`}
          icon={CheckCircle}
          color="yellow"
          progress={istatistikler.kontrolOrani}
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <SearchInput
            value={aramaMetni}
            onChange={setAramaMetni}
            placeholder="Bakım kaydı ara..."
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

      {gorunumTipi === 'liste' ? (
        <ElektrikBakimListesi
          bakimlar={filtrelenmisVeriler}
          sahalar={sahalar}
          onBakimTikla={(bakim) => setSeciliBakim(bakim)}
          onBakimSil={canDelete ? (id) => setSilinecekBakim(id) : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtrelenmisVeriler.map((bakim) => (
            <div key={bakim.id} className="relative">
              <ElektrikBakimKart
                bakim={bakim}
                sahaAdi={sahalar.find(s => s.id === bakim.sahaId)?.ad || 'Bilinmeyen Saha'}
                onClick={() => setSeciliBakim(bakim)}
              />
              {canDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSilinecekBakim(bakim.id);
                  }}
                  className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-lg hover:bg-red-50 transition-colors duration-200"
                >
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {formAcik && (
        <ElektrikBakimForm
          onClose={() => setFormAcik(false)}
          sahalar={sahalar}
        />
      )}

      {seciliBakim && (
        <ElektrikBakimDetay
          bakim={seciliBakim}
          sahaAdi={sahalar.find(s => s.id === seciliBakim.sahaId)?.ad || 'Bilinmeyen Saha'}
          onClose={() => setSeciliBakim(null)}
        />
      )}

      {silinecekBakim && (
        <SilmeOnayModal
          onConfirm={() => handleBakimSil(silinecekBakim)}
          onCancel={() => setSilinecekBakim(null)}
          mesaj="Bu bakım kaydını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz."
        />
      )}
    </div>
  );
};