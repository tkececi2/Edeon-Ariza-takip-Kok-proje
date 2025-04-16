import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { UserPlus, Mail, Phone, Trash2, X } from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EkipForm } from '../components/EkipForm';
import toast from 'react-hot-toast';
import type { Kullanici } from '../types';

export const Ekip: React.FC = () => {
  const { kullanici } = useAuth();
  const [ekipUyeleri, setEkipUyeleri] = useState<Kullanici[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [formAcik, setFormAcik] = useState(false);
  const [silmeOnayModal, setSilmeOnayModal] = useState<string | null>(null);

  // Yönetici kontrolü
  const isYonetici = kullanici?.rol === 'yonetici';

  useEffect(() => {
    if (!kullanici) return;

    const ekipQuery = query(
      collection(db, 'kullanicilar'),
      where('rol', 'in', ['tekniker', 'muhendis', 'yonetici']),
      orderBy('ad')
    );
    
    const unsubscribe = onSnapshot(ekipQuery, (snapshot) => {
      const ekipListesi = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Kullanici[];
      
      setEkipUyeleri(ekipListesi);
      setYukleniyor(false);
    }, (error) => {
      console.error('Ekip listesi getirilemedi:', error);
      toast.error('Ekip listesi yüklenirken bir hata oluştu');
      setYukleniyor(false);
    });

    return () => unsubscribe();
  }, [kullanici]);

  const handleSil = async (id: string) => {
    if (!isYonetici) {
      toast.error('Bu işlem için yönetici yetkisi gerekiyor');
      return;
    }

    if (id === kullanici?.id) {
      toast.error('Kendinizi silemezsiniz');
      return;
    }

    setYukleniyor(true);
    try {
      await deleteDoc(doc(db, 'kullanicilar', id));
      toast.success('Ekip üyesi başarıyla silindi');
      setSilmeOnayModal(null);
    } catch (error) {
      console.error('Ekip üyesi silme hatası:', error);
      toast.error('Ekip üyesi silinirken bir hata oluştu');
    } finally {
      setYukleniyor(false);
    }
  };

  if (!isYonetici) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <p className="text-gray-500">Bu sayfaya erişim yetkiniz yok.</p>
      </div>
    );
  }

  if (yukleniyor) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ekip Yönetimi</h1>
          <p className="mt-1 text-sm text-gray-500">
            Toplam {ekipUyeleri.length} üye
          </p>
        </div>
        <button
          onClick={() => setFormAcik(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700"
        >
          <UserPlus className="h-5 w-5 mr-2" />
          Yeni Ekip Üyesi Ekle
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {ekipUyeleri.map((uye) => (
          <div
            key={uye.id}
            className="bg-white overflow-hidden shadow-lg rounded-lg hover:shadow-xl transition-shadow duration-300"
          >
            <div className="p-6">
              <div className="flex items-center">
                <img
                  src={uye.fotoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(uye.ad)}&background=random`}
                  alt={uye.ad}
                  className="h-16 w-16 rounded-full ring-2 ring-white"
                />
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">{uye.ad}</h3>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    {uye.rol.charAt(0).toUpperCase() + uye.rol.slice(1)}
                  </span>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <div className="flex items-center text-sm text-gray-500">
                  <Mail className="h-5 w-5 mr-2 text-gray-400" />
                  {uye.email}
                </div>
                {uye.telefon && (
                  <div className="flex items-center text-sm text-gray-500">
                    <Phone className="h-5 w-5 mr-2 text-gray-400" />
                    {uye.telefon}
                  </div>
                )}
              </div>

              {kullanici?.id !== uye.id && (
                <div className="mt-6">
                  <button
                    onClick={() => setSilmeOnayModal(uye.id)}
                    className="w-full inline-flex justify-center items-center px-4 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Sil
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {formAcik && <EkipForm onClose={() => setFormAcik(false)} />}

      {silmeOnayModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Ekip Üyesini Sil
            </h3>
            <p className="text-gray-500 mb-4">
              Bu ekip üyesini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setSilmeOnayModal(null)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                İptal
              </button>
              <button
                onClick={() => handleSil(silmeOnayModal)}
                className="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};