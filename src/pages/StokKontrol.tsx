import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, where, doc, deleteDoc, addDoc, Timestamp, updateDoc } from 'firebase/firestore';
import { db, storage } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Plus, Trash2, Search, Building, Package, X, Upload, Image as ImageIcon, Edit2, Filter, AlertCircle, Check, BarChart } from 'lucide-react';
import { SearchInput } from '../components/SearchInput';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { FileUploadZone } from '../components/FileUploadZone';
import { uploadMultipleFiles } from '../utils/uploadHelpers';
import toast from 'react-hot-toast';

interface StokItem {
  id: string;
  sahaId: string;
  urunAdi: string;
  miktar: number;
  birim: string;
  kritikSeviye: number;
  kategori?: string;
  aciklama?: string;
  fotograflar?: string[];
  sonGuncelleme: Timestamp;
  olusturanKisi: {
    id: string;
    ad: string;
  };
}

// Stok kategorileri
const stokKategorileri = [
  'Elektronik',
  'Mekanik',
  'İnşaat Malzemesi',
  'Güvenlik Ekipmanı',
  'Ofis Malzemesi',
  'Temizlik Malzemesi',
  'Diğer'
];

export const StokKontrol: React.FC = () => {
  const { kullanici } = useAuth();
  const [stoklar, setStoklar] = useState<StokItem[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [formAcik, setFormAcik] = useState(false);
  const [secilenSaha, setSecilenSaha] = useState<string>('');
  const [secilenKategori, setSecilenKategori] = useState<string>('');
  const [sahalar, setSahalar] = useState<Array<{id: string, ad: string}>>([]);
  const [aramaMetni, setAramaMetni] = useState('');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [duzenlemeModu, setDuzenlemeModu] = useState(false);
  const [secilenStok, setSecilenStok] = useState<StokItem | null>(null);
  const [form, setForm] = useState({
    sahaId: '',
    urunAdi: '',
    miktar: 0,
    birim: '',
    kritikSeviye: 0,
    kategori: '',
    aciklama: '',
    fotograflar: [] as File[]
  });

  const canAdd = kullanici?.rol && ['yonetici', 'tekniker', 'muhendis'].includes(kullanici.rol);
  const canDelete = kullanici?.rol === 'yonetici';
  const canEdit = kullanici?.rol && ['yonetici', 'tekniker', 'muhendis'].includes(kullanici.rol);

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
        
        const snapshot = await getDocs(sahaQuery);
        const sahaListesi = snapshot.docs.map(doc => ({
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
    const stoklariGetir = async () => {
      if (!kullanici) return;

      try {
        setYukleniyor(true);
        let stokQuery;

        if (kullanici.rol === 'musteri' && kullanici.sahalar) {
          if (secilenSaha) {
            if (!kullanici.sahalar.includes(secilenSaha)) {
              setStoklar([]);
              return;
            }
            stokQuery = query(
              collection(db, 'stoklar'),
              where('sahaId', '==', secilenSaha)
            );
          } else {
            stokQuery = query(
              collection(db, 'stoklar'),
              where('sahaId', 'in', kullanici.sahalar)
            );
          }
        } else if (secilenSaha) {
          stokQuery = query(
            collection(db, 'stoklar'),
            where('sahaId', '==', secilenSaha)
          );
        } else {
          stokQuery = query(collection(db, 'stoklar'));
        }

        const snapshot = await getDocs(stokQuery);
        const stokVerileri = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as StokItem[];

        setStoklar(stokVerileri);
      } catch (error) {
        console.error('Stoklar getirilemedi:', error);
        toast.error('Stoklar yüklenirken bir hata oluştu');
      } finally {
        setYukleniyor(false);
      }
    };

    stoklariGetir();
  }, [kullanici, secilenSaha]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kullanici || !canAdd) {
      toast.error('Bu işlem için yetkiniz yok');
      return;
    }

    if (!form.sahaId || !form.urunAdi || form.miktar < 0) {
      toast.error('Lütfen gerekli alanları doldurun');
      return;
    }

    try {
      setYukleniyor(true);

      let fotografURLleri: string[] = [];
      
      if (form.fotograflar.length > 0) {
        fotografURLleri = await uploadMultipleFiles(
          form.fotograflar,
          'stoklar',
          (progress) => setUploadProgress(progress)
        );
      }

      if (duzenlemeModu && secilenStok) {
        await updateDoc(doc(db, 'stoklar', secilenStok.id), {
          sahaId: form.sahaId,
          urunAdi: form.urunAdi,
          miktar: form.miktar,
          birim: form.birim,
          kritikSeviye: form.kritikSeviye,
          kategori: form.kategori,
          aciklama: form.aciklama,
          ...(fotografURLleri.length > 0 ? { fotograflar: fotografURLleri } : {}),
          sonGuncelleme: Timestamp.now()
        });

        toast.success('Stok başarıyla güncellendi');
      } else {
        await addDoc(collection(db, 'stoklar'), {
          sahaId: form.sahaId,
          urunAdi: form.urunAdi,
          miktar: form.miktar,
          birim: form.birim,
          kritikSeviye: form.kritikSeviye,
          kategori: form.kategori,
          aciklama: form.aciklama,
          fotograflar: fotografURLleri,
          sonGuncelleme: Timestamp.now(),
          olusturanKisi: {
            id: kullanici.id,
            ad: kullanici.ad
          }
        });

        toast.success('Stok başarıyla eklendi');
      }

      // Formu temizle ve kapat
      setFormAcik(false);
      setDuzenlemeModu(false);
      setSecilenStok(null);
      setForm({
        sahaId: '',
        urunAdi: '',
        miktar: 0,
        birim: '',
        kritikSeviye: 0,
        kategori: '',
        aciklama: '',
        fotograflar: []
      });
      
      // Stokları yeniden yükle
      const stokQuery = query(collection(db, 'stoklar'));
      const snapshot = await getDocs(stokQuery);
      const stokVerileri = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as StokItem[];
      setStoklar(stokVerileri);
      
    } catch (error) {
      console.error('Stok işlemi hatası:', error);
      toast.error(duzenlemeModu ? 'Stok güncellenirken bir hata oluştu' : 'Stok eklenirken bir hata oluştu');
    } finally {
      setYukleniyor(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (id: string) => {
    if (!canDelete) {
      toast.error('Bu işlem için yetkiniz yok');
      return;
    }

    if (!window.confirm('Bu stok kaydını silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      setYukleniyor(true);
      await deleteDoc(doc(db, 'stoklar', id));
      toast.success('Stok başarıyla silindi');
      setStoklar(prev => prev.filter(stok => stok.id !== id));
    } catch (error) {
      console.error('Stok silme hatası:', error);
      toast.error('Stok silinirken bir hata oluştu');
    } finally {
      setYukleniyor(false);
    }
  };

  const handleEdit = (stok: StokItem) => {
    if (!canEdit) {
      toast.error('Bu işlem için yetkiniz yok');
      return;
    }

    setSecilenStok(stok);
    setForm({
      sahaId: stok.sahaId,
      urunAdi: stok.urunAdi,
      miktar: stok.miktar,
      birim: stok.birim,
      kritikSeviye: stok.kritikSeviye,
      kategori: stok.kategori || '',
      aciklama: stok.aciklama || '',
      fotograflar: []
    });
    setDuzenlemeModu(true);
    setFormAcik(true);
  };

  const filtrelenmisStoklar = stoklar.filter(stok => {
    // Arama metni filtresi
    const aramaFiltreleme = !aramaMetni || 
      stok.urunAdi.toLowerCase().includes(aramaMetni.toLowerCase()) ||
      stok.aciklama?.toLowerCase().includes(aramaMetni.toLowerCase());
    
    // Kategori filtresi
    const kategoriFiltreleme = !secilenKategori || stok.kategori === secilenKategori;
    
    return aramaFiltreleme && kategoriFiltreleme;
  });

  const kritikSeviyedeOlanlar = filtrelenmisStoklar.filter(stok => stok.miktar <= stok.kritikSeviye).length;
  const toplamStokAdedi = filtrelenmisStoklar.reduce((total, stok) => total + stok.miktar, 0);
  const toplamStokCesidi = filtrelenmisStoklar.length;
  const normalStokAdedi = filtrelenmisStoklar.filter(stok => stok.miktar > stok.kritikSeviye).length;
  
  // Detay görünümü için
  const [detayModalAcik, setDetayModalAcik] = useState(false);
  const [secilenDetay, setSecilenDetay] = useState<StokItem | null>(null);

  if (yukleniyor && stoklar.length === 0) {
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
          <h1 className="text-2xl font-bold text-gray-900">Stok Kontrol</h1>
          <p className="mt-1 text-sm text-gray-500">
            Toplam {filtrelenmisStoklar.length} ürün
            {kritikSeviyedeOlanlar > 0 && (
              <span className="ml-2 text-red-600">
                ({kritikSeviyedeOlanlar} ürün kritik seviyede)
              </span>
            )}
          </p>
        </div>
        {canAdd && (
          <button
            onClick={() => {
              setDuzenlemeModu(false);
              setSecilenStok(null);
              setForm({
                sahaId: '',
                urunAdi: '',
                miktar: 0,
                birim: '',
                kritikSeviye: 0,
                kategori: '',
                aciklama: '',
                fotograflar: []
              });
              setFormAcik(true);
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700"
          >
            <Plus className="h-5 w-5 mr-2" />
            Yeni Stok Ekle
          </button>
        )}
      </div>
      
      {/* Stok Durum Özeti - Bilgi Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Toplam Stok Çeşidi</p>
              <h3 className="text-xl font-bold text-gray-900">{toplamStokCesidi}</h3>
            </div>
            <div className="rounded-full p-3 bg-blue-100">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Toplam Ürün Adedi</p>
              <h3 className="text-xl font-bold text-gray-900">{toplamStokAdedi}</h3>
            </div>
            <div className="rounded-full p-3 bg-green-100">
              <Package className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Normal Seviyede</p>
              <h3 className="text-xl font-bold text-green-600">{normalStokAdedi}</h3>
            </div>
            <div className="rounded-full p-3 bg-green-100">
              <Package className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Kritik Seviyede</p>
              <h3 className="text-xl font-bold text-red-600">{kritikSeviyedeOlanlar}</h3>
            </div>
            <div className="rounded-full p-3 bg-red-100">
              <Package className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <SearchInput
            value={aramaMetni}
            onChange={setAramaMetni}
            placeholder="Stok ara..."
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
          <select
            value={secilenKategori}
            onChange={(e) => setSecilenKategori(e.target.value)}
            className="rounded-lg border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
          >
            <option value="">Tüm Kategoriler</option>
            {stokKategorileri.map(kategori => (
              <option key={kategori} value={kategori}>{kategori}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stok Listesi - Tablo Görünümü */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ürün
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Kategori
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Miktar
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Kritik Seviye
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Saha
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Son Güncelleme
              </th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                İşlemler
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filtrelenmisStoklar.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                  Stok bulunamadı
                </td>
              </tr>
            ) : (
              filtrelenmisStoklar.map((stok) => (
                <tr 
                  key={stok.id} 
                  className={`${stok.miktar <= stok.kritikSeviye ? "bg-red-50" : ""} cursor-pointer hover:bg-gray-50`}
                  onClick={() => {
                    setSecilenDetay(stok);
                    setDetayModalAcik(true);
                  }}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {stok.fotograflar && stok.fotograflar.length > 0 ? (
                        <div className="flex-shrink-0 h-10 w-10 mr-3">
                          <img
                            className="h-10 w-10 rounded-md object-cover"
                            src={stok.fotograflar[0]}
                            alt={stok.urunAdi}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = '/placeholder-image.png';
                            }}
                          />
                        </div>
                      ) : (
                        <div className="flex-shrink-0 h-10 w-10 mr-3 rounded-md bg-gray-200 flex items-center justify-center">
                          <Package className="h-6 w-6 text-gray-500" />
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {stok.urunAdi}
                        </div>
                        {stok.aciklama && (
                          <div className="text-xs text-gray-500 max-w-xs truncate">
                            {stok.aciklama}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {stok.kategori || "Kategorisiz"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm font-medium ${stok.miktar <= stok.kritikSeviye ? "text-red-700" : "text-gray-900"}`}>
                      {stok.miktar} {stok.birim}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {stok.kritikSeviye} {stok.birim}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {sahalar.find(s => s.id === stok.sahaId)?.ad || "Bilinmiyor"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {stok.sonGuncelleme ? format(stok.sonGuncelleme.toDate(), 'dd MMMM yyyy HH:mm', { locale: tr }) : 'Belirtilmemiş'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                    <div className="flex items-center justify-center space-x-2" onClick={(e) => e.stopPropagation()}>
                      {canEdit && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(stok);
                          }}
                          className="text-yellow-600 hover:text-yellow-800"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(stok.id);
                          }}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Stok Detay Modal */}
      {detayModalAcik && secilenDetay && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg w-full max-w-2xl">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-base font-medium text-gray-900">
                {secilenDetay.urunAdi}
              </h2>
              <button
                onClick={() => {
                  setDetayModalAcik(false);
                  setSecilenDetay(null);
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                {/* Sol Taraf - Fotoğraflar */}
                <div className="w-full md:w-2/5">
                  {secilenDetay.fotograflar && secilenDetay.fotograflar.length > 0 ? (
                    <div className="h-48 rounded-lg overflow-hidden bg-gray-100">
                      <img
                        src={secilenDetay.fotograflar[0]}
                        alt={secilenDetay.urunAdi}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/placeholder-image.png';
                        }}
                      />
                    </div>
                  ) : (
                    <div className="h-48 rounded-lg bg-gray-100 flex items-center justify-center">
                      <Package className="h-16 w-16 text-gray-300" />
                    </div>
                  )}
                  
                  {/* Küçük Resimler - Diğer Fotoğraflar */}
                  {secilenDetay.fotograflar && secilenDetay.fotograflar.length > 1 && (
                    <div className="flex mt-2 gap-1 overflow-x-auto pb-1">
                      {secilenDetay.fotograflar.slice(1).map((foto, idx) => (
                        <div key={`thumb-${idx}`} className="h-12 w-12 rounded-md overflow-hidden flex-shrink-0 border border-gray-200">
                          <img 
                            src={foto} 
                            alt={`${secilenDetay.urunAdi} - ${idx + 2}`}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = '/placeholder-image.png';
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Sağ Taraf - Detay Bilgileri */}
                <div className="w-full md:w-3/5 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-gray-500">Kategori</p>
                      <p className="text-sm font-medium">{secilenDetay.kategori || "Kategorisiz"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Saha</p>
                      <p className="text-sm font-medium">{sahalar.find(s => s.id === secilenDetay.sahaId)?.ad || "Bilinmiyor"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Miktar</p>
                      <p className={`text-sm font-medium ${secilenDetay.miktar <= secilenDetay.kritikSeviye ? "text-red-600" : ""}`}>
                        {secilenDetay.miktar} {secilenDetay.birim}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Kritik Seviye</p>
                      <p className="text-sm font-medium">{secilenDetay.kritikSeviye} {secilenDetay.birim}</p>
                    </div>
                  </div>
                  
                  {secilenDetay.aciklama && (
                    <div>
                      <p className="text-xs text-gray-500">Açıklama</p>
                      <p className="mt-1 text-sm text-gray-700">{secilenDetay.aciklama}</p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-gray-500">Son Güncelleme</p>
                      <p className="text-xs text-gray-700">
                        {secilenDetay.sonGuncelleme ? format(secilenDetay.sonGuncelleme.toDate(), 'dd MMMM yyyy HH:mm', { locale: tr }) : 'Belirtilmemiş'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Oluşturan</p>
                      <p className="text-xs text-gray-700">{secilenDetay.olusturanKisi?.ad || "Bilinmiyor"}</p>
                    </div>
                  </div>
                  
                  <div className="pt-3 flex gap-2">
                    {canEdit && (
                      <button
                        onClick={() => {
                          setDetayModalAcik(false);
                          handleEdit(secilenDetay);
                        }}
                        className="flex items-center px-3 py-1.5 border border-yellow-300 rounded-md shadow-sm text-xs font-medium text-yellow-700 bg-white hover:bg-yellow-50"
                      >
                        <Edit2 className="h-3 w-3 mr-1" />
                        Düzenle
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => {
                          setDetayModalAcik(false);
                          handleDelete(secilenDetay.id);
                        }}
                        className="flex items-center px-3 py-1.5 border border-red-300 rounded-md shadow-sm text-xs font-medium text-red-700 bg-white hover:bg-red-50"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Sil
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Yatay Form Modal */}
      {formAcik && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg w-full max-w-3xl">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-base font-medium text-gray-900">
                {duzenlemeModu ? `Stok Düzenle: ${secilenStok?.urunAdi}` : 'Yeni Stok Ekle'}
              </h2>
              <button
                onClick={() => setFormAcik(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Sol Sütun */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700">
                      Saha
                    </label>
                    <select
                      required
                      value={form.sahaId}
                      onChange={e => setForm(prev => ({ ...prev, sahaId: e.target.value }))}
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 text-sm"
                    >
                      <option value="">Saha Seçin</option>
                      {sahalar.map(saha => (
                        <option key={saha.id} value={saha.id}>{saha.ad}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700">
                      Ürün Adı
                    </label>
                    <input
                      type="text"
                      required
                      value={form.urunAdi}
                      onChange={e => setForm(prev => ({ ...prev, urunAdi: e.target.value }))}
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700">
                      Kategori
                    </label>
                    <select
                      value={form.kategori}
                      onChange={e => setForm(prev => ({ ...prev, kategori: e.target.value }))}
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 text-sm"
                    >
                      <option value="">Kategori Seçin</option>
                      {stokKategorileri.map(kategori => (
                        <option key={kategori} value={kategori}>{kategori}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Orta Sütun */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700">
                      Miktar
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={form.miktar}
                      onChange={e => setForm(prev => ({ ...prev, miktar: parseInt(e.target.value) }))}
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700">
                      Birim
                    </label>
                    <input
                      type="text"
                      required
                      value={form.birim}
                      onChange={e => setForm(prev => ({ ...prev, birim: e.target.value }))}
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 text-sm"
                      placeholder="adet, kg, metre vb."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700">
                      Kritik Seviye
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={form.kritikSeviye}
                      onChange={e => setForm(prev => ({ ...prev, kritikSeviye: parseInt(e.target.value) }))}
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 text-sm"
                    />
                  </div>
                </div>

                {/* Sağ Sütun */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700">
                      Açıklama
                    </label>
                    <textarea
                      value={form.aciklama}
                      onChange={e => setForm(prev => ({ ...prev, aciklama: e.target.value }))}
                      rows={2}
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Fotoğraflar
                    </label>
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
                    {duzenlemeModu && secilenStok?.fotograflar && secilenStok.fotograflar.length > 0 && (
                      <div className="mt-1 text-xs text-gray-500">
                        Not: Yeni fotoğraf yüklerseniz, mevcut fotoğraflar değiştirilecektir.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-4">
                <button
                  type="button"
                  onClick={() => setFormAcik(false)}
                  className="px-3 py-1.5 border border-gray-300 rounded-md text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={yukleniyor}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md shadow-sm text-xs font-medium text-white bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50"
                >
                  {yukleniyor ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span className="ml-2">Kaydediliyor...</span>
                    </>
                  ) : duzenlemeModu ? 'Güncelle' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};