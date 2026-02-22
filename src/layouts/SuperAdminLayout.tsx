// SaaS Master Controller — Super Admin Layout
import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Building2, LogOut, Menu, X, Shield } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import Button from '@/components/ui/Button';
import FooterCredit from '@/components/FooterCredit';
import LanguageSwitcher from '@/components/LanguageSwitcher';

const SuperAdminLayout = () => {
    const { t } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
    const { logout, username } = useAuthStore();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/admin/login', { replace: true });
    };

    const menuItems = [
        { path: '/superadmin/organizations', labelKey: 'nav.organizations', icon: Building2, label: 'Organizations' },
    ];

    return (
        <div className="min-h-screen bg-white flex flex-col">
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 sm:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            <header className="fixed top-0 left-0 right-0 z-50 h-14 shrink-0 flex items-center justify-between px-4 sm:px-8 border-b border-border bg-card">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="sm:hidden p-2 hover:bg-accent rounded-md"
                        aria-label={t('openMenu', 'Open Menu')}
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                    <div>
                        <h2 className="text-base sm:text-lg font-semibold">{t('superAdmin.welcome', 'Welcome')} {username || 'Super Admin'}</h2>
                        <p className="text-xs sm:text-sm text-muted-foreground">{t('superAdmin.masterController', 'Master Controller')}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <LanguageSwitcher />
                    <Button variant="outline" onClick={handleLogout} className="flex items-center space-x-2 text-sm sm:text-base">
                        <LogOut className="w-4 h-4" />
                        <span className="hidden sm:inline">{t('nav.logout', 'Logout')}</span>
                    </Button>
                </div>
            </header>

            <div className="flex flex-1 pt-14">
                <aside
                    className={cn(
                        'fixed top-14 bottom-0 left-0',
                        'z-40 w-56 bg-gray-50 border-r border-gray-200 flex flex-col',
                        'transform transition-transform duration-300 ease-in-out',
                        'sm:translate-x-0',
                        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
                    )}
                >
                    <div className="p-4 border-b border-gray-200 flex items-center justify-between shrink-0 bg-gray-50">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center">
                                <Shield className="w-4 h-4 text-white" />
                            </div>
                            <h1 className="text-base font-bold text-gray-900">{t('superAdmin.title', 'Super Admin')}</h1>
                        </div>
                        <button
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="sm:hidden p-1.5 hover:bg-gray-200 rounded transition-colors"
                            aria-label={t('closeMenu', 'Close Menu')}
                        >
                            <X className="w-4 h-4 text-gray-600" />
                        </button>
                    </div>

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
                                            ? 'bg-red-600 text-white shadow-sm'
                                            : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                                    )}
                                >
                                    <Icon className={cn('w-4 h-4', isActive ? 'text-white' : 'text-gray-600')} />
                                    <span>{t(item.labelKey, item.label)}</span>
                                </Link>
                            );
                        })}
                    </nav>
                </aside>

                <main className="flex-1 flex flex-col w-full bg-white sm:ml-56">
                    <div className="flex-1 overflow-auto p-4 sm:p-6">
                        <Outlet />
                    </div>
                    <footer className="shrink-0 mt-auto border-t border-gray-200 bg-white py-2 px-4">
                        <FooterCredit />
                    </footer>
                </main>
            </div>
        </div>
    );
};

export default SuperAdminLayout;
