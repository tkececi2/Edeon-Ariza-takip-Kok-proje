import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, where, doc, deleteDoc, addDoc, Timestamp, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { FileUploadZone } from '../components/FileUploadZone';
import { uploadMultipleFiles } from '../utils/uploadHelpers';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { 
  Sun, 
  Plus, 
  Trash2, 
  Edit2, 
  Building,
  MapPin,
  X,
  Save,
  Battery,
  Calendar,
  RefreshCw
} from 'lucide-react';
import { Card } from '@tremor/react';
import toast from 'react-hot-toast';
import type { GesDetay } from '../types';

export const GesSahalari: React.FC = () => {
  const { kullanici } = useAuth();
  const [sahalar, setSahalar] = useState<GesDetay[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [formAcik, setFormAcik] = useState(false);
  const [secilenSaha, setSecilenSaha] = useState<GesDetay | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [silmeOnayModalAcik, setSilmeOnayModalAcik] = useState(false);
  const [silinecekSahaId, setSilinecekSahaId] = useState<string | null>(null);
  const [yenileniyor, setYenileniyor] = useState(false);

  const [form, setForm] = useState({
    ad: '',
    kurulumTarihi: format(new Date(), "yyyy-MM-dd"),
    konum: {
      lat: 0,
      lng: 0,
      adres: ''
    },
    kapasite: 0,
    panelSayisi: 0,
    inverterSayisi: 0,
    yillikHedefUretim: 0,
    fotograflar: [] as File[],
    teknikOzellikler: {
      panelTipi: '',
      inverterTipi: '',
      panelGucu: 0,
      sistemVerimi: 0
    }
  });

  const canAdd = kullanici?.rol && ['yonetici', 'tekniker', 'muhendis'].includes(kullanici.rol);
  const canDelete = kullanici?.rol === 'yonetici';

  const fetchSahalar = async () => {
    if (!kullanici) return;

    try {
      setYukleniyor(true);
      let sahaQuery;

      if (kullanici.rol === 'musteri') {
        sahaQuery = query(
          collection(db, 'santraller'),
          where('musteriId', '==', kullanici.id),
          orderBy('olusturmaTarihi', 'desc')
        );
      } else {
        sahaQuery = query(
          collection(db, 'santraller'),
          orderBy('olusturmaTarihi', 'desc')
        );
      }

      const snapshot = await getDocs(sahaQuery);
      const sahaVerileri = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as GesDetay[];
      
      setSahalar(sahaVerileri);
    } catch (error) {
      console.error('Veri getirme hatası:', error);
      toast.error('Veriler yüklenirken bir hata oluştu');
    } finally {
      setYukleniyor(false);
    }
  };

  useEffect(() => {
    fetchSahalar();
  }, [kullanici]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kullanici) return;

    try {
      setYukleniyor(true);

      let fotografURLleri: string[] = [];
      if (form.fotograflar.length > 0) {
        fotografURLleri = await uploadMultipleFiles(
          form.fotograflar, 
          'santraller',
          (progress) => setUploadProgress(progress)
        );
      }

      const sahaData = {
        ...form,
        fotograflar: fotografURLleri,
        musteriId: secilenSaha?.musteriId || kullanici.id,
        olusturmaTarihi: Timestamp.now(),
        kurulumTarihi: Timestamp.fromDate(new Date(form.kurulumTarihi))
      };

      if (secilenSaha) {
        // Mevcut fotoğrafları koru
        if (fotografURLleri.length === 0 && secilenSaha.fotograflar) {
          sahaData.fotograflar = secilenSaha.fotograflar;
        }
        
        await updateDoc(doc(db, 'santraller', secilenSaha.id), sahaData);
        toast.success('Saha başarıyla güncellendi');
      } else {
        await addDoc(collection(db, 'santraller'), sahaData);
        toast.success('Saha başarıyla eklendi');
      }

      setFormAcik(false);
      setSecilenSaha(null);
      setForm({
        ad: '',
        kurulumTarihi: format(new Date(), "yyyy-MM-dd"),
        konum: { lat: 0, lng: 0, adres: '' },
        kapasite: 0,
        panelSayisi: 0,
        inverterSayisi: 0,
        yillikHedefUretim: 0,
        fotograflar: [],
        teknikOzellikler: {
          panelTipi: '',
          inverterTipi: '',
          panelGucu: 0,
          sistemVerimi: 0
        }
      });
      
      // Sahaları yenile
      fetchSahalar();
    } catch (error) {
      console.error('Saha kaydetme hatası:', error);
      toast.error(secilenSaha ? 'Saha güncellenirken bir hata oluştu' : 'Saha eklenirken bir hata oluştu');
    } finally {
      setYukleniyor(false);
      setUploadProgress(0);
    }
  };

  const handleSilmeOnayAc = (id: string) => {
    if (!canDelete) {
      toast.error('Bu işlem için yetkiniz yok');
      return;
    }
    
    setSilinecekSahaId(id);
    setSilmeOnayModalAcik(true);
  };

  const handleDelete = async () => {
    if (!canDelete || !silinecekSahaId) {
      toast.error('Bu işlem için yetkiniz yok');
      return;
    }

    try {
      setYukleniyor(true);
      
      // İlgili üretim verilerini bul
      const uretimVerileriQuery = query(
        collection(db, 'uretimVerileri'),
        where('santralId', '==', silinecekSahaId)
      );
      
      const uretimVerileriSnapshot = await getDocs(uretimVerileriQuery);
      
      // Batch işlemi başlat
      const batch = writeBatch(db);
      
      // Santralı sil
      batch.delete(doc(db, 'santraller', silinecekSahaId));
      
      // İlgili üretim verilerini sil
      uretimVerileriSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      // Batch işlemini commit et
      await batch.commit();
      
      // Sahaları yenile
      setSahalar(prev => prev.filter(saha => saha.id !== silinecekSahaId));
      
      toast.success(`Saha ve ${uretimVerileriSnapshot.size} üretim verisi başarıyla silindi`);
      
      // Modal'ı kapat
      setSilmeOnayModalAcik(false);
      setSilinecekSahaId(null);
    } catch (error) {
      console.error('Saha silme hatası:', error);
      toast.error('Saha silinirken bir hata oluştu');
    } finally {
      setYukleniyor(false);
    }
  };

  const handleYenile = async () => {
    setYenileniyor(true);
    await fetchSahalar();
    setYenileniyor(false);
    toast.success('Veriler yenilendi');
  };

  if (yukleniyor && sahalar.length === 0) {
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
          <h1 className="text-2xl font-bold text-gray-900">GES Sahaları</h1>
          <p className="mt-1 text-sm text-gray-500">
            {kullanici?.rol === 'musteri' 
              ? 'Size ait GES sahaları'
              : 'Tüm GES sahalarının yönetimi'}
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleYenile}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            disabled={yenileniyor}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${yenileniyor ? 'animate-spin' : ''}`} />
            Yenile
          </button>
          {canAdd && (
            <button
              onClick={() => {
                setSecilenSaha(null);
                setFormAcik(true);
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700"
            >
              <Plus className="h-5 w-5 mr-2" />
              Yeni Saha Ekle
            </button>
          )}
        </div>
      </div>

      {sahalar.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-12">
            <Sun className="h-16 w-16 text-yellow-300 mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">Saha Bulunamadı</h3>
            <p className="text-gray-500 text-center max-w-md">
              Henüz hiç saha kaydı bulunmuyor. Üretim verilerini görmek için önce bir saha eklemelisiniz.
            </p>
            {canAdd && (
              <button
                onClick={() => {
                  setSecilenSaha(null);
                  setFormAcik(true);
                }}
                className="mt-6 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700"
              >
                <Plus className="h-5 w-5 mr-2" />
                Yeni Saha Ekle
              </button>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sahalar.map((saha) => (
            <Card key={saha.id} className="hover:shadow-lg transition-shadow duration-200">
              <div className="relative">
                {saha.fotograflar?.[0] && (
                  <img
                    src={saha.fotograflar[0]}
                    alt={saha.ad}
                    className="w-full h-48 object-cover rounded-t-lg"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/placeholder-image.png';
                    }}
                  />
                )}
                <div className="absolute top-2 right-2 flex space-x-2">
                  {canAdd && (
                    <button
                      onClick={() => {
                        setSecilenSaha(saha);
                        setForm({
                          ...saha,
                          kurulumTarihi: format(saha.kurulumTarihi.toDate(), "yyyy-MM-dd"),
                          fotograflar: []
                        });
                        setFormAcik(true);
                      }}
                      className="p-2 bg-yellow-500 text-white rounded-full hover:bg-yellow-600"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => handleSilmeOnayAc(saha.id)}
                      className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-900">{saha.ad}</h3>
                
                <div className="mt-4 space-y-2">
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                    {saha.konum.adres}
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-600">
                    <Battery className="h-4 w-4 mr-2 text-gray-400" />
                    {saha.kapasite} kWp
                  </div>

                  <div className="flex items-center text-sm text-gray-600">
                    <Sun className="h-4 w-4 mr-2 text-gray-400" />
                    {saha.panelSayisi} Panel
                  </div>

                  <div className="flex items-center text-sm text-gray-600">
                    <Building className="h-4 w-4 mr-2 text-gray-400" />
                    {saha.inverterSayisi} İnvertör
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Kurulum Tarihi:</span>
                    <span className="font-medium">
                      {format(saha.kurulumTarihi.toDate(), 'dd MMMM yyyy', { locale: tr })}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Yatay Form Modal */}
      {formAcik && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg w-full max-w-7xl">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">
                {secilenSaha ? 'Saha Düzenle' : 'Yeni Saha Ekle'}
              </h2>
              <button
                onClick={() => setFormAcik(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(100vh-200px)]">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Temel Bilgiler */}
                  <div className="lg:col-span-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Temel Bilgiler</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Saha Adı
                        </label>
                        <input
                          type="text"
                          required
                          value={form.ad}
                          onChange={e => setForm(prev => ({ ...prev, ad: e.target.value }))}
                          className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          <Calendar className="h-4 w-4 inline mr-2" />
                          Kurulum Tarihi
                        </label>
                        <input
                          type="date"
                          required
                          value={form.kurulumTarihi}
                          onChange={e => setForm(prev => ({ ...prev, kurulumTarihi: e.target.value }))}
                          className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          <Battery className="h-4 w-4 inline mr-2" />
                          Kapasite (kWp)
                        </label>
                        <input
                          type="number"
                          required
                          value={form.kapasite}
                          onChange={e => setForm(prev => ({ ...prev, kapasite: parseFloat(e.target.value) }))}
                          className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Yıllık Hedef Üretim (kWh)
                        </label>
                        <input
                          type="number"
                          required
                          value={form.yillikHedefUretim}
                          onChange={e => setForm(prev => ({ ...prev, yillikHedefUretim: parseFloat(e.target.value) }))}
                          className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Konum Bilgileri */}
                  <div className="lg:col-span-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Konum Bilgileri</h3>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          <MapPin className="h-4 w-4 inline mr-2" />
                          Adres
                        </label>
                        <textarea
                          required
                          value={form.konum.adres}
                          onChange={e => setForm(prev => ({ 
                            ...prev, 
                            konum: { ...prev.konum, adres: e.target.value }
                          }))}
                          rows={2}
                          className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Teknik Özellikler */}
                  <div className="lg:col-span-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Teknik Özellikler</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          <Sun className="h-4 w-4 inline mr-2" />
                          Panel Sayısı
                        </label>
                        <input
                          type="number"
                          required
                          value={form.panelSayisi}
                          onChange={e => setForm(prev => ({ ...prev, panelSayisi: parseInt(e.target.value) }))}
                          className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          <Building className="h-4 w-4 inline mr-2" />
                          İnvertör Sayısı
                        </label>
                        <input
                          type="number"
                          required
                          value={form.inverterSayisi}
                          onChange={e => setForm(prev => ({ ...prev, inverterSayisi: parseInt(e.target.value) }))}
                          className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Panel Tipi
                        </label>
                        <input
                          type="text"
                          required
                          value={form.teknikOzellikler.panelTipi}
                          onChange={e => setForm(prev => ({ 
                            ...prev, 
                            teknikOzellikler: { ...prev.teknikOzellikler, panelTipi: e.target.value }
                          }))}
                          className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          İnvertör Tipi
                        </label>
                        <input
                          type="text"
                          required
                          value={form.teknikOzellikler.inverterTipi}
                          onChange={e => setForm(prev => ({ 
                            ...prev, 
                            teknikOzellikler: { ...prev.teknikOzellikler, inverterTipi: e.target.value }
                          }))}
                          className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Panel Gücü (W)
                        </label>
                        <input
                          type="number"
                          required
                          value={form.teknikOzellikler.panelGucu}
                          onChange={e => setForm(prev => ({ 
                            ...prev, 
                            teknikOzellikler: { ...prev.teknikOzellikler, panelGucu: parseFloat(e.target.value) }
                          }))}
                          className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Sistem Verimi (%)
                        </label>
                        <input
                          type="number"
                          required
                          value={form.teknikOzellikler.sistemVerimi}
                          onChange={e => setForm(prev => ({ 
                            ...prev, 
                            teknikOzellikler: { ...prev.teknikOzellikler, sistemVerimi: parseFloat(e.target.value) }
                          }))}
                          className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Fotoğraflar */}
                  <div className="lg:col-span-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Fotoğraflar</h3>
                    <FileUploadZone
                      onFileSelect={(files) => setForm(prev => ({ ...prev, fotograflar: files }))}
                      selectedFiles={form.fotograflar}
                      onFileRemove={(index) => {
                        setForm(prev => ({
                          ...prev,
                          fotograflar: prev.fotograflar.filter((_, i) => i !== index)
                        }));
                      }}
                      maxFiles={5}
                      uploadProgress={uploadProgress}
                    />
                    {secilenSaha && secilenSaha.fotograflar && secilenSaha.fotograflar.length > 0 && (
                      <div className="mt-2 text-sm text-gray-500">
                        Not: Yeni fotoğraf yüklerseniz, mevcut fotoğraflar değiştirilecektir.
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setFormAcik(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    disabled={yukleniyor}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50"
                  >
                    {yukleniyor ? (
                      <>
                        <LoadingSpinner size="sm" />
                        <span className="ml-2">Kaydediliyor...</span>
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        {secilenSaha ? 'Güncelle' : 'Kaydet'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Silme Onay Modalı */}
      {silmeOnayModalAcik && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Saha Silme Onayı</h3>
            <p className="text-sm text-gray-500 mb-4">
              Bu sahayı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz ve sahaya ait tüm üretim verileri de silinecektir.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setSilmeOnayModalAcik(false);
                  setSilinecekSahaId(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                İptal
              </button>
              <button
                onClick={handleDelete}
                disabled={yukleniyor}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
              >
                {yukleniyor ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span className="ml-2">Siliniyor...</span>
                  </>
                ) : (
                  'Evet, Sil'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};