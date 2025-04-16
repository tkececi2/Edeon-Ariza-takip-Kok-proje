import React from 'react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Building, Calendar, User, Image as ImageIcon, CheckCircle, AlertTriangle } from 'lucide-react';
import type { MekanikBakim } from '../types';

interface Props {
  bakim: MekanikBakim;
  sahaAdi: string;
  onClick: () => void;
}

export const MekanikBakimKart: React.FC<Props> = ({ bakim, sahaAdi, onClick }) => {
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.target as HTMLImageElement;
    target.src = '/placeholder-image.png';
  };

  // Sorunlu durumları kontrol et
  const sorunluDurumlar = Object.entries(bakim.durumlar).reduce((acc, [kategori, durumlar]) => {
    Object.entries(durumlar).forEach(([durum, deger]) => {
      if (deger === false) {
        acc.push(`${kategori} - ${durum}`);
      }
    });
    return acc;
  }, [] as string[]);

  const sorunVar = sorunluDurumlar.length > 0;

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-200 cursor-pointer overflow-hidden"
    >
      <div className="aspect-video relative">
        {bakim.fotograflar?.[0] ? (
          <img
            src={bakim.fotograflar[0]}
            alt="Bakım fotoğrafı"
            className="w-full h-full object-cover"
            onError={handleImageError}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <ImageIcon className="h-8 w-8 text-gray-400" />
          </div>
        )}
        {bakim.fotograflar && bakim.fotograflar.length > 1 && (
          <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-1.5 py-0.5 rounded-full">
            +{bakim.fotograflar.length - 1}
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center text-sm text-gray-600">
            <Building className="h-4 w-4 mr-1.5 text-gray-400" />
            <span className="truncate">{sahaAdi}</span>
          </div>
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            sorunVar ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
          }`}>
            {sorunVar ? (
              <>
                <AlertTriangle className="h-3 w-3 mr-1" />
                Sorun Var
              </>
            ) : (
              <>
                <CheckCircle className="h-3 w-3 mr-1" />
                Sorun Yok
              </>
            )}
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center text-sm text-gray-600">
            <Calendar className="h-4 w-4 mr-1.5 text-gray-400" />
            <span>{format(bakim.tarih.toDate(), 'dd MMMM yyyy HH:mm', { locale: tr })}</span>
          </div>

          <div className="flex items-center text-sm text-gray-600">
            <User className="h-4 w-4 mr-1.5 text-gray-400" />
            <span>{bakim.kontrolEden.ad}</span>
          </div>

          {sorunVar && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs font-medium text-red-600">Sorunlu Alanlar:</p>
              <ul className="mt-1 text-xs text-gray-600 space-y-1">
                {sorunluDurumlar.slice(0, 3).map((sorun, index) => (
                  <li key={index} className="truncate">• {sorun}</li>
                ))}
                {sorunluDurumlar.length > 3 && (
                  <li className="text-gray-500">+{sorunluDurumlar.length - 3} daha...</li>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};