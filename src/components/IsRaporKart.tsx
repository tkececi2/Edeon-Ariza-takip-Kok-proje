import React from 'react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Calendar, Building, Image as ImageIcon, Clock, User, Wrench } from 'lucide-react';

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
}

interface Props {
  rapor: IsRaporu;
  sahaAdi: string;
  onClick: () => void;
}

export const IsRaporKart: React.FC<Props> = ({ rapor, sahaAdi, onClick }) => {
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.target as HTMLImageElement;
    target.src = '/placeholder-image.png';
  };

  const ilkFotograf = rapor.fotograflar?.[0];

  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-200 cursor-pointer"
    >
      <div className="p-4">
        <div className="flex items-start space-x-4">
          {/* Fotoğraf Alanı */}
          <div className="flex-shrink-0 w-32 h-32 relative rounded-lg overflow-hidden bg-gray-100">
            {ilkFotograf ? (
              <img
                src={ilkFotograf}
                alt={`${rapor.baslik} fotoğrafı`}
                className="w-full h-full object-cover"
                onError={handleImageError}
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="h-8 w-8 text-gray-400" />
              </div>
            )}
            {rapor.fotograflar && rapor.fotograflar.length > 1 && (
              <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-1.5 py-0.5 rounded-full">
                +{rapor.fotograflar.length - 1}
              </div>
            )}
          </div>

          {/* Detaylar */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {rapor.baslik}
            </h3>
            
            <div className="space-y-2">
              <div className="flex items-center text-sm text-gray-600">
                <Building className="h-4 w-4 mr-2 text-gray-400" />
                <span>{sahaAdi}</span>
              </div>
              
              <div className="flex items-center text-sm text-gray-600">
                <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                <span>{format(rapor.tarih.toDate(), 'dd MMMM yyyy', { locale: tr })}</span>
              </div>

              <div className="flex items-center text-sm text-gray-600">
                <Clock className="h-4 w-4 mr-2 text-gray-400" />
                <span>{rapor.baslangicSaati} - {rapor.bitisSaati}</span>
              </div>

              <div className="flex items-center text-sm text-gray-600">
                <User className="h-4 w-4 mr-2 text-gray-400" />
                <span>{rapor.olusturanKisi.ad}</span>
              </div>

              <div className="flex items-center text-sm text-gray-600">
                <Wrench className="h-4 w-4 mr-2 text-gray-400" />
                <span className="truncate">{rapor.yapilanIsler.slice(0, 100)}...</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};