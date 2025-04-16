import React from 'react';
import { format, differenceInHours, differenceInDays, differenceInMinutes } from 'date-fns';
import { tr } from 'date-fns/locale';
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  Image as ImageIcon, 
  MapPin, 
  Building, 
  User, 
  Calendar,
  MessageSquare,
  AlertOctagon,
  AlertCircle,
  Timer
} from 'lucide-react';
import type { Ariza } from '../types';

interface Props {
  ariza: Ariza;
  sahaAdi: string;
  kullaniciAdi?: string;
  onClick: () => void;
  compact?: boolean;
}

const durumRenkleri = {
  'acik': 'bg-red-100 text-red-800 border-red-200',
  'devam-ediyor': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'beklemede': 'bg-blue-100 text-blue-800 border-blue-200',
  'cozuldu': 'bg-green-100 text-green-800 border-green-200'
};

const oncelikRenkleri = {
  'dusuk': 'bg-gray-100 text-gray-800 border-gray-200',
  'orta': 'bg-blue-100 text-blue-800 border-blue-200',
  'yuksek': 'bg-orange-100 text-orange-800 border-orange-200',
  'acil': 'bg-red-100 text-red-800 border-red-200'
};

const oncelikIkonlari = {
  'dusuk': AlertCircle,
  'orta': AlertOctagon,
  'yuksek': AlertTriangle,
  'acil': AlertOctagon
};

export const ArizaKart: React.FC<Props> = ({ ariza, sahaAdi, kullaniciAdi, onClick, compact = false }) => {
  const getCozumSuresi = () => {
    const baslangic = ariza.olusturmaTarihi.toDate();
    const bitis = ariza.cozum ? ariza.cozum.tamamlanmaTarihi.toDate() : new Date();
    
    const dakikaFarki = differenceInMinutes(bitis, baslangic);
    const saatFarki = differenceInHours(bitis, baslangic);
    const gunFarki = differenceInDays(bitis, baslangic);
    const kalanSaat = saatFarki % 24;

    if (ariza.cozum) {
      if (gunFarki === 0) {
        if (saatFarki === 0) {
          return `${dakikaFarki} dakikada çözüldü`;
        }
        return kalanSaat === 0 ? '1 saatte çözüldü' : `${kalanSaat} saatte çözüldü`;
      } else {
        return `${gunFarki} gün ${kalanSaat} saatte çözüldü`;
      }
    } else {
      if (gunFarki === 0) {
        if (saatFarki === 0) {
          return `${dakikaFarki} dakika`;
        }
        return kalanSaat === 0 ? '1 saat' : `${kalanSaat} saat`;
      } else {
        return `${gunFarki} gün ${kalanSaat} saat`;
      }
    }
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.target as HTMLImageElement;
    target.src = '/placeholder-image.png';
  };

  const OncelikIkonu = oncelikIkonlari[ariza.oncelik];
  const ilkFotograf = ariza.fotograflar?.[0];

  return (
    <div 
      className={`bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 ${
        compact ? 'scale-95' : ''
      } hover:scale-[1.02]`}
      onClick={onClick}
    >
      {/* Üst Kısım - Fotoğraf ve Durum */}
      <div className="relative">
        <div className={`aspect-video ${compact ? 'aspect-[3/2] sm:aspect-[4/3]' : 'aspect-[3/2] sm:aspect-video'}`}>
          {ilkFotograf ? (
            <img
              src={ilkFotograf}
              alt="Arıza fotoğrafı"
              className="w-full h-full object-cover"
              onError={handleImageError}
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-50">
              <ImageIcon className="h-8 w-8 text-gray-400" />
            </div>
          )}
        </div>

        {/* Durum ve Öncelik Rozetleri */}
        <div className="absolute top-2 left-2 flex flex-col gap-2">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${durumRenkleri[ariza.durum]}`}>
            {ariza.durum === 'cozuldu' && <CheckCircle className="w-3.5 h-3.5 mr-1" />}
            {ariza.durum === 'devam-ediyor' && <Clock className="w-3.5 h-3.5 mr-1" />}
            {ariza.durum === 'beklemede' && <Clock className="w-3.5 h-3.5 mr-1" />}
            {ariza.durum === 'acik' && <AlertTriangle className="w-3.5 h-3.5 mr-1" />}
            {ariza.durum.charAt(0).toUpperCase() + ariza.durum.slice(1).replace('-', ' ')}
          </span>
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${oncelikRenkleri[ariza.oncelik]}`}>
            <OncelikIkonu className="w-3.5 h-3.5 mr-1" />
            {ariza.oncelik.charAt(0).toUpperCase() + ariza.oncelik.slice(1)} Öncelik
          </span>
        </div>

        {/* Fotoğraf Sayısı */}
        {ariza.fotograflar && ariza.fotograflar.length > 1 && (
          <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded-full">
            <div className="flex items-center">
              <ImageIcon className="w-3.5 h-3.5 mr-1" />
              {ariza.fotograflar.length} Fotoğraf
            </div>
          </div>
        )}

        {/* Yorum Sayısı */}
        {ariza.yorumlar && ariza.yorumlar.length > 0 && (
          <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded-full">
            <div className="flex items-center">
              <MessageSquare className="w-3.5 h-3.5 mr-1" />
              {ariza.yorumlar.length} Yorum
            </div>
          </div>
        )}
      </div>

      {/* Alt Kısım - Detaylar */}
      <div className="p-4 sm:p-5 space-y-4">
        <div>
          <h3 className={`font-medium text-gray-900 ${compact ? 'text-sm' : 'text-base'} line-clamp-2`}>
            {ariza.baslik}
          </h3>
        </div>

        <div className={`space-y-2 ${compact ? 'text-xs' : 'text-sm'} text-gray-500`}>
          <div className="flex items-center">
            <Building className={`${compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} mr-1.5 text-gray-400`} />
            <span className="truncate">{sahaAdi}</span>
          </div>
          <div className="flex items-center">
            <MapPin className={`${compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} mr-1.5 text-gray-400`} />
            <span className="truncate">{ariza.konum}</span>
          </div>
          <div className="flex items-center">
            <User className={`${compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} mr-1.5 text-gray-400`} />
            <span className="truncate">{kullaniciAdi || 'Bilinmeyen Kullanıcı'}</span>
          </div>
        </div>

        <div className={`flex items-center justify-between ${compact ? 'text-xs' : 'text-sm'} pt-3 border-t border-gray-100`}>
          <div className="flex items-center text-gray-500">
            <Calendar className={`${compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} mr-1.5 text-gray-400`} />
            {format(ariza.olusturmaTarihi.toDate(), 'dd MMM yyyy', { locale: tr })}
          </div>
          <div className={`flex items-center ${ariza.cozum ? 'text-green-600' : 'text-gray-500'}`}>
            <Timer className={`${compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} mr-1.5`} />
            {getCozumSuresi()}
          </div>
        </div>
      </div>
    </div>
  );
};