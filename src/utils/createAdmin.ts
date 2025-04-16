import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

// Admin oluşturma işlemini kaldırıyoruz çünkü otomatik admin oluşturma
// kullanıcı rollerinin karışmasına sebep oluyor
export const createAdminUser = async () => {
  return Promise.resolve();
};