import React from 'react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { X, Calendar, Building, CheckCircle, AlertTriangle, User, Info } from 'lucide-react';
import type { InvertorKontrol } from '../types';

interface Props {
  kontrol: InvertorKontrol;
  sahaAdi: string;
  onClose: () => void;
}

export const InvertorKontrolDetay: React.FC<Props> = ({ kontrol, sahaAdi, onClose }) => {
  const calisanDizeSayisi = kontrol.invertorler.filter(inv => inv.dizeCalisiyor).length;
  const toplamDizeSayisi = kontrol.invertorler.length;
  const calismaOrani = (calisanDizeSayisi / toplamDizeSayisi) * 100;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-2">
            <Building className="h-5 w-5 text-yellow-500" />
            <h2 className="text-lg font-medium text-gray-900">{sahaAdi}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 rounded-full p-1 hover:bg-gray-100"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Üst Bilgiler */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center text-sm text-gray-500 mb-1">
                  <Calendar className="h-4 w-4 mr-2" />
                  Kontrol Tarihi
                </div>
                <div className="text-sm font-medium">
                  {format(kontrol.tarih.toDate(), 'dd MMMM yyyy HH:mm', { locale: tr })}
                </div>
              </div>
              <div>
                <div className="flex items-center text-sm text-gray-500 mb-1">
                  <User className="h-4 w-4 mr-2" />
                  Kontrol Eden
                </div>
                <div className="text-sm font-medium">
                  {kontrol.olusturanKisi.ad}
                </div>
              </div>
            </div>
          </div>

          {/* Çalışma Durumu */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
              <Info className="h-4 w-4 mr-2 text-yellow-500" />
              Genel Durum
            </h3>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-900">
                  Çalışan Dizeler: {calisanDizeSayisi} / {toplamDizeSayisi}
                </span>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                  calismaOrani >= 90 ? 'bg-green-100 text-green-800' :
                  calismaOrani >= 70 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  %{calismaOrani.toFixed(1)} Çalışma Oranı
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5">
                <div 
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    calismaOrani >= 90 ? 'bg-green-500' :
                    calismaOrani >= 70 ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}
                  style={{ width: `${calismaOrani}%` }}
                />
              </div>
            </div>
          </div>

          {/* İnvertör Listesi */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              İnvertör Durumları ({kontrol.invertorler.length} adet)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {kontrol.invertorler.map((invertor, index) => (
                <div 
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    invertor.dizeCalisiyor 
                      ? 'border-green-200 bg-green-50' 
                      : 'border-red-200 bg-red-50'
                  }`}
                >
                  <span className="text-sm font-medium text-gray-900">
                    {invertor.ad}
                  </span>
                  {invertor.dizeCalisiyor ? (
                    <div className="flex items-center text-green-700">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      <span className="text-xs font-medium">Çalışıyor</span>
                    </div>
                  ) : (
                    <div className="flex items-center text-red-700">
                      <AlertTriangle className="h-4 w-4 mr-1" />
                      <span className="text-xs font-medium">Arızalı</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Açıklama */}
          {kontrol.aciklama && (
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Açıklama</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {kontrol.aciklama}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};