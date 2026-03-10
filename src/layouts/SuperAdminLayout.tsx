// SaaS Master Controller - Super Admin Layout - Premium Violet Theme
import { useState, useMemo } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Building2, LogOut, Menu, X, Shield, UserPlus, Users } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import type { SAPermissionKey } from '@/models/types';
import FooterCredit from '@/components/FooterCredit';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import Logo from '@/components/Logo';

const SuperAdminLayout = () => {
    const { t } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
    const { logout, username, hasSAPermission, superAdminRole } = useAuthStore();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login', { replace: true });
    };

    const allMenuItems: { path: string; labelKey: string; label: string; icon: typeof LayoutDashboard; color: string; permission: SAPermissionKey }[] = [
        { path: '/superadmin/dashboard', labelKey: 'nav.dashboard', label: 'Dashboard', icon: LayoutDashboard, color: 'text-violet-400', permission: 'sa_dashboard' },
        { path: '/superadmin/organizations', labelKey: 'nav.organizations', label: 'Organizations', icon: Building2, color: 'text-indigo-400', permission: 'sa_organizations_view' },
        { path: '/superadmin/signup-requests', labelKey: 'nav.signupRequests', label: 'Signup Requests', icon: UserPlus, color: 'text-purple-400', permission: 'sa_signup_requests' },
        { path: '/superadmin/users', labelKey: 'nav.users', label: 'Users', icon: Users, color: 'text-fuchsia-400', permission: 'sa_users' },
    ];

    const menuItems = useMemo(
        () => allMenuItems.filter((item) => hasSAPermission(item.permission)),
        [hasSAPermission]
    );

    const roleBadgeLabel = superAdminRole === 'manager'
        ? t('superAdmin.managerRole', 'Manager')
        : t('superAdmin.roleName', 'Super Admin');

    return (
        <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col">
            {/* Mobile backdrop */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 sm:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 h-14 shrink-0 flex items-center justify-between px-3 sm:px-6 border-b border-gray-200/80 dark:border-gray-800 bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl shadow-sm">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <button
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="sm:hidden p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg shrink-0 transition-colors"
                        aria-label={t('openMenu', 'Open Menu')}
                    >
                        <Menu className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    </button>
                    <div className="logo-header-wrap shrink-0">
                        <Logo className="logo-header" />
                    </div>
                    <div className="hidden sm:flex items-center gap-2 min-w-0">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-100 dark:bg-violet-900/30 border border-violet-200 dark:border-violet-800">
                            <Shield className="w-3 h-3 text-violet-600 dark:text-violet-400" />
                            <span className="text-xs font-semibold text-violet-600 dark:text-violet-400">
                                {roleBadgeLabel}
                            </span>
                        </div>
                        {username && (
                            <span className="text-sm text-gray-500 dark:text-gray-400 truncate">{username}</span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                    <ThemeSwitcher />
                    <LanguageSwitcher />
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
                    >
                        <LogOut className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{t('nav.logout', 'Logout')}</span>
                    </button>
                </div>
            </header>

            <div className="flex flex-1 pt-14">
                {/* Sidebar */}
                <aside
                    className={cn(
                        'fixed top-14 bottom-0 left-0',
                        'z-40 w-56 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 flex flex-col',
                        'transform transition-transform duration-200 ease-out',
                        'sm:translate-x-0',
                        isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
                    )}
                >
                    <div className="px-4 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0">
                        <div>
                            <p className="text-xs font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                                {t('superAdmin.masterController', 'Master Controller')}
                            </p>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                                {username || roleBadgeLabel}
                            </p>
                        </div>
                        <button
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="sm:hidden p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        >
                            <X className="w-4 h-4 text-gray-400" />
                        </button>
                    </div>

                    <nav className="flex-1 overflow-y-auto p-3 space-y-1">
                        {menuItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = location.pathname === item.path;
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={cn(
                                        'flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                                        isActive
                                            ? 'bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-900/30 dark:to-indigo-900/20 text-violet-700 dark:text-violet-300 border border-violet-100 dark:border-violet-800/50 shadow-sm'
                                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800'
                                    )}
                                >
                                    <Icon
                                        className={cn(
                                            'w-4 h-4 shrink-0',
                                            isActive ? 'text-violet-600 dark:text-violet-400' : item.color + ' opacity-70'
                                        )}
                                    />
                                    <span>{t(item.labelKey, item.label)}</span>
                                    {isActive && (
                                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-600 dark:bg-violet-400 shrink-0" />
                                    )}
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="shrink-0 px-3 py-3 border-t border-gray-100 dark:border-gray-800">
                        <p className="text-[9px] text-gray-400 dark:text-gray-500 text-center">
                            {t('layout.version', 'v1.0 • GST Ready')}
                        </p>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 flex flex-col w-full sm:ml-56">
                    <div className="flex-1 overflow-auto p-3 sm:p-6 pb-24 sm:pb-6">
                        <Outlet />
                    </div>
                    <footer className="shrink-0 mt-auto border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 py-2 px-4 hidden sm:block">
                        <FooterCredit />
                    </footer>
                </main>
            </div>

            {/* Mobile Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 z-50 sm:hidden bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-t border-gray-100 dark:border-gray-800 shadow-lg shadow-black/10">
                <div className="flex items-center justify-around px-4 py-2">
                    {menuItems.map(({ path, icon: Icon, labelKey, label }) => {
                        const isActive = location.pathname === path;
                        return (
                            <Link
                                key={path}
                                to={path}
                                className="flex flex-col items-center gap-0.5 min-w-0 px-2 py-1"
                            >
                                <div
                                    className={cn(
                                        'w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-200',
                                        isActive
                                            ? 'bg-violet-600 shadow-lg shadow-violet-500/30 scale-110'
                                            : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                                    )}
                                >
                                    <Icon className={cn('w-4 h-4', isActive ? 'text-white' : 'text-gray-400 dark:text-gray-500')} />
                                </div>
                                <span className={cn('text-[9px] font-medium', isActive ? 'text-violet-600 dark:text-violet-400' : 'text-gray-400 dark:text-gray-500')}>
                                    {t(labelKey, label)}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
};

export default SuperAdminLayout;
