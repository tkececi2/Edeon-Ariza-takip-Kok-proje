import React, { useState, useEffect } from 'react';
import { collection, doc, addDoc, updateDoc, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { X } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';
import { FileUploadZone } from './FileUploadZone';
import toast from 'react-hot-toast';
import type { Ariza } from '../types';

interface Props {
  ariza?: Ariza | null;
  onClose: () => void;
}

export const ArizaForm: React.FC<Props> = ({ ariza, onClose }) => {
  const { kullanici } = useAuth();
  const [yukleniyor, setYukleniyor] = useState(false);
  const [sahalar, setSahalar] = useState<Array<{id: string, ad: string}>>([]);
  const [teknisyenler, setTeknisyenler] = useState<Array<{id: string, ad: string}>>([]);

  const [form, setForm] = useState({
    baslik: ariza?.baslik || '',
    aciklama: ariza?.aciklama || '',
    konum: ariza?.konum || '',
    saha: ariza?.saha || '',
    oncelik: ariza?.oncelik || 'orta',
    atananKisi: ariza?.atananKisi || '',
    durum: ariza?.durum || 'acik',
    olusturmaTarihi: ariza?.olusturmaTarihi 
      ? format(ariza.olusturmaTarihi.toDate(), "yyyy-MM-dd'T'HH:mm")
      : format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    cozumTarihi: ariza?.cozum?.tamamlanmaTarihi 
      ? format(ariza.cozum.tamamlanmaTarihi.toDate(), "yyyy-MM-dd'T'HH:mm")
      : '',
    fotograflar: [] as File[],
    mevcutFotograflar: ariza?.fotograflar || []
  });

  useEffect(() => {
    const veriGetir = async () => {
      try {
        // Sahaları getir
        const sahaSnapshot = await getDocs(collection(db, 'sahalar'));
        const sahaListesi = sahaSnapshot.docs.map(doc => ({
          id: doc.id,
          ad: doc.data().ad
        }));
        setSahalar(sahaListesi);

        // Teknisyenleri getir
        const teknisyenQuery = query(
          collection(db, 'kullanicilar'),
          where('rol', 'in', ['tekniker', 'muhendis'])
        );
        const teknisyenSnapshot = await getDocs(teknisyenQuery);
        const teknisyenListesi = teknisyenSnapshot.docs.map(doc => ({
          id: doc.id,
          ad: doc.data().ad
        }));
        setTeknisyenler(teknisyenListesi);
      } catch (error) {
        console.error('Veri getirme hatası:', error);
        toast.error('Veriler yüklenirken bir hata oluştu');
      }
    };

    veriGetir();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kullanici) return;

    setYukleniyor(true);
    try {
      // Yeni fotoğrafları yükle
      const fotografURLleri = [...form.mevcutFotograflar];
      
      for (const foto of form.fotograflar) {
        const storageRef = ref(storage, `arizalar/${Date.now()}_${foto.name}`);
        const snapshot = await uploadBytes(storageRef, foto);
        const url = await getDownloadURL(snapshot.ref);
        fotografURLleri.push(url);
      }

      const arizaData = {
        baslik: form.baslik,
        aciklama: form.aciklama,
        konum: form.konum,
        saha: form.saha,
        oncelik: form.oncelik,
        atananKisi: form.atananKisi || null,
        durum: form.durum,
        fotograflar: fotografURLleri,
        olusturmaTarihi: Timestamp.fromDate(new Date(form.olusturmaTarihi)),
        guncellenmeTarihi: Timestamp.now()
      };

      if (ariza) {
        // Güncelleme
        const docRef = doc(db, 'arizalar', ariza.id);
        await updateDoc(docRef, {
          ...arizaData,
          ...(ariza.cozum && form.cozumTarihi ? {
            cozum: {
              ...ariza.cozum,
              tamamlanmaTarihi: Timestamp.fromDate(new Date(form.cozumTarihi))
            }
          } : {})
        });
        toast.success('Arıza kaydı güncellendi');
      } else {
        // Yeni kayıt
        await addDoc(collection(db, 'arizalar'), {
          ...arizaData,
          olusturanKisi: kullanici.id,
          yorumlar: []
        });
        toast.success('Arıza kaydı oluşturuldu');
      }

      onClose();
    } catch (error) {
      console.error('Arıza kaydetme hatası:', error);
      toast.error(ariza ? 'Arıza güncellenirken bir hata oluştu' : 'Arıza kaydedilirken bir hata oluştu');
    } finally {
      setYukleniyor(false);
    }
  };

  const handleFotoSil = (index: number) => {
    setForm(prev => ({
      ...prev,
      mevcutFotograflar: prev.mevcutFotograflar.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              {ariza ? 'Arıza Düzenle' : 'Yeni Arıza'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Oluşturma Tarihi ve Saati
            </label>
            <input
              type="datetime-local"
              value={form.olusturmaTarihi}
              onChange={e => setForm(prev => ({
                ...prev,
                olusturmaTarihi: e.target.value
              }))}
              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
            />
          </div>

          {ariza?.cozum && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Çözüm Tarihi ve Saati
              </label>
              <input
                type="datetime-local"
                value={form.cozumTarihi}
                onChange={e => setForm(prev => ({
                  ...prev,
                  cozumTarihi: e.target.value
                }))}
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Başlık
            </label>
            <input
              type="text"
              required
              value={form.baslik}
              onChange={e => setForm(prev => ({ ...prev, baslik: e.target.value }))}
              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Açıklama
            </label>
            <textarea
              required
              value={form.aciklama}
              onChange={e => setForm(prev => ({ ...prev, aciklama: e.target.value }))}
              rows={4}
              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Konum
            </label>
            <input
              type="text"
              required
              value={form.konum}
              onChange={e => setForm(prev => ({ ...prev, konum: e.target.value }))}
              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Saha
            </label>
            <select
              required
              value={form.saha}
              onChange={e => setForm(prev => ({ ...prev, saha: e.target.value }))}
              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
            >
              <option value="">Saha Seçin</option>
              {sahalar.map(saha => (
                <option key={saha.id} value={saha.id}>
                  {saha.ad}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Atanan Teknisyen
            </label>
            <select
              value={form.atananKisi}
              onChange={e => setForm(prev => ({ ...prev, atananKisi: e.target.value }))}
              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
            >
              <option value="">Teknisyen Seçin</option>
              {teknisyenler.map(teknisyen => (
                <option key={teknisyen.id} value={teknisyen.id}>
                  {teknisyen.ad}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Durum
            </label>
            <select
              value={form.durum}
              onChange={e => setForm(prev => ({ ...prev, durum: e.target.value }))}
              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
            >
              <option value="acik">Açık</option>
              <option value="devam-ediyor">Devam Ediyor</option>
              <option value="beklemede">Beklemede</option>
              <option value="cozuldu">Çözüldü</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Öncelik
            </label>
            <select
              value={form.oncelik}
              onChange={e => setForm(prev => ({ ...prev, oncelik: e.target.value }))}
              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
            >
              <option value="dusuk">Düşük</option>
              <option value="orta">Orta</option>
              <option value="yuksek">Yüksek</option>
              <option value="acil">Acil</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mevcut Fotoğraflar
            </label>
            {form.mevcutFotograflar.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 mb-4">
                {form.mevcutFotograflar.map((foto, index) => (
                  <div key={index} className="relative">
                    <img
                      src={foto}
                      alt={`Fotoğraf ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => handleFotoSil(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 mb-4">Mevcut fotoğraf bulunmuyor</p>
            )}

            <label className="block text-sm font-medium text-gray-700 mb-2">
              Yeni Fotoğraflar Ekle
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
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
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
                  <span className="ml-2">{ariza ? 'Güncelleniyor...' : 'Kaydediliyor...'}</span>
                </>
              ) : (
                ariza ? 'Güncelle' : 'Kaydet'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};