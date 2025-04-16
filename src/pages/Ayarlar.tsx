import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updatePassword } from 'firebase/auth';
import { db, storage, auth } from '../lib/firebase';
import { Bell, Shield, User, Camera } from 'lucide-react';
import toast from 'react-hot-toast';

export const Ayarlar: React.FC = () => {
  const { kullanici } = useAuth();
  const [yukleniyor, setYukleniyor] = useState(false);
  const [aktifTab, setAktifTab] = useState('profil');
  
  const [profilForm, setProfilForm] = useState({
    ad: kullanici?.ad || '',
    telefon: kullanici?.telefon || '',
    fotograf: null as File | null
  });

  const [sifreForm, setSifreForm] = useState({
    mevcutSifre: '',
    yeniSifre: '',
    sifreTekrar: ''
  });

  const [bildirimTercihleri, setBildirimTercihleri] = useState({
    yeniAriza: true,
    durumGuncelleme: true,
    yeniYorum: true,
    sistemBildirimleri: true
  });

  const handleProfilGuncelle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kullanici) return;

    setYukleniyor(true);
    try {
      let fotoURL = kullanici.fotoURL;

      if (profilForm.fotograf) {
        const storageRef = ref(storage, `profil/${kullanici.id}`);
        const snapshot = await uploadBytes(storageRef, profilForm.fotograf);
        fotoURL = await getDownloadURL(snapshot.ref);
      }

      await updateDoc(doc(db, 'kullanicilar', kullanici.id), {
        ad: profilForm.ad,
        telefon: profilForm.telefon,
        fotoURL
      });

      toast.success('Profil başarıyla güncellendi');
    } catch (error) {
      toast.error('Profil güncellenirken bir hata oluştu');
    } finally {
      setYukleniyor(false);
    }
  };

  const handleSifreDegistir = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    if (sifreForm.yeniSifre !== sifreForm.sifreTekrar) {
      toast.error('Yeni şifreler eşleşmiyor');
      return;
    }

    setYukleniyor(true);
    try {
      await updatePassword(auth.currentUser, sifreForm.yeniSifre);
      toast.success('Şifre başarıyla güncellendi');
      setSifreForm({ mevcutSifre: '', yeniSifre: '', sifreTekrar: '' });
    } catch (error) {
      toast.error('Şifre güncellenirken bir hata oluştu');
    } finally {
      setYukleniyor(false);
    }
  };

  const handleBildirimGuncelle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kullanici) return;

    setYukleniyor(true);
    try {
      await updateDoc(doc(db, 'kullanicilar', kullanici.id), {
        bildirimTercihleri
      });
      toast.success('Bildirim tercihleri güncellendi');
    } catch (error) {
      toast.error('Bildirim tercihleri güncellenirken bir hata oluştu');
    } finally {
      setYukleniyor(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            <button
              onClick={() => setAktifTab('profil')}
              className={`${
                aktifTab === 'profil'
                  ? 'border-yellow-500 text-yellow-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } flex-1 py-4 px-1 text-center border-b-2 font-medium text-sm`}
            >
              <User className="h-5 w-5 mx-auto mb-1" />
              Profil
            </button>
            <button
              onClick={() => setAktifTab('bildirimler')}
              className={`${
                aktifTab === 'bildirimler'
                  ? 'border-yellow-500 text-yellow-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } flex-1 py-4 px-1 text-center border-b-2 font-medium text-sm`}
            >
              <Bell className="h-5 w-5 mx-auto mb-1" />
              Bildirimler
            </button>
            <button
              onClick={() => setAktifTab('guvenlik')}
              className={`${
                aktifTab === 'guvenlik'
                  ? 'border-yellow-500 text-yellow-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } flex-1 py-4 px-1 text-center border-b-2 font-medium text-sm`}
            >
              <Shield className="h-5 w-5 mx-auto mb-1" />
              Güvenlik
            </button>
          </nav>
        </div>

        <div className="p-6">
          {aktifTab === 'profil' && (
            <form onSubmit={handleProfilGuncelle} className="space-y-6">
              <div className="flex items-center">
                <div className="relative">
                  <img
                    src={kullanici?.fotoURL || `https://ui-avatars.com/api/?name=${kullanici?.ad}`}
                    alt={kullanici?.ad}
                    className="h-24 w-24 rounded-full object-cover"
                  />
                  <label
                    htmlFor="foto"
                    className="absolute bottom-0 right-0 bg-white rounded-full p-1.5 shadow-lg cursor-pointer"
                  >
                    <Camera className="h-5 w-5 text-gray-600" />
                    <input
                      type="file"
                      id="foto"
                      accept="image/*"
                      onChange={(e) => setProfilForm(prev => ({
                        ...prev,
                        fotograf: e.target.files?.[0] || null
                      }))}
                      className="hidden"
                    />
                  </label>
                </div>
                <div className="ml-6">
                  <h3 className="text-lg font-medium text-gray-900">Profil Fotoğrafı</h3>
                  <p className="text-sm text-gray-500">
                    JPG veya PNG formatında, maksimum 2MB
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Ad Soyad
                </label>
                <input
                  type="text"
                  value={profilForm.ad}
                  onChange={(e) => setProfilForm(prev => ({ ...prev, ad: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Telefon
                </label>
                <input
                  type="tel"
                  value={profilForm.telefon}
                  onChange={(e) => setProfilForm(prev => ({ ...prev, telefon: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={yukleniyor}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50"
                >
                  {yukleniyor ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </form>
          )}

          {aktifTab === 'bildirimler' && (
            <form onSubmit={handleBildirimGuncelle} className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Yeni Arıza Bildirimleri</h3>
                    <p className="text-sm text-gray-500">
                      Yeni bir arıza kaydı oluşturulduğunda bildirim al
                    </p>
                  </div>
                  <label className="relative inline-flex items-center">
                    <input
                      type="checkbox"
                      checked={bildirimTercihleri.yeniAriza}
                      onChange={(e) => setBildirimTercihleri(prev => ({
                        ...prev,
                        yeniAriza: e.target.checked
                      }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Durum Güncellemeleri</h3>
                    <p className="text-sm text-gray-500">
                      Arıza durumu değiştiğinde bildirim al
                    </p>
                  </div>
                  <label className="relative inline-flex items-center">
                    <input
                      type="checkbox"
                      checked={bildirimTercihleri.durumGuncelleme}
                      onChange={(e) => setBildirimTercihleri(prev => ({
                        ...prev,
                        durumGuncelleme: e.target.checked
                      }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Yeni Yorumlar</h3>
                    <p className="text-sm text-gray-500">
                      Arızalara yeni yorum eklendiğinde bildirim al
                    </p>
                  </div>
                  <label className="relative inline-flex items-center">
                    <input
                      type="checkbox"
                      checked={bildirimTercihleri.yeniYorum}
                      onChange={(e) => setBildirimTercihleri(prev => ({
                        ...prev,
                        yeniYorum: e.target.checked
                      }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Sistem Bildirimleri</h3>
                    <p className="text-sm text-gray-500">
                      Önemli sistem güncellemeleri ve duyurular
                    </p>
                  </div>
                  <label className="relative inline-flex items-center">
                    <input
                      type="checkbox"
                      checked={bildirimTercihleri.sistemBildirimleri}
                      onChange={(e) => setBildirimTercihleri(prev => ({
                        ...prev,
                        sistemBildirimleri: e.target.checked
                      }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-600"></div>
                  </label>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={yukleniyor}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50"
                >
                  {yukleniyor ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </form>
          )}

          {aktifTab === 'guvenlik' && (
            <form onSubmit={handleSifreDegistir} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Mevcut Şifre
                </label>
                <input
                  type="password"
                  value={sifreForm.mevcutSifre}
                  onChange={(e) => setSifreForm(prev => ({
                    ...prev,
                    mevcutSifre: e.target.value
                  }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Yeni Şifre
                </label>
                <input
                  type="password"
                  value={sifreForm.yeniSifre}
                  onChange={(e) => setSifreForm(prev => ({
                    ...prev,
                    yeniSifre: e.target.value
                  }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Yeni Şifre Tekrar
                </label>
                <input
                  type="password"
                  value={sifreForm.sifreTekrar}
                  onChange={(e) => setSifreForm(prev => ({
                    ...prev,
                    sifreTekrar: e.target.value
                  }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={yukleniyor}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50"
                >
                  {yukleniyor ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};