import { initializeApp, getApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, enableIndexedDbPersistence } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { FirebaseError } from 'firebase/app';
import { authService } from '../services/authService';
import toast from 'react-hot-toast';

const firebaseConfig = {
  apiKey: "AIzaSyAGLu35FxS8Z51SBdpOvoaAdqPSG0l2di4",
  authDomain: "arizalar-955b6.firebaseapp.com",
  projectId: "arizalar-955b6",
  storageBucket: "arizalar-955b6.firebasestorage.app",
  messagingSenderId: "802092171880",
  appId: "1:802092171880:web:0ab6c609e002ed22a531dd"
};

let app;
try {
  app = initializeApp(firebaseConfig);
} catch (error) {
  if (error instanceof Error && error.message.includes('already exists')) {
    app = getApp();
  } else {
    throw error;
  }
}

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

try {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
    } else if (err.code === 'unimplemented') {
      console.warn('The current browser does not support persistence.');
    }
  });
} catch (error) {
  console.warn('Error enabling persistence:', error);
}

const checkConnection = async () => {
  try {
    await fetch('https://www.googleapis.com/identitytoolkit/v3/relyingparty/getAccountInfo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        idToken: await auth.currentUser?.getIdToken(),
      }),
    });
    return true;
  } catch (error) {
    return false;
  }
};

export const createUserWithProfile = async (email: string, password: string, userData: any) => {
  try {
    const isConnected = await checkConnection();
    if (!isConnected) {
      throw new Error('İnternet bağlantısı yok');
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    const userProfile = {
      ...userData,
      id: user.uid,
      email: user.email,
      olusturmaTarihi: new Date(),
      guncellenmeTarihi: new Date()
    };

    await setDoc(doc(db, 'kullanicilar', user.uid), userProfile);
    authService.setCurrentUser(userProfile);

    toast.success('Kullanıcı başarıyla oluşturuldu');
    return user;
  } catch (error: any) {
    if (error.code === 'auth/email-already-in-use') {
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        const userProfile = {
          ...userData,
          id: user.uid,
          email: user.email,
          guncellenmeTarihi: new Date()
        };

        await setDoc(doc(db, 'kullanicilar', user.uid), userProfile, { merge: true });
        authService.setCurrentUser(userProfile);

        toast.success('Kullanıcı profili güncellendi');
        return user;
      } catch (signInError) {
        handleAuthError(signInError);
        throw signInError;
      }
    }
    handleAuthError(error);
    throw error;
  }
};

export const signInUser = async (email: string, password: string) => {
  try {
    const isConnected = await checkConnection();
    if (!isConnected) {
      throw new Error('İnternet bağlantısı yok');
    }

    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    if (error instanceof Error && error.message === 'İnternet bağlantısı yok') {
      toast.error('İnternet bağlantısı yok. Lütfen bağlantınızı kontrol edin.');
    } else {
      handleAuthError(error);
    }
    throw error;
  }
};

export const handleAuthError = (error: unknown) => {
  console.error('Authentication Error:', error);
  
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'auth/network-request-failed':
        toast.error('İnternet bağlantısı yok. Lütfen bağlantınızı kontrol edin.');
        break;
      case 'auth/email-already-in-use':
        toast.error('Bu e-posta adresi zaten kullanımda');
        break;
      case 'auth/invalid-email':
        toast.error('Geçersiz e-posta adresi');
        break;
      case 'auth/operation-not-allowed':
        toast.error('E-posta/şifre girişi etkin değil');
        break;
      case 'auth/weak-password':
        toast.error('Şifre çok zayıf');
        break;
      case 'auth/user-disabled':
        toast.error('Bu hesap devre dışı bırakılmış');
        break;
      case 'auth/user-not-found':
        toast.error('Kullanıcı bulunamadı');
        break;
      case 'auth/wrong-password':
        toast.error('Hatalı şifre');
        break;
      case 'auth/too-many-requests':
        toast.error('Çok fazla başarısız deneme. Lütfen daha sonra tekrar deneyin');
        break;
      case 'auth/permission-denied':
        toast.error('Bu işlem için yetkiniz bulunmuyor');
        break;
      default:
        toast.error('Bir hata oluştu: ' + error.message);
    }
  } else if (error instanceof Error) {
    toast.error(error.message);
  } else {
    toast.error('Beklenmeyen bir hata oluştu');
  }
};

export default app;