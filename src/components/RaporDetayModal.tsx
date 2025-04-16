import React from 'react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { X, AlertTriangle, Clock, CheckCircle, MapPin, Building, Calendar, User, Image as ImageIcon } from 'lucide-react';
import type { Ariza } from '../types';

interface Props {
  ariza: Ariza;
  sahaAdi: string;
  onClose: () => void;
}

const durumRenkleri = {
  'acik': 'bg-red-100 text-red-800',
  'devam-ediyor': 'bg-yellow-100 text-yellow-800',
  'beklemede': 'bg-blue-100 text-blue-800',
  'cozuldu': 'bg-green-100 text-green-800'
};

const oncelikRenkleri = {
  'dusuk': 'bg-gray-100 text-gray-800',
  'orta': 'bg-blue-100 text-blue-800',
  'yuksek': 'bg-orange-100 text-orange-800',
  'acil': 'bg-red-100 text-red-800'
};

export const RaporDetayModal: React.FC<Props> = ({ ariza, sahaAdi, onClose }) => {
  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            Arıza Rapor Detayı #{ariza.id.slice(-6).toUpperCase()}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900">{ariza.baslik}</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${durumRenkleri[ariza.durum]}`}>
                    {ariza.durum === 'acik' && <AlertTriangle className="w-4 h-4 mr-1" />}
                    {ariza.durum === 'devam-ediyor' && <Clock className="w-4 h-4 mr-1" />}
                    {ariza.durum === 'beklemede' && <Clock className="w-4 h-4 mr-1" />}
                    {ariza.durum === 'cozuldu' && <CheckCircle className="w-4 h-4 mr-1" />}
                    {ariza.durum.charAt(0).toUpperCase() + ariza.durum.slice(1).replace('-', ' ')}
                  </span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${oncelikRenkleri[ariza.oncelik]}`}>
                    {ariza.oncelik.charAt(0).toUpperCase() + ariza.oncelik.slice(1)} Öncelik
                  </span>
                </div>
              </div>

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
                  Oluşturma: {format(ariza.olusturmaTarihi.toDate(), 'dd MMMM yyyy HH:mm', { locale: tr })}
                </div>
                {ariza.cozum && (
                  <div className="flex items-center text-sm text-green-600">
                    <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                    Çözüm: {format(ariza.cozum.tamamlanmaTarihi.toDate(), 'dd MMMM yyyy HH:mm', { locale: tr })}
                  </div>
                )}
                <div className="flex items-center text-sm text-gray-500">
                  <User className="h-5 w-5 mr-2 text-gray-400" />
                  {ariza.olusturanKisi}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Açıklama</h4>
                <p className="text-sm text-gray-500 whitespace-pre-wrap">
                  {ariza.aciklama}
                </p>
              </div>

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
            </div>

            <div>
              {ariza.fotograflar && ariza.fotograflar.length > 0 ? (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Fotoğraflar</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {ariza.fotograflar.map((foto, index) => (
                      <div key={index} className="relative aspect-square">
                        <img
                          src={foto}
                          alt={`Arıza fotoğrafı ${index + 1}`}
                          className="absolute inset-0 w-full h-full object-cover rounded-lg"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxyZWN0IHg9IjMiIHk9IjMiIHdpZHRoPSIxOCIgaGVpZ2h0PSIxOCIgcng9IjIiIHJ5PSIyIi8+PGNpcmNsZSBjeD0iOC41IiBjeT0iOC41IiByPSIxLjUiLz48cG9seWxpbmUgcG9pbnRzPSIyMSAxNSAxNiAxMCA1IDIxIi8+PC9zdmc+';
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-48 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-500">Fotoğraf bulunmuyor</p>
                  </div>
                </div>
              )}

              {ariza.yorumlar && ariza.yorumlar.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Yorumlar</h4>
                  <div className="space-y-4">
                    {ariza.yorumlar.map((yorum: any) => (
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
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};