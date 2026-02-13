import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Package, Users, FileText, ShoppingCart, AlertCircle, UserCog, Settings, LogOut, Menu, X, PhoneCall } from 'lucide-react';
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

  // Full product sidebar — enterprise SaaS structure. Admin sees all; Employee sees limited.
  const adminMenuItems = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/admin/customers', label: 'Customers', icon: Users },
    { path: '/admin/connection-requests', label: 'New Connection', icon: PhoneCall },
    { path: '/admin/catalog', label: 'Catalog', icon: Package },
    { path: '/admin/invoices', label: 'Invoices', icon: FileText },
    { path: '/admin/purchase-invoices', label: 'Purchase Invoices', icon: ShoppingCart },
    { path: '/admin/complaints', label: 'Complaints', icon: AlertCircle },
    { path: '/admin/users', label: 'Users', icon: UserCog },
    { path: '/admin/settings', label: 'Settings', icon: Settings },
  ];

  // Employee sidebar — Dashboard hidden, only Customers and Complaints visible
  const employeeMenuItems = [
    { path: '/admin/customers', label: 'Customers', icon: Users },
    { path: '/admin/complaints', label: 'Complaints', icon: AlertCircle },
  ];

  const menuItems = role === 'admin' ? adminMenuItems : employeeMenuItems;

  // Header height: h-14 (3.5rem). Sidebar uses top-14 to sit below it.
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Mobile overlay — z-40; header z-50 stays above so drawer does not overlap header */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 sm:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sticky header — full width, compact, stays above content */}
      <header className="fixed top-0 left-0 right-0 z-50 h-14 shrink-0 flex items-center justify-between px-4 sm:px-8 border-b border-border bg-card">
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

      <div className="flex flex-1 pt-14">
        {/* Sidebar — desktop: sticky full height; mobile: drawer */}
        <aside
          className={cn(
            'fixed top-14 bottom-0 left-0',
            'z-40 w-56 bg-gray-50 border-r border-gray-200 flex flex-col',
            'transform transition-transform duration-300 ease-in-out',
            'sm:translate-x-0',
            isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          {/* Logo Header */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between shrink-0 bg-gray-50">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <span className="text-white text-xs font-bold">P</span>
              </div>
              <h1 className="text-base font-bold text-gray-900">Popna</h1>
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="sm:hidden p-1.5 hover:bg-gray-200 rounded transition-colors"
              aria-label="Close menu"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                  )}
                >
                  <Icon className={cn('w-4 h-4', isActive ? 'text-white' : 'text-gray-600')} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
          
          {/* Profile Section */}
          {/* <div className="p-3 border-t border-gray-200 shrink-0 bg-gray-50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-semibold">
                  {username?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{username || 'User'}</p>
                <p className="text-xs text-gray-500 truncate">{username ? `${username}@popna.com` : 'user@popna.com'}</p>
              </div>
            </div>
          </div> */}
        </aside>

        {/* Main content — flex column to push footer to bottom */}
        <main className="flex-1 flex flex-col w-full bg-white sm:ml-56">
          <div className="flex-1 overflow-auto p-4 sm:p-6">
            <Outlet />
          </div>
          
          {/* Footer credit — sticks to bottom using margin-top: auto */}
          <footer className="shrink-0 mt-auto border-t border-gray-200 bg-white py-2 px-4">
            <FooterCredit />
          </footer>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
