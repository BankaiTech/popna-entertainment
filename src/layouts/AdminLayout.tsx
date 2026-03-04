// Module access controlled by organization permissions
import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Package, FileText, ShoppingCart, AlertCircle,
  UserCog, Settings, LogOut, Menu, X, PhoneCall, Contact2,
  GitBranch, Store, ChevronDown
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useOrganizationStore } from '@/store/useOrganizationStore';
import FooterCredit from '@/components/FooterCredit';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import type { ModuleKey } from '@/models/types';

// Sidebar group definition
interface SidebarGroup {
  labelKey: string;
  items: SidebarItem[];
}

interface SidebarItem {
  path: string;
  labelKey: string;
  icon: typeof LayoutDashboard;
  moduleKey: ModuleKey;
}

const AdminLayout = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { role, logout, organizationId, allowedModules } = useAuthStore();
  const { fetchOrganization, isModuleAllowed, currentOrganization } = useOrganizationStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Fetch organization permissions on mount
  useEffect(() => {
    if (organizationId) {
      fetchOrganization(organizationId);
    }
  }, [organizationId, fetchOrganization]);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const toggleGroup = (label: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  // Grouped sidebar structure
  const sidebarGroups: SidebarGroup[] = [
    {
      labelKey: 'nav.groupMain',
      items: [
        { path: '/admin/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard, moduleKey: 'dashboard' },
      ],
    },
    {
      labelKey: 'nav.groupBusiness',
      items: [
        { path: '/admin/contacts', labelKey: 'nav.contacts', icon: Contact2, moduleKey: 'contacts' },
        { path: '/admin/inventory-products', labelKey: 'nav.inventory', icon: Package, moduleKey: 'inventory-products' },
        { path: '/admin/invoices', labelKey: 'nav.invoices', icon: FileText, moduleKey: 'invoices' },
        { path: '/admin/purchase-invoices', labelKey: 'nav.purchaseInvoices', icon: ShoppingCart, moduleKey: 'purchase-invoices' },
      ],
    },
    {
      labelKey: 'nav.groupOperations',
      items: [
        { path: '/admin/connection-requests', labelKey: 'nav.newConnection', icon: PhoneCall, moduleKey: 'connection-requests' },
        { path: '/admin/complaints', labelKey: 'nav.complaints', icon: AlertCircle, moduleKey: 'complaints' },
        { path: '/admin/pos', labelKey: 'nav.pos', icon: Store, moduleKey: 'pos' },
      ],
    },
    {
      labelKey: 'nav.groupManagement',
      items: [
        { path: '/admin/branches', labelKey: 'nav.branches', icon: GitBranch, moduleKey: 'branches' },
        { path: '/admin/users', labelKey: 'nav.users', icon: UserCog, moduleKey: 'users' },
        { path: '/admin/settings', labelKey: 'nav.settings', icon: Settings, moduleKey: 'settings' },
      ],
    },
  ];

  // Filter groups by permission
  const filteredGroups = sidebarGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        const orgAllowed = isModuleAllowed(item.moduleKey);
        if (role === 'employee') {
          return orgAllowed && allowedModules?.includes(item.moduleKey);
        }
        return orgAllowed;
      }),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Mobile backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 sm:hidden transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 h-13 shrink-0 flex items-center justify-between px-3 sm:px-5 border-b border-gray-200/80 bg-white/95 backdrop-blur-md shadow-sm">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="sm:hidden p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label={t('openMenu')}
          >
            <Menu className="w-4.5 h-4.5 text-gray-600" />
          </button>
          <img src="/NexLink.svg" alt="NexLink" className="h-[104px] w-auto object-contain shrink-0" />
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <LanguageSwitcher />
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 transition-all duration-200"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('nav.logout')}</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 pt-13">
        {/* Sidebar */}
        <aside
          className={cn(
            'fixed top-13 bottom-0 left-0',
            'z-40 w-52 bg-white border-r border-gray-200/80 flex flex-col',
            'transform transition-transform duration-200 ease-out',
            'sm:translate-x-0',
            isMobileMenuOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full'
          )}
        >
          {/* Sidebar header — org name and close button */}
          <div className="px-3 py-2.5 border-b border-gray-100 flex items-center justify-between shrink-0">
            <h1 className="text-xs font-semibold text-gray-800 uppercase tracking-wider truncate">
              {currentOrganization?.name || t('nexlink', 'NexLink')}
            </h1>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="sm:hidden p-1 hover:bg-gray-100 rounded-md transition-colors"
              aria-label="Close menu"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* Navigation with groups */}
          <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-1 scrollbar-thin">
            {filteredGroups.map((group) => {
              const isCollapsed = collapsedGroups[group.labelKey];
              const hasActiveItem = group.items.some((item) => location.pathname === item.path);
              const groupLabel = t(group.labelKey, group.labelKey.split('.').pop() || '');

              return (
                <div key={group.labelKey} className="space-y-0.5">
                  {/* Group header */}
                  <button
                    onClick={() => toggleGroup(group.labelKey)}
                    className="w-full flex items-center justify-between px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <span>{groupLabel}</span>
                    <ChevronDown
                      className={cn(
                        'w-3 h-3 transition-transform duration-200',
                        isCollapsed ? '-rotate-90' : 'rotate-0'
                      )}
                    />
                  </button>

                  {/* Group items */}
                  {!isCollapsed && (
                    <div className="space-y-0.5">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                          <Link
                            key={item.path}
                            to={item.path}
                            className={cn(
                              'flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150',
                              isActive
                                ? 'bg-blue-50 text-blue-700 border-l-2 border-blue-600 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                            )}
                          >
                            <Icon className={cn('w-3.5 h-3.5 shrink-0', isActive ? 'text-blue-600' : 'text-gray-400')} />
                            <span className="truncate">{t(item.labelKey)}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Sidebar footer */}
          <div className="shrink-0 px-3 py-2 border-t border-gray-100">
            <p className="text-[9px] text-gray-400 text-center">v1.0 • GST Ready</p>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 flex flex-col w-full bg-white sm:ml-52">
          <div className="flex-1 overflow-auto p-3 sm:p-5 pb-20 sm:pb-5">
            <Outlet />
          </div>
          <footer className="shrink-0 mt-auto border-t border-gray-200/80 bg-white py-1.5 px-3 hidden sm:block">
            <FooterCredit />
          </footer>
        </main>
      </div>

      {/* Mobile Bottom Navigation — PWA-style */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 sm:hidden bg-white border-t border-gray-200/80 shadow-[0_-2px_10px_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-around px-1 py-1.5">
          {([
            { path: '/admin/dashboard', icon: LayoutDashboard, label: t('nav.bottomHome', 'Home') },
            { path: '/admin/contacts', icon: Contact2, label: t('nav.contacts', 'Contacts') },
            { path: '/admin/invoices', icon: FileText, label: t('nav.invoices', 'Invoices') },
            { path: '/admin/inventory-products', icon: Package, label: t('nav.inventory', 'Inventory') },
            { path: '/admin/settings', icon: Settings, label: t('nav.settings', 'Settings') },
          ] as { path: string; icon: typeof LayoutDashboard; label: string }[]).map(({ path, icon: Icon, label }) => {
            const isActive = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={cn(
                  'flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all duration-150 min-w-0',
                  isActive ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
                )}
              >
                <Icon className={cn('w-5 h-5 shrink-0', isActive && 'scale-110')} />
                <span className="text-[9px] font-medium truncate">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default AdminLayout;
