// SaaS Product Fully Completed
// Client folder removed - SaaS multi-tenant architecture used
// Multi-tenant SaaS Isolation

import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import PublicLayout from './layouts/PublicLayout';
import AdminLayout from './layouts/AdminLayout';
import SuperAdminLayout from './layouts/SuperAdminLayout';
import HomePage from './pages/public/HomePage';
import AdminDashboard from './pages/admin/Dashboard';
// Catalog module removed - merged into Inventory
// Customers module removed - merged into Contacts
import AdminSales from './pages/admin/Sales';
import AdminPurchase from './pages/admin/Purchase';
import Appointments from './pages/admin/Appointments';
import ServiceRequests from './pages/admin/ServiceRequests';
import Leads from './pages/admin/Leads';
import Reports from './pages/admin/Reports';
import AuditTrail from './pages/admin/AuditTrail';
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
import SignupRequests from './pages/superadmin/SignupRequests';
import SuperAdminUsers from './pages/superadmin/Users';
import Login from './pages/Login';
import CustomerDashboard from './pages/customer/Dashboard';
import CustomerHistory from './pages/customer/History';
import ProtectedRoute from './components/ProtectedRoute';
import ScrollToTop from './components/ScrollToTop';
import { PWAFeatures } from './components/PWAFeatures';
import { useAuthStore } from './store/useAuthStore';

function App() {

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
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<PublicLayout />}>
          <Route index element={<HomePage />} />
        </Route>

        {/* Single Login - admin/employee/customer determined by credentials */}
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
          path="/customer/history"
          element={
            <ProtectedRoute customerOnly>
              <CustomerHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer"
          element={<Navigate to="/customer/dashboard" replace />}
        />

        {/* Super Admin Routes - SaaS Master Controller */}
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
          <Route
            path="signup-requests"
            element={
              <ProtectedRoute allowedRoles={['superadmin']}>
                <SignupRequests />
              </ProtectedRoute>
            }
          />
          <Route
            path="users"
            element={
              <ProtectedRoute allowedRoles={['superadmin']}>
                <SuperAdminUsers />
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
            path="sales"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminSales />
              </ProtectedRoute>
            }
          />
          <Route path="invoices" element={<Navigate to="/admin/sales" replace />} />
          <Route path="quotations" element={<Navigate to="/admin/sales" replace />} />
          <Route
            path="purchase"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminPurchase />
              </ProtectedRoute>
            }
          />
          <Route path="purchase-invoices" element={<Navigate to="/admin/purchase" replace />} />
          <Route path="purchase-orders" element={<Navigate to="/admin/purchase" replace />} />
          <Route path="expenses" element={<Navigate to="/admin/purchase" replace />} />
          <Route
            path="appointments"
            element={
              <ProtectedRoute allowedRoles={['admin', 'employee']}>
                <Appointments />
              </ProtectedRoute>
            }
          />
          <Route
            path="service-requests"
            element={
              <ProtectedRoute allowedRoles={['admin', 'employee']}>
                <ServiceRequests />
              </ProtectedRoute>
            }
          />
          <Route
            path="leads"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Leads />
              </ProtectedRoute>
            }
          />
          {/* Subscriptions consolidated into CustomerSheet */}
          <Route path="subscriptions" element={<Navigate to="/admin/contacts" replace />} />
          <Route
            path="reports"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Reports />
              </ProtectedRoute>
            }
          />
          <Route
            path="audit-trail"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AuditTrail />
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
