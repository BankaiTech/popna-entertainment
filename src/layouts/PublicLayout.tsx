import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';
import { Menu, X, ChevronDown } from 'lucide-react';
import FooterCredit from '@/components/FooterCredit';

const PublicLayout = () => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { companyProfile, products, fetchCompanyProfile, fetchActiveProducts } = useStore();

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

  // Multi-tenant ready — dynamic navigation from products (with safety check)
  const cableProducts = Array.isArray(products) ? products.filter((p) => p.productType === 'cable' && p.isActive) : [];
  const internetProducts = Array.isArray(products) ? products.filter((p) => p.productType === 'internet' && p.isActive) : [];

  const isCableActive = cableProducts.some((p) => location.pathname.includes(`/cable/${p.name.toLowerCase()}`));
  const isInternetActive = internetProducts.some((p) => location.pathname.includes(`/internet/${p.name.toLowerCase()}`));

  return (
    <div className="min-h-screen bg-muted">
      {/* Navbar — Dynamic based on active products */}
      <nav className="bg-card border-b border-border shadow-sm">
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
                  location.pathname === '/' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                )}
              >
                Home
              </Link>
              
              {/* Cable Services Dropdown - Dynamic */}
              {cableProducts.length > 0 && (
                <div className="relative group">
                  <button
                    className={cn(
                      'flex items-center gap-1 px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap',
                      isCableActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    )}
                  >
                    Cable Services
                    <ChevronDown className="w-4 h-4 opacity-70" />
                  </button>
                  <div className="absolute left-0 top-full mt-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <div className="bg-card border border-border rounded-lg shadow-xl py-2 min-w-[180px]">
                      {cableProducts.map((product) => (
                        <Link
                          key={product.id}
                          to={`/cable/${product.name.toLowerCase()}`}
                          className="block px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
                        >
                          {product.name} Cable
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Internet Services Dropdown - Dynamic */}
              {internetProducts.length > 0 && (
                <div className="relative group">
                  <button
                    className={cn(
                      'flex items-center gap-1 px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer whitespace-nowrap',
                      isInternetActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    )}
                  >
                    Internet Services
                    <ChevronDown className="w-4 h-4 opacity-70" />
                  </button>
                  <div className="absolute left-0 top-full mt-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <div className="bg-card border border-border rounded-lg shadow-xl py-2 min-w-[200px]">
                      {internetProducts.map((product) => (
                        <Link
                          key={product.id}
                          to={`/internet/${product.name.toLowerCase()}`}
                          className="block px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
                        >
                          {product.name} Internet
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 hover:bg-accent rounded-md transition-colors"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {/* Mobile Navigation - Dynamic */}
          {isMobileMenuOpen && (
            <div className="md:hidden border-t border-border py-2">
              <Link
                to="/"
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  'block px-4 py-2 text-sm font-medium',
                  location.pathname === '/' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                )}
              >
                Home
              </Link>
              
              {cableProducts.length > 0 && (
                <>
                  <div className="px-4 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-2">
                    Cable Services
                  </div>
                  {cableProducts.map((product) => (
                    <Link
                      key={product.id}
                      to={`/cable/${product.name.toLowerCase()}`}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={cn(
                        'block px-6 py-2 text-sm font-medium',
                        location.pathname === `/cable/${product.name.toLowerCase()}` ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                      )}
                    >
                      {product.name} Cable
                    </Link>
                  ))}
                </>
              )}
              
              {internetProducts.length > 0 && (
                <>
                  <div className="px-4 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-2">
                    Internet Services
                  </div>
                  {internetProducts.map((product) => (
                    <Link
                      key={product.id}
                      to={`/internet/${product.name.toLowerCase()}`}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={cn(
                        'block px-6 py-2 text-sm font-medium',
                        location.pathname === `/internet/${product.name.toLowerCase()}` ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                      )}
                    >
                      {product.name} Internet
                    </Link>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main>
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-card border-t border-border mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="text-center text-sm text-muted-foreground space-y-2">
            <p>&copy; 2024 {companyName}. All rights reserved.</p>
            <FooterCredit />
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;
