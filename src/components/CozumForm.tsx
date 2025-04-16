import React, { useState } from 'react';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { X, Upload } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';
import { FileUploadZone } from './FileUploadZone';
import toast from 'react-hot-toast';
import type { Ariza } from '../types';

interface Props {
  ariza: Ariza;
  onClose: () => void;
}

export const CozumForm: React.FC<Props> = ({ ariza, onClose }) => {
  const { kullanici } = useAuth();
  const [yukleniyor, setYukleniyor] = useState(false);
  const [form, setForm] = useState({
    aciklama: ariza.cozum?.aciklama || '',
    malzemeler: ariza.cozum?.malzemeler || [''],
    tamamlanmaTarihi: ariza.cozum?.tamamlanmaTarihi 
      ? format(ariza.cozum.tamamlanmaTarihi.toDate(), "yyyy-MM-dd'T'HH:mm")
      : format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    fotograflar: [] as File[]
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kullanici) return;

    if (!form.aciklama.trim()) {
      toast.error('Lütfen çözüm açıklaması girin');
      return;
    }

    setYukleniyor(true);

    try {
      // Fotoğrafları yükle
      const fotografURLleri = [];
      
      // Mevcut fotoğrafları koru
      if (ariza.cozum?.fotograflar) {
        fotografURLleri.push(...ariza.cozum.fotograflar);
      }

      // Yeni fotoğrafları yükle
      for (const foto of form.fotograflar) {
        const storageRef = ref(storage, `cozumler/${Date.now()}_${foto.name}`);
        const snapshot = await uploadBytes(storageRef, foto);
        const url = await getDownloadURL(snapshot.ref);
        fotografURLleri.push(url);
      }

      // Arızayı güncelle
      const docRef = doc(db, 'arizalar', ariza.id);
      await updateDoc(docRef, {
        durum: 'cozuldu',
        guncellenmeTarihi: Timestamp.now(),
        cozum: {
          aciklama: form.aciklama,
          malzemeler: form.malzemeler.filter(m => m.trim()),
          tamamlanmaTarihi: Timestamp.fromDate(new Date(form.tamamlanmaTarihi)),
          tamamlayanKisi: kullanici.id,
          fotograflar: fotografURLleri
        }
      });

      toast.success('Arıza çözüldü olarak işaretlendi');
      onClose();
    } catch (error) {
      console.error('Çözüm kaydetme hatası:', error);
      toast.error('Çözüm kaydedilirken bir hata oluştu');
    } finally {
      setYukleniyor(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              {ariza.cozum ? 'Çözüm Detaylarını Düzenle' : 'Çözüm Detayları'}
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
              Çözüm Tarihi ve Saati
            </label>
            <input
              type="datetime-local"
              value={form.tamamlanmaTarihi}
              onChange={e => setForm(prev => ({
                ...prev,
                tamamlanmaTarihi: e.target.value
              }))}
              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Çözüm Açıklaması
            </label>
            <textarea
              value={form.aciklama}
              onChange={e => setForm(prev => ({ ...prev, aciklama: e.target.value }))}
              rows={4}
              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
              placeholder="Arıza nasıl çözüldü?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Kullanılan Malzemeler
            </label>
            {form.malzemeler.map((malzeme, index) => (
              <div key={index} className="flex mt-2 space-x-2">
                <input
                  type="text"
                  value={malzeme}
                  onChange={e => {
                    const yeniMalzemeler = [...form.malzemeler];
                    yeniMalzemeler[index] = e.target.value;
                    setForm(prev => ({ ...prev, malzemeler: yeniMalzemeler }));
                  }}
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                  placeholder="Malzeme adı"
                />
                {index === form.malzemeler.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setForm(prev => ({
                      ...prev,
                      malzemeler: [...prev.malzemeler, '']
                    }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    +
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      const yeniMalzemeler = form.malzemeler.filter((_, i) => i !== index);
                      setForm(prev => ({ ...prev, malzemeler: yeniMalzemeler }));
                    }}
                    className="px-3 py-2 border border-red-300 rounded-lg text-sm font-medium text-red-700 hover:bg-red-50"
                  >
                    -
                  </button>
                )}
              </div>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Çözüm Fotoğrafları
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
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
            >
              {yukleniyor ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="ml-2">Kaydediliyor...</span>
                </>
              ) : (
                'Kaydet'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};