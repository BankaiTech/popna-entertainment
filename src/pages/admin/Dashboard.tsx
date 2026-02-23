// SaaS Dashboard KPI cards implemented
// Finance graph implemented
// Financial system enhancement completed
import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '@/store/useStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import Select from '@/components/ui/Select';
import { Link } from 'react-router-dom';
import {
  Users, Wifi, TrendingUp, UserCheck, UserX, AlertCircle,
  DollarSign, Clock, AlertTriangle, MessageSquare, Zap, Package, Layers, RefreshCw
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { customersApi } from '@/api/api';
import { salesInvoicesApi } from '@/api/invoices';
import { organizationsApi } from '@/api/organizations';
import type { Customer, SalesInvoice, Organization } from '@/models/types';
import { MOCK_ORGANIZATION_ID } from '@/models/types';
import { getConnectionTypeLabel } from '@/lib/providerUtils';
import { cn, formatCurrencyINR } from '@/lib/utils';
import Button from '@/components/ui/Button';

// Finance chart time filter type
type TimeFilter = 'this_month' | 'last_month' | 'last_6_months' | 'this_year';

const AdminDashboard = () => {
  const { t } = useTranslation();
  const { dashboardStats, loading, fetchDashboardStats, initialize, fetchCustomers, fetchProducts, customers, products } = useStore();
  const [lastCustomers, setLastCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('this_month');
  const [organization, setOrganization] = useState<Organization | null>(null);

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
      const allInvoices = await salesInvoicesApi.getAll();
      setInvoices(allInvoices);
      const org = await organizationsApi.getById(MOCK_ORGANIZATION_ID);
      setOrganization(org ?? null);
    };
    loadData();
  }, [fetchDashboardStats, fetchProducts, fetchCustomers, initialize]);

  // Finance chart data — computed from invoices based on time filter
  const financeChartData = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // Helper to get month label
    const monthLabel = (m: number, y: number) => {
      const d = new Date(y, m, 1);
      return d.toLocaleString('en-IN', { month: 'short', year: '2-digit' });
    };

    // Determine time range
    let months: { month: number; year: number }[] = [];
    switch (timeFilter) {
      case 'this_month':
        months = [{ month: currentMonth, year: currentYear }];
        break;
      case 'last_month': {
        const lm = currentMonth === 0 ? 11 : currentMonth - 1;
        const ly = currentMonth === 0 ? currentYear - 1 : currentYear;
        months = [{ month: lm, year: ly }];
        break;
      }
      case 'last_6_months':
        for (let i = 5; i >= 0; i--) {
          const d = new Date(currentYear, currentMonth - i, 1);
          months.push({ month: d.getMonth(), year: d.getFullYear() });
        }
        break;
      case 'this_year':
        for (let m = 0; m <= currentMonth; m++) {
          months.push({ month: m, year: currentYear });
        }
        break;
    }

    return months.map(({ month, year }) => {
      const monthInvoices = invoices.filter((inv) => {
        const d = new Date(inv.issueDate);
        return d.getMonth() === month && d.getFullYear() === year;
      });
      const collected = monthInvoices
        .filter((inv) => inv.status === 'paid')
        .reduce((sum, inv) => sum + inv.totalAmount, 0);
      const pending = monthInvoices
        .filter((inv) => inv.status !== 'paid')
        .reduce((sum, inv) => sum + inv.totalAmount, 0);
      return {
        name: monthLabel(month, year),
        collected,
        pending,
      };
    });
  }, [invoices, timeFilter]);

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
      isCurrency: false,
    };
  }) : [];

  // Customer KPI cards
  const customerCards = [
    {
      title: t('dashboard.totalCustomers'),
      value: dashboardStats.totalCustomers,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      isCurrency: false,
    },
    ...productStatCards,
    {
      title: t('dashboard.newThisMonth'),
      value: dashboardStats.newCustomersThisMonth,
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      isCurrency: false,
    },
    {
      title: t('dashboard.activeCustomers'),
      value: dashboardStats.activeCustomers,
      icon: UserCheck,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      isCurrency: false,
    },
    {
      title: t('dashboard.inactiveCustomers'),
      value: dashboardStats.inactiveCustomers,
      icon: UserX,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      isCurrency: false,
    },
  ];

  // Payment KPI cards
  const paymentCards = [
    {
      title: t('dashboard.totalCollected', 'Total Collected'),
      value: dashboardStats.totalAmountCollected,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      isCurrency: true,
    },
    {
      title: t('dashboard.totalPending', 'Total Pending'),
      value: dashboardStats.totalPendingAmount,
      icon: Clock,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      isCurrency: true,
    },
    {
      title: t('dashboard.overdueAmount', 'Overdue Amount'),
      value: dashboardStats.overdueAmount,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      isCurrency: true,
    },
  ];

  // Complaint KPI cards
  const complaintCards = [
    {
      title: t('dashboard.totalComplaints', 'Total Complaints'),
      value: dashboardStats.totalComplaints,
      icon: MessageSquare,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      isCurrency: false,
    },
    {
      title: t('dashboard.activeComplaints'),
      value: dashboardStats.activeComplaints,
      icon: AlertCircle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      isCurrency: false,
    },
    {
      title: t('dashboard.onHoldComplaints', 'On Hold'),
      value: dashboardStats.onHoldComplaints,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      isCurrency: false,
    },
  ];

  // Connection KPI cards
  const connectionCards = [
    {
      title: t('dashboard.newConnections', 'New Requests'),
      value: dashboardStats.newConnectionRequests,
      icon: Zap,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50',
      isCurrency: false,
    },
    {
      title: t('dashboard.convertedConnections', 'Converted'),
      value: dashboardStats.convertedConnections,
      icon: UserCheck,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      isCurrency: false,
    },
  ];

  // Plan & Product KPI cards
  const planProductCards = [
    {
      title: t('dashboard.totalActivePlans', 'Active Plans'),
      value: dashboardStats.totalActivePlans,
      icon: Layers,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      isCurrency: false,
    },
    {
      title: t('dashboard.totalProducts', 'Total Products'),
      value: dashboardStats.totalProducts,
      icon: Package,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
      isCurrency: false,
    },
  ];

  // Renders a section of KPI cards. cardCols: 2 for side-by-side sections (Connection / Plans), 4 for full-width.
  const renderCardSection = (title: string, cards: typeof customerCards, cardCols: 2 | 4 = 4) => (
    <>
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      <div className={cn(
        'grid gap-4',
        cardCols === 2 ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
      )}>
        {cards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="overflow-hidden group hover:-translate-y-1 transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4">
                <CardTitle className="text-[10px] font-semibold uppercase tracking-wider">
                  {stat.title}
                </CardTitle>
                <div className={`p-2.5 rounded-lg ${stat.bgColor} group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent className="pb-4 px-4">
                <div className="text-xl font-bold text-foreground mb-1">
                  {stat.isCurrency ? (
                    formatCurrencyINR(stat.value)
                  ) : (
                    <AnimatedCounter value={stat.value} duration={1500} />
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );

  return (
    <div className="space-y-3 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold mb-1 gradient-text">{t('dashboard.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('dashboard.subtitle')}</p>
        </div>
        {/* Subscription renewal — show only when due within 7 days or expired */}
        {organization && (() => {
          const endDate = new Date(organization.subscriptionEnd);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          endDate.setHours(0, 0, 0, 0);
          const daysUntilEnd = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          const showRenewCard = daysUntilEnd <= 7;
          if (!showRenewCard) return null;
          return (
            <Card className="overflow-hidden border-primary/20 bg-primary/5 sm:w-auto w-full">
              <CardContent className="py-3 px-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <RefreshCw className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {t('dashboard.subscription', 'Subscription')}
                    </p>
                    <p className="text-sm font-medium text-foreground">
                      {daysUntilEnd <= 0
                        ? t('dashboard.subscriptionExpired', 'Expired')
                        : t('dashboard.validUntil', 'Valid until') + ' ' + organization.subscriptionEnd}
                    </p>
                  </div>
                </div>
                <Link to="/admin/settings?tab=billing">
                  <Button size="sm" className="whitespace-nowrap">
                    {t('dashboard.renewSubscription', 'Renew subscription')}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          );
        })()}
      </div>

      {/* Customer Metrics */}
      {renderCardSection(t('dashboard.customerMetrics', 'Customer Metrics'), customerCards)}

      {/* Payment Metrics */}
      {renderCardSection(t('dashboard.paymentMetrics', 'Payment Metrics'), paymentCards)}

      {/* Complaint Metrics */}
      {renderCardSection(t('dashboard.complaintMetrics', 'Complaint Metrics'), complaintCards)}

      {/* Connection Metrics & Plans & Products — same row, top-aligned */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <div className="space-y-3 min-w-0">
          {renderCardSection(t('dashboard.connectionMetrics', 'Connection Metrics'), connectionCards, 2)}
        </div>
        <div className="space-y-3 min-w-0">
          {renderCardSection(t('dashboard.planProductMetrics', 'Plans & Products'), planProductCards, 2)}
        </div>
      </div>

      {/* Finance Graph */}
      <Card className="overflow-hidden animate-slide-up">
        <div className="h-1 bg-gradient-to-r from-green-500 to-red-500"></div>
        <CardHeader className="py-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base">{t('dashboard.financeGraph', 'Finance Overview')}</CardTitle>
          <Select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value as TimeFilter)}
            className="h-8 text-xs w-auto"
          >
            <option value="this_month">{t('dashboard.thisMonth', 'This Month')}</option>
            <option value="last_month">{t('dashboard.lastMonth', 'Last Month')}</option>
            <option value="last_6_months">{t('dashboard.last6Months', 'Last 6 Months')}</option>
            <option value="this_year">{t('dashboard.thisYear', 'This Year')}</option>
          </Select>
        </CardHeader>
        <CardContent className="py-2">
          <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={financeChartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" fontSize={12} tickLine={false} />
                <YAxis
                  fontSize={12}
                  tickLine={false}
                  tickFormatter={(value) => formatCurrencyINR(value)}
                />
                <Tooltip
                  formatter={(value) => formatCurrencyINR(Number(value ?? 0))}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '13px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar
                  dataKey="collected"
                  name={t('dashboard.collected', 'Collected')}
                  fill="#22c55e"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="pending"
                  name={t('dashboard.pending', 'Pending')}
                  fill="#ef4444"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

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
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-border bg-muted/30">
                  <th className="text-left px-3 py-2 text-sm font-medium text-foreground">{t('customers.id', 'ID')}</th>
                  <th className="text-left px-3 py-2 text-sm font-medium text-foreground">{t('customers.name', 'Name')}</th>
                  <th className="text-left px-3 py-2 text-sm font-medium text-foreground">{t('customers.mobile', 'Mobile')}</th>
                  <th className="text-left px-3 py-2 text-sm font-medium text-foreground">{t('customers.connectionType', 'Connection Type')}</th>
                  <th className="text-left px-3 py-2 text-sm font-medium text-foreground">{t('customers.package', 'Package Rate')}</th>
                  <th className="text-left px-3 py-2 text-sm font-medium text-foreground">{t('customers.status', 'Status')}</th>
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
                      <td className="px-3 py-2 text-sm font-normal text-gray-600">{getConnectionTypeLabel(customer.connectionType, products)}</td>
                      <td className="px-3 py-2 text-sm font-normal text-gray-600">{customer.package}</td>
                      <td className="px-3 py-2 text-sm">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${customer.status === 'Active'
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

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3 p-3">
            {lastCustomers.length === 0 ? (
              <div className="text-center p-4 text-muted-foreground text-sm">
                {t('dashboard.noCustomers')}
              </div>
            ) : (
              lastCustomers.map((customer) => (
                <div key={customer.id} className="bg-card border border-border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{customer.name}</p>
                      <p className="text-xs text-muted-foreground">{customer.mobile}</p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${customer.status === 'Active'
                        ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800'
                        : 'bg-gradient-to-r from-red-100 to-pink-100 text-red-800'
                        }`}
                    >
                      {customer.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">{t('customers.connectionType', 'Connection Type')}</p>
                      <p className="font-medium">{getConnectionTypeLabel(customer.connectionType, products)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t('customers.package', 'Package Rate')}</p>
                      <p className="font-medium">{customer.package}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
