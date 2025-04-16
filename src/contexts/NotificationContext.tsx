import React, { createContext, useContext, useState } from 'react';
import { toast } from 'react-hot-toast';

interface NotificationContextType {
  notification: any | null;
  requestPermission: () => Promise<string | null>;
}

const NotificationContext = createContext<NotificationContextType>({
  notification: null,
  requestPermission: async () => null,
});

export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notification, setNotification] = useState<any>(null);

  const requestPermission = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        toast.success('Bildirim izni alındı');
        return 'granted';
      }
      toast.error('Bildirim izni alınamadı');
      return null;
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      toast.error('Bildirim izni alınamadı');
      return null;
    }
  };

  return (
    <NotificationContext.Provider value={{ notification, requestPermission }}>
      {children}
    </NotificationContext.Provider>
  );
};