// SaaS Product Fully Completed
// Client folder removed — SaaS multi-tenant architecture used
// Multi-tenant SaaS Isolation

import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import PublicLayout from './layouts/PublicLayout';
import AdminLayout from './layouts/AdminLayout';
import SuperAdminLayout from './layouts/SuperAdminLayout';
import HomePage from './pages/public/HomePage';
import ErrorShowPage from './pages/ErrorShowPage';
import AdminDashboard from './pages/admin/Dashboard';
// Catalog module removed — merged into Inventory
// Customers module removed — merged into Contacts
import AdminInvoices from './pages/admin/Invoices';
import AdminPurchaseInvoices from './pages/admin/PurchaseInvoices';
import AdminComplaints from './pages/admin/Complaints';
import AdminUsers from './pages/admin/Users';
import AdminSettings from './pages/admin/Settings';
import ConnectionRequests from './pages/admin/ConnectionRequests';
import AdminContacts from './pages/admin/Contacts';
import InventoryProducts from './pages/admin/InventoryProducts';
import AdminBranches from './pages/admin/Branches';
import AdminPointOfSale from './pages/admin/PointOfSale';
import SuperAdminDashboard from './pages/superadmin/Dashboard';
import Organizations from './pages/superadmin/Organizations';
import Login from './pages/Login';
import CustomerDashboard from './pages/customer/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import ScrollToTop from './components/ScrollToTop';
import { PWAFeatures } from './components/PWAFeatures';
import { useAuthStore } from './store/useAuthStore';

function App() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const showErrorPage = location.pathname === '/' && searchParams.has('error_show');

  // Remove the loading screen after the first paint so the skeleton flash is not visible (wait 2 frames)
  useEffect(() => {
    const el = document.getElementById('app-loading');
    let rafId: number;
    const remove = () => {
      if (el?.parentNode) el.remove();
    };
    rafId = requestAnimationFrame(() => {
      rafId = requestAnimationFrame(remove);
    });
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <>
      <ScrollToTop />
      <PWAFeatures />
      {showErrorPage && <ErrorShowPage />}
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<PublicLayout />}>
          <Route index element={<HomePage />} />
        </Route>

        {/* Single Login — admin/employee/customer determined by credentials */}
        <Route path="/login" element={<Login />} />

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

        {/* Super Admin Routes — SaaS Master Controller */}
        <Route
          path="/superadmin"
          element={
            <ProtectedRoute allowedRoles={['superadmin']}>
              <SuperAdminLayout />
            </ProtectedRoute>
          }
        >
          <Route
            path="dashboard"
            element={
              <ProtectedRoute allowedRoles={['superadmin']}>
                <SuperAdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="organizations"
            element={
              <ProtectedRoute allowedRoles={['superadmin']}>
                <Organizations />
              </ProtectedRoute>
            }
          />
          <Route index element={<Navigate to="/superadmin/dashboard" replace />} />
        </Route>

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
          {/* Catalog & Products → Inventory redirect for backward compat */}
          <Route path="products" element={<Navigate to="/admin/inventory-products" replace />} />
          <Route path="catalog" element={<Navigate to="/admin/inventory-products" replace />} />
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
          {/* Customers → Contacts redirect for backward compat */}
          <Route path="customers" element={<Navigate to="/admin/contacts" replace />} />
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
          <Route
            path="contacts"
            element={
              <ProtectedRoute allowedRoles={['admin', 'employee']}>
                <AdminContacts />
              </ProtectedRoute>
            }
          />
          <Route
            path="inventory-products"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <InventoryProducts />
              </ProtectedRoute>
            }
          />
          <Route
            path="branches"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminBranches />
              </ProtectedRoute>
            }
          />
          <Route
            path="pos"
            element={
              <ProtectedRoute allowedRoles={['admin', 'employee']}>
                <AdminPointOfSale />
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
    return <Navigate to="/login" replace />;
  }

  if (role === 'customer') {
    return <Navigate to="/customer/dashboard" replace />;
  }

  if (role === 'superadmin') {
    return <Navigate to="/superadmin/dashboard" replace />;
  }

  if (role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <Navigate to="/admin/contacts" replace />;
}

export default App;
