import React from 'react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { AlertTriangle, CheckCircle, Building, Calendar, Clock, Trash2 } from 'lucide-react';
import type { ElektrikKesinti } from '../types';

interface Props {
  kesintiler: ElektrikKesinti[];
  sahalar: Array<{id: string, ad: string}>;
  onKesintiyeTikla: (kesinti: ElektrikKesinti) => void;
  onKesintiyiSil?: (id: string) => void;
}

export const ElektrikKesintisiListesi: React.FC<Props> = ({ 
  kesintiler, 
  sahalar,
  onKesintiyeTikla,
  onKesintiyiSil
}) => {
  const getSahaAdi = (sahaId: string) => {
    return sahalar.find(s => s.id === sahaId)?.ad || 'Bilinmeyen Saha';
  };

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

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Saha
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Başlangıç
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Bitiş
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Süre
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Etkilenen Alan
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Durum
            </th>
            {onKesintiyiSil && (
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                İşlemler
              </th>
            )}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {kesintiler.map((kesinti) => (
            <tr
              key={kesinti.id}
              onClick={() => onKesintiyeTikla(kesinti)}
              className="hover:bg-gray-50 cursor-pointer"
            >
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <Building className="h-5 w-5 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-900">{getSahaAdi(kesinti.sahaId)}</span>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {format(kesinti.baslangicTarihi.toDate(), 'dd MMM yyyy HH:mm', { locale: tr })}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {kesinti.bitisTarihi ? 
                  format(kesinti.bitisTarihi.toDate(), 'dd MMM yyyy HH:mm', { locale: tr }) : 
                  '-'
                }
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {formatSure(kesinti.sure)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {kesinti.etkiAlani || '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  kesinti.durum === 'devam-ediyor' 
                    ? 'bg-red-100 text-red-800' 
                    : 'bg-green-100 text-green-800'
                }`}>
                  {kesinti.durum === 'devam-ediyor' ? (
                    <AlertTriangle className="h-4 w-4 mr-1" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-1" />
                  )}
                  {kesinti.durum === 'devam-ediyor' ? 'Devam Ediyor' : 'Tamamlandı'}
                </span>
              </td>
              {onKesintiyiSil && (
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onKesintiyiSil(kesinti.id);
                    }}
                    className="text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded-full transition-colors duration-200"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};