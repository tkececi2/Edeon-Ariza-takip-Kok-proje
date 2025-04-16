import React, { useState } from 'react';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { X, Calendar, Building, Clock, AlertTriangle } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';
import toast from 'react-hot-toast';

interface Props {
  onClose: () => void;
  sahalar: Array<{
    id: string;
    ad: string;
  }>;
}

export const ElektrikKesintisiForm: React.FC<Props> = ({ onClose, sahalar }) => {
  const { kullanici } = useAuth();
  const [yukleniyor, setYukleniyor] = useState(false);
  const [form, setForm] = useState({
    sahaId: '',
    baslangicTarihi: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    bitisTarihi: '',
    aciklama: '',
    etkiAlani: '',
    durum: 'devam-ediyor' as 'devam-ediyor' | 'tamamlandi'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kullanici) return;

    if (!form.sahaId || !form.baslangicTarihi || !form.aciklama) {
      toast.error('Lütfen gerekli alanları doldurun');
      return;
    }

    setYukleniyor(true);
    try {
      const baslangic = new Date(form.baslangicTarihi);
      const bitis = form.bitisTarihi ? new Date(form.bitisTarihi) : null;
      
      let sure = 0;
      if (bitis) {
        sure = Math.round((bitis.getTime() - baslangic.getTime()) / (1000 * 60));
      }

      await addDoc(collection(db, 'elektrikKesintileri'), {
        sahaId: form.sahaId,
        baslangicTarihi: Timestamp.fromDate(baslangic),
        bitisTarihi: bitis ? Timestamp.fromDate(bitis) : null,
        sure: sure,
        aciklama: form.aciklama,
        etkiAlani: form.etkiAlani,
        durum: bitis ? 'tamamlandi' : 'devam-ediyor',
        olusturanKisi: {
          id: kullanici.id,
          ad: kullanici.ad
        },
        olusturmaTarihi: Timestamp.now()
      });

      toast.success('Kesinti kaydı başarıyla oluşturuldu');
      onClose();
    } catch (error) {
      console.error('Kesinti kaydı oluşturma hatası:', error);
      toast.error('Kesinti kaydı oluşturulurken bir hata oluştu');
    } finally {
      setYukleniyor(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <h2 className="text-lg font-medium text-gray-900">
            Yeni Elektrik Kesintisi Kaydı
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
            <div className="grid grid-cols-2 gap-6">
              {/* Sol Kolon */}
              <div className="space-y-6">
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
                    Başlangıç Tarihi ve Saati
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={form.baslangicTarihi}
                    onChange={e => setForm(prev => ({ ...prev, baslangicTarihi: e.target.value }))}
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    <Calendar className="h-4 w-4 inline mr-2" />
                    Bitiş Tarihi ve Saati
                  </label>
                  <input
                    type="datetime-local"
                    value={form.bitisTarihi}
                    onChange={e => setForm(prev => ({ ...prev, bitisTarihi: e.target.value }))}
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Kesinti devam ediyorsa boş bırakın
                  </p>
                </div>
              </div>

              {/* Sağ Kolon */}
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Etkilenen Alan/Bölge
                  </label>
                  <input
                    type="text"
                    value={form.etkiAlani}
                    onChange={e => setForm(prev => ({ ...prev, etkiAlani: e.target.value }))}
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                    placeholder="Örn: A Blok, Tüm Tesis, vb."
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
                    rows={8}
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                    placeholder="Kesinti sebebi ve detayları..."
                  />
                </div>
              </div>
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