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
    if (customerOnly) {
      return <Navigate to="/customer/login" state={{ from: location }} replace />;
    }
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  // Customer routes - only customers can access
  if (customerOnly) {
    if (!isAuthenticated || role !== 'customer') {
      // Redirect to customer login if not authenticated or not a customer
      return <Navigate to="/customer/login" state={{ from: location }} replace />;
    }
    return <>{children}</>;
  }

  // Admin/Employee routes - customers must not access
  if (role === 'customer' && !customerOnly) {
    // Customers trying to access admin routes
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
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
