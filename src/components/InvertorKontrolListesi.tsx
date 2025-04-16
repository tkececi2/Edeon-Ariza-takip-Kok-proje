import React from 'react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { AlertTriangle, CheckCircle, Building, Calendar, User } from 'lucide-react';
import type { InvertorKontrol } from '../types';

interface Props {
  kontroller: InvertorKontrol[];
  sahalar: Array<{id: string, ad: string}>;
  onKontrolTikla: (kontrol: InvertorKontrol) => void;
}

export const InvertorKontrolListesi: React.FC<Props> = ({ 
  kontroller, 
  sahalar,
  onKontrolTikla 
}) => {
  const getSahaAdi = (sahaId: string) => {
    return sahalar.find(s => s.id === sahaId)?.ad || 'Bilinmeyen Saha';
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Saha
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Tarih
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Kontrol Eden
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              İnvertör Sayısı
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Çalışma Durumu
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {kontroller.map((kontrol) => {
            const calisanDizeSayisi = kontrol.invertorler.filter(inv => inv.dizeCalisiyor).length;
            const toplamDizeSayisi = kontrol.invertorler.length;
            const calismaOrani = (calisanDizeSayisi / toplamDizeSayisi) * 100;

            return (
              <tr
                key={kontrol.id}
                onClick={() => onKontrolTikla(kontrol)}
                className="hover:bg-gray-50 cursor-pointer"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <Building className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-900">{getSahaAdi(kontrol.sahaId)}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center text-sm text-gray-500">
                    <Calendar className="h-4 w-4 mr-2" />
                    {format(kontrol.tarih.toDate(), 'dd MMM yyyy HH:mm', { locale: tr })}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center text-sm text-gray-500">
                    <User className="h-4 w-4 mr-2" />
                    {kontrol.olusturanKisi.ad}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {kontrol.invertorler.length} adet
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      calismaOrani >= 90 ? 'bg-green-100 text-green-800' :
                      calismaOrani >= 70 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {calismaOrani >= 90 ? (
                        <CheckCircle className="h-4 w-4 mr-1" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 mr-1" />
                      )}
                      {calisanDizeSayisi} / {toplamDizeSayisi} (%{calismaOrani.toFixed(1)})
                    </span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};