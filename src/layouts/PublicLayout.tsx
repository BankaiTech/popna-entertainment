import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';
import { Menu, X } from 'lucide-react';
import FooterCredit from '@/components/FooterCredit';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import Logo from '@/components/Logo';

const PublicLayout = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { companyProfile, fetchCompanyProfile, fetchActiveProducts } = useStore();

  useEffect(() => {
    const loadData = async () => {
      try {
        await fetchCompanyProfile();
        await fetchActiveProducts();
      } catch (error) {
        console.error('Error loading layout data:', error);
      }
    };
    loadData();
  }, [fetchCompanyProfile, fetchActiveProducts]);

  const companyName = companyProfile?.companyName || 'Businexa';
  const isHomePage = location.pathname === '/';

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/95 dark:bg-gray-950/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 shadow-sm transition-shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2 min-h-0 flex-shrink-0 logo-nav-wrap">
              <Link to="/" className="flex items-center justify-center h-full w-full">
                <Logo className="logo-nav" />
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              <Link
                to="/"
                className={cn(
                  'px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors',
                  location.pathname === '/' ? 'bg-primary text-white' : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                )}
              >
                {t('nav.home')}
              </Link>

              {isHomePage && (
                <>
                  <a
                    href="#features"
                    className="px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    {t('home.features.title', 'Features')}
                  </a>
                  <a
                    href="#contact"
                    className="px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    {t('home.contact.title', 'Contact')}
                  </a>
                </>
              )}

              <Link
                to="/login"
                className={cn(
                  'px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors',
                  location.pathname === '/login' ? 'bg-primary text-white' : 'bg-primary/10 text-primary hover:bg-primary/20 dark:bg-primary/20 dark:hover:bg-primary/30'
                )}
              >
                {t('nav.login')}
              </Link>
              <ThemeSwitcher />
              <LanguageSwitcher />
            </div>

            {/* Mobile: Login + Theme + Language + Hamburger always visible */}
            <div className="md:hidden flex items-center gap-1">
              <ThemeSwitcher />
              <LanguageSwitcher />
              <Link
                to="/login"
                className={cn(
                  'px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  location.pathname === '/login' ? 'bg-primary text-white' : 'bg-primary/10 text-primary hover:bg-primary/20'
                )}
              >
                {t('nav.login')}
              </Link>
              {isHomePage && (
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="p-2 hover:bg-accent rounded-md transition-colors"
                  aria-label="Toggle menu"
                >
                  {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              )}
            </div>
          </div>

          {/* Mobile Navigation — section anchors (only on homepage) */}
          {isMobileMenuOpen && isHomePage && (
            <div className="md:hidden border-t border-gray-200 dark:border-gray-800 py-2 bg-white dark:bg-gray-950">
              <a
                href="#features"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-4 py-3 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-300"
              >
                {t('home.features.title', 'Features')}
              </a>
              <a
                href="#about"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-4 py-3 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-300"
              >
                {t('home.about.title', 'About')}
              </a>
              <a
                href="#contact"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-4 py-3 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-300"
              >
                {t('home.contact.title', 'Contact')}
              </a>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-gradient-to-b from-white to-gray-50 dark:from-gray-950 dark:to-gray-900 border-t border-gray-200 dark:border-gray-800 mt-auto shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">{companyName}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('footer.tagline')}
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">{t('nav.quickLinks')}</h3>
              <ul className="space-y-2">
                <li>
                  <Link to="/" className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary transition-colors">
                    {t('nav.home')}
                  </Link>
                </li>
                {isHomePage && (
                  <>
                    <li>
                      <a href="#features" className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary transition-colors">
                        {t('home.features.title', 'Features')}
                      </a>
                    </li>
                    <li>
                      <a href="#contact" className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary transition-colors">
                        {t('home.contact.title', 'Contact')}
                      </a>
                    </li>
                  </>
                )}
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">{t('nav.contact')}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{companyProfile?.contactNumber || ''}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{companyProfile?.email || ''}</p>
            </div>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-800 pt-6">
            <div className="text-center text-sm text-gray-600 dark:text-gray-400 space-y-2">
              <p>&copy; {new Date().getFullYear()} {companyName}. {t('footer.rightsReserved')}</p>
              <FooterCredit />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;
