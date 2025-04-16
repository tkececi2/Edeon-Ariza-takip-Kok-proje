import { format, differenceInHours, differenceInDays } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Timestamp } from 'firebase/firestore';

export const formatTarih = (tarih: Timestamp | Date): string => {
  const date = tarih instanceof Timestamp ? tarih.toDate() : tarih;
  return format(date, 'dd MMM yyyy HH:mm', { locale: tr });
};

export const formatCozumSuresi = (baslangic: Date, bitis: Date): string => {
  const saatFarki = differenceInHours(bitis, baslangic);
  const gunFarki = Math.floor(saatFarki / 24);
  const kalanSaat = saatFarki % 24;

  if (gunFarki === 0) {
    return `${saatFarki} saat`;
  } else {
    return `${gunFarki} gün ${kalanSaat} saat`;
  }
};