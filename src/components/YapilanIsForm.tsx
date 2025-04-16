import React, { useState } from 'react';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { X, Calendar, Building, FileText, Upload, User, Clock } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';
import { FileUploadZone } from './FileUploadZone';
import { uploadMultipleFiles } from '../utils/uploadHelpers';
import toast from 'react-hot-toast';

interface Props {
  onClose: () => void;
  sahalar: Array<{
    id: string;
    ad: string;
  }>;
}

export const YapilanIsForm: React.FC<Props> = ({ onClose, sahalar }) => {
  const { kullanici } = useAuth();
  const [yukleniyor, setYukleniyor] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [form, setForm] = useState({
    baslik: '',
    aciklama: '',
    yapilanIsler: '',
    saha: '',
    tarih: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    baslangicSaati: format(new Date(), "HH:mm"),
    bitisSaati: format(new Date(), "HH:mm"),
    harcananSure: '',
    malzemeler: [''],
    fotograflar: [] as File[]
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kullanici) return;

    if (!form.baslik.trim() || !form.yapilanIsler.trim() || !form.saha) {
      toast.error('Lütfen gerekli alanları doldurun');
      return;
    }

    setYukleniyor(true);
    try {
      // Fotoğrafları yükle
      const fotografURLleri = await uploadMultipleFiles(
        form.fotograflar, 
        'isRaporlari',
        (progress) => setUploadProgress(progress)
      );

      // Raporu kaydet
      await addDoc(collection(db, 'isRaporlari'), {
        baslik: form.baslik,
        aciklama: form.aciklama,
        yapilanIsler: form.yapilanIsler,
        saha: form.saha,
        tarih: Timestamp.fromDate(new Date(form.tarih)),
        baslangicSaati: form.baslangicSaati,
        bitisSaati: form.bitisSaati,
        harcananSure: form.harcananSure,
        malzemeler: form.malzemeler.filter(m => m.trim()),
        fotograflar: fotografURLleri,
        olusturanKisi: {
          id: kullanici.id,
          ad: kullanici.ad,
          rol: kullanici.rol
        },
        olusturmaTarihi: Timestamp.now()
      });

      toast.success('İş raporu başarıyla kaydedildi');
      onClose();
    } catch (error) {
      console.error('İş raporu kaydetme hatası:', error);
      toast.error('İş raporu kaydedilirken bir hata oluştu');
    } finally {
      setYukleniyor(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-4xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <FileText className="h-5 w-5 mr-2 text-yellow-500" />
            Yeni İş Raporu
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Form */}
          <div className="flex-1 overflow-y-auto p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Calendar className="h-4 w-4 inline mr-1" />
                    Tarih
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={form.tarih}
                    onChange={e => setForm(prev => ({ ...prev, tarih: e.target.value }))}
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Clock className="h-4 w-4 inline mr-1" />
                    Başlangıç Saati
                  </label>
                  <input
                    type="time"
                    required
                    value={form.baslangicSaati}
                    onChange={e => setForm(prev => ({ ...prev, baslangicSaati: e.target.value }))}
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Clock className="h-4 w-4 inline mr-1" />
                    Bitiş Saati
                  </label>
                  <input
                    type="time"
                    required
                    value={form.bitisSaati}
                    onChange={e => setForm(prev => ({ ...prev, bitisSaati: e.target.value }))}
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Building className="h-4 w-4 inline mr-1" />
                    Saha
                  </label>
                  <select
                    required
                    value={form.saha}
                    onChange={e => setForm(prev => ({ ...prev, saha: e.target.value }))}
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                  >
                    <option value="">Saha Seçin</option>
                    {sahalar.map(saha => (
                      <option key={saha.id} value={saha.id}>
                        {saha.ad}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Başlık
                  </label>
                  <input
                    type="text"
                    required
                    value={form.baslik}
                    onChange={e => setForm(prev => ({ ...prev, baslik: e.target.value }))}
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                    placeholder="İş raporunun başlığını girin"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Açıklama
                  </label>
                  <textarea
                    value={form.aciklama}
                    onChange={e => setForm(prev => ({ ...prev, aciklama: e.target.value }))}
                    rows={3}
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                    placeholder="Genel açıklama ekleyin"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Yapılan İşler
                  </label>
                  <textarea
                    required
                    value={form.yapilanIsler}
                    onChange={e => setForm(prev => ({ ...prev, yapilanIsler: e.target.value }))}
                    rows={6}
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                    placeholder="Yapılan işleri detaylı olarak yazın..."
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Upload className="h-4 w-4 inline mr-1" />
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
                </div>
              </div>
            </form>
          </div>

          {/* Preview */}
          <div className="w-80 border-l border-gray-200 bg-gray-50 overflow-y-auto p-6">
            <h4 className="text-sm font-medium text-gray-900 mb-4">Önizleme</h4>
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <h5 className="font-medium text-gray-900">{form.baslik || 'Başlık'}</h5>
                <div className="mt-2 text-sm text-gray-500">
                  <p>{form.aciklama || 'Açıklama'}</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm">
                <h5 className="font-medium text-gray-900">Yapılan İşler</h5>
                <div className="mt-2 text-sm text-gray-500">
                  <p className="whitespace-pre-wrap">{form.yapilanIsler || 'Yapılan işler listesi'}</p>
                </div>
              </div>

              {form.malzemeler.some(m => m.trim()) && (
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <h5 className="font-medium text-gray-900">Kullanılan Malzemeler</h5>
                  <ul className="mt-2 list-disc list-inside text-sm text-gray-500">
                    {form.malzemeler.filter(m => m.trim()).map((malzeme, index) => (
                      <li key={index}>{malzeme}</li>
                    ))}
                  </ul>
                </div>
              )}

              {form.fotograflar.length > 0 && (
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <h5 className="font-medium text-gray-900 mb-2">Seçilen Fotoğraflar</h5>
                  <div className="grid grid-cols-2 gap-2">
                    {form.fotograflar.map((file, index) => (
                      <div key={index} className="relative aspect-square">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Önizleme ${index + 1}`}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 px-6 py-4 border-t border-gray-200 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            İptal
          </button>
          <button
            onClick={handleSubmit}
            disabled={yukleniyor}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50"
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
      </div>
    </div>
  );
};