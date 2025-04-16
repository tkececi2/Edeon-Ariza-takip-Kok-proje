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
  RefreshCw,
  BarChart2,
  Users
} from 'lucide-react';
import { Card, Title, ProgressBar } from '@tremor/react';
import toast from 'react-hot-toast';
import type { GesDetay, Kullanici } from '../types';

// Aylık üretim hedefi dağılım oranları
const AYLIK_HEDEF_ORANLARI = {
  ocak: 5.258,
  subat: 5.910,
  mart: 7.909,
  nisan: 9.281,
  mayis: 10.751,
  haziran: 11.182,
  temmuz: 10.947,
  agustos: 10.918,
  eylul: 9.825,
  ekim: 7.698,
  kasim: 5.733,
  aralik: 4.587
};

export const GesYonetimi: React.FC = () => {
  const { kullanici } = useAuth();
  const [santraller, setSantraller] = useState<GesDetay[]>([]);
  const [musteriler, setMusteriler] = useState<Kullanici[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [formAcik, setFormAcik] = useState(false);
  const [secilenSantral, setSecilenSantral] = useState<GesDetay | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [silmeOnayModalAcik, setSilmeOnayModalAcik] = useState(false);
  const [silinecekSantralId, setSilinecekSantralId] = useState<string | null>(null);
  const [yenileniyor, setYenileniyor] = useState(false);
  const [aylikHedeflerAcik, setAylikHedeflerAcik] = useState(false);

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
    aylikHedefler: {
      ocak: 0,
      subat: 0,
      mart: 0,
      nisan: 0,
      mayis: 0,
      haziran: 0,
      temmuz: 0,
      agustos: 0,
      eylul: 0,
      ekim: 0,
      kasim: 0,
      aralik: 0
    },
    fotograflar: [] as File[],
    teknikOzellikler: {
      panelTipi: '',
      inverterTipi: '',
      panelGucu: 0,
      sistemVerimi: 0
    },
    musteriId: ''
  });

  const canAdd = kullanici?.rol && ['yonetici', 'tekniker', 'muhendis'].includes(kullanici.rol);
  const canDelete = kullanici?.rol === 'yonetici';

  const fetchSantraller = async () => {
    if (!kullanici) return;

    try {
      setYukleniyor(true);
      let santralQuery;

      if (kullanici.rol === 'musteri') {
        if (!kullanici.sahalar || kullanici.sahalar.length === 0) {
          setSantraller([]);
          setYukleniyor(false);
          return;
        }
        
        santralQuery = query(
          collection(db, 'santraller'),
          where('__name__', 'in', kullanici.sahalar),
          orderBy('olusturmaTarihi', 'desc')
        );
      } else {
        santralQuery = query(
          collection(db, 'santraller'),
          orderBy('olusturmaTarihi', 'desc')
        );
      }

      const snapshot = await getDocs(santralQuery);
      const santralVerileri = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as GesDetay[];
      
      setSantraller(santralVerileri);
      
      // Müşterileri getir (sadece yöneticiler için)
      if (kullanici.rol === 'yonetici') {
        const musteriQuery = query(
          collection(db, 'kullanicilar'),
          where('rol', '==', 'musteri')
        );
        
        const musteriSnapshot = await getDocs(musteriQuery);
        const musteriListesi = musteriSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Kullanici[];
        
        setMusteriler(musteriListesi);
      }
    } catch (error) {
      console.error('Veri getirme hatası:', error);
      toast.error('Veriler yüklenirken bir hata oluştu');
    } finally {
      setYukleniyor(false);
    }
  };

  useEffect(() => {
    fetchSantraller();
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

      const santralData = {
        ...form,
        fotograflar: fotografURLleri,
        musteriId: form.musteriId || null,
        olusturmaTarihi: Timestamp.now(),
        kurulumTarihi: Timestamp.fromDate(new Date(form.kurulumTarihi))
      };

      if (secilenSantral) {
        // Mevcut fotoğrafları koru
        if (fotografURLleri.length === 0 && secilenSantral.fotograflar) {
          santralData.fotograflar = secilenSantral.fotograflar;
        }
        
        await updateDoc(doc(db, 'santraller', secilenSantral.id), santralData);
        toast.success('Santral başarıyla güncellendi');
      } else {
        const docRef = await addDoc(collection(db, 'santraller'), santralData);
        toast.success('Santral başarıyla eklendi');
        
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
            
            await updateDoc(musteriRef, {
              sahalar: [...sahalar, docRef.id]
            });
          }
        }
      }

      setFormAcik(false);
      setSecilenSantral(null);
      setForm({
        ad: '',
        kurulumTarihi: format(new Date(), "yyyy-MM-dd"),
        konum: { lat: 0, lng: 0, adres: '' },
        kapasite: 0,
        panelSayisi: 0,
        inverterSayisi: 0,
        yillikHedefUretim: 0,
        aylikHedefler: {
          ocak: 0,
          subat: 0,
          mart: 0,
          nisan: 0,
          mayis: 0,
          haziran: 0,
          temmuz: 0,
          agustos: 0,
          eylul: 0,
          ekim: 0,
          kasim: 0,
          aralik: 0
        },
        fotograflar: [],
        teknikOzellikler: {
          panelTipi: '',
          inverterTipi: '',
          panelGucu: 0,
          sistemVerimi: 0
        },
        musteriId: ''
      });
      
      // Santralleri yenile
      fetchSantraller();
    } catch (error) {
      console.error('Santral kaydetme hatası:', error);
      toast.error('Santral kaydedilirken bir hata oluştu');
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
    
    setSilinecekSantralId(id);
    setSilmeOnayModalAcik(true);
  };

  const handleDelete = async () => {
    if (!canDelete || !silinecekSantralId) {
      toast.error('Bu işlem için yetkiniz yok');
      return;
    }

    try {
      setYukleniyor(true);
      
      // İlgili üretim verilerini bul
      const uretimVerileriQuery = query(
        collection(db, 'uretimVerileri'),
        where('santralId', '==', silinecekSantralId)
      );
      
      const uretimVerileriSnapshot = await getDocs(uretimVerileriQuery);
      
      // Bu santralı sahalar listesinde bulunduran müşterileri bul
      const musteriQuery = query(
        collection(db, 'kullanicilar'),
        where('sahalar', 'array-contains', silinecekSantralId)
      );
      
      const musteriSnapshot = await getDocs(musteriQuery);
      
      // Batch işlemi başlat
      const batch = writeBatch(db);
      
      // Santralı sil
      batch.delete(doc(db, 'santraller', silinecekSantralId));
      
      // İlgili üretim verilerini sil
      uretimVerileriSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      // Batch işlemini commit et
      await batch.commit();
      
      // Müşterilerin sahalar listesinden bu santralı çıkar
      const musteriGuncellemeler = [];
      for (const musteriDoc of musteriSnapshot.docs) {
        const musteriRef = doc(db, 'kullanicilar', musteriDoc.id);
        const musteriData = musteriDoc.data() as Kullanici;
        const yeniSahalar = musteriData.sahalar?.filter(sahaId => sahaId !== silinecekSantralId) || [];
        
        musteriGuncellemeler.push(updateDoc(musteriRef, { sahalar: yeniSahalar }));
      }
      
      // Tüm müşteri güncellemelerini yap
      await Promise.all(musteriGuncellemeler);
      
      // Santralleri yenile
      setSantraller(prev => prev.filter(santral => santral.id !== silinecekSantralId));
      
      toast.success(`Santral ve ${uretimVerileriSnapshot.size} üretim verisi başarıyla silindi`);
      
      // Modal'ı kapat
      setSilmeOnayModalAcik(false);
      setSilinecekSantralId(null);
    } catch (error) {
      console.error('Santral silme hatası:', error);
      toast.error('Santral silinirken bir hata oluştu');
    } finally {
      setYukleniyor(false);
    }
  };

  const handleYenile = async () => {
    setYenileniyor(true);
    await fetchSantraller();
    setYenileniyor(false);
    toast.success('Veriler yenilendi');
  };

  const handleYillikHedefChange = (value: number) => {
    // Yıllık hedef üretimi güncelle
    setForm(prev => {
      // Aylık hedefleri otomatik olarak güncelle (verilen oranlara göre)
      const aylikHedefler = {
        ocak: Math.round(value * AYLIK_HEDEF_ORANLARI.ocak / 100),
        subat: Math.round(value * AYLIK_HEDEF_ORANLARI.subat / 100),
        mart: Math.round(value * AYLIK_HEDEF_ORANLARI.mart / 100),
        nisan: Math.round(value * AYLIK_HEDEF_ORANLARI.nisan / 100),
        mayis: Math.round(value * AYLIK_HEDEF_ORANLARI.mayis / 100),
        haziran: Math.round(value * AYLIK_HEDEF_ORANLARI.haziran / 100),
        temmuz: Math.round(value * AYLIK_HEDEF_ORANLARI.temmuz / 100),
        agustos: Math.round(value * AYLIK_HEDEF_ORANLARI.agustos / 100),
        eylul: Math.round(value * AYLIK_HEDEF_ORANLARI.eylul / 100),
        ekim: Math.round(value * AYLIK_HEDEF_ORANLARI.ekim / 100),
        kasim: Math.round(value * AYLIK_HEDEF_ORANLARI.kasim / 100),
        aralik: Math.round(value * AYLIK_HEDEF_ORANLARI.aralik / 100)
      };
      
      return {
        ...prev,
        yillikHedefUretim: value,
        aylikHedefler
      };
    });
  };

  const handleAylikHedefChange = (ay: string, value: number) => {
    setForm(prev => ({
      ...prev,
      aylikHedefler: {
        ...prev.aylikHedefler,
        [ay]: value
      }
    }));
  };

  if (yukleniyor && santraller.length === 0) {
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
          <h1 className="text-2xl font-bold text-neutral-900">GES Yönetimi</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {kullanici?.rol === 'musteri' 
              ? 'Santrallerinizin yönetimi'
              : 'Güneş enerjisi santrallerinin yönetimi'}
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleYenile}
            className="inline-flex items-center px-3 py-2 border border-neutral-300 rounded-md shadow-sm text-sm font-medium text-neutral-700 bg-white hover:bg-neutral-50"
            disabled={yenileniyor}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${yenileniyor ? 'animate-spin' : ''}`} />
            Yenile
          </button>
          {canAdd && (
            <button
              onClick={() => {
                setSecilenSantral(null);
                setFormAcik(true);
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
            >
              <Plus className="h-5 w-5 mr-2" />
              Yeni Santral Ekle
            </button>
          )}
        </div>
      </div>

      {santraller.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-12">
            <Sun className="h-16 w-16 text-primary-300 mb-4" />
            <h3 className="text-xl font-medium text-neutral-900 mb-2">Santral Bulunamadı</h3>
            <p className="text-neutral-500 text-center max-w-md">
              {kullanici?.rol === 'musteri' 
                ? 'Henüz size atanmış santral bulunmuyor. Lütfen yöneticinizle iletişime geçin.'
                : 'Henüz hiç santral kaydı bulunmuyor. Üretim verilerini görmek için önce bir santral eklemelisiniz.'}
            </p>
            {canAdd && (
              <button
                onClick={() => {
                  setSecilenSantral(null);
                  setFormAcik(true);
                }}
                className="mt-6 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
              >
                <Plus className="h-5 w-5 mr-2" />
                Yeni Santral Ekle
              </button>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {santraller.map((santral) => {
            // Bu santrale atanmış müşteriyi bul
            const atananMusteri = musteriler.find(m => m.sahalar?.includes(santral.id));
            
            return (
              <Card key={santral.id} className="hover:shadow-lg transition-shadow duration-200">
                <div className="relative">
                  {santral.fotograflar?.[0] && (
                    <img
                      src={santral.fotograflar[0]}
                      alt={santral.ad}
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
                          setSecilenSantral(santral);
                          setForm({
                            ...santral,
                            kurulumTarihi: format(santral.kurulumTarihi.toDate(), "yyyy-MM-dd"),
                            aylikHedefler: santral.aylikHedefler || {
                              ocak: Math.round(santral.yillikHedefUretim * AYLIK_HEDEF_ORANLARI.ocak / 100),
                              subat: Math.round(santral.yillikHedefUretim * AYLIK_HEDEF_ORANLARI.subat / 100),
                              mart: Math.round(santral.yillikHedefUretim * AYLIK_HEDEF_ORANLARI.mart / 100),
                              nisan: Math.round(santral.yillikHedefUretim * AYLIK_HEDEF_ORANLARI.nisan / 100),
                              mayis: Math.round(santral.yillikHedefUretim * AYLIK_HEDEF_ORANLARI.mayis / 100),
                              haziran: Math.round(santral.yillikHedefUretim * AYLIK_HEDEF_ORANLARI.haziran / 100),
                              temmuz: Math.round(santral.yillikHedefUretim * AYLIK_HEDEF_ORANLARI.temmuz / 100),
                              agustos: Math.round(santral.yillikHedefUretim * AYLIK_HEDEF_ORANLARI.agustos / 100),
                              eylul: Math.round(santral.yillikHedefUretim * AYLIK_HEDEF_ORANLARI.eylul / 100),
                              ekim: Math.round(santral.yillikHedefUretim * AYLIK_HEDEF_ORANLARI.ekim / 100),
                              kasim: Math.round(santral.yillikHedefUretim * AYLIK_HEDEF_ORANLARI.kasim / 100),
                              aralik: Math.round(santral.yillikHedefUretim * AYLIK_HEDEF_ORANLARI.aralik / 100)
                            },
                            fotograflar: [],
                            musteriId: santral.musteriId || ''
                          });
                          setFormAcik(true);
                        }}
                        className="p-2 bg-primary-500 text-white rounded-full hover:bg-primary-600"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => handleSilmeOnayAc(santral.id)}
                        className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="text-lg font-semibold text-neutral-900">{santral.ad}</h3>
                  
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center text-sm text-neutral-600">
                      <MapPin className="h-4 w-4 mr-2 text-neutral-400" />
                      {santral.konum.adres}
                    </div>
                    
                    <div className="flex items-center text-sm text-neutral-600">
                      <Battery className="h-4 w-4 mr-2 text-neutral-400" />
                      {santral.kapasite} kWp
                    </div>

                    <div className="flex items-center text-sm text-neutral-600">
                      <Sun className="h-4 w-4 mr-2 text-neutral-400" />
                      {santral.panelSayisi} Panel
                    </div>

                    <div className="flex items-center text-sm text-neutral-600">
                      <Building className="h-4 w-4 mr-2 text-neutral-400" />
                      {santral.inverterSayisi} İnvertör
                    </div>

                    <div className="flex items-center text-sm text-neutral-600">
                      <BarChart2 className="h-4 w-4 mr-2 text-neutral-400" />
                      {santral.yillikHedefUretim.toLocaleString('tr-TR')} kWh/yıl
                    </div>
                    
                    {atananMusteri && (
                      <div className="flex items-center text-sm text-neutral-600">
                        <Users className="h-4 w-4 mr-2 text-neutral-400" />
                        Müşteri: {atananMusteri.ad}
                      </div>
                    )}
                  </div>

                  <div className="mt-4">
                    <p className="text-xs text-neutral-500">Sistem Verimi</p>
                    <ProgressBar 
                      value={santral.teknikOzellikler.sistemVerimi} 
                      color="yellow"
                      className="mt-1"
                    />
                    <p className="text-xs text-right mt-1">
                      %{santral.teknikOzellikler.sistemVerimi}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Yatay Form Modal */}
      {formAcik && (
        <div className="fixed inset-0 bg-neutral-500 bg-opacity-75 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg w-full max-w-7xl">
            <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
              <h2 className="text-lg font-medium text-neutral-900">
                {secilenSantral ? 'Santral Düzenle' : 'Yeni Santral Ekle'}
              </h2>
              <button
                onClick={() => setFormAcik(false)}
                className="text-neutral-400 hover:text-neutral-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(100vh-200px)]">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Temel Bilgiler */}
                  <div className="lg:col-span-4">
                    <h3 className="text-lg font-medium text-neutral-900 mb-4">Temel Bilgiler</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-neutral-700">
                          Santral Adı
                        </label>
                        <input
                          type="text"
                          required
                          value={form.ad}
                          onChange={e => setForm(prev => ({ ...prev, ad: e.target.value }))}
                          className="mt-1 block w-full rounded-lg border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700">
                          <Calendar className="h-4 w-4 inline mr-2" />
                          Kurulum Tarihi
                        </label>
                        <input
                          type="date"
                          required
                          value={form.kurulumTarihi}
                          onChange={e => setForm(prev => ({ ...prev, kurulumTarihi: e.target.value }))}
                          className="mt-1 block w-full rounded-lg border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700">
                          <Battery className="h-4 w-4 inline mr-2" />
                          Kapasite (kWp)
                        </label>
                        <input
                          type="number"
                          required
                          value={form.kapasite}
                          onChange={e => setForm(prev => ({ ...prev, kapasite: parseFloat(e.target.value) }))}
                          className="mt-1 block w-full rounded-lg border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700">
                          Yıllık Hedef Üretim (kWh)
                        </label>
                        <input
                          type="number"
                          required
                          value={form.yillikHedefUretim}
                          onChange={e => handleYillikHedefChange(parseFloat(e.target.value))}
                          className="mt-1 block w-full rounded-lg border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Müşteri Atama */}
                  {musteriler.length > 0 && (
                    <div className="lg:col-span-4">
                      <h3 className="text-lg font-medium text-neutral-900 mb-4">Müşteri Atama</h3>
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-neutral-700">
                            <Users className="h-4 w-4 inline mr-2" />
                            Müşteri Seç
                          </label>
                          <select
                            value={form.musteriId}
                            onChange={e => setForm(prev => ({ ...prev, musteriId: e.target.value }))}
                            className="mt-1 block w-full rounded-lg border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                          >
                            <option value="">Müşteri Seçin (Opsiyonel)</option>
                            {musteriler.map(musteri => (
                              <option key={musteri.id} value={musteri.id}>{musteri.ad}</option>
                            ))}
                          </select>
                          <p className="mt-1 text-xs text-neutral-500">
                            Seçilen müşteri bu santrala otomatik olarak erişim kazanacaktır.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Aylık Hedefler */}
                  <div className="lg:col-span-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-neutral-900">Aylık Üretim Hedefleri</h3>
                      <button
                        type="button"
                        onClick={() => setAylikHedeflerAcik(!aylikHedeflerAcik)}
                        className="text-sm text-primary-600 hover:text-primary-700"
                      >
                        {aylikHedeflerAcik ? 'Gizle' : 'Göster'}
                      </button>
                    </div>
                    
                    {aylikHedeflerAcik && (
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 bg-neutral-50 p-4 rounded-lg">
                        <div>
                          <label className="block text-sm font-medium text-neutral-700">
                            Ocak (kWh) - %{AYLIK_HEDEF_ORANLARI.ocak}
                          </label>
                          <input
                            type="number"
                            value={form.aylikHedefler.ocak}
                            onChange={e => handleAylikHedefChange('ocak', parseFloat(e.target.value))}
                            className="mt-1 block w-full rounded-lg border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-neutral-700">
                            Şubat (kWh) - %{AYLIK_HEDEF_ORANLARI.subat}
                          </label>
                          <input
                            type="number"
                            value={form.aylikHedefler.subat}
                            onChange={e => handleAylikHedefChange('subat', parseFloat(e.target.value))}
                            className="mt-1 block w-full rounded-lg border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-neutral-700">
                            Mart (kWh) - %{AYLIK_HEDEF_ORANLARI.mart}
                          </label>
                          <input
                            type="number"
                            value={form.aylikHedefler.mart}
                            onChange={e => handleAylikHedefChange('mart', parseFloat(e.target.value))}
                            className="mt-1 block w-full rounded-lg border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-neutral-700">
                            Nisan (kWh) - %{AYLIK_HEDEF_ORANLARI.nisan}
                          </label>
                          <input
                            type="number"
                            value={form.aylikHedefler.nisan}
                            onChange={e => handleAylikHedefChange('nisan', parseFloat(e.target.value))}
                            className="mt-1 block w-full rounded-lg border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-neutral-700">
                            Mayıs (kWh) - %{AYLIK_HEDEF_ORANLARI.mayis}
                          </label>
                          <input
                            type="number"
                            value={form.aylikHedefler.mayis}
                            onChange={e => handleAylikHedefChange('mayis', parseFloat(e.target.value))}
                            className="mt-1 block w-full rounded-lg border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-neutral-700">
                            Haziran (kWh) - %{AYLIK_HEDEF_ORANLARI.haziran}
                          </label>
                          <input
                            type="number"
                            value={form.aylikHedefler.haziran}
                            onChange={e => handleAylikHedefChange('haziran', parseFloat(e.target.value))}
                            className="mt-1 block w-full rounded-lg border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-neutral-700">
                            Temmuz (kWh) - %{AYLIK_HEDEF_ORANLARI.temmuz}
                          </label>
                          <input
                            type="number"
                            value={form.aylikHedefler.temmuz}
                            onChange={e => handleAylikHedefChange('temmuz', parseFloat(e.target.value))}
                            className="mt-1 block w-full rounded-lg border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-neutral-700">
                            Ağustos (kWh) - %{AYLIK_HEDEF_ORANLARI.agustos}
                          </label>
                          <input
                            type="number"
                            value={form.aylikHedefler.agustos}
                            onChange={e => handleAylikHedefChange('agustos', parseFloat(e.target.value))}
                            className="mt-1 block w-full rounded-lg border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-neutral-700">
                            Eylül (kWh) - %{AYLIK_HEDEF_ORANLARI.eylul}
                          </label>
                          <input
                            type="number"
                            value={form.aylikHedefler.eylul}
                            onChange={e => handleAylikHedefChange('eylul', parseFloat(e.target.value))}
                            className="mt-1 block w-full rounded-lg border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-neutral-700">
                            Ekim (kWh) - %{AYLIK_HEDEF_ORANLARI.ekim}
                          </label>
                          <input
                            type="number"
                            value={form.aylikHedefler.ekim}
                            onChange={e => handleAylikHedefChange('ekim', parseFloat(e.target.value))}
                            className="mt-1 block w-full rounded-lg border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-neutral-700">
                            Kasım (kWh) - %{AYLIK_HEDEF_ORANLARI.kasim}
                          </label>
                          <input
                            type="number"
                            value={form.aylikHedefler.kasim}
                            onChange={e => handleAylikHedefChange('kasim', parseFloat(e.target.value))}
                            className="mt-1 block w-full rounded-lg border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-neutral-700">
                            Aralık (kWh) - %{AYLIK_HEDEF_ORANLARI.aralik}
                          </label>
                          <input
                            type="number"
                            value={form.aylikHedefler.aralik}
                            onChange={e => handleAylikHedefChange('aralik', parseFloat(e.target.value))}
                            className="mt-1 block w-full rounded-lg border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                          />
                        </div>
                      </div>
                    )}
                    
                    {!aylikHedeflerAcik && (
                      <div className="bg-neutral-50 p-4 rounded-lg">
                        <p className="text-sm text-neutral-600">
                          Aylık hedefler, yıllık hedef üretim değerine göre otomatik olarak hesaplanmıştır. 
                          Aylık hedefleri özelleştirmek için "Göster" butonuna tıklayın.
                        </p>
                        <div className="mt-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 text-xs text-neutral-500">
                          <div>Ocak: %{AYLIK_HEDEF_ORANLARI.ocak}</div>
                          <div>Şubat: %{AYLIK_HEDEF_ORANLARI.subat}</div>
                          <div>Mart: %{AYLIK_HEDEF_ORANLARI.mart}</div>
                          <div>Nisan: %{AYLIK_HEDEF_ORANLARI.nisan}</div>
                          <div>Mayıs: %{AYLIK_HEDEF_ORANLARI.mayis}</div>
                          <div>Haziran: %{AYLIK_HEDEF_ORANLARI.haziran}</div>
                          <div>Temmuz: %{AYLIK_HEDEF_ORANLARI.temmuz}</div>
                          <div>Ağustos: %{AYLIK_HEDEF_ORANLARI.agustos}</div>
                          <div>Eylül: %{AYLIK_HEDEF_ORANLARI.eylul}</div>
                          <div>Ekim: %{AYLIK_HEDEF_ORANLARI.ekim}</div>
                          <div>Kasım: %{AYLIK_HEDEF_ORANLARI.kasim}</div>
                          <div>Aralık: %{AYLIK_HEDEF_ORANLARI.aralik}</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Konum Bilgileri */}
                  <div className="lg:col-span-4">
                    <h3 className="text-lg font-medium text-neutral-900 mb-4">Konum Bilgileri</h3>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-neutral-700">
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
                          className="mt-1 block w-full rounded-lg border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Teknik Özellikler */}
                  <div className="lg:col-span-4">
                    <h3 className="text-lg font-medium text-neutral-900 mb-4">Teknik Özellikler</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-neutral-700">
                          Panel Sayısı
                        </label>
                        <input
                          type="number"
                          required
                          value={form.panelSayisi}
                          onChange={e => setForm(prev => ({ ...prev, panelSayisi: parseInt(e.target.value) }))}
                          className="mt-1 block w-full rounded-lg border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700">
                          İnvertör Sayısı
                        </label>
                        <input
                          type="number"
                          required
                          value={form.inverterSayisi}
                          onChange={e => setForm(prev => ({ ...prev, inverterSayisi: parseInt(e.target.value) }))}
                          className="mt-1 block w-full rounded-lg border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700">
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
                          className="mt-1 block w-full rounded-lg border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700">
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
                          className="mt-1 block w-full rounded-lg border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700">
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
                          className="mt-1 block w-full rounded-lg border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700">
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
                          className="mt-1 block w-full rounded-lg border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Fotoğraflar */}
                  <div className="lg:col-span-4">
                    <h3 className="text-lg font-medium text-neutral-900 mb-4">Fotoğraflar</h3>
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
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setFormAcik(false)}
                    className="px-4 py-2 border border-neutral-300 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    disabled={yukleniyor}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
                  >
                    {yukleniyor ? (
                      <>
                        <LoadingSpinner size="sm" />
                        <span className="ml-2">Kaydediliyor...</span>
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        {secilenSantral ? 'Güncelle' : 'Kaydet'}
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
        <div className="fixed inset-0 bg-neutral-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-neutral-900 mb-4">Santral Silme Onayı</h3>
            <p className="text-sm text-neutral-500 mb-4">
              Bu santralı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz ve santrale ait tüm üretim verileri de silinecektir.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setSilmeOnayModalAcik(false);
                  setSilinecekSantralId(null);
                }}
                className="px-4 py-2 border border-neutral-300 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-50"
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