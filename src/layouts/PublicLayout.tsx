import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Menu, X, ChevronDown } from 'lucide-react';
import FooterCredit from '@/components/FooterCredit';

const PublicLayout = () => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const cableService = { path: '/cable/gtpl', label: 'GTPL Cable' };
  const internetServices = [
    { path: '/internet/bsnl', label: 'BSNL Internet' },
    { path: '/internet/railwire', label: 'Railwire Internet' },
    { path: '/internet/krishiinet', label: 'Krishiinet Internet' },
  ];

  const isCableActive = location.pathname === cableService.path;
  const isInternetActive = internetServices.some((s) => location.pathname === s.path);

  return (
    <div className="min-h-screen bg-muted">
      {/* Navbar — Cable and Internet separation; do NOT mix GTPL with internet */}
      <nav className="bg-card border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link to="/" className="text-lg sm:text-xl font-bold text-primary">
                BankaiTech
              </Link>
            </div>

            {/* Desktop: Home + Cable Services (GTPL) + Internet Services (BSNL, Railwire, Krishiinet) */}
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
                    <Link
                      to={cableService.path}
                      className="block px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
                    >
                      {cableService.label}
                    </Link>
                  </div>
                </div>
              </div>
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
                    {internetServices.map((s) => (
                      <Link
                        key={s.path}
                        to={s.path}
                        className="block px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
                      >
                        {s.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 hover:bg-accent rounded-md transition-colors"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {/* Mobile: Home, Cable (GTPL), Internet (BSNL, Railwire, Krishiinet) */}
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
              <div className="px-4 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-2">
                Cable Services
              </div>
              <Link
                to={cableService.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  'block px-6 py-2 text-sm font-medium',
                  isCableActive ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                )}
              >
                {cableService.label}
              </Link>
              <div className="px-4 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-2">
                Internet Services
              </div>
              {internetServices.map((s) => (
                <Link
                  key={s.path}
                  to={s.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    'block px-6 py-2 text-sm font-medium',
                    location.pathname === s.path ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                  )}
                >
                  {s.label}
                </Link>
              ))}
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
            <p>&copy; 2024 BankaiTech. All rights reserved.</p>
            <FooterCredit />
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;
