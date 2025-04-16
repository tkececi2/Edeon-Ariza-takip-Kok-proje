import React, { useState, useEffect } from 'react';
import { createUserWithProfile, db } from '../lib/firebase';
import { collection, getDocs, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { X, Users, Building, MapPin, Mail, Phone, Briefcase, Home, Save, ArrowLeft } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';
import toast from 'react-hot-toast';
import type { Kullanici } from '../types';

interface Props {
  sahalar: Array<{
    id: string;
    ad: string;
  }>;
  musteri?: Kullanici | null;
  onClose: () => void;
}

interface MusteriFormu {
  ad: string;
  email: string;
  telefon: string;
  sirket: string;
  adres: string;
  sahalar: string[]; // Birden fazla saha seçimi için dizi
  sifre: string;
  sifreTekrar: string;
}

export const MusteriForm: React.FC<Props> = ({ sahalar, musteri, onClose }) => {
  const [yukleniyor, setYukleniyor] = useState(false);
  const [santraller, setSantraller] = useState<Array<{id: string, ad: string}>>([]);
  const [activeTab, setActiveTab] = useState<'basic' | 'assignments' | 'address'>('basic');
  const [form, setForm] = useState<MusteriFormu>({
    ad: musteri?.ad || '',
    email: musteri?.email || '',
    telefon: musteri?.telefon || '',
    sirket: musteri?.sirket || '',
    adres: musteri?.adres || '',
    sahalar: musteri?.sahalar || [], // Boş dizi olarak başlat
    sifre: '',
    sifreTekrar: ''
  });

  useEffect(() => {
    const veriGetir = async () => {
      try {
        // Sahaları getir
        const sahaQuery = query(collection(db, 'sahalar'), orderBy('ad'));
        const sahaSnapshot = await getDocs(sahaQuery);
        const sahaListesi = sahaSnapshot.docs.map(doc => ({
          id: doc.id,
          ad: doc.data().ad
        }));
        
        // Santralleri getir
        const santralQuery = query(collection(db, 'santraller'), orderBy('ad'));
        const santralSnapshot = await getDocs(santralQuery);
        const santralListesi = santralSnapshot.docs.map(doc => ({
          id: doc.id,
          ad: doc.data().ad
        }));
        
        setSantraller(santralListesi);
      } catch (error) {
        console.error('Veri getirme hatası:', error);
        toast.error('Veriler yüklenirken bir hata oluştu');
      }
    };

    veriGetir();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!musteri && form.sifre !== form.sifreTekrar) {
      toast.error('Şifreler eşleşmiyor');
      return;
    }

    if (!musteri && form.sifre.length < 6) {
      toast.error('Şifre en az 6 karakter olmalıdır');
      return;
    }

    setYukleniyor(true);

    try {
      if (musteri) {
        // Mevcut müşteriyi güncelle
        await updateDoc(doc(db, 'kullanicilar', musteri.id), {
          ad: form.ad,
          telefon: form.telefon || '',
          sirket: form.sirket || '',
          adres: form.adres || '',
          sahalar: form.sahalar,
          guncellenmeTarihi: new Date()
        });
        toast.success('Müşteri bilgileri güncellendi');
      } else {
        // Yeni müşteri oluştur
        const userData = {
          ad: form.ad,
          email: form.email,
          telefon: form.telefon || '',
          sirket: form.sirket || '',
          adres: form.adres || '',
          sahalar: form.sahalar,
          rol: 'musteri',
          fotoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(form.ad)}&background=random`
        };

        await createUserWithProfile(form.email, form.sifre, userData);
        toast.success('Müşteri başarıyla oluşturuldu');
      }
      onClose();
    } catch (error) {
      // Hata yönetimi firebase.ts'de yapılıyor
    } finally {
      setYukleniyor(false);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'basic':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700">
                <Users className="h-4 w-4 inline mr-2" />
                Ad Soyad
              </label>
              <input
                type="text"
                required
                value={form.ad}
                onChange={e => setForm(prev => ({ ...prev, ad: e.target.value }))}
                className="mt-1 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700">
                <Mail className="h-4 w-4 inline mr-2" />
                E-posta
              </label>
              <input
                type="email"
                required
                value={form.email}
                onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                className="mt-1 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                disabled={!!musteri} // Mevcut müşteri düzenleniyorsa email değiştirilemez
              />
            </div>

            {!musteri && (
              <>
                <div>
                  <label className="block text-sm font-medium text-neutral-700">
                    Şifre
                  </label>
                  <input
                    type="password"
                    required={!musteri}
                    value={form.sifre}
                    onChange={e => setForm(prev => ({ ...prev, sifre: e.target.value }))}
                    className="mt-1 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700">
                    Şifre Tekrar
                  </label>
                  <input
                    type="password"
                    required={!musteri}
                    value={form.sifreTekrar}
                    onChange={e => setForm(prev => ({ ...prev, sifreTekrar: e.target.value }))}
                    className="mt-1 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-neutral-700">
                <Phone className="h-4 w-4 inline mr-2" />
                Telefon
              </label>
              <input
                type="tel"
                value={form.telefon}
                onChange={e => setForm(prev => ({ ...prev, telefon: e.target.value }))}
                className="mt-1 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700">
                <Briefcase className="h-4 w-4 inline mr-2" />
                Şirket
              </label>
              <input
                type="text"
                value={form.sirket}
                onChange={e => setForm(prev => ({ ...prev, sirket: e.target.value }))}
                className="mt-1 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
            </div>
          </div>
        );
      
      case 'assignments':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                <Building className="h-4 w-4 inline mr-2" />
                Saha Atamaları
              </label>
              <div className="bg-neutral-50 p-4 rounded-lg max-h-48 overflow-y-auto">
                <div className="space-y-2">
                  {sahalar.length > 0 ? (
                    sahalar.map((saha) => (
                      <label key={saha.id} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={form.sahalar.includes(saha.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setForm(prev => ({
                                ...prev,
                                sahalar: [...prev.sahalar, saha.id]
                              }));
                            } else {
                              setForm(prev => ({
                                ...prev,
                                sahalar: prev.sahalar.filter(id => id !== saha.id)
                              }));
                            }
                          }}
                          className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500 h-4 w-4"
                        />
                        <span className="ml-2 text-sm text-neutral-700">{saha.ad}</span>
                      </label>
                    ))
                  ) : (
                    <p className="text-sm text-neutral-500">Henüz saha bulunmuyor</p>
                  )}
                </div>
              </div>
              <p className="mt-2 text-xs text-neutral-500">
                Müşterinin erişebileceği sahaları seçin. Müşteri sadece kendisine atanan sahaların verilerini görebilecektir.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                <MapPin className="h-4 w-4 inline mr-2" />
                Santral Atamaları
              </label>
              <div className="bg-neutral-50 p-4 rounded-lg max-h-48 overflow-y-auto">
                <div className="space-y-2">
                  {santraller.length > 0 ? (
                    santraller.map((santral) => (
                      <label key={santral.id} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={form.sahalar.includes(santral.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setForm(prev => ({
                                ...prev,
                                sahalar: [...prev.sahalar, santral.id]
                              }));
                            } else {
                              setForm(prev => ({
                                ...prev,
                                sahalar: prev.sahalar.filter(id => id !== santral.id)
                              }));
                            }
                          }}
                          className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500 h-4 w-4"
                        />
                        <span className="ml-2 text-sm text-neutral-700">{santral.ad}</span>
                      </label>
                    ))
                  ) : (
                    <p className="text-sm text-neutral-500">Henüz santral bulunmuyor</p>
                  )}
                </div>
              </div>
              <p className="mt-2 text-xs text-neutral-500">
                Müşterinin erişebileceği santralleri seçin. Müşteri sadece kendisine atanan santrallerin verilerini görebilecektir.
              </p>
            </div>
          </div>
        );
      
      case 'address':
        return (
          <div>
            <label className="block text-sm font-medium text-neutral-700">
              <Home className="h-4 w-4 inline mr-2" />
              Adres
            </label>
            <textarea
              value={form.adres}
              onChange={e => setForm(prev => ({ ...prev, adres: e.target.value }))}
              rows={5}
              className="mt-1 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              placeholder="Müşterinin tam adresini girin"
            />
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-neutral-500 bg-opacity-75 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between flex-shrink-0">
          <h2 className="text-lg font-medium text-neutral-900">
            {musteri ? 'Müşteri Düzenle' : 'Yeni Müşteri Ekle'}
          </h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-neutral-200">
          <nav className="-mb-px flex">
            <button
              onClick={() => setActiveTab('basic')}
              className={`${
                activeTab === 'basic'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
              } flex-1 py-4 px-1 text-center border-b-2 font-medium text-sm`}
            >
              <Users className="h-5 w-5 mx-auto mb-1" />
              <span className="hidden sm:inline">Temel Bilgiler</span>
              <span className="sm:hidden">Temel</span>
            </button>
            <button
              onClick={() => setActiveTab('assignments')}
              className={`${
                activeTab === 'assignments'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
              } flex-1 py-4 px-1 text-center border-b-2 font-medium text-sm`}
            >
              <Building className="h-5 w-5 mx-auto mb-1" />
              <span className="hidden sm:inline">Atamalar</span>
              <span className="sm:hidden">Atama</span>
            </button>
            <button
              onClick={() => setActiveTab('address')}
              className={`${
                activeTab === 'address'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
              } flex-1 py-4 px-1 text-center border-b-2 font-medium text-sm`}
            >
              <MapPin className="h-5 w-5 mx-auto mb-1" />
              <span className="hidden sm:inline">Adres Bilgileri</span>
              <span className="sm:hidden">Adres</span>
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <form id="musteriForm" onSubmit={handleSubmit}>
            {renderTabContent()}
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-200 flex justify-between flex-shrink-0">
          <div>
            {activeTab !== 'basic' && (
              <button
                type="button"
                onClick={() => {
                  if (activeTab === 'assignments') setActiveTab('basic');
                  if (activeTab === 'address') setActiveTab('assignments');
                }}
                className="inline-flex items-center px-4 py-2 border border-neutral-300 rounded-md text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Geri
              </button>
            )}
          </div>
          
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-neutral-300 rounded-md text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              İptal
            </button>
            
            {activeTab !== 'address' ? (
              <button
                type="button"
                onClick={() => {
                  if (activeTab === 'basic') setActiveTab('assignments');
                  if (activeTab === 'assignments') setActiveTab('address');
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
              >
                İleri
              </button>
            ) : (
              <button
                type="submit"
                form="musteriForm"
                disabled={yukleniyor}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
              >
                {yukleniyor ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span className="ml-2">{musteri ? 'Güncelleniyor...' : 'Ekleniyor...'}</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {musteri ? 'Güncelle' : 'Kaydet'}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};