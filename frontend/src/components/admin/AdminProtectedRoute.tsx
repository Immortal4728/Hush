import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isAdminAuthenticated } from '../../services/adminApi';

interface AdminProtectedRouteProps {
  children: React.ReactElement;
}

export const AdminProtectedRoute: React.FC<AdminProtectedRouteProps> = ({ children }) => {
  const location = useLocation();

  if (!isAdminAuthenticated()) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return children;
};
