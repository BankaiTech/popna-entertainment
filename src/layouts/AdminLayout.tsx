// Module access controlled by organization permissions
import { useState, useEffect, useMemo } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Package, FileText, ShoppingCart,
  UserCog, Settings, LogOut, Menu, Contact2,
  GitBranch, Store, ChevronDown, ChevronLeft,
  Calendar, Wrench, UserPlus, Repeat, BarChart3, Activity
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useOrganizationStore } from '@/store/useOrganizationStore';
import { useTerminology } from '@/hooks/useTerminology';
import FooterCredit from '@/components/FooterCredit';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import Logo from '@/components/Logo';
import type { ModuleKey } from '@/models/types';

interface SidebarGroup {
  labelKey: string;
  items: SidebarItem[];
}

interface SidebarItem {
  path: string;
  labelKey: string;
  icon: typeof LayoutDashboard;
  moduleKey: ModuleKey;
  color: string;
  terminologyKey?: string;
}

const AdminLayout = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { role, logout, organizationId, allowedModules } = useAuthStore();
  const { fetchOrganization, isModuleAllowed, currentOrganization } = useOrganizationStore();
  const { term } = useTerminology();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (organizationId) {
      fetchOrganization(organizationId);
    }
  }, [organizationId, fetchOrganization]);

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

  const sidebarGroups: SidebarGroup[] = useMemo(() => [
    {
      labelKey: 'nav.groupMain',
      items: [
        { path: '/admin/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard, moduleKey: 'dashboard', color: 'text-blue-500' },
      ],
    },
    {
      labelKey: 'nav.groupBusiness',
      items: [
        { path: '/admin/contacts', labelKey: 'nav.contacts', icon: Contact2, moduleKey: 'contacts', color: 'text-violet-500', terminologyKey: 'contact' },
        { path: '/admin/inventory-products', labelKey: 'nav.inventory', icon: Package, moduleKey: 'inventory-products', color: 'text-emerald-500', terminologyKey: 'product' },
        { path: '/admin/sales', labelKey: 'nav.sales', icon: FileText, moduleKey: 'invoices', color: 'text-orange-500' },
        { path: '/admin/purchase', labelKey: 'nav.purchase', icon: ShoppingCart, moduleKey: 'purchase-invoices', color: 'text-pink-500' },
      ],
    },
    {
      labelKey: 'nav.groupServices',
      items: [
        { path: '/admin/appointments', labelKey: 'nav.appointments', icon: Calendar, moduleKey: 'appointments', color: 'text-sky-500', terminologyKey: 'appointment' },
        { path: '/admin/service-requests', labelKey: 'nav.serviceRequests', icon: Wrench, moduleKey: 'service-requests', color: 'text-rose-500', terminologyKey: 'serviceRequest' },
        { path: '/admin/leads', labelKey: 'nav.leads', icon: UserPlus, moduleKey: 'crm-leads', color: 'text-fuchsia-500', terminologyKey: 'lead' },
        { path: '/admin/subscriptions', labelKey: 'nav.subscriptions', icon: Repeat, moduleKey: 'subscriptions', color: 'text-lime-500', terminologyKey: 'subscription' },
      ],
    },
    {
      labelKey: 'nav.groupOperations',
      items: [
        { path: '/admin/pos', labelKey: 'nav.pos', icon: Store, moduleKey: 'pos', color: 'text-amber-500' },
      ],
    },
    {
      labelKey: 'nav.groupManagement',
      items: [
        { path: '/admin/branches', labelKey: 'nav.branches', icon: GitBranch, moduleKey: 'branches', color: 'text-teal-500' },
        { path: '/admin/users', labelKey: 'nav.users', icon: UserCog, moduleKey: 'users', color: 'text-indigo-500' },
        { path: '/admin/reports', labelKey: 'nav.reports', icon: BarChart3, moduleKey: 'reports', color: 'text-blue-500' },
        { path: '/admin/audit-trail', labelKey: 'nav.auditTrail', icon: Activity, moduleKey: 'audit-trail', color: 'text-slate-500' },
        { path: '/admin/settings', labelKey: 'nav.settings', icon: Settings, moduleKey: 'settings', color: 'text-gray-500' },
      ],
    },
  ], []);

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

  // Mobile bottom nav: top 5 from allowed modules (flatten sidebar order)
  const bottomNavItems = filteredGroups.flatMap((g) => g.items).slice(0, 5);
  const showPOSFAB = currentOrganization && (currentOrganization.industryType === 'retail' || currentOrganization.industryType === 'restaurant-cafe') && isModuleAllowed('pos');

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col">
      {/* Mobile backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 sm:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* ── Header ── */}
      <header className="fixed top-0 left-0 right-0 z-50 h-14 shrink-0 flex items-center justify-between px-3 sm:px-5 border-b border-gray-200/80 dark:border-gray-800 bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl shadow-sm">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="sm:hidden p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label={t('openMenu')}
          >
            <Menu className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
          <div className="logo-header-wrap shrink-0">
            <Logo className="logo-header sm:hidden" variant="icon" />
            <Logo className="logo-header hidden sm:block" />
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <ThemeSwitcher />
          <LanguageSwitcher />
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('nav.logout')}</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 pt-14">
        {/* ── Sidebar ── */}
        <aside
          className={cn(
            'fixed top-14 left-0',
            'bottom-16 sm:bottom-0',
            'z-40 w-56 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 flex flex-col',
            'transform transition-transform duration-200 ease-out',
            'sm:translate-x-0',
            isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
          )}
        >
          {/* Nav */}
          <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-4 scrollbar-thin relative">
            {/* Mobile close button */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(false)}
              className="sm:hidden absolute top-1 right-1 z-10 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label={t('closeMenu', 'Close menu')}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {filteredGroups.map((group) => {
              const isCollapsed = collapsedGroups[group.labelKey];
              const groupLabel = t(group.labelKey, group.labelKey.split('.').pop() || '');

              return (
                <div key={group.labelKey} className="space-y-0.5">
                  {/* Group header */}
                  <button
                    onClick={() => toggleGroup(group.labelKey)}
                    className="w-full flex items-center justify-between px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
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
                        const label = item.terminologyKey
                          ? term(item.terminologyKey, t(item.labelKey))
                          : t(item.labelKey);
                        return (
                          <Link
                            key={item.path}
                            to={item.path}
                            className={cn(
                              'flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150',
                              isActive
                                ? 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/20 text-blue-700 dark:text-blue-300 shadow-sm border border-blue-100 dark:border-blue-800/50'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800'
                            )}
                          >
                            <Icon
                              className={cn(
                                'w-4 h-4 shrink-0 transition-colors',
                                isActive ? 'text-blue-600 dark:text-blue-400' : item.color + ' opacity-70 group-hover:opacity-100'
                              )}
                            />
                            <span className="truncate">{label}</span>
                            {isActive && (
                              <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 shrink-0" />
                            )}
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
          <div className="shrink-0 px-3 py-3 border-t border-gray-100 dark:border-gray-800">
            <p className="text-[9px] text-gray-400 dark:text-gray-500 text-center">{t('layout.version', 'v1.0 • GST Ready')}</p>
          </div>
        </aside>

        {/* ── Main Content ── */}
        <main className="flex-1 flex flex-col w-full sm:ml-56">
          <div className="flex-1 overflow-auto p-3 sm:p-5 pb-20 sm:pb-5">
            <Outlet />
          </div>
          <footer className="shrink-0 mt-auto border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 py-1.5 px-4 hidden sm:block">
            <FooterCredit />
          </footer>
        </main>
      </div>

      {/* ── Mobile Bottom Navigation (dynamic from template's allowed modules) ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 sm:hidden bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-t border-gray-100 dark:border-gray-800 shadow-lg shadow-black/10">
        <div className="flex items-center justify-around px-1 py-2">
          {bottomNavItems.map(({ path, icon: Icon, labelKey }) => {
            const isActive = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className="flex flex-col items-center gap-0.5 min-w-0 relative px-2 py-1"
              >
                <div
                  className={cn(
                    'w-8 h-8 flex items-center justify-center rounded-xl transition-all duration-200',
                    isActive
                      ? 'bg-blue-600 shadow-lg shadow-blue-500/30 scale-110'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                  )}
                >
                  <Icon className={cn('w-4 h-4', isActive ? 'text-white' : 'text-gray-400 dark:text-gray-500')} />
                </div>
                <span className={cn('text-[9px] font-medium truncate', isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500')}>
                  {t(labelKey)}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* POS FAB on mobile for retail/restaurant */}
      {showPOSFAB && (
        <Link
          to="/admin/pos"
          className="fixed bottom-20 right-4 z-50 sm:hidden w-14 h-14 rounded-full bg-amber-500 hover:bg-amber-600 text-white shadow-lg flex items-center justify-center"
          aria-label={t('nav.pos', 'Point of Sale')}
        >
          <Store className="w-6 h-6" />
        </Link>
      )}
    </div>
  );
};

export default AdminLayout;
