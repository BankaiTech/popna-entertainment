import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '@/store/useStore';
import { useAuthStore } from '@/store/useAuthStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import { Users, Wifi, TrendingUp, UserCheck, UserX, AlertCircle } from 'lucide-react';
import { customersApi } from '@/api/api';
import type { Customer } from '@/models/types';
import { getConnectionTypeLabel } from '@/lib/providerUtils';
import { cn } from '@/lib/utils';

const AdminDashboard = () => {
  const { t } = useTranslation();
  const { dashboardStats, loading, fetchDashboardStats, initialize, fetchCustomers, fetchProducts, customers, complaints, products } = useStore();
  const [lastCustomers, setLastCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    const loadData = async () => {
      await initialize();
      await fetchProducts();
      await fetchCustomers();
      await fetchDashboardStats();
      const allCustomers = await customersApi.getAll();
      const sorted = allCustomers
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);
      setLastCustomers(sorted);
    };
    loadData();
  }, [fetchDashboardStats, fetchProducts, fetchCustomers, initialize]);

  // Calculate active complaints count
  const activeComplaintsCount = complaints.filter((c) => c.status === 'active').length;

  // SaaS Ready — Payment Summary for ALL products (universal, no cable-only restriction)
  const allProductStats = Array.isArray(products) ? products.map((product) => {
    const productCustomers = customers.filter((c) => c.connectionType === product.name);
    const paidCount = productCustomers.filter((c) => c.paymentStatus === 'paid').length;
    const unpaidCount = productCustomers.filter((c) => c.paymentStatus !== 'paid').length;
    return { product, customers: productCustomers, paidCount, unpaidCount };
  }) : [];

  // Show data immediately if available, don't show loading if we have data
  if (!dashboardStats && loading) {
    return <div className="text-center py-12">{t('dashboard.loading')}</div>;
  }

  // If no stats but not loading, initialize
  if (!dashboardStats && !loading) {
    return null; // Will be handled by useEffect
  }
  if (!dashboardStats) return null;

  // Multi-tenant ready — generate product stat cards dynamically
  const productStatCards = Array.isArray(products) && products.length > 0 ? products.map((product) => {
    const productCustomers = customers.filter((c) => c.connectionType === product.name);
    const colors = [
      { text: 'text-blue-600', bg: 'bg-blue-50' },
      { text: 'text-orange-600', bg: 'bg-orange-50' },
      { text: 'text-green-600', bg: 'bg-green-50' },
      { text: 'text-purple-600', bg: 'bg-purple-50' },
      { text: 'text-pink-600', bg: 'bg-pink-50' },
      { text: 'text-indigo-600', bg: 'bg-indigo-50' },
    ];
    const colorIndex = product.id % colors.length;
    return {
      title: `${product.productType === 'cable' ? t('dashboard.cable') : t('dashboard.internet')} — ${getConnectionTypeLabel(product.name)}`,
      value: productCustomers.length,
      icon: Wifi,
      color: colors[colorIndex].text,
      bgColor: colors[colorIndex].bg,
    };
  }) : [];

  const statCards = [
    {
      title: t('dashboard.totalCustomers'),
      value: dashboardStats.totalCustomers,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    ...productStatCards,
    {
      title: t('dashboard.newThisMonth'),
      value: dashboardStats.newCustomersThisMonth,
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: t('dashboard.activeCustomers'),
      value: dashboardStats.activeCustomers,
      icon: UserCheck,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: t('dashboard.inactiveCustomers'),
      value: dashboardStats.inactiveCustomers,
      icon: UserX,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      title: t('dashboard.activeComplaints'),
      value: activeComplaintsCount,
      icon: AlertCircle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
  ];

  return (
    <div className="space-y-3 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold mb-1 gradient-text">{t('dashboard.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('dashboard.subtitle')}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="overflow-hidden group hover:-translate-y-1 transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4">
                <CardTitle className="text-[10px] font-semibold uppercase tracking-wider ">
                  {stat.title}
                </CardTitle>
                <div className={`p-2.5 rounded-lg ${stat.bgColor} group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent className="pb-4 px-4">
                <div className="text-3xl font-bold text-foreground mb-1">
                  <AnimatedCounter value={stat.value} duration={1500} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Provider Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card className="overflow-hidden animate-slide-up">
          <div className="h-1 bg-gradient-to-r from-green-500 to-emerald-500"></div>
          <CardHeader className="py-3">
            <CardTitle className="text-base">{t('dashboard.activeByService')}</CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <div className="space-y-2">
              {products.map((product) => {
                const count = customers.filter(
                  (c) => c.connectionType === product.name && c.status === 'Active'
                ).length;
                return (
                  <div key={product.id} className="flex justify-between items-center p-2 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 hover:shadow-md transition-all duration-300">
                    <span className="text-sm font-medium">{getConnectionTypeLabel(product.name, products)}</span>
                    <span className="text-lg font-bold text-green-600">{count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="h-1 bg-gradient-to-r from-red-500 to-pink-500"></div>
          <CardHeader className="py-3">
            <CardTitle className="text-base">{t('dashboard.inactiveByService')}</CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <div className="space-y-2">
              {products.map((product) => {
                const count = customers.filter(
                  (c) => c.connectionType === product.name && c.status === 'Inactive'
                ).length;
                return (
                  <div key={product.id} className="flex justify-between items-center p-2 rounded-lg bg-gradient-to-r from-red-50 to-pink-50 hover:shadow-md transition-all duration-300">
                    <span className="text-sm font-medium">{getConnectionTypeLabel(product.name, products)}</span>
                    <span className="text-lg font-bold text-red-600">{count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Last 5 Customers Table */}
      <Card className="overflow-hidden animate-slide-up" style={{ animationDelay: '0.2s' }}>
        <div className="h-1 bg-gradient-to-r from-purple-500 to-pink-500"></div>
        <CardHeader className="py-3">
          <CardTitle className="text-base">{t('dashboard.last5Customers')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-border bg-muted/30">
                  <th className="text-left px-3 py-2 text-sm font-medium text-foreground">ID</th>
                  <th className="text-left px-3 py-2 text-sm font-medium text-foreground">Name</th>
                  <th className="text-left px-3 py-2 text-sm font-medium text-foreground">Mobile</th>
                  <th className="text-left px-3 py-2 text-sm font-medium text-foreground">Connection Type</th>
                  <th className="text-left px-3 py-2 text-sm font-medium text-foreground">Package Rate</th>
                  <th className="text-left px-3 py-2 text-sm font-medium text-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {lastCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center p-4 text-muted-foreground text-sm">
                      {t('dashboard.noCustomers')}
                    </td>
                  </tr>
                ) : (
                  lastCustomers.map((customer, idx) => (
                    <tr key={customer.id} className={cn(
                      "border-b border-gray-200 hover:bg-gray-50 transition-colors",
                      idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    )}>
                      <td className="px-3 py-2 text-sm font-normal text-gray-600">{customer.id}</td>
                      <td className="px-3 py-2 text-sm font-medium text-gray-900">{customer.name}</td>
                      <td className="px-3 py-2 text-sm font-normal text-gray-600">{customer.mobile}</td>
                      <td className="px-3 py-2 text-sm font-normal text-gray-600">{customer.connectionType}</td>
                      <td className="px-3 py-2 text-sm font-normal text-gray-600">{customer.package}</td>
                      <td className="px-3 py-2 text-sm">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            customer.status === 'Active'
                              ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800'
                              : 'bg-gradient-to-r from-red-100 to-pink-100 text-red-800'
                          }`}
                        >
                          {customer.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
