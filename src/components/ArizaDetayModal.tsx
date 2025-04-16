import React, { useState } from 'react';
import { doc, updateDoc, Timestamp, arrayUnion } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { 
  X, 
  MessageSquare,
  Send,
  ImageIcon,
  Building,
  MapPin,
  Calendar,
  CheckCircle,
  Pencil
} from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';
import { ArizaForm } from './ArizaForm';
import { CozumForm } from './CozumForm';
import toast from 'react-hot-toast';
import type { Ariza } from '../types';

interface Props {
  ariza: Ariza;
  sahaAdi: string;
  onClose: () => void;
}

export const ArizaDetayModal: React.FC<Props> = ({ ariza, sahaAdi, onClose }) => {
  const { kullanici } = useAuth();
  const [seciliFoto, setSeciliFoto] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [yeniYorum, setYeniYorum] = useState('');
  const [yorumGonderiliyor, setYorumGonderiliyor] = useState(false);
  const [cozumFormAcik, setCozumFormAcik] = useState(false);
  const [formAcik, setFormAcik] = useState(false);

  // Yönetici, tekniker veya mühendis kontrolü
  const canEdit = kullanici?.rol && ['yonetici', 'tekniker', 'muhendis'].includes(kullanici.rol);
  const canSolve = canEdit && ariza.durum !== 'cozuldu';

  // Müşteri yorum yapabilme kontrolü
  const canComment = kullanici && (
    canEdit || // Yönetici/tekniker/mühendis her zaman yorum yapabilir
    (kullanici.rol === 'musteri' && kullanici.sahalar?.includes(ariza.saha)) // Müşteri kendi sahasındaki arızalara yorum yapabilir
  );

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.target as HTMLImageElement;
    target.src = '/placeholder-image.png';
  };

  const handleYorumGonder = async () => {
    if (!kullanici || !yeniYorum.trim() || !canComment) {
      if (!canComment) {
        toast.error('Bu arızaya yorum yapma yetkiniz yok');
      }
      return;
    }

    setYorumGonderiliyor(true);
    try {
      const docRef = doc(db, 'arizalar', ariza.id);
      await updateDoc(docRef, {
        yorumlar: arrayUnion({
          id: crypto.randomUUID(),
          kullaniciId: kullanici.id,
          kullaniciAdi: kullanici.ad,
          mesaj: yeniYorum.trim(),
          tarih: Timestamp.now()
        }),
        guncellenmeTarihi: Timestamp.now()
      });

      setYeniYorum('');
      toast.success('Yorum eklendi');
    } catch (error) {
      console.error('Yorum gönderme hatası:', error);
      toast.error('Yorum gönderilemedi');
    } finally {
      setYorumGonderiliyor(false);
    }
  };

  const renderFotograflar = (fotograflar: string[] = [], baslik: string) => (
    <div className="mb-6">
      <h4 className="text-sm font-medium text-gray-900 mb-2">{baslik}</h4>
      {fotograflar.length > 0 ? (
        <div className="grid grid-cols-2 gap-4">
          {fotograflar.map((foto, index) => (
            <div key={index} className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
              <img
                src={foto}
                alt={`${baslik} ${index + 1}`}
                className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setSeciliFoto(foto)}
                onError={handleImageError}
                loading="lazy"
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center h-48 bg-gray-50 rounded-lg">
          <div className="text-center">
            <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-500">Fotoğraf bulunmuyor</p>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between z-10">
          <h2 className="text-xl font-semibold text-gray-900 truncate">
            {ariza.baslik}
          </h2>
          <div className="flex items-center gap-3">
            {canEdit && (
              <button
                onClick={() => setFormAcik(true)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <Pencil className="h-4 w-4 mr-2" />
                Düzenle
              </button>
            )}
            {!ariza.cozum && canSolve && (
              <button
                onClick={() => setCozumFormAcik(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Çözüldü İşaretle
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sol Kolon - Arıza ve Çözüm Detayları */}
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center text-sm text-gray-500">
                  <Building className="h-5 w-5 mr-2 text-gray-400" />
                  {sahaAdi}
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <MapPin className="h-5 w-5 mr-2 text-gray-400" />
                  {ariza.konum}
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <Calendar className="h-5 w-5 mr-2 text-gray-400" />
                  {format(ariza.olusturmaTarihi.toDate(), 'dd MMMM yyyy HH:mm', { locale: tr })}
                </div>
                {ariza.cozum && (
                  <div className="flex items-center text-sm text-green-600">
                    <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                    Çözüm: {format(ariza.cozum.tamamlanmaTarihi.toDate(), 'dd MMMM yyyy HH:mm', { locale: tr })}
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Açıklama</h4>
                <p className="text-sm text-gray-500 whitespace-pre-wrap">
                  {ariza.aciklama}
                </p>
              </div>

              {/* Çözüm Detayları */}
              {ariza.cozum && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Çözüm Detayları</h4>
                  <p className="text-sm text-gray-500 whitespace-pre-wrap">
                    {ariza.cozum.aciklama}
                  </p>
                  {ariza.cozum.malzemeler && ariza.cozum.malzemeler.length > 0 && (
                    <div className="mt-2">
                      <h5 className="text-sm font-medium text-gray-700">Kullanılan Malzemeler:</h5>
                      <ul className="mt-1 list-disc list-inside text-sm text-gray-500">
                        {ariza.cozum.malzemeler.map((malzeme, index) => (
                          <li key={index}>{malzeme}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Çözüm Fotoğrafları */}
              {ariza.cozum && renderFotograflar(ariza.cozum.fotograflar, 'Çözüm Fotoğrafları')}
            </div>

            {/* Sağ Kolon - Arıza Fotoğrafları ve Yorumlar */}
            <div className="space-y-6">
              {/* Arıza Fotoğrafları */}
              {renderFotograflar(ariza.fotograflar, 'Arıza Fotoğrafları')}

              {/* Yorumlar */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  <MessageSquare className="inline-block h-4 w-4 mr-1" />
                  Yorumlar
                </h4>
                <div className="space-y-4">
                  {ariza.yorumlar?.map((yorum: any) => (
                    <div key={yorum.id} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <span className="font-medium text-gray-900">{yorum.kullaniciAdi}</span>
                        <span className="text-sm text-gray-500">
                          {format(yorum.tarih.toDate(), 'dd MMM yyyy HH:mm', { locale: tr })}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-gray-700">{yorum.mesaj}</p>
                    </div>
                  ))}
                </div>

                {canComment && (
                  <div className="mt-4 flex space-x-2">
                    <input
                      type="text"
                      value={yeniYorum}
                      onChange={(e) => setYeniYorum(e.target.value)}
                      placeholder="Yorumunuzu yazın..."
                      className="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                    />
                    <button
                      onClick={handleYorumGonder}
                      disabled={!yeniYorum.trim() || yorumGonderiliyor}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50"
                    >
                      {yorumGonderiliyor ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Gönder
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Fotoğraf Modal */}
        {seciliFoto && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
            onClick={() => setSeciliFoto(null)}
          >
            <button
              onClick={() => setSeciliFoto(null)}
              className="absolute top-4 right-4 text-white hover:text-gray-300"
            >
              <X className="h-8 w-8" />
            </button>
            <img
              src={seciliFoto}
              alt="Büyük fotoğraf görünümü"
              className="max-h-[90vh] max-w-[90vw] object-contain"
              onClick={(e) => e.stopPropagation()}
              onError={handleImageError}
            />
          </div>
        )}

        {/* Düzenleme Formu */}
        {formAcik && (
          <ArizaForm
            ariza={ariza}
            onClose={() => setFormAcik(false)}
          />
        )}

        {/* Çözüm Formu */}
        {cozumFormAcik && (
          <CozumForm
            ariza={ariza}
            onClose={() => setCozumFormAcik(false)}
          />
        )}
      </div>
    </div>
  );
};