import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, setDoc, updateDoc, deleteDoc, addDoc, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { MapPin, Plus, Pencil, Trash2, X, Building, Users } from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { SilmeOnayModal } from '../components/SilmeOnayModal';
import toast from 'react-hot-toast';
import type { Saha, Kullanici } from '../types';

interface SahaFormu extends Omit<Saha, 'id'> {
  musteriId?: string;
}

export const Sahalar: React.FC = () => {
  const { kullanici } = useAuth();
  const [sahalar, setSahalar] = useState<Saha[]>([]);
  const [musteriler, setMusteriler] = useState<Kullanici[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [formAcik, setFormAcik] = useState(false);
  const [duzenlemeModu, setDuzenlemeModu] = useState<string | null>(null);
  const [silinecekSaha, setSilinecekSaha] = useState<string | null>(null);
  const [form, setForm] = useState<SahaFormu>({
    ad: '',
    konum: '',
    kapasite: '',
    aciklama: '',
    musteriId: ''
  });

  const canManage = kullanici?.rol === 'yonetici';

  useEffect(() => {
    if (!kullanici) return;

    let q;
    if (kullanici.rol === 'musteri' && kullanici.sahalar) {
      // Müşteri sadece kendi sahalarını görebilir
      q = query(
        collection(db, 'sahalar'),
        where('__name__', 'in', kullanici.sahalar)
      );
    } else {
      // Yönetici ve teknisyenler tüm sahaları görebilir
      q = query(collection(db, 'sahalar'), orderBy('ad'));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sahaListesi = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Saha[];
      
      setSahalar(sahaListesi);
      setYukleniyor(false);
    }, (error) => {
      console.error('Sahalar getirilemedi:', error);
      toast.error('Saha listesi yüklenirken bir hata oluştu');
      setYukleniyor(false);
    });

    // Müşterileri getir (sadece yöneticiler için)
    if (kullanici.rol === 'yonetici') {
      const musteriQuery = query(
        collection(db, 'kullanicilar'),
        where('rol', '==', 'musteri')
      );
      
      getDocs(musteriQuery).then(snapshot => {
        const musteriListesi = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Kullanici[];
        
        setMusteriler(musteriListesi);
      }).catch(error => {
        console.error('Müşteriler getirilemedi:', error);
      });
    }

    return () => unsubscribe();
  }, [kullanici]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) {
      toast.error('Bu işlem için yetkiniz yok');
      return;
    }

    setYukleniyor(true);

    try {
      const sahaData = {
        ad: form.ad,
        konum: form.konum,
        kapasite: form.kapasite,
        aciklama: form.aciklama || '',
        musteriId: form.musteriId || null
      };

      if (duzenlemeModu) {
        await updateDoc(doc(db, 'sahalar', duzenlemeModu), sahaData);
        toast.success('Saha başarıyla güncellendi');
      } else {
        await addDoc(collection(db, 'sahalar'), {
          ...sahaData,
          olusturmaTarihi: new Date()
        });
        toast.success('Yeni saha başarıyla eklendi');
      }

      // Eğer müşteri seçildiyse, müşterinin sahalar listesini güncelle
      if (form.musteriId) {
        const musteriRef = doc(db, 'kullanicilar', form.musteriId);
        const musteriDoc = await getDocs(query(
          collection(db, 'kullanicilar'),
          where('__name__', '==', form.musteriId)
        ));
        
        if (!musteriDoc.empty) {
          const musteriData = musteriDoc.docs[0].data() as Kullanici;
          const sahalar = musteriData.sahalar || [];
          
          // Eğer saha zaten müşteriye atanmışsa ekleme
          if (duzenlemeModu && !sahalar.includes(duzenlemeModu)) {
            await updateDoc(musteriRef, {
              sahalar: [...sahalar, duzenlemeModu]
            });
          }
        }
      }

      setFormAcik(false);
      setForm({ ad: '', konum: '', kapasite: '', aciklama: '', musteriId: '' });
      setDuzenlemeModu(null);
    } catch (error) {
      console.error('Saha kaydetme hatası:', error);
      toast.error('Saha kaydedilirken bir hata oluştu');
    } finally {
      setYukleniyor(false);
    }
  };

  const handleSil = async (id: string) => {
    if (!canManage) {
      toast.error('Bu işlem için yetkiniz yok');
      return;
    }

    setYukleniyor(true);
    try {
      // Önce bu sahaya atanmış müşterilerin sahalar listesinden bu sahayı çıkar
      const musteriQuery = query(
        collection(db, 'kullanicilar'),
        where('sahalar', 'array-contains', id)
      );
      
      const musteriSnapshot = await getDocs(musteriQuery);
      
      const batch = [];
      for (const musteriDoc of musteriSnapshot.docs) {
        const musteriRef = doc(db, 'kullanicilar', musteriDoc.id);
        const musteriData = musteriDoc.data() as Kullanici;
        const yeniSahalar = musteriData.sahalar?.filter(sahaId => sahaId !== id) || [];
        
        batch.push(updateDoc(musteriRef, { sahalar: yeniSahalar }));
      }
      
      // Tüm müşteri güncellemelerini yap
      await Promise.all(batch);
      
      // Sahayı sil
      await deleteDoc(doc(db, 'sahalar', id));
      
      toast.success('Saha başarıyla silindi');
      setSilinecekSaha(null);
    } catch (error) {
      console.error('Saha silme hatası:', error);
      toast.error('Saha silinirken bir hata oluştu');
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
    <div className="space-y-6 animate-slide-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">
            {kullanici?.rol === 'musteri' ? 'Sahalarım' : 'Saha Yönetimi'}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            {kullanici?.rol === 'musteri' ? 'Size atanan sahalar' : `Toplam ${sahalar.length} saha`}
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => {
              setFormAcik(true);
              setDuzenlemeModu(null);
              setForm({ ad: '', konum: '', kapasite: '', aciklama: '', musteriId: '' });
            }}
            className="modern-button-primary"
          >
            <Plus className="h-5 w-5 mr-2" />
            Yeni Saha Ekle
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {sahalar.map((saha) => {
          // Bu sahaya atanmış müşteriyi bul
          const atananMusteri = musteriler.find(m => m.sahalar?.includes(saha.id));
          
          return (
            <div key={saha.id} className="modern-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-neutral-900">{saha.ad}</h3>
                <MapPin className="h-6 w-6 text-primary-500" />
              </div>

              <div className="space-y-3">
                <div className="flex items-center text-sm text-neutral-600">
                  <MapPin className="h-5 w-5 mr-2 text-neutral-400" />
                  {saha.konum}
                </div>
                <div className="flex items-center text-sm text-neutral-600">
                  <Building className="h-5 w-5 mr-2 text-neutral-400" />
                  {saha.kapasite}
                </div>
                {atananMusteri && (
                  <div className="flex items-center text-sm text-neutral-600">
                    <Users className="h-5 w-5 mr-2 text-neutral-400" />
                    Müşteri: {atananMusteri.ad}
                  </div>
                )}
                {saha.aciklama && (
                  <p className="text-sm text-neutral-600 mt-2">{saha.aciklama}</p>
                )}
              </div>

              {canManage && (
                <div className="mt-6 flex space-x-3">
                  <button
                    onClick={() => {
                      setForm({
                        ad: saha.ad,
                        konum: saha.konum,
                        kapasite: saha.kapasite,
                        aciklama: saha.aciklama || '',
                        musteriId: atananMusteri?.id || ''
                      });
                      setDuzenlemeModu(saha.id);
                      setFormAcik(true);
                    }}
                    className="modern-button-secondary flex-1"
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Düzenle
                  </button>
                  <button
                    onClick={() => setSilinecekSaha(saha.id)}
                    className="modern-button-secondary flex-1 !bg-red-50 !text-red-600 !border-red-200 hover:!bg-red-100"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Sil
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {formAcik && (
        <div className="fixed inset-0 bg-neutral-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-neutral-900">
                {duzenlemeModu ? 'Saha Düzenle' : 'Yeni Saha Ekle'}
              </h2>
              <button
                onClick={() => {
                  setFormAcik(false);
                  setDuzenlemeModu(null);
                }}
                className="text-neutral-400 hover:text-neutral-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700">
                  Saha Adı
                </label>
                <input
                  type="text"
                  required
                  value={form.ad}
                  onChange={e => setForm(prev => ({ ...prev, ad: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700">
                  Konum
                </label>
                <input
                  type="text"
                  required
                  value={form.konum}
                  onChange={e => setForm(prev => ({ ...prev, konum: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700">
                  Kapasite
                </label>
                <input
                  type="text"
                  required
                  value={form.kapasite}
                  onChange={e => setForm(prev => ({ ...prev, kapasite: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                />
              </div>

              {musteriler.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-neutral-700">
                    Müşteri Ata
                  </label>
                  <select
                    value={form.musteriId}
                    onChange={e => setForm(prev => ({ ...prev, musteriId: e.target.value }))}
                    className="mt-1 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  >
                    <option value="">Müşteri Seçin (Opsiyonel)</option>
                    {musteriler.map(musteri => (
                      <option key={musteri.id} value={musteri.id}>{musteri.ad}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-neutral-500">
                    Seçilen müşteri bu sahaya otomatik olarak erişim kazanacaktır.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-neutral-700">
                  Açıklama
                </label>
                <textarea
                  value={form.aciklama}
                  onChange={e => setForm(prev => ({ ...prev, aciklama: e.target.value }))}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                />
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setFormAcik(false);
                    setDuzenlemeModu(null);
                  }}
                  className="px-4 py-2 border border-neutral-300 rounded-md text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={yukleniyor}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
                >
                  {yukleniyor ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span className="ml-2">
                        {duzenlemeModu ? 'Güncelleniyor...' : 'Ekleniyor...'}
                      </span>
                    </>
                  ) : (
                    duzenlemeModu ? 'Güncelle' : 'Ekle'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {silinecekSaha && (
        <SilmeOnayModal
          onConfirm={() => handleSil(silinecekSaha)}
          onCancel={() => setSilinecekSaha(null)}
          mesaj="Bu sahayı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz ve bu sahaya erişimi olan müşterilerin erişimi kaldırılacaktır."
        />
      )}
    </div>
  );
};