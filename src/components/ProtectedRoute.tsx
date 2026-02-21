import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore, UserRole } from '@/store/useAuthStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  customerOnly?: boolean; // For customer-specific routes
  clientOnly?: boolean; // SaaS Ready — for client/partner routes
}

const ProtectedRoute = ({ children, allowedRoles, customerOnly, clientOnly }: ProtectedRouteProps) => {
  const { isAuthenticated, role } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    if (customerOnly) {
      return <Navigate to="/customer/login" state={{ from: location }} replace />;
    }
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  // Customer routes - only customers can access
  if (customerOnly) {
    if (!isAuthenticated || role !== 'customer') {
      return <Navigate to="/customer/login" state={{ from: location }} replace />;
    }
    return <>{children}</>;
  }

  // Client/Partner routes — only clients can access
  if (clientOnly) {
    if (role !== 'client') {
      if (role === 'admin' || role === 'employee') {
        return <Navigate to="/admin/dashboard" replace />;
      }
      return <Navigate to="/admin/login" replace />;
    }
    return <>{children}</>;
  }

  // Admin/Employee routes - customers and clients must not access
  if (role === 'customer' && !customerOnly) {
    return <Navigate to="/customer/dashboard" replace />;
  }
  if (role === 'client' && !clientOnly) {
    return <Navigate to="/client/dashboard" replace />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    // Redirect based on role
    if (role === 'employee') {
      return <Navigate to="/admin/customers" replace />;
    }
    if (role === 'customer') {
      return <Navigate to="/customer/dashboard" replace />;
    }
    if (role === 'client') {
      return <Navigate to="/client/dashboard" replace />;
    }
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;

