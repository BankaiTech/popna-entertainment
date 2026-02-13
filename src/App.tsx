// Project cleaned — unused files & dead code removed

import { Routes, Route, Navigate } from 'react-router-dom';
import PublicLayout from './layouts/PublicLayout';
import AdminLayout from './layouts/AdminLayout';
import HomePage from './pages/public/HomePage';
import PlansPage from './pages/public/PlansPage';
import AdminDashboard from './pages/admin/Dashboard';
import AdminCatalog from './pages/admin/Catalog';
import AdminCustomers from './pages/admin/Customers';
import AdminInvoices from './pages/admin/Invoices';
import AdminPurchaseInvoices from './pages/admin/PurchaseInvoices';
import AdminComplaints from './pages/admin/Complaints';
import AdminUsers from './pages/admin/Users';
import AdminSettings from './pages/admin/Settings';
import ConnectionRequests from './pages/admin/ConnectionRequests';
import Login from './pages/admin/Login';
import CustomerLogin from './pages/customer/Login';
import CustomerDashboard from './pages/customer/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import ScrollToTop from './components/ScrollToTop';
import { useAuthStore } from './store/useAuthStore';

function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
      {/* Public Routes */}
      <Route path="/" element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path="plans" element={<PlansPage />} />
      </Route>

      {/* Admin Login */}
      <Route path="/admin/login" element={<Login />} />

      {/* Customer Login */}
      <Route path="/customer/login" element={<CustomerLogin />} />

      {/* Customer Routes - Protected */}
      <Route
        path="/customer/dashboard"
        element={
          <ProtectedRoute customerOnly>
            <CustomerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/customer"
        element={<Navigate to="/customer/dashboard" replace />}
      />

      {/* Admin Routes - Protected */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route
          path="dashboard"
          element={
            <ProtectedRoute allowedRoles={['admin', 'employee']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="catalog"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminCatalog />
            </ProtectedRoute>
          }
        />
        <Route
          path="invoices"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminInvoices />
            </ProtectedRoute>
          }
        />
        <Route
          path="purchase-invoices"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminPurchaseInvoices />
            </ProtectedRoute>
          }
        />
        <Route
          path="customers"
          element={
            <ProtectedRoute allowedRoles={['admin', 'employee']}>
              <AdminCustomers />
            </ProtectedRoute>
          }
        />
        <Route
          path="complaints"
          element={
            <ProtectedRoute allowedRoles={['admin', 'employee']}>
              <AdminComplaints />
            </ProtectedRoute>
          }
        />
        <Route
          path="users"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminUsers />
            </ProtectedRoute>
          }
        />
        <Route
          path="settings"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminSettings />
            </ProtectedRoute>
          }
        />
        <Route
          path="connection-requests"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <ConnectionRequests />
            </ProtectedRoute>
          }
        />
        <Route index element={<AdminRedirect />} />
      </Route>
    </Routes>
    </>
  );
}

// Component to handle /admin redirect based on auth state
function AdminRedirect() {
  const { isAuthenticated, role } = useAuthStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }
  
  if (role === 'customer') {
    return <Navigate to="/customer/dashboard" replace />;
  }
  
  if (role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }
  
  return <Navigate to="/admin/customers" replace />;
}

export default App;
