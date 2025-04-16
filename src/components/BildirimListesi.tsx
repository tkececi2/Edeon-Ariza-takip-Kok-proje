import React from 'react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Bell, MessageSquare, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { useBildirimler } from '../contexts/BildirimContext';
import { Link } from 'react-router-dom';

const bildirimIkonlari = {
  ariza: AlertTriangle,
  yorum: MessageSquare,
  durum: CheckCircle,
  sistem: Info,
};

const bildirimRenkleri = {
  ariza: 'text-rose-500',
  yorum: 'text-primary-500',
  durum: 'text-green-500',
  sistem: 'text-gray-500',
};

interface Props {
  onClose?: () => void;
}

export const BildirimListesi: React.FC<Props> = ({ onClose }) => {
  const { bildirimler, bildirimOku } = useBildirimler();

  const handleBildirimTikla = async (id: string) => {
    await bildirimOku(id);
    onClose?.();
  };

  if (bildirimler.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        Henüz bildirim bulunmuyor.
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {bildirimler.map((bildirim) => {
        const Ikon = bildirimIkonlari[bildirim.tip];
        return (
          <div
            key={bildirim.id}
            className={`p-4 hover:bg-gray-50 transition-colors duration-200 ${
              !bildirim.okundu ? 'bg-primary-50' : ''
            }`}
          >
            {bildirim.link ? (
              <Link
                to={bildirim.link}
                onClick={() => handleBildirimTikla(bildirim.id)}
                className="flex items-start space-x-3"
              >
                <Ikon className={`h-5 w-5 mt-1 ${bildirimRenkleri[bildirim.tip]}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{bildirim.baslik}</p>
                  <p className="text-sm text-gray-500">{bildirim.mesaj}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {format(bildirim.tarih.toDate(), 'dd MMM yyyy HH:mm', { locale: tr })}
                  </p>
                </div>
              </Link>
            ) : (
              <div className="flex items-start space-x-3">
                <Ikon className={`h-5 w-5 mt-1 ${bildirimRenkleri[bildirim.tip]}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{bildirim.baslik}</p>
                  <p className="text-sm text-gray-500">{bildirim.mesaj}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {format(bildirim.tarih.toDate(), 'dd MMM yyyy HH:mm', { locale: tr })}
                  </p>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};