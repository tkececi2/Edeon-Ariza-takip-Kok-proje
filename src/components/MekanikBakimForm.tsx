import React, { useState } from 'react';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { X, Calendar, Building, Upload, Save } from 'lucide-react';
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

interface KontrolDurumu {
  durum: boolean;
  aciklama: string;
}

const KONTROL_GRUPLARI = {
  cevreselDurum: {
    baslik: '1. Çevresel Durum',
    kontroller: {
      karTozKum: { label: 'Kar, toz, kum birikimi', key: 'karTozKum' },
      kusKirliligi: { label: 'Kuş popülasyonuna bağlı kirlilik', key: 'kusKirliligi' },
      bitkiHayvan: { label: 'Bitki örtüsü ve yabani hayvan etkileri', key: 'bitkiHayvan' }
    }
  },
  araziDurumu: {
    baslik: '2. Arazi ve Toprak Koşulları',
    kontroller: {
      toprakErozyonu: { label: 'Toprak erozyonu', key: 'toprakErozyonu' },
      suBirikintileri: { label: 'Su birikintileri ve çatlaklar', key: 'suBirikintileri' },
      cokmeVeCukurlar: { label: 'Çökme, çukurlar, oyuklar', key: 'cokmeVeCukurlar' }
    }
  },
  tasiyiciYapilar: {
    baslik: '3. Taşıyıcı Yapılar',
    kontroller: {
      yapiButunlugu: { label: 'Modül taşıyıcı yapı bütünlüğü', key: 'yapiButunlugu' },
      paslanmaKorozyon: { label: 'Paslanma ve korozyon', key: 'paslanmaKorozyon' },
      gevsekBaglantilar: { label: 'Gevşek bağlantılar', key: 'gevsekBaglantilar' }
    }
  },
  kazikVeKirisler: {
    baslik: '4. Kazıklar ve Kirişler',
    kontroller: {
      boyutlar: { label: 'Kazık ve kiriş türleri/boyutları', key: 'boyutlar' },
      paslanmaKorozyon: { label: 'Paslanma ve korozyon', key: 'paslanmaKorozyon' },
      gevsekCivatalar: { label: 'Gevşek civatalar', key: 'gevsekCivatalar' }
    }
  },
  pvModulleri: {
    baslik: '5. PV Modülleri',
    kontroller: {
      kirilmaVeCatlaklar: { label: 'Kırılma, çatlama ve renk bozulmaları', key: 'kirilmaVeCatlaklar' },
      tozKirBirikimi: { label: 'Toz/kir birikimi ve sıcak noktalar', key: 'tozKirBirikimi' },
      gevsekKlempler: { label: 'Gevşek klempler', key: 'gevsekKlempler' }
    }
  },
  elektrikSistemleri: {
    baslik: '6. Elektrik Sistemleri',
    kontroller: {
      montajYapilari: { label: 'İnvertör ve DC/AC kutu montaj yapıları', key: 'montajYapilari' },
      paslanmaKorozyon: { label: 'Paslanma ve korozyon', key: 'paslanmaKorozyon' },
      gevsekBaglantilar: { label: 'Gevşek bağlantılar', key: 'gevsekBaglantilar' }
    }
  }
};

export const MekanikBakimForm: React.FC<Props> = ({ onClose, sahalar }) => {
  const { kullanici } = useAuth();
  const [yukleniyor, setYukleniyor] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  
  const [form, setForm] = useState({
    sahaId: '',
    tarih: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    fotograflar: [] as File[],
    durumlar: Object.fromEntries(
      Object.entries(KONTROL_GRUPLARI).map(([key]) => [
        key,
        Object.fromEntries(
          Object.entries(KONTROL_GRUPLARI[key].kontroller).map(([kontrolKey]) => [
            kontrolKey,
            { durum: true, aciklama: '' }
          ])
        )
      ])
    ),
    genelNotlar: ''
  });

  const handleDurumChange = (
    kategori: string,
    alan: string,
    value: boolean | string,
    tip: 'durum' | 'aciklama'
  ) => {
    setForm(prev => ({
      ...prev,
      durumlar: {
        ...prev.durumlar,
        [kategori]: {
          ...prev.durumlar[kategori],
          [alan]: {
            ...prev.durumlar[kategori][alan],
            [tip]: value
          }
        }
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kullanici) return;

    if (!form.sahaId || !form.tarih) {
      toast.error('Lütfen gerekli alanları doldurun');
      return;
    }

    setYukleniyor(true);
    try {
      // Fotoğrafları yükle
      const fotografURLleri = await uploadMultipleFiles(
        form.fotograflar,
        'mekanikBakimlar',
        (progress) => setUploadProgress(progress)
      );

      // Durumları düzenle
      const durumlar = Object.entries(form.durumlar).reduce((acc, [key, value]) => {
        acc[key] = Object.entries(value).reduce((subAcc, [subKey, subValue]) => {
          subAcc[subKey] = subValue.durum;
          if (subValue.aciklama) {
            if (!acc[`${key}Aciklamalar`]) {
              acc[`${key}Aciklamalar`] = {};
            }
            acc[`${key}Aciklamalar`][subKey] = subValue.aciklama;
          }
          return subAcc;
        }, {});
        return acc;
      }, {});

      // Bakım kaydını oluştur
      await addDoc(collection(db, 'mekanikBakimlar'), {
        sahaId: form.sahaId,
        tarih: Timestamp.fromDate(new Date(form.tarih)),
        fotograflar: fotografURLleri,
        durumlar,
        genelNotlar: form.genelNotlar,
        kontrolEden: {
          id: kullanici.id,
          ad: kullanici.ad,
          rol: kullanici.rol
        },
        olusturmaTarihi: Timestamp.now()
      });

      toast.success('Bakım kaydı başarıyla oluşturuldu');
      onClose();
    } catch (error) {
      console.error('Bakım kaydı oluşturma hatası:', error);
      toast.error('Bakım kaydı oluşturulurken bir hata oluştu');
    } finally {
      setYukleniyor(false);
    }
  };

  const renderKontrolGrubu = (
    baslik: string,
    kategori: string,
    kontroller: { [key: string]: { label: string; key: string } }
  ) => (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">{baslik}</h3>
      {Object.entries(kontroller).map(([key, { label }]) => (
        <div key={key} className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              {label}
            </label>
            <div className="flex items-center space-x-4">
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  checked={form.durumlar[kategori][key].durum}
                  onChange={(e) => handleDurumChange(kategori, key, e.target.checked, 'durum')}
                  className="rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
                />
                <span className="ml-2 text-sm text-gray-700">Kontrol Edildi</span>
              </label>
            </div>
          </div>
          <textarea
            value={form.durumlar[kategori][key].aciklama}
            onChange={(e) => handleDurumChange(kategori, key, e.target.value, 'aciklama')}
            placeholder="Açıklama ekleyin..."
            rows={2}
            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
          />
        </div>
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <h2 className="text-lg font-medium text-gray-900">
            Yeni Mekanik Bakım Kaydı
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
            </div>

            <div className="space-y-8">
              {Object.entries(KONTROL_GRUPLARI).map(([key, { baslik, kontroller }]) => (
                <div key={key}>
                  {renderKontrolGrubu(baslik, key, kontroller)}
                </div>
              ))}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Upload className="h-4 w-4 inline mr-2" />
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

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Genel Notlar ve Açıklamalar
              </label>
              <textarea
                value={form.genelNotlar}
                onChange={e => setForm(prev => ({ ...prev, genelNotlar: e.target.value }))}
                rows={4}
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                placeholder="Genel gözlem ve notlarınızı buraya yazın..."
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
              <>
                <Save className="h-4 w-4 mr-2" />
                Kaydet
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};