import { useState, useEffect, useRef } from 'react';
import { tr } from '@/lib/lt';
import { LOGIN_AS_KEY } from '@/pages/customer/portalShared';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/useAuthStore';
import {
  Lock, User, ArrowRight, Building2, Eye, EyeOff, Mail, Phone, MapPin, CheckCircle2, Tv,
} from 'lucide-react';

import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useTheme } from '@/components/ThemeProvider';
import { signupRequestsApi, SIGNUP_SIZES, type SignupService, type SignupSize } from '@/api/signupRequests';
import { showError } from '@/utils/toast';
import { env } from '@/lib/env';
import Logo from '@/components/Logo';
import { SUBSCRIPTION_MSG_KEY } from '@/lib/subscription';

const EMPTY_SIGNUP = {
  name: '', mobile: '', email: '', businessName: '', city: '',
  service: 'cable' as SignupService, customerCount: '' as SignupSize, message: '',
  website: '', // hidden trap field: real people never see or fill it
};

const Login = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { login, customerLogin, isAuthenticated, role, initialize } = useAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  // Staff (operator, manager, agent...) or customer (mobile + box number)
  const [mode, setMode] = useState<'staff' | 'customer'>(() => {
    const asParam = new URLSearchParams(window.location.search).get('as');
    if (asParam === 'customer' || asParam === 'staff') return asParam;
    try {
      return localStorage.getItem(LOGIN_AS_KEY) === 'customer' ? 'customer' : 'staff';
    } catch {
      return 'staff';
    }
  });
  const [custMobile, setCustMobile] = useState('');
  const [custBox, setCustBox] = useState('');
  // Set when an operator was logged out because the subscription ended
  const [subscriptionNotice] = useState<string | null>(() => sessionStorage.getItem(SUBSCRIPTION_MSG_KEY));
  useEffect(() => {
    sessionStorage.removeItem(SUBSCRIPTION_MSG_KEY); // show once
  }, []);
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupForm, setSignupForm] = useState(EMPTY_SIGNUP);
  const [signupDone, setSignupDone] = useState(false);

  // Force light mode while on the login page and restore previous theme on unmount
  const { resolvedTheme } = useTheme();
  const prevThemeRef = useRef<'light' | 'dark' | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    // Capture the current theme only once on mount
    if (!prevThemeRef.current) {
      prevThemeRef.current = root.classList.contains('dark') ? 'dark' : 'light';
    }

    // Always enforce light mode while this component is mounted
    root.classList.remove('dark');
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', '#2563eb');
    }

    return () => {
      // We only want to restore on true unmount, but Strict Mode unmounts and remounts
      // If we navigate away, we restore. In StrictMode, it might flash. 
      // Actually, relying on ThemeProvider is better, but this handles DOM.
      if (prevThemeRef.current === 'dark') {
        root.classList.add('dark');
        const metaTag = document.querySelector('meta[name="theme-color"]');
        if (metaTag) {
          metaTag.setAttribute('content', '#0f172a');
        }
      }
    };
  }, [resolvedTheme]); // Re-run if ThemeProvider tries to apply dark mode again

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!isAuthenticated || !role) return;
    if (role === 'customer') {
      navigate('/customer/dashboard', { replace: true });
      return;
    }
    if (role === 'superadmin') {
      navigate('/superadmin/dashboard', { replace: true });
      return;
    }
    if (role === 'admin') {
      navigate('/admin/dashboard', { replace: true });
      return;
    }
    navigate('/admin/customers', { replace: true });
  }, [isAuthenticated, role, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError(t('login.enterBoth'));
      triggerShake();
      return;
    }

    setIsLoading(true);

    const adminSuccess = await login(username.trim(), password);
    if (adminSuccess) {
      try { localStorage.setItem(LOGIN_AS_KEY, 'staff'); } catch { /* private mode */ }
      const userRole = useAuthStore.getState().role;
      setIsLoading(false);
      if (userRole === 'customer') {
        navigate('/customer/dashboard', { replace: true });
      } else if (userRole === 'superadmin') {
        navigate('/superadmin/dashboard', { replace: true });
      } else if (userRole === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/admin/dashboard', { replace: true });
      }
      return;
    }

    setIsLoading(false);
    setError(t('login.wrongCredentials', 'Username and password is wrong'));
    triggerShake();
  };

  const handleCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const mobile = custMobile.replace(/\D/g, '').slice(-10);
    if (!/^[6-9]\d{9}$/.test(mobile) || custBox.trim().length < 3) {
      setError(tr('Enter your 10-digit mobile number and the box number.'));
      triggerShake();
      return;
    }
    setIsLoading(true);
    const result = await customerLogin(mobile, custBox.trim());
    setIsLoading(false);
    if (result.success) {
      try { localStorage.setItem(LOGIN_AS_KEY, 'customer'); } catch { /* private mode */ }
      navigate('/customer/dashboard', { replace: true });
      return;
    }
    setError(result.message === 'too_many'
      ? tr('Too many tries. Please wait a few minutes and try again.')
      : tr('Mobile number or box number is not correct. Check the number on your set-top box or ask your cable operator.'));
    triggerShake();
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const f = signupForm;
    if (!f.name.trim() || !f.mobile.trim() || !f.businessName.trim() || !f.city.trim()) {
      showError(tr('Please fill name, mobile, business name and town'));
      return;
    }
    if (!/^[6-9]\d{9}$/.test(f.mobile.trim())) {
      showError(tr('Enter a valid 10-digit mobile number'));
      return;
    }
    if (f.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) {
      showError(tr('Enter a valid email address'));
      return;
    }
    setSignupLoading(true);
    try {
      await signupRequestsApi.submit({
        ...f,
        name: f.name.trim(),
        mobile: f.mobile.trim(),
        email: f.email.trim(),
        businessName: f.businessName.trim(),
        city: f.city.trim(),
        message: f.message.trim(),
        language: (i18n.language || 'en').slice(0, 2),
      });
      setSignupForm(EMPTY_SIGNUP);
      setSignupDone(true);
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      showError(status === 429
        ? tr('Too many requests. Please try again after some time.')
        : status === 400
          ? tr('Please check the details and try again.')
          : tr('Could not send. Please check your internet and try again.'));
    } finally {
      setSignupLoading(false);
    }
  };

  function triggerShake() {
    setShaking(true);
    setTimeout(() => setShaking(false), 600);
  }

  const inputClass =
    'w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all';

  return (
    <div className="min-h-screen flex">
      {/* Left panel (decorative, hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-700 to-violet-800">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-violet-400/15 rounded-full blur-3xl animate-float-delayed" />
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.7) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }}
        />
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-16 py-16">
          <div className="mb-10">
            <Logo size="lg" tone="light" className="mb-8" />
            <h1 className="text-4xl xl:text-5xl font-extrabold text-white leading-tight tracking-tight mb-4">
              {isSignup ? tr('Get started') : t('login.welcomeBack', 'Welcome Back')}
            </h1>
            <p className="text-lg text-white/65 leading-relaxed">
              {isSignup
                ? tr('Tell us about your business. We will call you and set up your account.')
                : tr('Billing, collection and field staff tracking for cable TV and broadband operators.')}
            </p>
          </div>
          <div className="space-y-3">
            {[
              tr('Cable & broadband customers'),
              tr('Collections with receipt SMS'),
              tr('Due-date reminder SMS'),
              tr('Collection agent live location'),
              tr('Cut-off list'),
              tr('Stock with barcode scanning'),
              tr('GST sales invoices'),
              tr('Tamil and 5 more languages'),
            ].map((feat) => (
              <div key={feat} className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <ArrowRight className="w-2.5 h-2.5 text-white" />
                </div>
                <span className="text-xs text-white/80 font-medium">{feat}</span>
              </div>
            ))}
          </div>
          <div className="mt-12 flex items-center gap-2 text-white/40 text-xs">
            <Building2 className="w-4 h-4" />
            <span>{tr('LCO Desk · for cable TV and broadband operators')}</span>
          </div>
        </div>
      </div>

      {/* Right panel (form) */}
      <div className="flex-1 flex flex-col bg-white">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <span />
          <div className="flex items-center gap-1">
            <LanguageSwitcher />
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md">
            <div className="flex justify-center mb-8 lg:hidden">
              <Logo size="lg" />
            </div>

            {!isSignup ? (
              <>
                {/* Login Form */}
                <div className="mb-8">
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mb-2">
                    {t('login.title', 'Login')}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {mode === 'staff'
                      ? t('login.subtitle', 'Enter your username and password. You will be directed to the right dashboard.')
                      : tr('Cable TV and internet customers')}
                  </p>
                </div>

                {subscriptionNotice && (
                  <div role="alert" className="mb-4 p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">
                    {subscriptionNotice}
                  </div>
                )}

                <div role="tablist" className="grid grid-cols-2 gap-1 p-1 mb-5 rounded-xl bg-gray-100">
                  {([['staff', tr('Operator / staff')], ['customer', tr('Customer')]] as const).map(([key, label]) => (
                    <button key={key} type="button" role="tab" aria-selected={mode === key}
                      onClick={() => { setMode(key); setError(''); }}
                      className={`py-2 rounded-lg text-sm font-semibold transition-colors ${mode === key
                        ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                      {label}
                    </button>
                  ))}
                </div>

                {mode === 'customer' ? (
                <form onSubmit={handleCustomerSubmit} className={`space-y-5 ${shaking ? 'animate-shake' : ''}`}>
                  {error && (
                    <div role="alert" className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                      <span className="shrink-0 mt-px">⚠</span>
                      {error}
                    </div>
                  )}
                  <p className="text-sm text-gray-500">
                    {tr('See your bill, receipts and complaints. Use the mobile number you gave your cable operator.')}
                  </p>
                  <div>
                    <label htmlFor="cust-mobile" className="block text-sm font-semibold text-gray-700 mb-2">
                      {tr('Mobile number')}
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input id="cust-mobile" type="tel" inputMode="numeric" maxLength={14} value={custMobile}
                        onChange={(e) => { setCustMobile(e.target.value); setError(''); }}
                        placeholder="98765 43210" className={inputClass} disabled={isLoading} autoComplete="tel-national" />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="cust-box" className="block text-sm font-semibold text-gray-700 mb-2">
                      {tr('Box number (STB / VC no.)')}
                    </label>
                    <div className="relative">
                      <Tv className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input id="cust-box" type="text" value={custBox} autoCapitalize="characters" spellCheck={false}
                        onChange={(e) => { setCustBox(e.target.value); setError(''); }}
                        placeholder={tr('Printed on the sticker under your set-top box')}
                        className={inputClass} disabled={isLoading} autoComplete="off" />
                    </div>
                    <p className="mt-1.5 text-xs text-gray-400">
                      {tr('Internet customers: use the customer ID on your bill.')}
                    </p>
                  </div>
                  <button type="submit" disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-sm shadow-lg shadow-blue-500/25 transition-all disabled:opacity-60 disabled:cursor-not-allowed">
                    {isLoading ? t('login.loggingIn') : t('nav.login')}
                    {!isLoading && <ArrowRight className="w-4 h-4" />}
                  </button>
                </form>
                ) : (
                <form
                  onSubmit={handleSubmit}
                  className={`space-y-5 ${shaking ? 'animate-shake' : ''}`}
                >
                  {error && (
                    <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                      <span className="shrink-0 mt-px">⚠</span>
                      {error}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('login.usernameOrMobile', 'Username or mobile')}
                    </label>
                    <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => { setUsername(e.target.value); setError(''); }}
                        placeholder={t('login.placeholderUsername')}
                        className={inputClass}
                        required
                        disabled={isLoading}
                        autoComplete="username"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('login.password')}
                    </label>
                    <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setError(''); }}
                        placeholder={t('login.placeholderPassword')}
                        className="w-full pl-10 pr-11 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        required
                        disabled={isLoading}
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-sm shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        {t('login.loggingIn')}
                      </>
                    ) : (
                      <>
                        {t('nav.login')}
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
                )}

                {/* Sign up: sends a request; the app owner calls back and creates the account */}
                {mode === 'staff' && (
                <div className="mt-6 text-center">
                  <p className="text-sm text-gray-500">
                    {t('login.noAccount', "Don't have an account?")}{' '}
                    <button
                      type="button"
                      onClick={() => { setIsSignup(true); setSignupDone(false); }}
                      className="text-blue-600 font-semibold hover:underline"
                    >
                      {t('login.signUp', 'Sign Up')}
                    </button>
                  </p>
                </div>
                )}

                {/* Demo credentials — mock mode only, never shown with the real backend */}
                {env.USE_MOCK_API && (
                <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-100 max-h-64 overflow-y-auto">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    {t('login.demoCredentials')}
                  </p>
                  <div className="space-y-1.5 text-xs text-gray-600">
                    <div className="border-t border-gray-200 pt-1.5 mt-1.5 space-y-1">
                      {[
                        { label: 'ISP / Cable', user: 'isp' },
                      ].map((d) => (
                        <button
                          key={d.user}
                          type="button"
                          onClick={() => { setUsername(d.user); setPassword('test123'); setError(''); }}
                          className="flex items-center justify-between w-full rounded-lg px-2 py-1.5 hover:bg-blue-50 transition-colors text-left"
                        >
                          <span>{d.label}</span>
                          <span className="font-mono text-blue-600">{d.user} / test123</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                )}
              </>
            ) : (
              <>
                {/* Sign Up Form */}
                <div className="mb-6">
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mb-2">
                    {t('signup.title', 'Sign Up')}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {tr('Fill in your details. Our team will call you within one working day.')}
                  </p>
                </div>

                {signupDone ? (
                  <div className="rounded-2xl border border-green-200 bg-green-50 p-6 text-center">
                    <CheckCircle2 className="w-10 h-10 text-green-600 mx-auto mb-3" />
                    <p className="font-semibold text-gray-900">{tr('Thank you! We received your request.')}</p>
                    <p className="text-sm text-gray-600 mt-1">{tr('We will call you soon on the mobile number you gave.')}</p>
                  </div>
                ) : (
                <form onSubmit={handleSignupSubmit} className="space-y-4" noValidate>
                  {/* Hidden trap field for bots. Not shown to people or screen readers. */}
                  <input
                    type="text"
                    name="lcd_trap_field"
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                    value={signupForm.website}
                    onChange={(e) => setSignupForm({ ...signupForm, website: e.target.value })}
                    className="absolute -left-[9999px] w-px h-px opacity-0"
                  />

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">{tr('Your name')} *</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type="text" autoComplete="name" maxLength={100} value={signupForm.name}
                        onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })}
                        className={inputClass} disabled={signupLoading} />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">{tr('Mobile number')} *</label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type="tel" inputMode="numeric" autoComplete="tel-national" value={signupForm.mobile}
                        onChange={(e) => setSignupForm({ ...signupForm, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                        placeholder={tr('10-digit mobile number')}
                        className={inputClass} disabled={signupLoading} />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">{tr('Business name')} *</label>
                    <div className="relative">
                      <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type="text" autoComplete="organization" maxLength={150} value={signupForm.businessName}
                        onChange={(e) => setSignupForm({ ...signupForm, businessName: e.target.value })}
                        placeholder={tr('e.g. Sri Murugan Cable Network')}
                        className={inputClass} disabled={signupLoading} />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">{tr('Town / City')} *</label>
                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type="text" autoComplete="address-level2" maxLength={100} value={signupForm.city}
                        onChange={(e) => setSignupForm({ ...signupForm, city: e.target.value })}
                        className={inputClass} disabled={signupLoading} />
                    </div>
                  </div>

                  <div>
                    <span className="block text-sm font-semibold text-gray-700 mb-1.5">{tr('What do you provide?')} *</span>
                    <div className="grid grid-cols-3 gap-2">
                      {([['cable', tr('Cable TV')], ['internet', tr('Internet')], ['both', tr('Both')]] as [SignupService, string][]).map(([value, label]) => (
                        <button key={value} type="button" disabled={signupLoading}
                          onClick={() => setSignupForm({ ...signupForm, service: value })}
                          className={`py-2.5 px-2 rounded-xl border-2 text-sm font-medium transition-colors ${
                            signupForm.service === value
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300'
                          }`}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">{tr('How many customers?')}</label>
                    <select value={signupForm.customerCount} disabled={signupLoading}
                      onChange={(e) => setSignupForm({ ...signupForm, customerCount: e.target.value as SignupSize })}
                      className="w-full px-3 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">{tr('Choose (optional)')}</option>
                      {SIGNUP_SIZES.map((v) => (
                        <option key={v} value={v}>{({
                          under_500: tr('Under 500 customers'), '500_2000': tr('500 - 2,000 customers'),
                          '2000_5000': tr('2,000 - 5,000 customers'), over_5000: tr('Over 5,000 customers'),
                        } as Record<string, string>)[v]}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">{tr('Email (optional)')}</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type="email" autoComplete="email" maxLength={254} value={signupForm.email}
                        onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                        className={inputClass} disabled={signupLoading} />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">{tr('Message (optional)')}</label>
                    <textarea rows={2} maxLength={1000} value={signupForm.message}
                      onChange={(e) => setSignupForm({ ...signupForm, message: e.target.value })}
                      placeholder={tr('Best time to call, questions...')}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={signupLoading} />
                  </div>

                  <button
                    type="submit"
                    disabled={signupLoading}
                    className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-sm shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {signupLoading ? tr('Sending...') : (
                      <>
                        {tr('Send request')}
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
                )}

                <div className="mt-6 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('signup.haveAccount', 'Already have an account?')}{' '}
                    <button
                      type="button"
                      onClick={() => setIsSignup(false)}
                      className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                    >
                      {t('nav.login', 'Login')}
                    </button>
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 50%, 90% { transform: translateX(-6px); }
          30%, 70% { transform: translateX(6px); }
        }
        .animate-shake { animation: shake 0.6s ease-in-out; }
      `}</style>
    </div>
  );
};

export default Login;
