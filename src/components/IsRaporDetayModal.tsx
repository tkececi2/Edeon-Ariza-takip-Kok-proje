import React, { useState } from 'react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { 
  X, 
  Calendar, 
  Building, 
  Image as ImageIcon,
  Clock,
  User,
  Wrench,
  CheckCircle,
  FileText,
  AlignLeft
} from 'lucide-react';

interface IsRaporu {
  id: string;
  baslik: string;
  aciklama: string;
  yapilanIsler: string;
  saha: string;
  tarih: any;
  baslangicSaati: string;
  bitisSaati: string;
  fotograflar: string[];
  olusturanKisi: {
    id: string;
    ad: string;
    rol: string;
  };
  malzemeler?: string[];
}

interface Props {
  rapor: IsRaporu;
  sahaAdi: string;
  onClose: () => void;
}

export const IsRaporDetayModal: React.FC<Props> = ({ rapor, sahaAdi, onClose }) => {
  const [seciliFoto, setSeciliFoto] = useState<string | null>(null);

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.target as HTMLImageElement;
    target.src = '/placeholder-image.png';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between z-10">
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-yellow-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              {rapor.baslik}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Sol Kolon - Detaylar */}
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <Building className="h-5 w-5 mr-2 text-gray-400" />
                    <span>{sahaAdi}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="h-5 w-5 mr-2 text-gray-400" />
                    <span>{format(rapor.tarih.toDate(), 'dd MMMM yyyy', { locale: tr })}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="h-5 w-5 mr-2 text-gray-400" />
                    <span>{rapor.baslangicSaati} - {rapor.bitisSaati}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <User className="h-5 w-5 mr-2 text-gray-400" />
                    <span>{rapor.olusturanKisi.ad}</span>
                  </div>
                </div>
                <div className="flex items-center text-sm text-green-600 pt-2 border-t border-gray-200">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  <span>İş Tamamlandı</span>
                </div>
              </div>

              <div>
                <h4 className="flex items-center text-sm font-medium text-gray-900 mb-2">
                  <AlignLeft className="h-4 w-4 mr-2" />
                  Açıklama
                </h4>
                <p className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 rounded-lg p-4">
                  {rapor.aciklama}
                </p>
              </div>

              <div>
                <h4 className="flex items-center text-sm font-medium text-gray-900 mb-2">
                  <Wrench className="h-4 w-4 mr-2" />
                  Yapılan İşler
                </h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">
                    {rapor.yapilanIsler}
                  </p>
                </div>
              </div>

              {rapor.malzemeler && rapor.malzemeler.length > 0 && (
                <div>
                  <h4 className="flex items-center text-sm font-medium text-gray-900 mb-2">
                    <Wrench className="h-4 w-4 mr-2" />
                    Kullanılan Malzemeler
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                      {rapor.malzemeler.map((malzeme, index) => (
                        <li key={index}>{malzeme}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* Sağ Kolon - Fotoğraflar */}
            <div>
              <h4 className="flex items-center text-sm font-medium text-gray-900 mb-4">
                <ImageIcon className="h-4 w-4 mr-2" />
                Fotoğraflar
              </h4>
              {rapor.fotograflar && rapor.fotograflar.length > 0 ? (
                <div className="grid grid-cols-2 gap-4">
                  {rapor.fotograflar.map((foto, index) => (
                    <div
                      key={index}
                      className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden group cursor-pointer"
                      onClick={() => setSeciliFoto(foto)}
                    >
                      <img
                        src={foto}
                        alt={`Fotoğraf ${index + 1}`}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                        onError={handleImageError}
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity duration-300 flex items-center justify-center">
                        <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          Büyüt
                        </span>
                      </div>
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
          </div>
        </div>
      </div>

      {/* Büyük Fotoğraf Modalı */}
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
    </div>
  );
};