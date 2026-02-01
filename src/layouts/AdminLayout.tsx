import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Globe, Users, UserCog, LogOut, AlertCircle, Menu, X } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import Button from '@/components/ui/Button';
import FooterCredit from '@/components/FooterCredit';

const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { role, logout, username } = useAuthStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/admin/login', { replace: true });
  };

  // Admin menu items (Users visible only to Admin)
  const adminMenuItems = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/admin/manage-plans', label: 'Manage Front Website', icon: Globe },
    { path: '/admin/customers', label: 'Customers', icon: Users },
    { path: '/admin/complaints', label: 'Complaints', icon: AlertCircle },
    { path: '/admin/users', label: 'Users', icon: UserCog },
  ];

  // Employee menu items (Customers and Complaints)
  const employeeMenuItems = [
    { path: '/admin/customers', label: 'Customers', icon: Users },
    { path: '/admin/complaints', label: 'Complaints', icon: AlertCircle },
  ];

  const menuItems = role === 'admin' ? adminMenuItems : employeeMenuItems;

  // Header height: h-14 (3.5rem). Sidebar uses top-14 to sit below it.
  return (
    <div className="min-h-screen bg-muted flex flex-col">
      {/* Mobile overlay — z-40; header z-50 stays above so drawer does not overlap header */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 sm:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sticky header — full width, compact, stays above content */}
      <header className="sticky top-0 z-50 h-14 shrink-0 flex items-center justify-between px-4 sm:px-8 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="sm:hidden p-2 hover:bg-accent rounded-md"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-base sm:text-lg font-semibold">Welcome, {username || 'User'}</h2>
            <p className="text-xs sm:text-sm text-muted-foreground capitalize">{role || 'User'} Dashboard</p>
          </div>
        </div>
        <Button variant="outline" onClick={handleLogout} className="flex items-center space-x-2 text-sm sm:text-base">
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </header>

      <div className="flex flex-1 flex-col sm:flex-row min-h-0">
        {/* Sidebar — desktop: sticky below header, scrolls independently; mobile: drawer below header */}
        <aside
          className={cn(
            'fixed sm:sticky left-0 top-14 bottom-0 sm:bottom-auto sm:top-14 sm:self-start sm:max-h-[calc(100vh-3.5rem)]',
            'z-50 w-64 bg-card border-r border-border flex flex-col shrink-0',
            'transform transition-transform duration-300 ease-in-out',
            isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full sm:translate-x-0'
          )}
        >
          <div className="p-4 sm:p-6 border-b border-border flex items-center justify-between shrink-0">
            <h1 className="text-lg sm:text-xl font-bold text-primary">Popna ISP Admin</h1>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="sm:hidden p-2 hover:bg-accent rounded-md"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <nav className="flex-1 min-h-0 overflow-y-auto p-4 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center space-x-3 px-4 py-3 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main content — scrolls vertically, padding to avoid overlap */}
        <main className="flex-1 min-h-0 overflow-auto w-full">
          <div className="p-4 sm:p-8">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Footer credit — sticky at bottom */}
      <footer className="shrink-0 border-t border-border bg-card py-3 px-4">
        <FooterCredit />
      </footer>
    </div>
  );
};

export default AdminLayout;
