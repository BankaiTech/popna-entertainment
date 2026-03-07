// Admin Dashboard — business management: dynamic by inventory categories
import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '@/store/useStore';
import { useInventoryStore } from '@/store/useInventoryStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import Select from '@/components/ui/Select';
import { Link } from 'react-router-dom';
import {
  Users, AlertCircle, TrendingUp, IndianRupee,
  DollarSign, Clock, MessageSquare, Package, RefreshCw, ArrowRight,
  AlertTriangle, BarChart3, Tag, Percent, ShoppingBag,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from 'recharts';
import { customersApi } from '@/api/api';
import { salesInvoicesApi } from '@/api/invoices';
import { organizationsApi } from '@/api/organizations';
import type { Customer, SalesInvoice, Organization } from '@/models/types';
import { MOCK_ORGANIZATION_ID } from '@/models/types';
import { cn, formatCurrencyINR } from '@/lib/utils';
import Button from '@/components/ui/Button';

// Finance chart time filter type
type TimeFilter = 'this_month' | 'last_month' | 'last_6_months' | 'this_year';

const categoryColors = [
  { text: 'text-blue-600', bg: 'bg-blue-50', gradient: 'from-blue-500 to-blue-600' },
  { text: 'text-orange-600', bg: 'bg-orange-50', gradient: 'from-orange-500 to-orange-600' },
  { text: 'text-green-600', bg: 'bg-green-50', gradient: 'from-green-500 to-green-600' },
  { text: 'text-purple-600', bg: 'bg-purple-50', gradient: 'from-purple-500 to-purple-600' },
  { text: 'text-pink-600', bg: 'bg-pink-50', gradient: 'from-pink-500 to-pink-600' },
  { text: 'text-indigo-600', bg: 'bg-indigo-50', gradient: 'from-indigo-500 to-indigo-600' },
  { text: 'text-teal-600', bg: 'bg-teal-50', gradient: 'from-teal-500 to-teal-600' },
  { text: 'text-amber-600', bg: 'bg-amber-50', gradient: 'from-amber-500 to-amber-600' },
];

const AdminDashboard = () => {
  const { t } = useTranslation();
  const { dashboardStats, loading, fetchDashboardStats, initialize, fetchCustomers } = useStore();
  const {
    categories, products: inventoryProducts, initialize: initInventory,
  } = useInventoryStore();
  const [lastCustomers, setLastCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('this_month');
  const [organization, setOrganization] = useState<Organization | null>(null);

  useEffect(() => {
    const loadData = async () => {
      await initialize();
      await initInventory();
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
  }, [fetchDashboardStats, fetchCustomers, initialize, initInventory]);

  // ── Category stats (auto-tracking: dynamically computed from categories) ──
  const categoryStats = useMemo(() => {
    return categories.map((cat, idx) => {
      const catProducts = inventoryProducts.filter(p => p.categoryId === cat.id);
      const activeProducts = catProducts.filter(p => p.isActive);
      const totalStockValue = catProducts.reduce(
        (sum, p) => sum + (p.price * (p.currentStock ?? 0)), 0
      );
      const lowStockCount = catProducts.filter(
        p => p.currentStock != null && p.stockAlert != null && p.currentStock <= p.stockAlert
      ).length;
      const colorIndex = idx % categoryColors.length;
      return {
        category: cat,
        productCount: catProducts.length,
        activeCount: activeProducts.length,
        totalStockValue,
        lowStockCount,
        colors: categoryColors[colorIndex],
      };
    });
  }, [categories, inventoryProducts]);

  // ── Finance chart data ──
  const financeChartData = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const monthLabel = (m: number, y: number) => {
      const d = new Date(y, m, 1);
      return d.toLocaleString('en-IN', { month: 'short', year: '2-digit' });
    };

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
      return { name: monthLabel(month, year), collected, pending };
    });
  }, [invoices, timeFilter]);

  // ── Overview KPI computations ──
  const totalInventoryProducts = inventoryProducts.length;
  const lowStockTotal = inventoryProducts.filter(
    p => p.currentStock != null && p.stockAlert != null && p.currentStock <= p.stockAlert
  ).length;
  const totalRevenue = invoices
    .filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.totalAmount, 0);
  const totalPending = invoices
    .filter(inv => inv.status !== 'paid')
    .reduce((sum, inv) => sum + inv.totalAmount, 0);

  // ── Recent invoices ──
  const recentInvoices = useMemo(() => {
    return [...invoices]
      .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime())
      .slice(0, 5);
  }, [invoices]);

  // ── Finance KPI metrics ──
  const financeKpis = useMemo(() => {
    const totalInvoiced = invoices.reduce((s, inv) => s + inv.totalAmount, 0);
    const collected = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.totalAmount, 0);
    const pending = totalInvoiced - collected;
    const collectionRate = totalInvoiced > 0 ? Math.round((collected / totalInvoiced) * 100) : 0;
    const avgOrderValue = invoices.length > 0 ? Math.round(totalInvoiced / invoices.length) : 0;
    const totalGst = invoices.reduce((s, i) => s + (i.gstAmount ?? 0), 0);
    return { totalInvoiced, collected, pending, collectionRate, avgOrderValue, totalGst };
  }, [invoices]);

  // ── Category-wise revenue pie chart data ──
  const categoryPieData = useMemo(() => {
    return categoryStats.map(stat => ({
      name: stat.category.name,
      value: stat.totalStockValue,
    })).filter(d => d.value > 0);
  }, [categoryStats]);

  const PIE_COLORS = ['#3b82f6', '#f97316', '#22c55e', '#a855f7', '#ec4899', '#6366f1', '#14b8a6', '#f59e0b'];

  // ── Loading states ──
  if (!dashboardStats && loading) {
    return <div className="text-center py-12">{t('dashboard.loading')}</div>;
  }
  if (!dashboardStats && !loading) return null;
  if (!dashboardStats) return null;

  // ── Overview KPI cards ──
  const overviewCards = [
    {
      title: t('dashboard.totalContacts', 'Total Contacts'),
      value: dashboardStats.totalCustomers,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      isCurrency: false,
    },
    {
      title: t('dashboard.totalInventoryProducts', 'Total Products'),
      value: totalInventoryProducts,
      icon: Package,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      isCurrency: false,
    },
    {
      title: t('dashboard.lowStockAlerts', 'Low Stock Alerts'),
      value: lowStockTotal,
      icon: AlertTriangle,
      color: lowStockTotal > 0 ? 'text-red-600' : 'text-green-600',
      bgColor: lowStockTotal > 0 ? 'bg-red-50' : 'bg-green-50',
      isCurrency: false,
    },
    {
      title: t('dashboard.totalRevenue', 'Total Revenue'),
      value: totalRevenue,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      isCurrency: true,
    },
    {
      title: t('dashboard.totalPending', 'Total Pending'),
      value: totalPending,
      icon: Clock,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      isCurrency: true,
    },
  ];

  // ── Complaint cards ──
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

  // ── Render KPI card section ──
  const renderCardSection = (
    title: string,
    cards: { title: string; value: number; icon: React.ElementType; color: string; bgColor: string; isCurrency: boolean }[],
    cols: 'auto' | 2 = 'auto',
  ) => (
    <>
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      <div className={cn(
        'grid gap-2 sm:gap-3',
        cols === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
      )}>
        {cards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="overflow-hidden group hover:-translate-y-0.5 transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2 px-3">
                <CardTitle className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider line-clamp-2">
                  {stat.title}
                </CardTitle>
                <div className={`p-1.5 rounded-lg ${stat.bgColor} group-hover:scale-110 transition-transform duration-300 shrink-0`}>
                  <Icon className={`w-3.5 h-3.5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent className="pb-2 px-3">
                <div className="text-sm sm:text-base font-bold text-foreground">
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
    <div className="space-y-4 sm:space-y-5 animate-fade-in pb-4 sm:pb-6">
      {/* ── Subscription Renewal Alert ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {organization && (() => {
          const endDate = new Date(organization.subscriptionEnd);
          const todayDate = new Date();
          todayDate.setHours(0, 0, 0, 0);
          endDate.setHours(0, 0, 0, 0);
          const daysUntilEnd = Math.ceil((endDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
          if (daysUntilEnd > 7) return null;
          return (
            <Card className="overflow-hidden border-primary/20 bg-primary/5 w-full sm:max-w-md">
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

      {/* ── Overview KPI Cards ── */}
      {renderCardSection(t('dashboard.overview', 'Overview'), overviewCards)}

      {/* ── Category-wise Inventory ── */}
      {categoryStats.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t('dashboard.inventoryByCategory', 'Inventory by Category')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {categoryStats.map((stat) => (
              <Card key={stat.category.id} className="overflow-hidden group hover:-translate-y-0.5 transition-all duration-300">
                <div className={`h-1 bg-gradient-to-r ${stat.colors.gradient}`}></div>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2.5 px-3 sm:px-4">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`p-1.5 rounded-lg ${stat.colors.bg} shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                      <Tag className={`w-3.5 h-3.5 ${stat.colors.text}`} />
                    </div>
                    <CardTitle className="text-xs sm:text-sm font-semibold truncate">
                      {stat.category.name}
                    </CardTitle>
                  </div>
                  {stat.category.code && (
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${stat.colors.bg} ${stat.colors.text} shrink-0`}>
                      {stat.category.code}
                    </span>
                  )}
                </CardHeader>
                <CardContent className="pb-3 px-3 sm:px-4">
                  <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-1">
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        {t('dashboard.products', 'Products')}
                      </p>
                      <p className="text-base sm:text-lg font-bold text-foreground">
                        <AnimatedCounter value={stat.productCount} duration={1200} />
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        {t('dashboard.stockValue', 'Stock Value')}
                      </p>
                      <p className="text-xs sm:text-sm font-bold text-foreground truncate">
                        {formatCurrencyINR(stat.totalStockValue)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        {t('dashboard.lowStock', 'Low Stock')}
                      </p>
                      <p className={cn(
                        'text-base sm:text-lg font-bold',
                        stat.lowStockCount > 0 ? 'text-red-600' : 'text-green-600'
                      )}>
                        <AnimatedCounter value={stat.lowStockCount} duration={1200} />
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── Sales & Revenue ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 items-start">
        {/* Revenue by Category */}
        <Card className="overflow-hidden animate-slide-up">
          <div className="h-1 bg-gradient-to-r from-green-500 to-emerald-500"></div>
          <CardHeader className="py-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm sm:text-base">{t('dashboard.revenueByCategory', 'Revenue by Category')}</CardTitle>
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="py-2">
            <div className="space-y-2">
              {categoryStats.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t('dashboard.noCategories', 'No categories found')}
                </p>
              ) : (
                categoryStats.map((stat) => {
                  const maxValue = Math.max(...categoryStats.map(s => s.totalStockValue), 1);
                  const percentage = (stat.totalStockValue / maxValue) * 100;
                  return (
                    <div key={stat.category.id} className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-xs sm:text-sm font-medium">{stat.category.name}</span>
                        <span className={`text-xs sm:text-sm font-bold ${stat.colors.text}`}>
                          {formatCurrencyINR(stat.totalStockValue)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full bg-gradient-to-r ${stat.colors.gradient} transition-all duration-700`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Sales */}
        <Card className="overflow-hidden animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
          <CardHeader className="py-3 flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-sm sm:text-base">{t('dashboard.recentSales', 'Recent Sales')}</CardTitle>
            <Link to="/admin/invoices">
              <Button variant="outline" size="sm" className="text-xs shrink-0">
                {t('dashboard.viewAll', 'View all')}
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-border bg-muted/30">
                    <th className="text-left px-3 py-2 text-xs sm:text-sm font-medium text-foreground">{t('invoices.number', 'Invoice')}</th>
                    <th className="text-left px-3 py-2 text-xs sm:text-sm font-medium text-foreground">{t('invoices.customer', 'Customer')}</th>
                    <th className="text-right px-3 py-2 text-xs sm:text-sm font-medium text-foreground">{t('invoices.amount', 'Amount')}</th>
                    <th className="text-left px-3 py-2 text-xs sm:text-sm font-medium text-foreground">{t('invoices.status', 'Status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {recentInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center p-4 text-muted-foreground text-sm">
                        {t('dashboard.noInvoices', 'No invoices found')}
                      </td>
                    </tr>
                  ) : (
                    recentInvoices.map((inv, idx) => (
                      <tr key={inv.id} className={cn(
                        "border-b border-gray-200 hover:bg-gray-50 transition-colors",
                        idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      )}>
                        <td className="px-3 py-2 text-xs sm:text-sm font-medium text-foreground">{inv.invoiceNumber}</td>
                        <td className="px-3 py-2 text-xs sm:text-sm text-gray-600">{inv.customerName}</td>
                        <td className="px-3 py-2 text-xs sm:text-sm text-right font-medium">{formatCurrencyINR(inv.totalAmount)}</td>
                        <td className="px-3 py-2 text-xs sm:text-sm">
                          <span className={cn(
                            'px-2 py-1 rounded-full text-xs font-semibold',
                            inv.status === 'paid'
                              ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800'
                              : inv.status === 'sent'
                              ? 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800'
                              : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700'
                          )}>
                            {inv.status === 'paid' ? t('common.paid', 'Paid') : inv.status === 'sent' ? t('common.sent', 'Sent') : t('common.draft', 'Draft')}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {/* Mobile Card View */}
            <div className="md:hidden space-y-2 p-3">
              {recentInvoices.length === 0 ? (
                <p className="text-center p-4 text-muted-foreground text-sm">
                  {t('dashboard.noInvoices', 'No invoices found')}
                </p>
              ) : (
                recentInvoices.map((inv) => (
                  <div key={inv.id} className="bg-card border border-border rounded-lg p-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-foreground">{inv.invoiceNumber}</span>
                      <span className={cn(
                        'px-2 py-0.5 rounded-full text-[10px] font-semibold',
                        inv.status === 'paid'
                          ? 'bg-green-100 text-green-800'
                          : inv.status === 'sent'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-700'
                      )}>
                        {inv.status === 'paid' ? t('common.paid', 'Paid') : inv.status === 'sent' ? t('common.sent', 'Sent') : t('common.draft', 'Draft')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{inv.customerName}</span>
                      <span className="text-sm font-bold text-foreground">{formatCurrencyINR(inv.totalAmount)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Complaint Metrics ── */}
      {renderCardSection(t('dashboard.complaintMetrics', 'Complaint Metrics'), complaintCards)}

      {/* ── Financial Overview — Combined Dashboard ── */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t('dashboard.financialOverview', 'Financial Overview')}
        </h2>

        {/* Mini KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
          {[
            { label: t('dashboard.totalInvoiced', 'Total Invoiced'), value: financeKpis.totalInvoiced, icon: IndianRupee, color: 'text-blue-600', bg: 'bg-blue-50', isCurrency: true },
            { label: t('dashboard.collected', 'Collected'), value: financeKpis.collected, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50', isCurrency: true },
            { label: t('dashboard.pending', 'Pending'), value: financeKpis.pending, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', isCurrency: true },
            { label: t('dashboard.collectionRate', 'Collection Rate'), value: financeKpis.collectionRate, icon: Percent, color: 'text-emerald-600', bg: 'bg-emerald-50', isCurrency: false, suffix: '%' },
            { label: t('dashboard.avgOrderValue', 'Avg. Order Value'), value: financeKpis.avgOrderValue, icon: ShoppingBag, color: 'text-purple-600', bg: 'bg-purple-50', isCurrency: true },
            { label: t('dashboard.totalGst', 'GST Collected'), value: financeKpis.totalGst, icon: DollarSign, color: 'text-indigo-600', bg: 'bg-indigo-50', isCurrency: true },
          ].map((kpi, i) => {
            const Icon = kpi.icon;
            return (
              <Card key={i} className="overflow-hidden group hover:-translate-y-0.5 transition-all duration-300">
                <CardContent className="p-2.5 sm:p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className={`p-1 rounded-md ${kpi.bg} group-hover:scale-110 transition-transform duration-300 shrink-0`}>
                      <Icon className={`w-3 h-3 ${kpi.color}`} />
                    </div>
                    <p className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
                      {kpi.label}
                    </p>
                  </div>
                  <p className="text-sm sm:text-base font-bold text-foreground">
                    {kpi.isCurrency ? formatCurrencyINR(kpi.value) : (
                      <><AnimatedCounter value={kpi.value} duration={1200} />{kpi.suffix && <span className="text-xs ml-0.5">{kpi.suffix}</span>}</>
                    )}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Charts: Revenue Trend + Category Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 sm:gap-4 items-start">
          {/* Revenue Trend — Area Chart */}
          <Card className="overflow-hidden animate-slide-up lg:col-span-3">
            <div className="h-1 bg-gradient-to-r from-green-500 to-emerald-500"></div>
            <CardHeader className="py-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm sm:text-base">{t('dashboard.revenueTrend', 'Revenue Trend')}</CardTitle>
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
              <div className="w-full h-[220px] sm:h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={financeChartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="gradCollected" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="gradPending" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" fontSize={11} tickLine={false} />
                    <YAxis
                      fontSize={11}
                      tickLine={false}
                      tickFormatter={(value) => formatCurrencyINR(value)}
                    />
                    <Tooltip
                      formatter={(value) => formatCurrencyINR(Number(value ?? 0))}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '13px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Area
                      type="monotone"
                      dataKey="collected"
                      name={t('dashboard.collected', 'Collected')}
                      stroke="#22c55e"
                      strokeWidth={2}
                      fill="url(#gradCollected)"
                    />
                    <Area
                      type="monotone"
                      dataKey="pending"
                      name={t('dashboard.pending', 'Pending')}
                      stroke="#ef4444"
                      strokeWidth={2}
                      fill="url(#gradPending)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Category Distribution — Donut Chart */}
          <Card className="overflow-hidden animate-slide-up lg:col-span-2" style={{ animationDelay: '0.1s' }}>
            <div className="h-1 bg-gradient-to-r from-purple-500 to-pink-500"></div>
            <CardHeader className="py-3">
              <CardTitle className="text-sm sm:text-base">{t('dashboard.categoryDistribution', 'Category Distribution')}</CardTitle>
            </CardHeader>
            <CardContent className="py-2">
              {categoryPieData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {t('dashboard.noCategories', 'No categories found')}
                </p>
              ) : (
                <>
                  <div className="w-full h-[180px] sm:h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius="50%"
                          outerRadius="80%"
                          paddingAngle={3}
                          dataKey="value"
                          stroke="none"
                        >
                          {categoryPieData.map((_entry, index) => (
                            <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value) => formatCurrencyINR(Number(value ?? 0))}
                          contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Legend */}
                  <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-2 justify-center">
                    {categoryPieData.map((entry, index) => (
                      <div key={entry.name} className="flex items-center gap-1.5">
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                        />
                        <span className="text-[10px] sm:text-xs text-muted-foreground">{entry.name}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Recent Contacts ── */}
      <Card className="overflow-hidden animate-slide-up" style={{ animationDelay: '0.2s' }}>
        <div className="h-1 bg-gradient-to-r from-purple-500 to-pink-500"></div>
        <CardHeader className="py-3 flex flex-row items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-sm sm:text-base">{t('dashboard.recentContacts', 'Recent Contacts')}</CardTitle>
          <Link to="/admin/contacts">
            <Button variant="outline" size="sm" className="text-xs shrink-0">
              {t('dashboard.viewAllContacts', 'View all')}
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-border bg-muted/30">
                  <th className="text-left px-3 py-2 text-xs sm:text-sm font-medium text-foreground">{t('customers.id', 'ID')}</th>
                  <th className="text-left px-3 py-2 text-xs sm:text-sm font-medium text-foreground">{t('customers.name', 'Name')}</th>
                  <th className="text-left px-3 py-2 text-xs sm:text-sm font-medium text-foreground">{t('customers.mobile', 'Mobile')}</th>
                  <th className="text-left px-3 py-2 text-xs sm:text-sm font-medium text-foreground">{t('customers.connectionType', 'Type')}</th>
                  <th className="text-left px-3 py-2 text-xs sm:text-sm font-medium text-foreground">{t('customers.status', 'Status')}</th>
                </tr>
              </thead>
              <tbody>
                {lastCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center p-4 text-muted-foreground text-sm">
                      {t('dashboard.noCustomers')}
                    </td>
                  </tr>
                ) : (
                  lastCustomers.map((customer, idx) => (
                    <tr key={customer.id} className={cn(
                      "border-b border-gray-200 hover:bg-gray-50 transition-colors",
                      idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    )}>
                      <td className="px-3 py-2 text-xs sm:text-sm font-normal text-gray-600">{customer.id}</td>
                      <td className="px-3 py-2 text-xs sm:text-sm font-medium text-gray-900">{customer.name}</td>
                      <td className="px-3 py-2 text-xs sm:text-sm font-normal text-gray-600">{customer.mobile}</td>
                      <td className="px-3 py-2 text-xs sm:text-sm font-normal text-gray-600">{customer.connectionType}</td>
                      <td className="px-3 py-2 text-xs sm:text-sm">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${customer.status === 'Active'
                            ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800'
                            : 'bg-gradient-to-r from-red-100 to-pink-100 text-red-800'
                          }`}
                        >
                          {customer.status === 'Active' ? t('common.active', 'Active') : t('common.inactive', 'Inactive')}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-2 p-3">
            {lastCustomers.length === 0 ? (
              <div className="text-center p-4 text-muted-foreground text-sm">
                {t('dashboard.noCustomers')}
              </div>
            ) : (
              lastCustomers.map((customer) => (
                <div key={customer.id} className="bg-card border border-border rounded-lg p-3 space-y-1.5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{customer.name}</p>
                      <p className="text-xs text-muted-foreground">{customer.mobile}</p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${customer.status === 'Active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {customer.status === 'Active' ? t('common.active', 'Active') : t('common.inactive', 'Inactive')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{customer.connectionType}</span>
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
