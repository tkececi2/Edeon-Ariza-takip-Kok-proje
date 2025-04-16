import React from 'react';
import { useAuth } from '../contexts/AuthContext';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-2xl font-semibold text-gray-900">
            Hoş Geldiniz, {user?.email}
          </h1>
          <div className="mt-4">
            <p className="text-gray-600">
              Arıza takip sistemine başarıyla giriş yaptınız.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};