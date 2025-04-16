import React from 'react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { AlertTriangle, Clock, CheckCircle, Image as ImageIcon } from 'lucide-react';
import type { Ariza } from '../types';

interface Props {
  ariza: Ariza;
  sahaAdi: string;
  onClick: () => void;
}

const durumRenkleri = {
  'acik': 'bg-red-100 text-red-800',
  'devam-ediyor': 'bg-yellow-100 text-yellow-800',
  'beklemede': 'bg-blue-100 text-blue-800',
  'cozuldu': 'bg-green-100 text-green-800'
};

const durumIkonlari = {
  'acik': AlertTriangle,
  'devam-ediyor': Clock,
  'beklemede': Clock,
  'cozuldu': CheckCircle
};

export const RaporOzeti: React.FC<Props> = ({ ariza, sahaAdi, onClick }) => {
  const DurumIkonu = durumIkonlari[ariza.durum];
  const fotograf = ariza.fotograflar?.[0];

  return (
    <div 
      className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 cursor-pointer"
      onClick={onClick}
    >
      <div className="p-4">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0 w-24 h-24 relative rounded-lg overflow-hidden bg-gray-100">
            {fotograf ? (
              <img
                src={fotograf}
                alt="Arıza fotoğrafı"
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxyZWN0IHg9IjMiIHk9IjMiIHdpZHRoPSIxOCIgaGVpZ2h0PSIxOCIgcng9IjIiIHJ5PSIyIi8+PGNpcmNsZSBjeD0iOC41IiBjeT0iOC41IiByPSIxLjUiLz48cG9seWxpbmUgcG9pbnRzPSIyMSAxNSAxNiAxMCA1IDIxIi8+PC9zdmc+';
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="h-8 w-8 text-gray-400" />
              </div>
            )}
            {ariza.fotograflar && ariza.fotograflar.length > 1 && (
              <div className="absolute top-1 right-1 bg-black bg-opacity-50 text-white text-xs px-1.5 py-0.5 rounded-full">
                +{ariza.fotograflar.length - 1}
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900">
                #{ariza.id.slice(-6).toUpperCase()}
              </span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${durumRenkleri[ariza.durum]}`}>
                <DurumIkonu className="h-3.5 w-3.5 mr-1" />
                {ariza.durum.charAt(0).toUpperCase() + ariza.durum.slice(1).replace('-', ' ')}
              </span>
            </div>
            
            <h3 className="mt-1 text-sm font-medium text-gray-900 truncate">
              {ariza.baslik}
            </h3>
            
            <div className="mt-1">
              <p className="text-sm text-gray-500 truncate">{sahaAdi}</p>
              <p className="text-sm text-gray-500 truncate">{ariza.konum}</p>
            </div>

            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-gray-500">
                {format(ariza.olusturmaTarihi.toDate(), 'dd MMM yyyy HH:mm', { locale: tr })}
              </span>
              {ariza.cozum && (
                <span className="text-xs text-green-600">
                  Çözüldü: {format(ariza.cozum.tamamlanmaTarihi.toDate(), 'dd MMM yyyy HH:mm', { locale: tr })}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};