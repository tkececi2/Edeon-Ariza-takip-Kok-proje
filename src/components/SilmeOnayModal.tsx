import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  onConfirm: () => void;
  onCancel: () => void;
  mesaj?: string;
  baslik?: string;
}

export const SilmeOnayModal: React.FC<Props> = ({ 
  onConfirm, 
  onCancel, 
  mesaj = "Bu öğeyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.",
  baslik = "Silme Onayı"
}) => {
  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl border border-gray-100">
        <div className="flex items-start mb-4">
          <div className="flex-shrink-0 bg-rose-100 rounded-full p-2">
            <AlertTriangle className="h-6 w-6 text-rose-600" />
          </div>
          <div className="ml-4">
            <h3 className="text-lg font-medium text-gray-900">
              {baslik}
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              {mesaj}
            </p>
          </div>
        </div>
        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            İptal
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 transition-colors"
          >
            Sil
          </button>
        </div>
      </div>
    </div>
  );
};