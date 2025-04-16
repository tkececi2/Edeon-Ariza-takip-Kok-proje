import React, { useState } from 'react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { X, Calendar, Building, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import type { ElektrikKesinti } from '../types';

interface Props {
  kesinti: ElektrikKesinti;
  sahaAdi: string;
  onClose: () => void;
}

export const ElektrikKesintisiDetay: React.FC<Props> = ({ kesinti, sahaAdi, onClose }) => {
  const { kullanici } = useAuth();
  const [yukleniyor, setYukleniyor] = useState(false);
  
  // Yönetici veya teknisyen kontrolü
  const canEdit = kullanici?.rol && ['yonetici', 'tekniker', 'muhendis'].includes(kullanici.rol);

  const formatSure = (dakika: number): string => {
    const saat = Math.floor(dakika / 60);
    const kalanDakika = dakika % 60;
    
    if (saat === 0) {
      return `${kalanDakika} dakika`;
    } else if (kalanDakika === 0) {
      return `${saat} saat`;
    } else {
      return `${saat} saat ${kalanDakika} dakika`;
    }
  };

  const handleKesintiyiTamamla = async () => {
    if (!canEdit) {
      toast.error('Bu işlem için yetkiniz yok');
      return;
    }

    setYukleniyor(true);
    try {
      const bitisTarihi = new Date();
      const sure = Math.round((bitisTarihi.getTime() - kesinti.baslangicTarihi.toDate().getTime()) / (1000 * 60));

      await updateDoc(doc(db, 'elektrikKesintileri', kesinti.id), {
        bitisTarihi: Timestamp.fromDate(bitisTarihi),
        sure: sure,
        durum: 'tamamlandi',
        guncellenmeTarihi: Timestamp.now()
      });

      toast.success('Kesinti tamamlandı olarak işaretlendi');
      onClose();
    } catch (error) {
      console.error('Kesinti tamamlama hatası:', error);
      toast.error('Kesinti tamamlanırken bir hata oluştu');
    } finally {
      setYukleniyor(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Building className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-medium text-gray-900">{sahaAdi}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6 flex items-center justify-between">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              kesinti.durum === 'devam-ediyor' 
                ? 'bg-red-100 text-red-800' 
                : 'bg-green-100 text-green-800'
            }`}>
              {kesinti.durum === 'devam-ediyor' ? (
                <AlertTriangle className="h-4 w-4 mr-2" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              {kesinti.durum === 'devam-ediyor' ? 'Kesinti Devam Ediyor' : 'Kesinti Tamamlandı'}
            </span>

            {kesinti.durum === 'devam-ediyor' && canEdit && (
              <button
                onClick={handleKesintiyiTamamla}
                disabled={yukleniyor}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
              >
                {yukleniyor ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span className="ml-2">İşleniyor...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Kesintiyi Tamamla
                  </>
                )}
              </button>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Başlangıç</h3>
              <p className="mt-1 flex items-center text-base text-gray-900">
                <Calendar className="h-5 w-5 mr-2 text-gray-400" />
                {format(kesinti.baslangicTarihi.toDate(), 'dd MMMM yyyy HH:mm', { locale: tr })}
              </p>
            </div>

            {kesinti.durum === 'tamamlandi' && (
              <div>
                <h3 className="text-sm font-medium text-gray-500">Bitiş</h3>
                <p className="mt-1 flex items-center text-base text-gray-900">
                  <Calendar className="h-5 w-5 mr-2 text-gray-400" />
                  {format(kesinti.bitisTarihi.toDate(), 'dd MMMM yyyy HH:mm', { locale: tr })}
                </p>
              </div>
            )}

            <div>
              <h3 className="text-sm font-medium text-gray-500">Kesinti Süresi</h3>
              <p className="mt-1 flex items-center text-base text-gray-900">
                <Clock className="h-5 w-5 mr-2 text-gray-400" />
                {formatSure(kesinti.sure)}
              </p>
            </div>

            {kesinti.etkiAlani && (
              <div>
                <h3 className="text-sm font-medium text-gray-500">Etkilenen Alan</h3>
                <p className="mt-1 text-base text-gray-900">{kesinti.etkiAlani}</p>
              </div>
            )}

            <div>
              <h3 className="text-sm font-medium text-gray-500">Açıklama</h3>
              <p className="mt-1 text-base text-gray-900 whitespace-pre-wrap">
                {kesinti.aciklama}
              </p>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>Oluşturan: {kesinti.olusturanKisi.ad}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};