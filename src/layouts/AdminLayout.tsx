import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Globe, Users, LogOut, AlertCircle, Menu, X } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import Button from '@/components/ui/Button';

const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { role, logout, username } = useAuthStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/admin/login', { replace: true });
  };

  // Admin menu items
  const adminMenuItems = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/admin/manage-plans', label: 'Manage Front Website', icon: Globe },
    { path: '/admin/customers', label: 'Customers', icon: Users },
    { path: '/admin/complaints', label: 'Complaints', icon: AlertCircle },
  ];

  // Employee menu items (Customers and Complaints)
  const employeeMenuItems = [
    { path: '/admin/customers', label: 'Customers', icon: Users },
    { path: '/admin/complaints', label: 'Complaints', icon: AlertCircle },
  ];

  const menuItems = role === 'admin' ? adminMenuItems : employeeMenuItems;

  return (
    <div className="min-h-screen bg-muted flex flex-col sm:flex-row">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 sm:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed sm:static inset-y-0 left-0 z-50 w-64 bg-card border-r border-border flex flex-col transform transition-transform duration-300 ease-in-out',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full sm:translate-x-0'
        )}
      >
        <div className="p-4 sm:p-6 border-b border-border flex items-center justify-between">
          <h1 className="text-lg sm:text-xl font-bold text-primary">Popna ISP Admin</h1>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="sm:hidden p-2 hover:bg-accent rounded-md"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
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

      {/* Main Content */}
      <main className="flex-1 overflow-auto w-full sm:w-auto">
        {/* Header */}
        <div className="bg-card border-b border-border px-4 sm:px-8 py-4 flex justify-between items-center">
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
        </div>
        <div className="p-4 sm:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
