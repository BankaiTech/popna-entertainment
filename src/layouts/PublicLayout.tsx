import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';
import { Menu, X } from 'lucide-react';
import FooterCredit from '@/components/FooterCredit';

const PublicLayout = () => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { companyProfile, fetchCompanyProfile, fetchActiveProducts } = useStore();

  useEffect(() => {
    // Load data if not already initialized, but don't block rendering
    const loadData = async () => {
      try {
        await fetchCompanyProfile();
        await fetchActiveProducts();
      } catch (error) {
        console.error('Error loading layout data:', error);
        // Continue rendering with mock data
      }
    };
    // Always try to load data, but don't block rendering
    loadData();
  }, [fetchCompanyProfile, fetchActiveProducts]);

  // Multi-tenant ready — company name from settings
  const companyName = companyProfile?.companyName || 'BankaiTech';

  // Multi-tenant ready — company name from settings

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Navbar — Dynamic based on active products — Sticky header */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm transition-shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link to="/" className="text-lg sm:text-xl font-bold text-primary">
                {companyName}
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              <Link
                to="/"
                className={cn(
                  'px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors',
                  location.pathname === '/' ? 'bg-primary text-white' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                )}
              >
                Home
              </Link>

              <Link
                to="/plans"
                className={cn(
                  'px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors',
                  location.pathname === '/plans' ? 'bg-primary text-white' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                )}
              >
                Plans
              </Link>

              <Link
                to="/customer/login"
                className={cn(
                  'px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors',
                  location.pathname === '/customer/login' ? 'bg-primary text-white' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                )}
              >
                Login
              </Link>
            </div>

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 hover:bg-accent rounded-md transition-colors"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {isMobileMenuOpen && (
            <div className="md:hidden border-t border-gray-200 py-2 bg-white">
              <Link
                to="/"
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  'block px-4 py-2 text-sm font-medium',
                  location.pathname === '/' ? 'bg-primary text-white' : 'hover:bg-gray-100'
                )}
              >
                Home
              </Link>

              <Link
                to="/plans"
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  'block px-4 py-2 text-sm font-medium',
                  location.pathname === '/plans' ? 'bg-primary text-white' : 'hover:bg-gray-100'
                )}
              >
                Plans
              </Link>

              <Link
                to="/customer/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  'block px-4 py-2 text-sm font-medium',
                  location.pathname === '/customer/login' ? 'bg-primary text-white' : 'hover:bg-gray-100'
                )}
              >
                Login
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow">
        <Outlet />
      </main>

      {/* Footer — Sticky at bottom */}
      <footer className="bg-gradient-to-b from-white to-gray-50 border-t border-gray-200 mt-auto shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">{companyName}</h3>
              <p className="text-sm text-gray-600">
                Providing reliable cable and internet services for homes and businesses.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Quick Links</h3>
              <ul className="space-y-2">
                <li>
                  <Link to="/" className="text-sm text-gray-600 hover:text-primary transition-colors">
                    Home
                  </Link>
                </li>
                <li>
                  <Link to="/plans" className="text-sm text-gray-600 hover:text-primary transition-colors">
                    Plans
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Contact</h3>
              <p className="text-sm text-gray-600">{companyProfile?.contactNumber || '+91 9876543210'}</p>
              <p className="text-sm text-gray-600">{companyProfile?.email || 'info@bankaitech.com'}</p>
            </div>
          </div>
          <div className="border-t border-gray-200 pt-6">
            <div className="text-center text-sm text-gray-600 space-y-2">
              <p>&copy; 2024 {companyName}. All rights reserved.</p>
              <FooterCredit />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;
