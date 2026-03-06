// Client folder removed — SaaS multi-tenant only
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore, UserRole } from '@/store/useAuthStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  customerOnly?: boolean; // For customer-specific routes
}

const ProtectedRoute = ({ children, allowedRoles, customerOnly }: ProtectedRouteProps) => {
  const { isAuthenticated, role } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Customer routes - only customers can access
  if (customerOnly) {
    if (!isAuthenticated || role !== 'customer') {
      return <Navigate to="/login" state={{ from: location }} replace />;
    }
    return <>{children}</>;
  }

  // Admin/Employee/SuperAdmin routes - customers must not access
  if (role === 'customer' && !customerOnly) {
    return <Navigate to="/customer/dashboard" replace />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    // Redirect based on role
    if (role === 'employee') {
      return <Navigate to="/admin/customers" replace />;
    }
    if (role === 'customer') {
      return <Navigate to="/customer/dashboard" replace />;
    }
    if (role === 'superadmin') {
      return <Navigate to="/superadmin/dashboard" replace />;
    }
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
