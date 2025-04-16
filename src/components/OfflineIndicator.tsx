import React, { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import toast from 'react-hot-toast';

export const OfflineIndicator: React.FC = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      toast.success('İnternet bağlantısı kuruldu');
    };
    
    const handleOffline = () => {
      setIsOffline(true);
      toast.error('İnternet bağlantısı kesildi');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 z-50 animate-bounce">
      <WifiOff className="h-5 w-5" />
      <span>İnternet bağlantısı yok</span>
    </div>
  );
};