// Customer app shell: operator name on top. Phone: three tabs at the bottom. Desktop: tabs in the top bar.
import { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Home, LogOut, MessageSquareWarning, ReceiptText } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { customerPortalApi, type PortalProfile } from '@/api/customerPortal';
import { useLt } from '@/lib/lt';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import type { PortalContext } from '@/pages/customer/portalShared';

const CustomerLayout = () => {
  const tr = useLt();
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const [profile, setProfile] = useState<PortalProfile | null>(null);
  const [error, setError] = useState('');

  const reload = useCallback(() => {
    customerPortalApi.me()
      .then((p) => { setProfile(p); setError(''); })
      .catch((e: Error) => setError(e.message || tr('Could not load. Please check your internet and try again.')));
  }, [tr]);

  useEffect(() => { reload(); }, [reload]);

  const handleLogout = () => {
    logout();
    navigate('/customer/login', { replace: true });
  };

  const tabs = [
    { to: '/customer/dashboard', label: tr('Home'), icon: Home },
    { to: '/customer/history', label: tr('Bills'), icon: ReceiptText },
    ...(profile?.complaintsEnabled === false ? []
      : [{ to: '/customer/complaints', label: tr('Complaints'), icon: MessageSquareWarning }]),
  ];

  return (
    <div className="min-h-[100dvh] bg-slate-50 dark:bg-slate-950 text-gray-900 flex flex-col">
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-gray-200 dark:border-slate-800">
        <div className="max-w-xl md:max-w-5xl mx-auto flex items-center gap-2 md:gap-6 px-4 md:px-6 h-14 md:h-16">
          <div className="min-w-0 flex-1 md:flex-none md:max-w-xs">
            <p className="text-[11px] uppercase tracking-wide text-gray-500 leading-none">{tr('Your cable operator')}</p>
            <p className="font-bold truncate leading-tight mt-0.5 md:text-lg">{profile?.operator.name ?? '…'}</p>
          </div>
          <nav aria-label={tr('Menu')} className="hidden md:flex flex-1 items-center gap-1">
            {tabs.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to}
                className={({ isActive }) => `inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                  isActive ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                    : 'text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-800'}`}>
                <Icon className="w-4 h-4" />
                {label}
              </NavLink>
            ))}
          </nav>
          <LanguageSwitcher />
          <button type="button" onClick={handleLogout} aria-label={tr('Logout')}
            className="p-2 md:px-3 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 inline-flex items-center gap-2">
            <LogOut className="w-5 h-5" />
            <span className="hidden md:inline text-sm font-medium">{tr('Logout')}</span>
          </button>
        </div>
      </header>

      {/* Extra bottom space so the install / update banner never hides the last button */}
      <main className="flex-1 w-full max-w-xl md:max-w-5xl mx-auto px-4 md:px-6 pt-4 md:pt-8 pb-44 md:pb-16">
        {error && !profile ? (
          <div role="alert" className="mt-10 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {tr(error)}
            <button type="button" onClick={reload} className="block mt-3 font-semibold underline">{tr('Try again')}</button>
          </div>
        ) : (
          <Outlet context={{ profile, reload } satisfies PortalContext} />
        )}
      </main>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 pb-[env(safe-area-inset-bottom)]">
        <div className={`max-w-xl mx-auto grid ${tabs.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
          {tabs.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) => `flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium ${
                isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'}`}>
              <Icon className="w-5 h-5" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default CustomerLayout;
