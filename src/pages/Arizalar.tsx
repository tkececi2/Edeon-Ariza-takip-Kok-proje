import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, where, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Search, Filter, LayoutGrid, List, Edit, Trash2, Calendar, ChevronDown, ChevronUp, Image as ImageIcon, Clock, Timer } from 'lucide-react';
import { ArizaForm } from '../components/ArizaForm';
import { ArizaKart } from '../components/ArizaKart';
import { ArizaListesi } from '../components/ArizaListesi';
import { ArizaDetayModal } from '../components/ArizaDetayModal';
import { SilmeOnayModal } from '../components/SilmeOnayModal';
import type { Ariza } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { SearchInput } from '../components/SearchInput';
import { format, parseISO, isValid, parse, differenceInHours, differenceInDays, differenceInMinutes } from 'date-fns';
import { tr } from 'date-fns/locale';
import toast from 'react-hot-toast';

export const Arizalar: React.FC = () => {
  const { kullanici } = useAuth();
  const [arizalar, setArizalar] = useState<Ariza[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [formAcik, setFormAcik] = useState(false);
  const [aramaMetni, setAramaMetni] = useState('');
  const [secilenSaha, setSecilenSaha] = useState<string>('');
  const [secilenDurum, setSecilenDurum] = useState<string>('');
  const [gorunumTipi, setGorunumTipi] = useState<'kart' | 'liste' | 'aylik'>('aylik');
  const [sahalar, setSahalar] = useState<Record<string, string>>({});
  const [kullanicilar, setKullanicilar] = useState<Record<string, any>>({});
  const [seciliAriza, setSeciliAriza] = useState<Ariza | null>(null);
  const [duzenlenecekAriza, setDuzenlenecekAriza] = useState<Ariza | null>(null);
  const [silinecekAriza, setSilinecekAriza] = useState<string | null>(null);
  const [aylikGruplar, setAylikGruplar] = useState<Record<string, Ariza[]>>({});
  const [acikAylar, setAcikAylar] = useState<Record<string, boolean>>({});

  // Yetki kontrolü
  const canEdit = kullanici?.rol && ['yonetici', 'tekniker', 'muhendis'].includes(kullanici.rol);
  const canDelete = kullanici?.rol && ['yonetici', 'tekniker', 'muhendis'].includes(kullanici.rol);

  useEffect(() => {
    const veriGetir = async () => {
      if (!kullanici) return;

      try {
        // Sahaları getir
        let sahaQuery;
        if (kullanici.rol === 'musteri' && kullanici.sahalar) {
          sahaQuery = query(
            collection(db, 'sahalar'),
            where('__name__', 'in', kullanici.sahalar)
          );
        } else {
          sahaQuery = query(collection(db, 'sahalar'));
        }
        
        const sahaSnapshot = await getDocs(sahaQuery);
        const sahaMap: Record<string, string> = {};
        sahaSnapshot.docs.forEach(doc => {
          sahaMap[doc.id] = doc.data().ad;
        });
        setSahalar(sahaMap);

        // Kullanıcıları getir
        const kullaniciSnapshot = await getDocs(collection(db, 'kullanicilar'));
        const kullaniciMap: Record<string, any> = {};
        kullaniciSnapshot.docs.forEach(doc => {
          kullaniciMap[doc.id] = doc.data();
        });
        setKullanicilar(kullaniciMap);

        // Arızaları getir
        let arizaQuery;
        if (kullanici.rol === 'musteri') {
          if (!kullanici.sahalar || kullanici.sahalar.length === 0) {
            setArizalar([]);
            return;
          }
          arizaQuery = query(
            collection(db, 'arizalar'),
            where('saha', 'in', kullanici.sahalar),
            orderBy('olusturmaTarihi', 'desc')
          );
        } else if (secilenSaha) {
          arizaQuery = query(
            collection(db, 'arizalar'),
            where('saha', '==', secilenSaha),
            orderBy('olusturmaTarihi', 'desc')
          );
        } else {
          arizaQuery = query(
            collection(db, 'arizalar'),
            orderBy('olusturmaTarihi', 'desc')
          );
        }

        const snapshot = await getDocs(arizaQuery);
        const arizaVerileri = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Ariza[];
        
        setArizalar(arizaVerileri);
        
        // Aylık grupları oluştur
        const gruplar: Record<string, Ariza[]> = {};
        arizaVerileri.forEach(ariza => {
          const tarih = ariza.olusturmaTarihi.toDate();
          const ayYil = format(tarih, 'MMMM yyyy', { locale: tr });
          
          if (!gruplar[ayYil]) {
            gruplar[ayYil] = [];
          }
          
          gruplar[ayYil].push(ariza);
        });
        
        setAylikGruplar(gruplar);
        
        // İlk 3 ayı otomatik olarak aç
        const ilkAylar = Object.keys(gruplar).slice(0, 3);
        const acikAylarObj: Record<string, boolean> = {};
        ilkAylar.forEach(ay => {
          acikAylarObj[ay] = true;
        });
        setAcikAylar(acikAylarObj);
      } catch (error) {
        console.error('Veri getirme hatası:', error);
        toast.error('Veriler yüklenirken bir hata oluştu');
      } finally {
        setYukleniyor(false);
      }
    };

    veriGetir();
  }, [kullanici, secilenSaha]);

  const handleArizaSil = async (id: string) => {
    if (!canDelete) {
      toast.error('Bu işlem için yetkiniz yok');
      return;
    }

    setYukleniyor(true);
    try {
      await deleteDoc(doc(db, 'arizalar', id));
      toast.success('Arıza başarıyla silindi');
      setSilinecekAriza(null);
      // Listeyi güncelle
      setArizalar(prev => prev.filter(ariza => ariza.id !== id));
      
      // Aylık grupları güncelle
      const yeniGruplar = { ...aylikGruplar };
      Object.keys(yeniGruplar).forEach(ayYil => {
        yeniGruplar[ayYil] = yeniGruplar[ayYil].filter(ariza => ariza.id !== id);
        if (yeniGruplar[ayYil].length === 0) {
          delete yeniGruplar[ayYil];
        }
      });
      setAylikGruplar(yeniGruplar);
    } catch (error) {
      console.error('Arıza silme hatası:', error);
      toast.error('Arıza silinirken bir hata oluştu');
    } finally {
      setYukleniyor(false);
    }
  };

  const handleArizaDuzenle = (ariza: Ariza) => {
    if (!canEdit) {
      toast.error('Bu işlem için yetkiniz yok');
      return;
    }
    setDuzenlenecekAriza(ariza);
    setFormAcik(true);
  };
  
  const toggleAyAciklik = (ay: string) => {
    setAcikAylar(prev => ({
      ...prev,
      [ay]: !prev[ay]
    }));
  };

  const getCozumSuresi = (ariza: Ariza): string => {
    const baslangic = ariza.olusturmaTarihi.toDate();
    const bitis = ariza.cozum ? ariza.cozum.tamamlanmaTarihi.toDate() : new Date();
    
    const dakikaFarki = differenceInMinutes(bitis, baslangic);
    const saatFarki = differenceInHours(bitis, baslangic);
    const gunFarki = differenceInDays(bitis, baslangic);
    const kalanSaat = saatFarki % 24;

    if (ariza.cozum) {
      if (gunFarki === 0) {
        if (saatFarki === 0) {
          return `${dakikaFarki} dakikada çözüldü`;
        }
        return kalanSaat === 0 ? '1 saatte çözüldü' : `${kalanSaat} saatte çözüldü`;
      } else {
        return `${gunFarki} gün ${kalanSaat} saatte çözüldü`;
      }
    } else {
      if (gunFarki === 0) {
        if (saatFarki === 0) {
          return `${dakikaFarki} dakika`;
        }
        return kalanSaat === 0 ? '1 saat' : `${kalanSaat} saat`;
      } else {
        return `${gunFarki} gün ${kalanSaat} saat`;
      }
    }
  };

  const filtrelenmisArizalar = arizalar.filter(ariza => {
    const aramaUyumu = aramaMetni
      ? ariza.baslik.toLowerCase().includes(aramaMetni.toLowerCase()) ||
        ariza.aciklama.toLowerCase().includes(aramaMetni.toLowerCase())
      : true;

    const durumUyumu = secilenDurum ? ariza.durum === secilenDurum : true;

    return aramaUyumu && durumUyumu;
  });
  
  // Filtrelenmiş aylık grupları oluştur
  const filtrelenmisAylikGruplar: Record<string, Ariza[]> = {};
  Object.keys(aylikGruplar).forEach(ayYil => {
    const filtrelenmisArizalar = aylikGruplar[ayYil].filter(ariza => {
      const aramaUyumu = aramaMetni
        ? ariza.baslik.toLowerCase().includes(aramaMetni.toLowerCase()) ||
          ariza.aciklama.toLowerCase().includes(aramaMetni.toLowerCase())
        : true;

      const durumUyumu = secilenDurum ? ariza.durum === secilenDurum : true;

      return aramaUyumu && durumUyumu;
    });
    
    if (filtrelenmisArizalar.length > 0) {
      filtrelenmisAylikGruplar[ayYil] = filtrelenmisArizalar;
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Arızalar</h1>
          <p className="mt-1 text-sm text-gray-500">
            Toplam {filtrelenmisArizalar.length} arıza kaydı
          </p>
        </div>
        {!kullanici?.rol?.includes('musteri') && (
          <button
            onClick={() => {
              setDuzenlenecekAriza(null);
              setFormAcik(true);
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
          >
            <Plus className="h-5 w-5 mr-2" />
            Yeni Arıza Kaydı
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <SearchInput
            value={aramaMetni}
            onChange={setAramaMetni}
            placeholder="Arıza ara..."
          />
        </div>
        <div className="flex gap-4">
          <select
            value={secilenSaha}
            onChange={(e) => setSecilenSaha(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          >
            <option value="">Tüm Sahalar</option>
            {Object.entries(sahalar).map(([id, ad]) => (
              <option key={id} value={id}>{ad}</option>
            ))}
          </select>
          <select
            value={secilenDurum}
            onChange={(e) => setSecilenDurum(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          >
            <option value="">Tüm Durumlar</option>
            <option value="acik">Açık</option>
            <option value="devam-ediyor">Devam Ediyor</option>
            <option value="beklemede">Beklemede</option>
            <option value="cozuldu">Çözüldü</option>
          </select>
          <div className="flex rounded-md shadow-sm">
            <button
              onClick={() => setGorunumTipi('aylik')}
              className={`px-4 py-2 text-sm font-medium rounded-l-md border ${
                gorunumTipi === 'aylik'
                  ? 'bg-primary-50 text-primary-600 border-primary-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Calendar className="h-5 w-5" />
            </button>
            <button
              onClick={() => setGorunumTipi('kart')}
              className={`px-4 py-2 text-sm font-medium border-t border-b ${
                gorunumTipi === 'kart'
                  ? 'bg-primary-50 text-primary-600 border-primary-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <LayoutGrid className="h-5 w-5" />
            </button>
            <button
              onClick={() => setGorunumTipi('liste')}
              className={`px-4 py-2 text-sm font-medium rounded-r-md border-t border-r border-b -ml-px ${
                gorunumTipi === 'liste'
                  ? 'bg-primary-50 text-primary-600 border-primary-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <List className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {yukleniyor ? (
        <div className="flex justify-center items-center py-8">
          <LoadingSpinner size="lg" />
        </div>
      ) : gorunumTipi === 'aylik' ? (
        <div className="space-y-6">
          {Object.keys(filtrelenmisAylikGruplar).length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Filtrelere uygun arıza kaydı bulunamadı.</p>
            </div>
          ) : (
            Object.keys(filtrelenmisAylikGruplar).map(ayYil => (
              <div key={ayYil} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div 
                  className="px-6 py-4 bg-primary-50 border-b border-primary-100 flex justify-between items-center cursor-pointer"
                  onClick={() => toggleAyAciklik(ayYil)}
                >
                  <h2 className="text-lg font-semibold text-primary-800 flex items-center">
                    <Calendar className="h-5 w-5 mr-2 text-primary-600" />
                    {ayYil} <span className="ml-2 text-sm text-primary-600">({filtrelenmisAylikGruplar[ayYil].length} arıza)</span>
                  </h2>
                  <button className="text-primary-600 hover:text-primary-800">
                    {acikAylar[ayYil] ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </button>
                </div>
                
                {acikAylar[ayYil] && (
                  <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filtrelenmisAylikGruplar[ayYil].map(ariza => (
                        <div 
                          key={ariza.id} 
                          className="flex h-24 border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer"
                          onClick={() => setSeciliAriza(ariza)}
                        >
                          <div className="w-1/3 bg-gray-100 relative">
                            {ariza.fotograflar && ariza.fotograflar.length > 0 ? (
                              <img 
                                src={ariza.fotograflar[0]} 
                                alt="Arıza fotoğrafı" 
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
                            {ariza.fotograflar && ariza.fotograflar.length > 1 && (
                              <div className="absolute bottom-1 right-1 bg-black bg-opacity-60 text-white text-xs px-1 py-0.5 rounded">
                                +{ariza.fotograflar.length - 1}
                              </div>
                            )}
                          </div>
                          <div className="w-2/3 p-3">
                            <div className="flex justify-between items-start mb-1">
                              <h3 className="text-sm font-medium text-gray-900 line-clamp-1">{ariza.baslik}</h3>
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${
                                ariza.durum === 'cozuldu' ? 'bg-green-100 text-green-800' :
                                ariza.durum === 'devam-ediyor' ? 'bg-yellow-100 text-yellow-800' :
                                ariza.durum === 'beklemede' ? 'bg-blue-100 text-blue-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {ariza.durum.charAt(0).toUpperCase() + ariza.durum.slice(1).replace('-', ' ')}
                              </span>
                            </div>
                            
                            <div className="text-xs text-gray-500 mb-1">
                              <span className="font-medium">Saha:</span> {sahalar[ariza.saha] || 'Bilinmeyen Saha'}
                            </div>
                            
                            <div className="flex justify-between items-center text-xs text-gray-500">
                              <div className="flex items-center">
                                <Calendar className="h-3 w-3 mr-1" />
                                {format(ariza.olusturmaTarihi.toDate(), 'dd MMM', { locale: tr })}
                              </div>
                              <div className="flex items-center">
                                <Timer className="h-3 w-3 mr-1" />
                                <span className={ariza.cozum ? 'text-green-600' : ''}>
                                  {getCozumSuresi(ariza)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      ) : gorunumTipi === 'kart' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtrelenmisArizalar.map((ariza) => (
            <div key={ariza.id} className="relative">
              <ArizaKart
                ariza={ariza}
                sahaAdi={sahalar[ariza.saha] || 'Bilinmeyen Saha'}
                kullaniciAdi={kullanicilar[ariza.olusturanKisi]?.ad || 'Bilinmeyen Kullanıcı'}
                onClick={() => setSeciliAriza(ariza)}
              />
              {(canEdit || canDelete) && (
                <div className="absolute top-2 right-2 flex space-x-2">
                  {canEdit && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleArizaDuzenle(ariza);
                      }}
                      className="p-1 bg-white rounded-full shadow-lg hover:bg-primary-50"
                    >
                      <Edit className="h-4 w-4 text-primary-600" />
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSilinecekAriza(ariza.id);
                      }}
                      className="p-1 bg-white rounded-full shadow-lg hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <ArizaListesi
          arizalar={filtrelenmisArizalar}
          yukleniyor={yukleniyor}
          isMusteri={kullanici?.rol === 'musteri'}
          onArizaClick={(ariza) => setSeciliAriza(ariza)}
          canEdit={canEdit}
          canDelete={canDelete}
          onEdit={handleArizaDuzenle}
          onDelete={(id) => setSilinecekAriza(id)}
        />
      )}

      {formAcik && (
        <ArizaForm
          ariza={duzenlenecekAriza}
          onClose={() => {
            setFormAcik(false);
            setDuzenlenecekAriza(null);
          }}
        />
      )}

      {seciliAriza && (
        <ArizaDetayModal
          ariza={seciliAriza}
          sahaAdi={sahalar[seciliAriza.saha] || 'Bilinmeyen Saha'}
          onClose={() => setSeciliAriza(null)}
        />
      )}

      {silinecekAriza && (
        <SilmeOnayModal
          onConfirm={() => handleArizaSil(silinecekAriza)}
          onCancel={() => setSilinecekAriza(null)}
          mesaj="Bu arızayı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz."
        />
      )}
    </div>
  );
};