import type { Kullanici } from '../types';

export class StorageService {
  private static instance: StorageService;
  private readonly USER_KEY = 'currentUser';
  private readonly LOGOUT_KEY = 'isLoggedOut';
  private readonly AUTH_STATE_KEY = 'authState';

  private constructor() {}

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  public saveUser(user: Kullanici): void {
    try {
      const userString = JSON.stringify(user);
      localStorage.setItem(this.USER_KEY, userString);
      localStorage.setItem(this.AUTH_STATE_KEY, JSON.stringify({
        userId: user.id,
        rol: user.rol,
        timestamp: Date.now()
      }));
      sessionStorage.removeItem(this.LOGOUT_KEY);
    } catch (error) {
      console.error('Error saving user:', error);
    }
  }

  public getUser(): Kullanici | null {
    try {
      const userString = localStorage.getItem(this.USER_KEY);
      const authState = localStorage.getItem(this.AUTH_STATE_KEY);
      
      if (!userString || !authState) return null;
      
      const user = JSON.parse(userString) as Kullanici;
      const auth = JSON.parse(authState);
      
      // Kullanıcı bilgileri ve auth state eşleşiyor mu kontrol et
      if (user.id !== auth.userId || user.rol !== auth.rol) {
        this.clearUser();
        return null;
      }
      
      return user;
    } catch (error) {
      console.error('Error getting user:', error);
      this.clearUser();
      return null;
    }
  }

  public clearUser(): void {
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem(this.AUTH_STATE_KEY);
    sessionStorage.setItem(this.LOGOUT_KEY, 'true');
  }

  public isLoggedOut(): boolean {
    return sessionStorage.getItem(this.LOGOUT_KEY) === 'true';
  }

  public validateStoredUser(uid: string): boolean {
    try {
      const user = this.getUser();
      const authState = localStorage.getItem(this.AUTH_STATE_KEY);
      
      if (!user || !authState) return false;
      
      const auth = JSON.parse(authState);
      return user.id === uid && user.id === auth.userId && Date.now() - auth.timestamp < 24 * 60 * 60 * 1000;
    } catch {
      return false;
    }
  }
}

export const storageService = StorageService.getInstance();