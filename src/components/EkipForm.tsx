import React, { useState } from 'react';
import { createUserWithProfile } from '../lib/firebase';
import { X } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';
import toast from 'react-hot-toast';
import type { KullaniciRolu } from '../types';

interface Props {
  onClose: () => void;
}

interface EkipFormu {
  ad: string;
  email: string;
  telefon: string;
  rol: KullaniciRolu;
  sifre: string;
  sifreTekrar: string;
}

export const EkipForm: React.FC<Props> = ({ onClose }) => {
  const [yukleniyor, setYukleniyor] = useState(false);
  const [form, setForm] = useState<EkipFormu>({
    ad: '',
    email: '',
    telefon: '',
    rol: 'tekniker',
    sifre: '',
    sifreTekrar: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.sifre !== form.sifreTekrar) {
      toast.error('Şifreler eşleşmiyor');
      return;
    }

    if (form.sifre.length < 6) {
      toast.error('Şifre en az 6 karakter olmalıdır');
      return;
    }

    setYukleniyor(true);

    try {
      const userData = {
        ad: form.ad,
        email: form.email,
        telefon: form.telefon || '',
        rol: form.rol,
        fotoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(form.ad)}&background=random`
      };

      await createUserWithProfile(form.email, form.sifre, userData);
      toast.success('Ekip üyesi başarıyla eklendi');
      onClose();
    } catch (error) {
      // Hata yönetimi firebase.ts'de yapılıyor
    } finally {
      setYukleniyor(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-lg w-full">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">
            Yeni Ekip Üyesi Ekle
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Ad Soyad
              </label>
              <input
                type="text"
                required
                value={form.ad}
                onChange={e => setForm(prev => ({ ...prev, ad: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                E-posta
              </label>
              <input
                type="email"
                required
                value={form.email}
                onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Şifre
              </label>
              <input
                type="password"
                required
                value={form.sifre}
                onChange={e => setForm(prev => ({ ...prev, sifre: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Şifre Tekrar
              </label>
              <input
                type="password"
                required
                value={form.sifreTekrar}
                onChange={e => setForm(prev => ({ ...prev, sifreTekrar: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Telefon
              </label>
              <input
                type="tel"
                value={form.telefon}
                onChange={e => setForm(prev => ({ ...prev, telefon: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Rol
              </label>
              <select
                required
                value={form.rol}
                onChange={e => setForm(prev => ({ ...prev, rol: e.target.value as KullaniciRolu }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
              >
                <option value="tekniker">Tekniker</option>
                <option value="muhendis">Mühendis</option>
                <option value="yonetici">Yönetici</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={yukleniyor}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50"
            >
              {yukleniyor ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="ml-2">Ekleniyor...</span>
                </>
              ) : (
                'Ekle'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};