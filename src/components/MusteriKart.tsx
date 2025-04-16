import React from 'react';
import { Mail, Phone, Building, MapPin, Trash2, Pencil, Sun, Users } from 'lucide-react';
import type { Kullanici } from '../types';

interface Props {
  musteri: Kullanici;
  sahalar: Array<{id: string, ad: string}>;
  santraller: Array<{id: string, ad: string}>;
  onDuzenle: () => void;
  onSil: () => void;
}

export const MusteriKart: React.FC<Props> = ({ musteri, sahalar, santraller, onDuzenle, onSil }) => {
  // Müşteriye atanmış sahaları ve santralleri filtrele
  const atananSahalar = sahalar.filter(saha => musteri.sahalar?.includes(saha.id));
  const atananSantraller = santraller.filter(santral => musteri.sahalar?.includes(santral.id));

  return (
    <div className="bg-white overflow-hidden shadow-md rounded-xl hover:shadow-lg transition-all duration-300 border border-neutral-100">
      <div className="p-6">
        <div className="flex items-center">
          <img
            src={musteri.fotoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(musteri.ad)}&background=random`}
            alt={musteri.ad}
            className="h-16 w-16 rounded-full ring-2 ring-primary-100 object-cover"
          />
          <div className="ml-4">
            <h3 className="text-lg font-semibold text-neutral-900">{musteri.ad}</h3>
            {musteri.sirket && (
              <p className="text-sm text-neutral-500">{musteri.sirket}</p>
            )}
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <div className="flex items-center text-sm text-neutral-600">
            <Mail className="h-5 w-5 mr-2 text-primary-400" />
            {musteri.email}
          </div>
          {musteri.telefon && (
            <div className="flex items-center text-sm text-neutral-600">
              <Phone className="h-5 w-5 mr-2 text-primary-400" />
              {musteri.telefon}
            </div>
          )}
          
          {atananSahalar.length > 0 && (
            <div className="flex items-start text-sm text-neutral-600">
              <Building className="h-5 w-5 mr-2 text-primary-400 mt-0.5" />
              <div>
                <p className="font-medium mb-1">Atanan Sahalar:</p>
                <ul className="list-disc list-inside pl-1 space-y-1">
                  {atananSahalar.map(saha => (
                    <li key={saha.id} className="text-xs">{saha.ad}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          
          {atananSantraller.length > 0 && (
            <div className="flex items-start text-sm text-neutral-600">
              <Sun className="h-5 w-5 mr-2 text-primary-400 mt-0.5" />
              <div>
                <p className="font-medium mb-1">Atanan Santraller:</p>
                <ul className="list-disc list-inside pl-1 space-y-1">
                  {atananSantraller.map(santral => (
                    <li key={santral.id} className="text-xs">{santral.ad}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          
          {musteri.adres && (
            <div className="flex items-center text-sm text-neutral-600">
              <MapPin className="h-5 w-5 mr-2 text-primary-400" />
              {musteri.adres}
            </div>
          )}
        </div>

        <div className="mt-6 flex space-x-3">
          <button
            onClick={onDuzenle}
            className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-primary-200 shadow-sm text-sm font-medium rounded-lg text-primary-700 bg-white hover:bg-primary-50 transition-colors"
          >
            <Pencil className="h-4 w-4 mr-2" />
            Düzenle
          </button>
          <button
            onClick={onSil}
            className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-red-200 shadow-sm text-sm font-medium rounded-lg text-red-700 bg-white hover:bg-red-50 transition-colors"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Sil
          </button>
        </div>
      </div>
    </div>
  );
};