import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // 1. Strict Active Check (User & Business) - Works offline if user data is cached
  if (user && (!user.isActive || user.businessActive === false)) {
    // Allows access to business-status page to see why they are blocked
    if (location.pathname !== '/business-status') {
      return <Navigate to="/business-status" replace />;
    }
  }

  // 2. Subscription Expiry Check
  if (user?.subscription) {
    const endDate = new Date(user.subscription.endDate);
    const isExpired = endDate < new Date();

    // Allow access to specific management pages even if expired
    const isAllowedPath = location.pathname.includes('/dashboard/upgrade') ||
      location.pathname.includes('/dashboard/profile') ||
      location.pathname.includes('/dashboard/settings') ||
      location.pathname === '/business-status';

    if (isExpired && !isAllowedPath) {
      return <Navigate to="/business-status" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
