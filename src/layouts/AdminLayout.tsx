// Module access controlled by organization permissions
import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Package, Users, FileText, ShoppingCart, AlertCircle, UserCog, Settings, LogOut, Menu, X, PhoneCall } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useOrganizationStore } from '@/store/useOrganizationStore';
import Button from '@/components/ui/Button';
import FooterCredit from '@/components/FooterCredit';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import type { ModuleKey } from '@/models/types';

const AdminLayout = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { role, logout, username, organizationId } = useAuthStore();
  const { fetchOrganization, isModuleAllowed } = useOrganizationStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Fetch organization permissions on mount
  useEffect(() => {
    if (organizationId) {
      fetchOrganization(organizationId);
    }
  }, [organizationId, fetchOrganization]);

  const handleLogout = () => {
    logout();
    navigate('/admin/login', { replace: true });
  };

  // Full product sidebar — enterprise SaaS structure. Admin sees all (filtered by org); Employee sees limited.
  const allAdminMenuItems: { path: string; labelKey: string; icon: typeof LayoutDashboard; moduleKey: ModuleKey }[] = [
    { path: '/admin/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard, moduleKey: 'dashboard' },
    { path: '/admin/customers', labelKey: 'nav.customers', icon: Users, moduleKey: 'customers' },
    { path: '/admin/connection-requests', labelKey: 'nav.newConnection', icon: PhoneCall, moduleKey: 'connection-requests' },
    { path: '/admin/catalog', labelKey: 'nav.catalog', icon: Package, moduleKey: 'catalog' },
    { path: '/admin/invoices', labelKey: 'nav.invoices', icon: FileText, moduleKey: 'invoices' },
    { path: '/admin/purchase-invoices', labelKey: 'nav.purchaseInvoices', icon: ShoppingCart, moduleKey: 'purchase-invoices' },
    { path: '/admin/complaints', labelKey: 'nav.complaints', icon: AlertCircle, moduleKey: 'complaints' },
    { path: '/admin/users', labelKey: 'nav.users', icon: UserCog, moduleKey: 'users' },
    { path: '/admin/settings', labelKey: 'nav.settings', icon: Settings, moduleKey: 'settings' },
  ];

  // Filter admin menu by organization allowed modules
  const adminMenuItems = allAdminMenuItems.filter((item) => isModuleAllowed(item.moduleKey));

  // Employee sidebar — Dashboard hidden, only Customers and Complaints visible (also filtered by org)
  const employeeMenuItems = allAdminMenuItems.filter(
    (item) => (item.moduleKey === 'customers' || item.moduleKey === 'complaints') && isModuleAllowed(item.moduleKey)
  );

  const menuItems = role === 'admin' ? adminMenuItems : employeeMenuItems;

  // Header height: h-14 (3.5rem). Sidebar uses top-14 to sit below it.
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Mobile overlay — z-40; header z-50 stays above so drawer does not overlap header */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 sm:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sticky header — full width, compact, stays above content */}
      <header className="fixed top-0 left-0 right-0 z-50 h-14 shrink-0 flex items-center justify-between px-4 sm:px-8 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="sm:hidden p-2 hover:bg-accent rounded-md"
            aria-label={t('openMenu')}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-base sm:text-lg font-semibold">{t('dashboard.welcome')} {username || t('common.user', 'User')}</h2>
            <p className="text-xs sm:text-sm text-muted-foreground capitalize">{role || t('common.user', 'User')} {t('dashboard.userDashboard')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <Button variant="outline" onClick={handleLogout} className="flex items-center space-x-2 text-sm sm:text-base">
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">{t('nav.logout')}</span>
          </Button>
        </div>
      </header>

      <div className="flex flex-1 pt-14">
        {/* Sidebar — desktop: sticky full height; mobile: drawer */}
        <aside
          className={cn(
            'fixed top-14 bottom-0 left-0',
            'z-40 w-56 bg-gray-50 border-r border-gray-200 flex flex-col',
            'transform transition-transform duration-300 ease-in-out',
            'sm:translate-x-0',
            isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          {/* Logo Header */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between shrink-0 bg-gray-50">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <span className="text-white text-xs font-bold">P</span>
              </div>
              <h1 className="text-base font-bold text-gray-900">{t('popna')}</h1>
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="sm:hidden p-1.5 hover:bg-gray-200 rounded transition-colors"
              aria-label={t('closeMenu')}
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                  )}
                >
                  <Icon className={cn('w-4 h-4', isActive ? 'text-white' : 'text-gray-600')} />
                  <span>{t(item.labelKey)}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main content — flex column to push footer to bottom */}
        <main className="flex-1 flex flex-col w-full bg-white sm:ml-56">
          <div className="flex-1 overflow-auto p-4 sm:p-6">
            <Outlet />
          </div>

          {/* Footer credit — sticks to bottom using margin-top: auto */}
          <footer className="shrink-0 mt-auto border-t border-gray-200 bg-white py-2 px-4">
            <FooterCredit />
          </footer>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
