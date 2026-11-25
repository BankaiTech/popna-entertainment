// Customer login (cable TV / internet subscriber): mobile number + box number.
// Its own page (lcodesk.in/customer/login), separate from the operator / staff login.
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Building2, Phone, Tv, ReceiptText, MessageSquareWarning } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useLt } from '@/lib/lt';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import Logo from '@/components/Logo';
import { LOGIN_AS_KEY } from '@/pages/customer/portalShared';

const inputClass =
  'w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';

const CustomerLogin = () => {
  const tr = useLt();
  const navigate = useNavigate();
  const { customerLogin, isAuthenticated, role, initialize } = useAuthStore();
  const [mobile, setMobile] = useState('');
  const [box, setBox] = useState('');
  const [trap, setTrap] = useState(''); // hidden field: people never fill it, bots do
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [shaking, setShaking] = useState(false);

  useEffect(() => { initialize(); }, [initialize]);

  // Already logged in on this phone: go straight in.
  useEffect(() => {
    if (!isAuthenticated || !role) return;
    if (role === 'customer') navigate('/customer/dashboard', { replace: true });
  }, [isAuthenticated, role, navigate]);

  const fail = (message: string) => {
    setError(message);
    setShaking(true);
    window.setTimeout(() => setShaking(false), 600);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError('');
    const digits = mobile.replace(/\D/g, '').slice(-10);
    if (!/^[6-9]\d{9}$/.test(digits) || box.trim().length < 3) {
      fail(tr('Enter your 10-digit mobile number and the box number.'));
      return;
    }
    if (trap) {  // a bot: answer like a wrong login, send nothing
      fail(tr('Mobile number or box number is not correct. Check the number on your set-top box or ask your cable operator.'));
      return;
    }
    setBusy(true);
    const result = await customerLogin(digits, box.trim());
    setBusy(false);
    if (result.success) {
      try { localStorage.setItem(LOGIN_AS_KEY, 'customer'); } catch { /* private mode */ }
      navigate('/customer/dashboard', { replace: true });
      return;
    }
    fail(result.message === 'too_many'
      ? tr('Too many tries. Please wait a few minutes and try again.')
      : tr('Mobile number or box number is not correct. Check the number on your set-top box or ask your cable operator.'));
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-gradient-to-b from-blue-50 to-white text-gray-900">
      <header className="flex items-center justify-between px-4 sm:px-6 py-3">
        <Logo size="sm" />
        <LanguageSwitcher />
      </header>

      <main className="flex-1 flex items-start sm:items-center justify-center px-4 py-6">
        <div className="w-full max-w-md">
          <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                <Tv className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight">{tr('Customer login')}</h1>
                <p className="text-sm text-gray-500">{tr('Cable TV and internet customers')}</p>
              </div>
            </div>

            <ul className="mt-4 mb-6 grid grid-cols-2 gap-2 text-xs text-gray-600">
              <li className="flex items-center gap-1.5"><ReceiptText className="w-4 h-4 text-blue-600 shrink-0" />{tr('Bills and receipts')}</li>
              <li className="flex items-center gap-1.5"><MessageSquareWarning className="w-4 h-4 text-amber-600 shrink-0" />{tr('Complaints')}</li>
            </ul>

            <form onSubmit={submit} noValidate className={`space-y-5 ${shaking ? 'animate-shake' : ''}`}>
              {error && (
                <div role="alert" className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  <span className="shrink-0 mt-px">⚠</span>
                  {error}
                </div>
              )}
              {/* Bot trap: hidden from people and screen readers */}
              <input type="text" name="lcd_trap_field" value={trap} onChange={(e) => setTrap(e.target.value)}
                tabIndex={-1} autoComplete="off" aria-hidden="true"
                className="absolute -left-[9999px] h-0 w-0 opacity-0" />
              <div>
                <label htmlFor="cust-mobile" className="block text-sm font-semibold text-gray-700 mb-2">{tr('Mobile number')}</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input id="cust-mobile" type="tel" inputMode="numeric" maxLength={14} value={mobile}
                    onChange={(e) => { setMobile(e.target.value); setError(''); }}
                    placeholder="98765 43210" className={inputClass} disabled={busy} autoComplete="tel-national" />
                </div>
                <p className="mt-1.5 text-xs text-gray-400">{tr('The mobile number you gave your cable operator.')}</p>
              </div>
              <div>
                <label htmlFor="cust-box" className="block text-sm font-semibold text-gray-700 mb-2">{tr('Box number (STB / VC no.)')}</label>
                <div className="relative">
                  <Tv className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input id="cust-box" type="text" value={box} autoCapitalize="characters" spellCheck={false}
                    onChange={(e) => { setBox(e.target.value); setError(''); }}
                    placeholder={tr('Printed on the sticker under your set-top box')}
                    className={inputClass} disabled={busy} autoComplete="off" />
                </div>
                <p className="mt-1.5 text-xs text-gray-400">{tr('Internet customers: use the customer ID on your bill.')}</p>
              </div>
              <button type="submit" disabled={busy}
                className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-sm shadow-lg shadow-blue-500/25 transition-all disabled:opacity-60 disabled:cursor-not-allowed">
                {busy ? tr('Logging in...') : tr('Login')}
                {!busy && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
          </div>

          <Link to="/login"
            className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 hover:border-blue-300 transition-colors">
            <span className="flex items-center gap-3 min-w-0">
              <Building2 className="w-5 h-5 text-gray-500 shrink-0" />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-gray-900">{tr('Operator / staff login')}</span>
                <span className="block text-xs text-gray-500">{tr('Cable operators, managers and collection staff')}</span>
              </span>
            </span>
            <ArrowRight className="w-4 h-4 text-gray-500 shrink-0" />
          </Link>
        </div>
      </main>
    </div>
  );
};

export default CustomerLogin;
