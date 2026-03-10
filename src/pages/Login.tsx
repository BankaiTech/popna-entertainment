import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/useAuthStore';
import { Lock, User, ArrowRight, Building2, ArrowLeft, Eye, EyeOff, Mail, Phone, Briefcase } from 'lucide-react';
import FooterCredit from '@/components/FooterCredit';
import Logo from '@/components/Logo';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { signupRequestsApi } from '@/api/signupRequests';
import { showSuccess, showError } from '@/utils/toast';

const BUSINESS_TYPES = [
  'Retail',
  'Wholesale',
  'Restaurant / Cafe',
  'Salon / Spa',
  'Grocery',
  'Electronics',
  'Clothing / Fashion',
  'Healthcare / Pharmacy',
  'ISP / Cable TV',
  'Other',
];

const Login = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login, customerLogin, isAuthenticated, role, initialize } = useAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupForm, setSignupForm] = useState({
    name: '',
    mobile: '',
    email: '',
    businessType: '',
    businessName: '',
  });

  // Force light mode while on the login page and restore previous theme on unmount
  const prevThemeRef = useRef<'light' | 'dark' | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    prevThemeRef.current = root.classList.contains('dark') ? 'dark' : 'light';
    root.classList.remove('dark');
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', '#2563eb');
    }
    return () => {
      if (prevThemeRef.current === 'dark') {
        root.classList.add('dark');
        const metaTag = document.querySelector('meta[name="theme-color"]');
        if (metaTag) {
          metaTag.setAttribute('content', '#0f172a');
        }
      }
    };
  }, []);

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
      const userRole = useAuthStore.getState().role;
      setIsLoading(false);
      if (userRole === 'customer') {
        navigate('/customer/dashboard', { replace: true });
      } else if (userRole === 'superadmin') {
        navigate('/superadmin/dashboard', { replace: true });
      } else if (userRole === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/admin/customers', { replace: true });
      }
      return;
    }

    try {
      const result = await customerLogin(username.trim(), password);
      if (result.success) {
        navigate('/customer/dashboard', { replace: true });
      } else {
        setError(t('login.wrongCredentials', 'Username and password is wrong'));
        triggerShake();
      }
    } catch {
      setError(t('login.wrongCredentials', 'Username and password is wrong'));
      triggerShake();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { name, mobile, email, businessType, businessName } = signupForm;
    if (!name.trim() || !mobile.trim() || !email.trim() || !businessType || !businessName.trim()) {
      showError(t('signup.fillAllFields', 'Please fill all fields'));
      return;
    }
    if (!/^\d{10}$/.test(mobile.trim())) {
      showError(t('signup.invalidMobile', 'Please enter a valid 10-digit mobile number'));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      showError(t('signup.invalidEmail', 'Please enter a valid email address'));
      return;
    }
    setSignupLoading(true);
    try {
      await signupRequestsApi.create({
        name: name.trim(),
        mobile: mobile.trim(),
        email: email.trim(),
        businessType,
        businessName: businessName.trim(),
      });
      showSuccess(t('signup.success', 'Sign up request submitted successfully! We will contact you soon.'));
      setSignupForm({ name: '', mobile: '', email: '', businessType: '', businessName: '' });
      setIsSignup(false);
    } catch {
      showError(t('signup.error', 'Failed to submit. Please try again.'));
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
            <img src="/Popna Dark.png" alt="Popna" className="h-12 w-auto mb-8" />
            <h1 className="text-4xl xl:text-5xl font-extrabold text-white leading-tight tracking-tight mb-4">
              {isSignup ? t('signup.welcomeTitle', 'Get Started') : t('login.welcomeBack', 'Welcome Back')}
            </h1>
            <p className="text-lg text-white/65 leading-relaxed">
              {isSignup
                ? t('signup.welcomeSubtitle', 'Sign up to start managing your business with our powerful platform.')
                : t('login.signInToContinue', 'Sign in to manage your business, invoices, contacts and more - all in one powerful platform.')}
            </p>
          </div>
          <div className="space-y-4">
            {[
              t('home.features.invoicing', 'GST Invoicing'),
              t('home.features.contacts', 'Contact Management'),
              t('home.features.pos', 'Point of Sale'),
              t('home.benefits.multiLang', 'Multi-Language Support'),
            ].map((feat) => (
              <div key={feat} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <ArrowRight className="w-3 h-3 text-white" />
                </div>
                <span className="text-sm text-white/75">{feat}</span>
              </div>
            ))}
          </div>
          <div className="mt-12 flex items-center gap-2 text-white/40 text-xs">
            <Building2 className="w-4 h-4" />
            <span>{t('footer.tagline', 'Complete Business Management Platform')}</span>
          </div>
        </div>
      </div>

      {/* Right panel (form) */}
      <div className="flex-1 flex flex-col bg-white">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('login.backToHome', 'Back to Home')}
          </Link>
          <div className="flex items-center gap-1">
            <LanguageSwitcher />
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md">
            <div className="flex justify-center mb-8 lg:hidden">
              <Logo className="h-12 w-auto" />
            </div>

            {!isSignup ? (
              <>
                {/* Login Form */}
                <div className="mb-8">
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mb-2">
                    {t('login.title', 'Login')}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {t('login.subtitle', 'Enter your username and password. You will be directed to the right dashboard.')}
                  </p>
                </div>

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

                {/* Sign up link */}
                <div className="mt-6 text-center">
                  <p className="text-sm text-gray-500">
                    {t('login.noAccount', "Don't have an account?")}{' '}
                    <button
                      type="button"
                      onClick={() => setIsSignup(true)}
                      className="text-blue-600 font-semibold hover:underline"
                    >
                      {t('login.signUp', 'Sign Up')}
                    </button>
                  </p>
                </div>

                {/* Demo credentials */}
                <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    {t('login.demoCredentials')}
                  </p>
                  <div className="space-y-1">
                    <p className="text-xs text-gray-600">{t('login.demoAdmin')}</p>
                    <p className="text-xs text-gray-600">{t('login.demoEmployee')}</p>
                    <p className="text-xs text-gray-600">
                      {t('login.demoCustomer', 'Customer: use your 10-digit mobile and password')}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Sign Up Form */}
                <div className="mb-6">
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mb-2">
                    {t('signup.title', 'Sign Up')}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {t('signup.subtitle', 'Fill in your details. Our team will get in touch with you.')}
                  </p>
                </div>

                <form onSubmit={handleSignupSubmit} className="space-y-4">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      {t('signup.name', 'Name')} *
                    </label>
                    <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={signupForm.name}
                        onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })}
                        placeholder={t('signup.namePlaceholder', 'Enter your full name')}
                        className={inputClass}
                        disabled={signupLoading}
                      />
                    </div>
                  </div>

                  {/* Mobile */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      {t('signup.mobile', 'Mobile')} *
                    </label>
                    <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400">
                        <Phone className="w-4 h-4" />
                      </div>
                      <input
                        type="tel"
                        value={signupForm.mobile}
                        onChange={(e) => setSignupForm({ ...signupForm, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                        placeholder={t('signup.mobilePlaceholder', '10-digit mobile number')}
                        className={inputClass}
                        disabled={signupLoading}
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      {t('signup.email', 'Email')} *
                    </label>
                    <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        value={signupForm.email}
                        onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                        placeholder={t('signup.emailPlaceholder', 'you@example.com')}
                        className={inputClass}
                        disabled={signupLoading}
                      />
                    </div>
                  </div>

                  {/* Business Type */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      {t('signup.businessType', 'Business / Company Type')} *
                    </label>
                    <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400">
                        <Briefcase className="w-4 h-4" />
                      </div>
                      <select
                        value={signupForm.businessType}
                        onChange={(e) => setSignupForm({ ...signupForm, businessType: e.target.value })}
                        className={`${inputClass} appearance-none`}
                        disabled={signupLoading}
                      >
                        <option value="">{t('signup.selectBusinessType', 'Select business type')}</option>
                        {BUSINESS_TYPES.map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Business Name */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      {t('signup.businessName', 'Business / Company Name')} *
                    </label>
                    <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={signupForm.businessName}
                        onChange={(e) => setSignupForm({ ...signupForm, businessName: e.target.value })}
                        placeholder={t('signup.businessNamePlaceholder', 'Enter your business name')}
                        className={inputClass}
                        disabled={signupLoading}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={signupLoading}
                    className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-sm shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {signupLoading ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        {t('signup.submitting', 'Submitting...')}
                      </>
                    ) : (
                      <>
                        {t('signup.submit', 'Submit Request')}
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

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

        <div className="shrink-0 py-4 px-6 border-t border-gray-100 flex justify-center">
          <FooterCredit />
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
