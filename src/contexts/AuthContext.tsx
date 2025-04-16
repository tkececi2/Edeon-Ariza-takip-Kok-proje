import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { authService } from '../services/authService';
import { signInUser } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { Kullanici } from '../types';
import toast from 'react-hot-toast';

interface AuthContextType {
  kullanici: Kullanici | null;
  loading: boolean;
  setKullanici: (kullanici: Kullanici | null) => void;
  cikisYap: () => Promise<void>;
  girisYap: (email: string, sifre: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType>({
  kullanici: null,
  loading: true,
  setKullanici: () => {},
  cikisYap: async () => {},
  girisYap: async () => false
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [kullanici, setKullanici] = useState<Kullanici | null>(null);
  const [loading, setLoading] = useState(true);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const authCheckCompleted = useRef(false);

  // Kullanıcı verilerini normalize et
  const normalizeUserData = (userData: any): Kullanici => {
    // Sahalar dizisini kontrol et
    let sahalar = userData.sahalar || [];
    
    // Eğer sahalar bir dizi değilse, dizi haline getir
    if (sahalar && !Array.isArray(sahalar)) {
      sahalar = Object.keys(sahalar);
    }
    
    return {
      ...userData,
      sahalar
    };
  };

  // Kullanıcı profilini getir
  const fetchUserProfile = async (userId: string): Promise<Kullanici | null> => {
    try {
      const userDoc = await getDoc(doc(db, 'kullanicilar', userId));
      if (!userDoc.exists()) return null;
      
      const userData = userDoc.data();
      return normalizeUserData({ id: userId, ...userData });
    } catch (error) {
      console.error('Kullanıcı profili getirme hatası:', error);
      return null;
    }
  };

  useEffect(() => {
    // Önce localStorage'dan kullanıcı bilgisini al
    const storedUser = authService.getCurrentUser();
    if (storedUser) {
      setKullanici(normalizeUserData(storedUser));
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (!authCheckCompleted.current) {
          authCheckCompleted.current = true;
        }

        if (user) {
          if (authService.isLoggedOut()) {
            setKullanici(null);
            setLoading(false);
            return;
          }

          // Kullanıcı profili bilgilerini getir
          const userData = await fetchUserProfile(user.uid);
          
          if (userData) {
            setKullanici(userData);
            authService.setCurrentUser(userData);
          } else {
            await signOut(auth);
            authService.clearUserData();
            setKullanici(null);
            toast.error('Kullanıcı profili bulunamadı');
          }
        } else {
          authService.clearUserData();
          setKullanici(null);
        }
      } catch (error) {
        console.error('Auth state change error:', error);
        authService.clearUserData();
        setKullanici(null);
      } finally {
        setLoading(false);
      }
    });

    unsubscribeRef.current = unsubscribe;
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        authCheckCompleted.current = false;
      }
    };
  }, []);

  const girisYap = async (email: string, sifre: string): Promise<boolean> => {
    try {
      const user = await signInUser(email, sifre);
      
      // Kullanıcı profili bilgilerini getir
      const userData = await fetchUserProfile(user.uid);
      
      if (userData) {
        setKullanici(userData);
        authService.setCurrentUser(userData);
        toast.success('Giriş başarılı');
        return true;
      }
      
      toast.error('Kullanıcı profili bulunamadı');
      await signOut(auth);
      authService.clearUserData();
      setKullanici(null);
      return false;
    } catch (error: any) {
      console.error('Giriş hatası:', error);
      
      // Hata mesajını belirle
      let errorMessage = 'Giriş yapılırken bir hata oluştu';
      if (error.code === 'auth/invalid-credential') {
        errorMessage = 'E-posta veya şifre hatalı';
      } else if (error.code === 'auth/user-not-found') {
        errorMessage = 'Kullanıcı bulunamadı';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Şifre hatalı';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Çok fazla başarısız deneme. Lütfen daha sonra tekrar deneyin';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Ağ bağlantısı hatası. İnternet bağlantınızı kontrol edin';
      }
      
      toast.error(errorMessage);
      return false;
    }
  };

  const cikisYap = async () => {
    try {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }

      await signOut(auth);
      authService.clearUserData();
      setKullanici(null);

      // Clear IndexedDB
      const databases = await window.indexedDB.databases();
      for (const db of databases) {
        if (db.name) {
          window.indexedDB.deleteDatabase(db.name);
        }
      }

      // Unregister service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
      }

      toast.success('Başarıyla çıkış yapıldı');
      window.location.href = '/login';
    } catch (error) {
      console.error('Çıkış yapılırken hata:', error);
      toast.error('Çıkış yapılırken bir hata oluştu');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-yellow-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ kullanici, loading, setKullanici, cikisYap, girisYap }}>
      {children}
    </AuthContext.Provider>
  );
};