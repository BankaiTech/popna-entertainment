import { useTranslation } from 'react-i18next';
// SaaS Product Fully Completed
// Client folder removed - SaaS multi-tenant architecture used
// Multi-tenant SaaS Isolation

import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './layouts/AdminLayout';
import SuperAdminLayout from './layouts/SuperAdminLayout';
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
import MyDuty from './pages/admin/MyDuty';
import LcoStock from './pages/admin/lco/Stock';
import LcoDashboard from './pages/admin/lco/Dashboard';
import SmsLog from './pages/admin/lco/SmsLog';
import LcoPurchases from './pages/admin/lco/Purchases';
import LcoSales from './pages/admin/lco/Sales';
import { isMockMode } from './lib/apiHelpers';
import LiveMap from './pages/admin/LiveMap';
import CutoffList from './pages/admin/CutoffList';
import CollectRoute from './pages/admin/CollectRoute';
import InventoryProducts from './pages/admin/InventoryProducts';
import AdminBranches from './pages/admin/Branches';
import AdminPointOfSale from './pages/admin/PointOfSale';
import SuperAdminDashboard from './pages/superadmin/Dashboard';
import Organizations from './pages/superadmin/Organizations';
import SignupRequests from './pages/superadmin/SignupRequests';
import SuperAdminPayments from './pages/superadmin/Payments';
import SuperAdminUsers from './pages/superadmin/Users';
import Login from './pages/Login';
import CustomerDashboard from './pages/customer/Dashboard';
import CustomerHistory from './pages/customer/History';
import CustomerComplaints from './pages/customer/Complaints';
import CustomerLayout from './layouts/CustomerLayout';
import CustomerLogin from './pages/CustomerLogin';
import ProtectedRoute from './components/ProtectedRoute';
import ScrollToTop from './components/ScrollToTop';
import { PWAFeatures } from './components/PWAFeatures';
import { useAuthStore } from './store/useAuthStore';

function App() {
  // Re-draw every screen when the user changes the language.
  const { i18n, ready } = useTranslation();

  // Remove the loading screen after the first paint so the skeleton flash is not visible (wait 2 frames).
  // Wait for the translation file too: drawing screens before it arrives means drawing them twice
  // (and every screen would load its data twice).
  useEffect(() => {
    if (!ready) return;
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
  }, [ready]);

  if (!ready) return null; // the static loading screen in index.html stays visible meanwhile

  return (
    <>
      <ScrollToTop />
      <PWAFeatures />
      <Routes key={i18n.language}>
        {/* Public Routes */}
        {/* No public marketing site: the address opens the login page */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Single Login - admin/employee/customer determined by credentials */}
        <Route path="/login" element={<Login />} />

        {/* Customer app (mobile + box number login) */}
        <Route path="/customer/login" element={<CustomerLogin />} />
        <Route
          path="/customer"
          element={
            <ProtectedRoute customerOnly>
              <CustomerLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/customer/dashboard" replace />} />
          <Route path="dashboard" element={<CustomerDashboard />} />
          <Route path="history" element={<CustomerHistory />} />
          <Route path="complaints" element={<CustomerComplaints />} />
          <Route path="*" element={<Navigate to="/customer/dashboard" replace />} />
        </Route>

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
            path="payments"
            element={
              <ProtectedRoute allowedRoles={['superadmin']}>
                <SuperAdminPayments />
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
                {isMockMode() ? <AdminDashboard /> : <LcoDashboard />}
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
                {isMockMode() ? <AdminSales /> : <LcoSales />}
              </ProtectedRoute>
            }
          />
          <Route path="invoices" element={<Navigate to="/admin/sales" replace />} />
          <Route path="quotations" element={<Navigate to="/admin/sales" replace />} />
          <Route
            path="purchase"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                {isMockMode() ? <AdminPurchase /> : <LcoPurchases />}
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
                {isMockMode() ? <Appointments /> : <Navigate to="/admin/dashboard" replace />}
              </ProtectedRoute>
            }
          />
          <Route
            path="service-requests"
            element={
              <ProtectedRoute allowedRoles={['admin', 'employee']}>
                {isMockMode() ? <ServiceRequests /> : <Navigate to="/admin/dashboard" replace />}
              </ProtectedRoute>
            }
          />
          <Route
            path="leads"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                {isMockMode() ? <Leads /> : <Navigate to="/admin/dashboard" replace />}
              </ProtectedRoute>
            }
          />
          {/* Subscriptions consolidated into CustomerSheet */}
          <Route path="subscriptions" element={<Navigate to="/admin/contacts" replace />} />
          <Route
            path="reports"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                {isMockMode() ? <Reports /> : <Navigate to="/admin/dashboard" replace />}
              </ProtectedRoute>
            }
          />
          <Route
            path="audit-trail"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                {isMockMode() ? <AuditTrail /> : <Navigate to="/admin/dashboard" replace />}
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
            path="sms-log"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <SmsLog />
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
                {isMockMode() ? <ConnectionRequests /> : <Navigate to="/admin/dashboard" replace />}
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
            path="duty"
            element={
              <ProtectedRoute allowedRoles={['employee']}>
                <MyDuty />
              </ProtectedRoute>
            }
          />
          <Route
            path="collect"
            element={
              <ProtectedRoute allowedRoles={['admin', 'employee']}>
                <CollectRoute />
              </ProtectedRoute>
            }
          />
          <Route
            path="live-map"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <LiveMap />
              </ProtectedRoute>
            }
          />
          <Route
            path="cutoff"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <CutoffList />
              </ProtectedRoute>
            }
          />
          <Route
            path="inventory-products"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                {isMockMode() ? <InventoryProducts /> : <LcoStock />}
              </ProtectedRoute>
            }
          />
          <Route
            path="branches"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                {isMockMode() ? <AdminBranches /> : <Navigate to="/admin/dashboard" replace />}
              </ProtectedRoute>
            }
          />
          <Route
            path="pos"
            element={
              <ProtectedRoute allowedRoles={['admin', 'employee']}>
                {isMockMode() ? <AdminPointOfSale /> : <Navigate to="/admin/dashboard" replace />}
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
