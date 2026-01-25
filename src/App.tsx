import { Routes, Route, Navigate } from 'react-router-dom';
import PublicLayout from './layouts/PublicLayout';
import AdminLayout from './layouts/AdminLayout';
import HomePage from './pages/public/HomePage';
import ProviderPage from './pages/public/ProviderPage';
import AdminDashboard from './pages/admin/Dashboard';
import AdminManagePlans from './pages/admin/ManagePlans';
import AdminCustomers from './pages/admin/Customers';
import AdminComplaints from './pages/admin/Complaints';
import AdminUsers from './pages/admin/Users';
import Login from './pages/admin/Login';
import CustomerLogin from './pages/customer/Login';
import CustomerDashboard from './pages/customer/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuthStore } from './store/useAuthStore';

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path="gtpl" element={<ProviderPage provider="GTPL" />} />
        <Route path="bsnl" element={<ProviderPage provider="BSNL" />} />
        <Route path="railwire" element={<ProviderPage provider="Railwire" />} />
        <Route path="krishiinet" element={<ProviderPage provider="Krishiinet" />} />
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
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="manage-plans"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminManagePlans />
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
        <Route index element={<AdminRedirect />} />
      </Route>
    </Routes>
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
