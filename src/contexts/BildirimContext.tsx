import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, where, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

interface Bildirim {
  id: string;
  baslik: string;
  mesaj: string;
  tarih: Date;
  okundu: boolean;
  tip: 'ariza' | 'yorum' | 'durum' | 'sistem';
  link?: string;
  kullaniciId: string;
}

interface BildirimContextType {
  bildirimler: Bildirim[];
  okunmamisSayisi: number;
  bildirimOku: (id: string) => Promise<void>;
  tumunuOku: () => Promise<void>;
}

const BildirimContext = createContext<BildirimContextType>({
  bildirimler: [],
  okunmamisSayisi: 0,
  bildirimOku: async () => {},
  tumunuOku: async () => {}
});

export const useBildirimler = () => useContext(BildirimContext);

export const BildirimProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [bildirimler, setBildirimler] = useState<Bildirim[]>([]);
  const { kullanici } = useAuth();

  useEffect(() => {
    if (!kullanici?.id) return;

    // Only fetch notifications for users with appropriate roles
    if (!['yonetici', 'tekniker', 'muhendis'].includes(kullanici.rol)) {
      return;
    }

    try {
      const bildirimQuery = query(
        collection(db, 'bildirimler'),
        where('kullaniciId', '==', kullanici.id),
        orderBy('tarih', 'desc')
      );

      const unsubscribe = onSnapshot(
        bildirimQuery,
        (snapshot) => {
          const yeniBildirimler = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            tarih: doc.data().tarih?.toDate() || new Date()
          })) as Bildirim[];
          
          setBildirimler(yeniBildirimler);
        },
        (error) => {
          // Only show error for unexpected errors, not permission denied
          if (error.code !== 'permission-denied') {
            console.error('Bildirim dinleme hatası:', error);
            toast.error('Bildirimler yüklenirken bir hata oluştu');
          }
        }
      );

      return () => unsubscribe();
    } catch (error) {
      // Only show error for unexpected errors
      if ((error as any).code !== 'permission-denied') {
        console.error('Bildirim sistemi başlatma hatası:', error);
      }
    }
  }, [kullanici?.id, kullanici?.rol]);

  const okunmamisSayisi = bildirimler.filter(b => !b.okundu).length;

  const bildirimOku = async (id: string) => {
    if (!kullanici?.id) return;

    try {
      const bildirimRef = doc(db, 'bildirimler', id);
      await updateDoc(bildirimRef, {
        okundu: true
      });
    } catch (error) {
      if ((error as any).code !== 'permission-denied') {
        console.error('Bildirim okuma hatası:', error);
        toast.error('Bildirim işaretlenirken bir hata oluştu');
      }
    }
  };

  const tumunuOku = async () => {
    if (!kullanici?.id || bildirimler.length === 0) return;

    try {
      const batch = writeBatch(db);
      
      bildirimler
        .filter(b => !b.okundu)
        .forEach(bildirim => {
          const bildirimRef = doc(db, 'bildirimler', bildirim.id);
          batch.update(bildirimRef, { okundu: true });
        });

      await batch.commit();
    } catch (error) {
      if ((error as any).code !== 'permission-denied') {
        console.error('Toplu bildirim okuma hatası:', error);
        toast.error('Bildirimler işaretlenirken bir hata oluştu');
      }
    }
  };

  return (
    <BildirimContext.Provider value={{ bildirimler, okunmamisSayisi, bildirimOku, tumunuOku }}>
      {children}
    </BildirimContext.Provider>
  );
};