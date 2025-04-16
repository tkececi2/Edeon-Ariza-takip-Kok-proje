import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from './LoadingSpinner';

export const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { kullanici, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!kullanici) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};