// SaaS Ready — Client/Partner Layout with configurable tab access
import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Users, FileText, AlertCircle, LogOut, Menu, X, Briefcase } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import Button from '@/components/ui/Button';
import FooterCredit from '@/components/FooterCredit';
import LanguageSwitcher from '@/components/LanguageSwitcher';

// All possible client sidebar tabs — admin controls which ones are visible per client
const allClientTabs = [
    { key: 'dashboard', path: '/client/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
    { key: 'customers', path: '/client/customers', labelKey: 'nav.customers', icon: Users },
    { key: 'complaints', path: '/client/complaints', labelKey: 'nav.complaints', icon: AlertCircle },
    { key: 'invoices', path: '/client/invoices', labelKey: 'nav.invoices', icon: FileText },
];

const ClientLayout = () => {
    const { t } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
    const { logout, username, allowedTabs } = useAuthStore();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/admin/login', { replace: true });
    };

    // Filter tabs based on what admin has allowed for this client
    const menuItems = allClientTabs.filter((tab) => allowedTabs?.includes(tab.key));

    return (
        <div className="min-h-screen bg-white flex flex-col">
            {/* Mobile overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 sm:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sticky header */}
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
                        <h2 className="text-base sm:text-lg font-semibold">{t('dashboard.welcome')} {username || t('common.client', 'Client')}</h2>
                        <p className="text-xs sm:text-sm text-muted-foreground">{t('clientDashboard.partnerPortal', 'Partner Portal')}</p>
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
                {/* Sidebar */}
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
                            <div className="w-8 h-8 rounded bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                                <Briefcase className="w-4 h-4 text-white" />
                            </div>
                            <h1 className="text-base font-bold text-gray-900">{t('clientDashboard.partner', 'Partner')}</h1>
                        </div>
                        <button
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="sm:hidden p-1.5 hover:bg-gray-200 rounded transition-colors"
                            aria-label={t('closeMenu')}
                        >
                            <X className="w-4 h-4 text-gray-600" />
                        </button>
                    </div>

                    {/* Navigation — renders only allowed tabs */}
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
                                            ? 'bg-emerald-600 text-white shadow-sm'
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

                {/* Main content */}
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

export default ClientLayout;
