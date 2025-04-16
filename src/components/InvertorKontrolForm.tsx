import React, { useState } from 'react';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { X, Plus, Minus, Building, Calendar } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';
import toast from 'react-hot-toast';

interface Props {
  onClose: () => void;
  sahalar: Array<{
    id: string;
    ad: string;
  }>;
}

interface Invertor {
  ad: string;
  dizeCalisiyor: boolean;
}

export const InvertorKontrolForm: React.FC<Props> = ({ onClose, sahalar }) => {
  const { kullanici } = useAuth();
  const [yukleniyor, setYukleniyor] = useState(false);
  const [form, setForm] = useState({
    sahaId: '',
    tarih: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    invertorler: [{ ad: 'İnvertör 1', dizeCalisiyor: true }] as Invertor[],
    aciklama: ''
  });

  const handleInvertorEkle = () => {
    setForm(prev => ({
      ...prev,
      invertorler: [
        ...prev.invertorler,
        { ad: `İnvertör ${prev.invertorler.length + 1}`, dizeCalisiyor: true }
      ]
    }));
  };

  const handleInvertorSil = (index: number) => {
    setForm(prev => ({
      ...prev,
      invertorler: prev.invertorler.filter((_, i) => i !== index)
    }));
  };

  const handleInvertorDuzenle = (index: number, field: keyof Invertor, value: string | boolean) => {
    setForm(prev => ({
      ...prev,
      invertorler: prev.invertorler.map((inv, i) => 
        i === index ? { ...inv, [field]: value } : inv
      )
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kullanici) return;

    if (!form.sahaId || !form.tarih || form.invertorler.length === 0) {
      toast.error('Lütfen gerekli alanları doldurun');
      return;
    }

    setYukleniyor(true);
    try {
      await addDoc(collection(db, 'invertorKontroller'), {
        sahaId: form.sahaId,
        tarih: Timestamp.fromDate(new Date(form.tarih)),
        invertorler: form.invertorler,
        aciklama: form.aciklama,
        olusturanKisi: {
          id: kullanici.id,
          ad: kullanici.ad,
          rol: kullanici.rol
        },
        olusturmaTarihi: Timestamp.now()
      });

      toast.success('Kontrol kaydı başarıyla oluşturuldu');
      onClose();
    } catch (error) {
      console.error('Kontrol kaydı oluşturma hatası:', error);
      toast.error('Kontrol kaydı oluşturulurken bir hata oluştu');
    } finally {
      setYukleniyor(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <h2 className="text-lg font-medium text-gray-900">
            Yeni İnvertör Kontrol Kaydı
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                <Building className="h-4 w-4 inline mr-2" />
                Saha
              </label>
              <select
                required
                value={form.sahaId}
                onChange={e => setForm(prev => ({ ...prev, sahaId: e.target.value }))}
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
              >
                <option value="">Saha Seçin</option>
                {sahalar.map(saha => (
                  <option key={saha.id} value={saha.id}>{saha.ad}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                <Calendar className="h-4 w-4 inline mr-2" />
                Kontrol Tarihi ve Saati
              </label>
              <input
                type="datetime-local"
                required
                value={form.tarih}
                onChange={e => setForm(prev => ({ ...prev, tarih: e.target.value }))}
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-medium text-gray-700">
                  İnvertörler
                </label>
                <button
                  type="button"
                  onClick={handleInvertorEkle}
                  className="inline-flex items-center px-3 py-1 border border-transparent rounded-md text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  İnvertör Ekle
                </button>
              </div>

              <div className="space-y-4">
                {form.invertorler.map((invertor, index) => (
                  <div key={index} className="flex items-center space-x-4 bg-gray-50 p-4 rounded-lg">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={invertor.ad}
                        onChange={e => handleInvertorDuzenle(index, 'ad', e.target.value)}
                        className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                        placeholder="İnvertör adı"
                      />
                    </div>
                    <div className="flex items-center">
                      <label className="inline-flex items-center">
                        <input
                          type="checkbox"
                          checked={invertor.dizeCalisiyor}
                          onChange={e => handleInvertorDuzenle(index, 'dizeCalisiyor', e.target.checked)}
                          className="rounded border-gray-300 text-yellow-600 focus:ring-yellow-500 h-5 w-5"
                        />
                        <span className="ml-2 text-sm text-gray-700">Dize Çalışıyor</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => handleInvertorSil(index)}
                        className="ml-4 p-1 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-full"
                      >
                        <Minus className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Açıklama
              </label>
              <textarea
                value={form.aciklama}
                onChange={e => setForm(prev => ({ ...prev, aciklama: e.target.value }))}
                rows={4}
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                placeholder="Kontrol sırasındaki gözlemlerinizi yazın..."
              />
            </div>
          </form>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3 flex-shrink-0">
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