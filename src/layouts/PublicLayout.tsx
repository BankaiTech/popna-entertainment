import { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useStore } from '@/store/useStore';
import { useTheme } from '@/components/ThemeProvider';
import { useMountFetch } from '@/hooks/useMountFetch';
import { cn } from '@/lib/utils';
import { Menu, X, ChevronRight } from 'lucide-react';
import FooterCredit from '@/components/FooterCredit';
import LanguageSwitcher from '@/components/LanguageSwitcher';


const PublicLayout = () => {
  const { resolvedTheme } = useTheme();
  const prevThemeRef = useRef(resolvedTheme);

  // Force light mode on public site - restore user theme on unmount
  useEffect(() => {
    prevThemeRef.current = resolvedTheme;
    document.documentElement.classList.remove('dark');
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', '#2563eb');

    return () => {
      if (prevThemeRef.current === 'dark') {
        document.documentElement.classList.add('dark');
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', '#0f172a');
      }
    };
  }, []);

  // Keep light mode enforced even if system theme changes while on public site
  useEffect(() => {
    prevThemeRef.current = resolvedTheme;
    document.documentElement.classList.remove('dark');
  }, [resolvedTheme]);
  const { t } = useTranslation();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const { companyProfile, fetchCompanyProfile, fetchActiveProducts } = useStore();

  useMountFetch(
    async (signal) => {
      try {
        await fetchCompanyProfile();
        if (signal.cancelled) return;
        await fetchActiveProducts();
      } catch (error) {
        if (!signal.cancelled) console.error('Error loading layout data:', error);
      }
    },
    []
  );

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 12);

      if (location.pathname === '/') {
        const sections = ['features', 'about'];
        let current = 'home';
        for (const section of sections) {
          const element = document.getElementById(section);
          if (element && element.getBoundingClientRect().top <= 150) {
            current = section;
          }
        }
        setActiveSection((prev) => (prev !== current ? current : prev));
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [location.pathname]);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const companyName = companyProfile?.companyName || 'Popna';
  const isHomePage = location.pathname === '/';

  const navLinks = isHomePage
    ? [
      { href: '#features', label: t('nav.features', 'Features') },
      { href: '#about', label: t('nav.about', 'About') },
    ]
    : [];

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* ── Navbar - always black ── */}
      <nav
        className={cn(
          'sticky top-0 z-50 transition-all duration-300 bg-black text-white',
          scrolled ? 'shadow-lg shadow-black/40' : ''
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 shrink-0 logo-nav-wrap">
              <img src="/Popna Dark.png" alt="Popna" className="logo-nav h-8 w-auto" />
            </Link>

            {/* Desktop nav links */}
            <div className="hidden md:flex items-center gap-1">
              <Link
                to="/"
                className={cn(
                  'relative px-4 py-2 rounded-lg text-sm transition-all duration-200',
                  (location.pathname === '/' && activeSection === 'home')
                    ? 'bg-white text-black font-bold'
                    : 'text-white/75 hover:text-white hover:bg-white/10 font-medium'
                )}
              >
                {t('nav.home')}
              </Link>

              {navLinks.map((link) => {
                const isActive = activeSection === link.href.substring(1);
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    className={cn(
                      'px-4 py-2 rounded-lg text-sm transition-all duration-200',
                      isActive
                        ? 'bg-white text-black font-bold'
                        : 'text-white/75 hover:text-white hover:bg-white/10 font-medium'
                    )}
                  >
                    {link.label}
                  </a>
                );
              })}
            </div>

            {/* Right controls */}
            <div className="hidden md:flex items-center gap-2">
              <LanguageSwitcher
                triggerClassName="bg-white/10 text-white border-white/20 hover:bg-white/20 hover:text-white"
              />
              <Link
                to="/login"
                className={cn(
                  'inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200',
                  location.pathname === '/login'
                    ? 'bg-white text-black shadow-md'
                    : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
                )}
              >
                {t('nav.login')}
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Mobile controls */}
            <div className="md:hidden flex items-center gap-1.5">
              <LanguageSwitcher
                triggerClassName="bg-white/10 text-white border-white/20 hover:bg-white/20 hover:text-white"
              />
              <Link
                to="/login"
                className="inline-flex items-center justify-center px-3 py-1.5 h-[36px] rounded-lg text-xs font-semibold bg-white text-black shadow-sm whitespace-nowrap"
              >
                {t('nav.login')}
              </Link>
              {isHomePage && (
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="p-1.5 hover:bg-white/15 rounded-lg transition-colors text-white"
                  aria-label="Toggle menu"
                >
                  {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile drawer */}
        {isMobileMenuOpen && isHomePage && (
          <>
            <div
              className="fixed inset-0 top-16 bg-black/60 backdrop-blur-sm z-40 md:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <div className="md:hidden relative z-50 border-t border-white/10 bg-black px-3 pb-4 pt-2 space-y-0.5 shadow-2xl">
              <Link
                to="/"
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-colors',
                  activeSection === 'home'
                    ? 'bg-white text-black font-bold'
                    : 'text-white/75 hover:text-white hover:bg-white/10 font-medium'
                )}
              >
                {t('nav.home')}
              </Link>
              {navLinks.map((link) => {
                const isActive = activeSection === link.href.substring(1);
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-colors',
                      isActive
                        ? 'bg-white text-black font-bold'
                        : 'text-white/75 hover:text-white hover:bg-white/10 font-medium'
                    )}
                  >
                    {link.label}
                  </a>
                );
              })}
              <div className="pt-2 pb-1 px-2">
                <Link
                  to="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl text-sm font-semibold bg-white text-black shadow-md"
                >
                  {t('nav.login')}
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </>
        )}
      </nav>

      {/* Main Content */}
      <main className="flex-grow">
        <Outlet />
      </main>

      {/* ── Footer - always black ── */}
      <footer className="bg-black text-gray-300">
        {/* Top accent line */}
        <div className="h-px bg-white/10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">

            {/* Brand column */}
            <div>
              <div className="mb-4">
                <img src="/Popna Dark.png" alt="Popna" className="h-8 w-auto" />
              </div>
              <h3 className="text-white font-semibold text-base mb-2">{companyName}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                {t('home.about.description', 'An application software to take your business to the next level.')}
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">
                {t('nav.quickLinks')}
              </h3>
              <ul className="space-y-2.5">
                <li>
                  <Link
                    to="/"
                    className="text-sm text-gray-400 hover:text-white transition-colors duration-200 flex items-center gap-1.5"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                    {t('nav.home')}
                  </Link>
                </li>
                {isHomePage && (
                  <>
                    <li>
                      <a
                        href="#features"
                        className="text-sm text-gray-400 hover:text-white transition-colors duration-200 flex items-center gap-1.5"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                        {t('nav.features', 'Features')}
                      </a>
                    </li>
                    <li>
                      <a
                        href="#about"
                        className="text-sm text-gray-400 hover:text-white transition-colors duration-200 flex items-center gap-1.5"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                        {t('nav.about', 'About')}
                      </a>
                    </li>
                  </>
                )}
                <li>
                  <Link
                    to="/login"
                    className="text-sm text-gray-400 hover:text-white transition-colors duration-200 flex items-center gap-1.5"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                    {t('nav.login')}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Contact column */}
            <div>
              <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">
                {t('home.contact.getInTouch', 'Get in Touch')}
              </h3>
              <div className="space-y-3">
                <a
                  href="mailto:bankai.tech12@gmail.com"
                  className="text-sm text-gray-400 hover:text-white transition-colors inline-block"
                >
                  bankai.tech12@gmail.com
                </a>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-gray-600">
              &copy; {new Date().getFullYear()} {companyName}. {t('footer.rightsReserved')}
            </p>
            <FooterCredit />
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;
