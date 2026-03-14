// Admin Dashboard - business management: widget-driven from industry template
import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '@/store/useStore';
import { useInventoryStore } from '@/store/useInventoryStore';
import { useOrganizationStore } from '@/store/useOrganizationStore';
import { useAppointmentsStore } from '@/store/useAppointmentsStore';
import { getTemplateById } from '@/config/industryTemplates';
import type { DashboardWidgetKey } from '@/config/industryTemplates';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import Select from '@/components/ui/Select';
import { Link } from 'react-router-dom';
import {
  Users, AlertCircle, TrendingUp, IndianRupee,
  DollarSign, Clock, MessageSquare, Package, RefreshCw, ArrowRight,
  AlertTriangle, Tag, Percent, ShoppingBag, CalendarClock, FileText, UserPlus, ShoppingCart, Calendar,
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
  { text: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/30', gradient: 'from-blue-500 to-blue-600' },
  { text: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/30', gradient: 'from-orange-500 to-orange-600' },
  { text: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/30', gradient: 'from-green-500 to-green-600' },
  { text: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/30', gradient: 'from-purple-500 to-purple-600' },
  { text: 'text-pink-600 dark:text-pink-400', bg: 'bg-pink-50 dark:bg-pink-900/30', gradient: 'from-pink-500 to-pink-600' },
  { text: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/30', gradient: 'from-indigo-500 to-indigo-600' },
  { text: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-50 dark:bg-teal-900/30', gradient: 'from-teal-500 to-teal-600' },
  { text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/30', gradient: 'from-amber-500 to-amber-600' },
];

const AdminDashboard = () => {
  const { t } = useTranslation();
  const { dashboardStats, loading, fetchDashboardStats, initialize, fetchCustomers } = useStore();
  const {
    categories, products: inventoryProducts, initialize: initInventory,
  } = useInventoryStore();
  const { currentOrganization, isModuleAllowed } = useOrganizationStore();
  const { appointments, fetchAppointments } = useAppointmentsStore();
  const [lastCustomers, setLastCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('this_month');
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [todayAppointmentsCount, setTodayAppointmentsCount] = useState(0);
  const [expiringSoonCount, setExpiringSoonCount] = useState(0);
  const [todaySalesAmount, setTodaySalesAmount] = useState(0);

  const template = useMemo(
    () => (currentOrganization?.industryType ? getTemplateById(currentOrganization.industryType) : undefined),
    [currentOrganization?.industryType]
  );
  const dashboardWidgets = template?.dashboardWidgets ?? [];

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
      await fetchAppointments();
    };
    loadData();
  }, [fetchDashboardStats, fetchCustomers, initialize, initInventory, fetchAppointments]);

  // Industry KPIs: today's appointments, expiring soon, today's sales
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayStart = new Date(today).getTime();
    const todayEnd = todayStart + 24 * 60 * 60 * 1000;
    const count = appointments.filter((a) => {
      const d = new Date(a.scheduledAt).getTime();
      return d >= todayStart && d < todayEnd;
    }).length;
    setTodayAppointmentsCount(count);
  }, [appointments]);

  useEffect(() => {
    const in30Days = new Date();
    in30Days.setDate(in30Days.getDate() + 30);
    const count = inventoryProducts.filter((p) => {
      if (!p.expiryDate) return false;
      const exp = new Date(p.expiryDate).getTime();
      return exp <= in30Days.getTime() && exp >= Date.now();
    }).length;
    setExpiringSoonCount(count);
  }, [inventoryProducts]);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const amount = invoices
      .filter((inv) => inv.issueDate === today && (inv.status === 'paid' || inv.status === 'sent'))
      .reduce((sum, inv) => sum + (inv.totalAmount ?? inv.amount + (inv.gstAmount ?? 0)), 0);
    setTodaySalesAmount(amount);
  }, [invoices]);

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

  // ── Payment aging ──
  const paymentAging = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekFromNow = new Date(today.getTime() + 7 * 86400000);
    const monthFromNow = new Date(today.getTime() + 30 * 86400000);
    const unpaid = invoices.filter(i => i.status !== 'paid');

    const overdue = unpaid.filter(i => new Date(i.dueDate) < today);
    const dueThisWeek = unpaid.filter(i => {
      const d = new Date(i.dueDate);
      return d >= today && d <= weekFromNow;
    });
    const dueThisMonth = unpaid.filter(i => {
      const d = new Date(i.dueDate);
      return d >= today && d <= monthFromNow;
    });

    return {
      overdue: { count: overdue.length, total: overdue.reduce((s, i) => s + i.totalAmount, 0) },
      dueThisWeek: { count: dueThisWeek.length, total: dueThisWeek.reduce((s, i) => s + i.totalAmount, 0) },
      dueThisMonth: { count: dueThisMonth.length, total: dueThisMonth.reduce((s, i) => s + i.totalAmount, 0) },
    };
  }, [invoices]);

  // ── Top products by revenue ──
  const topProducts = useMemo(() => {
    const grouped: Record<string, { name: string; revenue: number; count: number }> = {};
    invoices.forEach(inv => {
      const key = inv.planName || inv.serviceProvider;
      if (!grouped[key]) grouped[key] = { name: key, revenue: 0, count: 0 };
      grouped[key].revenue += inv.totalAmount;
      grouped[key].count += 1;
    });
    return Object.values(grouped).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [invoices]);

  // ── Invoice status breakdown for pie chart ──
  const invoiceStatusData = useMemo(() => {
    const counts: Record<string, number> = { paid: 0, sent: 0, draft: 0, overdue: 0 };
    invoices.forEach(inv => { counts[inv.status] = (counts[inv.status] || 0) + 1; });
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([status, value]) => ({ name: status, value }));
  }, [invoices]);

  const STATUS_COLORS: Record<string, string> = { paid: '#22c55e', sent: '#3b82f6', draft: '#9ca3af', overdue: '#ef4444' };

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
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/30',
      isCurrency: false,
    },
    {
      title: t('dashboard.totalInventoryProducts', 'Total Products'),
      value: totalInventoryProducts,
      icon: Package,
      color: 'text-indigo-600 dark:text-indigo-400',
      bgColor: 'bg-indigo-50 dark:bg-indigo-900/30',
      isCurrency: false,
    },
    {
      title: t('dashboard.lowStockAlerts', 'Low Stock Alerts'),
      value: lowStockTotal,
      icon: AlertTriangle,
      color: lowStockTotal > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400',
      bgColor: lowStockTotal > 0 ? 'bg-red-50 dark:bg-red-900/30' : 'bg-green-50 dark:bg-green-900/30',
      isCurrency: false,
    },
    {
      title: t('dashboard.totalRevenue', 'Total Revenue'),
      value: totalRevenue,
      icon: DollarSign,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/30',
      isCurrency: true,
    },
    {
      title: t('dashboard.totalPending', 'Total Pending'),
      value: totalPending,
      icon: Clock,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-50 dark:bg-amber-900/30',
      isCurrency: true,
    },
  ];

  // Widget key -> card config for industry-driven dashboard
  const widgetCardMap: Record<DashboardWidgetKey, { title: string; value: number; icon: React.ElementType; color: string; bgColor: string; isCurrency: boolean }> = {
    revenue: {
      title: t('dashboard.totalRevenue', 'Total Revenue'),
      value: totalRevenue,
      icon: DollarSign,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/30',
      isCurrency: true,
    },
    contacts: {
      title: t('dashboard.totalContacts', 'Total Contacts'),
      value: dashboardStats.totalCustomers,
      icon: Users,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/30',
      isCurrency: false,
    },
    lowStock: {
      title: t('dashboard.lowStockAlerts', 'Low Stock Alerts'),
      value: lowStockTotal,
      icon: AlertTriangle,
      color: lowStockTotal > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400',
      bgColor: lowStockTotal > 0 ? 'bg-red-50 dark:bg-red-900/30' : 'bg-green-50 dark:bg-green-900/30',
      isCurrency: false,
    },
    complaints: {
      title: t('dashboard.activeComplaints'),
      value: dashboardStats.activeComplaints,
      icon: MessageSquare,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-900/30',
      isCurrency: false,
    },
    appointments: {
      title: t('dashboard.todaysAppointments', "Today's Appointments"),
      value: todayAppointmentsCount,
      icon: Calendar,
      color: 'text-pink-600 dark:text-pink-400',
      bgColor: 'bg-pink-50 dark:bg-pink-900/30',
      isCurrency: false,
    },
    expiringSoon: {
      title: t('dashboard.expiringSoon', 'Expiring Soon'),
      value: expiringSoonCount,
      icon: Clock,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-50 dark:bg-amber-900/30',
      isCurrency: false,
    },
    pendingInvoices: {
      title: t('dashboard.totalPending', 'Total Pending'),
      value: totalPending,
      icon: Clock,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-50 dark:bg-amber-900/30',
      isCurrency: true,
    },
    todaySales: {
      title: t('dashboard.todaySales', "Today's Sales"),
      value: todaySalesAmount,
      icon: TrendingUp,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-900/30',
      isCurrency: true,
    },
  };

  const overviewCardsToShow =
    dashboardWidgets.length === 0
      ? overviewCards
      : dashboardWidgets
          .filter((w): w is DashboardWidgetKey => w in widgetCardMap)
          .map((w) => widgetCardMap[w]);

  // ── Complaint cards ──
  const complaintCards = [
    {
      title: t('dashboard.totalComplaints', 'Total Complaints'),
      value: dashboardStats.totalComplaints,
      icon: MessageSquare,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-900/30',
      isCurrency: false,
    },
    {
      title: t('dashboard.activeComplaints'),
      value: dashboardStats.activeComplaints,
      icon: AlertCircle,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-900/30',
      isCurrency: false,
    },
    {
      title: t('dashboard.onHoldComplaints', 'On Hold'),
      value: dashboardStats.onHoldComplaints,
      icon: Clock,
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/30',
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
                <div className="text-sm sm:text-base font-bold text-gray-900 dark:text-gray-100">
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
      {/* ── Quick actions ── */}
      <div className="flex flex-wrap gap-2">
        {isModuleAllowed('invoices') && (
          <Link to="/admin/invoices">
            <Button variant="outline" size="sm" className="gap-2">
              <FileText className="w-4 h-4" />
              {t('dashboard.quickActionNewInvoice', 'New Invoice')}
            </Button>
          </Link>
        )}
        {isModuleAllowed('contacts') && (
          <Link to="/admin/contacts">
            <Button variant="outline" size="sm" className="gap-2">
              <UserPlus className="w-4 h-4" />
              {t('dashboard.quickActionNewContact', 'New Contact')}
            </Button>
          </Link>
        )}
        {isModuleAllowed('pos') && (
          <Link to="/admin/pos">
            <Button variant="outline" size="sm" className="gap-2">
              <ShoppingCart className="w-4 h-4" />
              {t('dashboard.quickActionPOS', 'Point of Sale')}
            </Button>
          </Link>
        )}
        {isModuleAllowed('appointments') && (
          <Link to="/admin/appointments">
            <Button variant="outline" size="sm" className="gap-2">
              <Calendar className="w-4 h-4" />
              {t('dashboard.quickActionAppointments', 'Appointments')}
            </Button>
          </Link>
        )}
      </div>

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
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
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

      {/* ── Overview KPI Cards (widget-driven when template has dashboardWidgets) ── */}
      {renderCardSection(t('dashboard.overview', 'Overview'), overviewCardsToShow)}

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
                      <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100">
                        <AnimatedCounter value={stat.productCount} duration={1200} />
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        {t('dashboard.stockValue', 'Stock Value')}
                      </p>
                      <p className="text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
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
        {/* Top Products by Revenue */}
        <Card className="overflow-hidden animate-slide-up">
          <div className="h-1 bg-gradient-to-r from-green-500 to-emerald-500"></div>
          <CardHeader className="py-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm sm:text-base">{t('dashboard.topProducts', 'Top Products by Revenue')}</CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="py-2">
            <div className="space-y-2">
              {topProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t('dashboard.noProductData', 'No product data available')}
                </p>
              ) : (
                topProducts.map((product, idx) => {
                  const maxRevenue = topProducts[0]?.revenue || 1;
                  const percentage = (product.revenue / maxRevenue) * 100;
                  const color = categoryColors[idx % categoryColors.length];
                  return (
                    <div key={product.name} className="space-y-1">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={cn('text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full shrink-0', color.bg, color.text)}>
                            {idx + 1}
                          </span>
                          <span className="text-xs sm:text-sm font-medium truncate">{product.name}</span>
                          <span className="text-[10px] text-muted-foreground shrink-0">({product.count})</span>
                        </div>
                        <span className={`text-xs sm:text-sm font-bold ${color.text} shrink-0 ml-2`}>
                          {formatCurrencyINR(product.revenue)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full bg-gradient-to-r ${color.gradient} transition-all duration-700`}
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
                    <th className="text-left px-3 py-2 text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100">{t('invoices.number', 'Invoice')}</th>
                    <th className="text-left px-3 py-2 text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100">{t('invoices.customer', 'Customer')}</th>
                    <th className="text-right px-3 py-2 text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100">{t('invoices.amount', 'Amount')}</th>
                    <th className="text-left px-3 py-2 text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100">{t('invoices.status', 'Status')}</th>
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
                        idx % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800/30'
                      )}>
                        <td className="px-3 py-2 text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100">{inv.invoiceNumber}</td>
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
                      <span className="text-xs font-medium text-gray-900 dark:text-gray-100">{inv.invoiceNumber}</span>
                      <span className={cn(
                        'px-2 py-0.5 rounded-full text-[10px] font-semibold',
                        inv.status === 'paid'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                          : inv.status === 'sent'
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      )}>
                        {inv.status === 'paid' ? t('common.paid', 'Paid') : inv.status === 'sent' ? t('common.sent', 'Sent') : t('common.draft', 'Draft')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{inv.customerName}</span>
                      <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{formatCurrencyINR(inv.totalAmount)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Payment Aging ── */}
      <div className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t('dashboard.paymentAging', 'Payment Alerts')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
          {[
            { label: t('dashboard.dueThisWeek', 'Due This Week'), data: paymentAging.dueThisWeek, icon: CalendarClock, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/30', gradient: 'from-green-500 to-emerald-500' },
            { label: t('dashboard.dueThisMonth', 'Due This Month'), data: paymentAging.dueThisMonth, icon: Clock, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/30', gradient: 'from-amber-500 to-yellow-500' },
            { label: t('dashboard.overdue', 'Overdue'), data: paymentAging.overdue, icon: AlertTriangle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/30', gradient: 'from-red-500 to-rose-500' },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.label} className="overflow-hidden group hover:-translate-y-0.5 transition-all duration-300">
                <div className={`h-1 bg-gradient-to-r ${item.gradient}`}></div>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`p-1.5 rounded-lg ${item.bg} group-hover:scale-110 transition-transform duration-300 shrink-0`}>
                      <Icon className={`w-4 h-4 ${item.color}`} />
                    </div>
                    <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">{item.label}</p>
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">
                        <AnimatedCounter value={item.data.count} duration={1200} />
                      </p>
                      <p className="text-[10px] text-muted-foreground">{t('dashboard.invoicesLabel', 'invoices')}</p>
                    </div>
                    <p className={`text-sm sm:text-base font-bold ${item.color}`}>
                      {formatCurrencyINR(item.data.total)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ── Complaint Metrics ── */}
      {renderCardSection(t('dashboard.complaintMetrics', 'Complaint Metrics'), complaintCards)}

      {/* ── Financial Overview - Combined Dashboard ── */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t('dashboard.financialOverview', 'Financial Overview')}
        </h2>

        {/* Mini KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
          {[
            { label: t('dashboard.totalInvoiced', 'Total Invoiced'), value: financeKpis.totalInvoiced, icon: IndianRupee, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/30', isCurrency: true },
            { label: t('dashboard.collected', 'Collected'), value: financeKpis.collected, icon: TrendingUp, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/30', isCurrency: true },
            { label: t('dashboard.pending', 'Pending'), value: financeKpis.pending, icon: Clock, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/30', isCurrency: true },
            { label: t('dashboard.collectionRate', 'Collection Rate'), value: financeKpis.collectionRate, icon: Percent, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30', isCurrency: false, suffix: '%' },
            { label: t('dashboard.avgOrderValue', 'Avg. Order Value'), value: financeKpis.avgOrderValue, icon: ShoppingBag, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/30', isCurrency: true },
            { label: t('dashboard.totalGst', 'GST Collected'), value: financeKpis.totalGst, icon: DollarSign, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/30', isCurrency: true },
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
                  <p className="text-sm sm:text-base font-bold text-gray-900 dark:text-gray-100">
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
          {/* Revenue Trend - Area Chart */}
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

          {/* Invoice Status Breakdown - Donut Chart */}
          <Card className="overflow-hidden animate-slide-up lg:col-span-2" style={{ animationDelay: '0.1s' }}>
            <div className="h-1 bg-gradient-to-r from-purple-500 to-pink-500"></div>
            <CardHeader className="py-3">
              <CardTitle className="text-sm sm:text-base">{t('dashboard.invoiceStatusBreakdown', 'Invoice Status')}</CardTitle>
            </CardHeader>
            <CardContent className="py-2">
              {invoiceStatusData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {t('dashboard.noInvoices', 'No invoices found')}
                </p>
              ) : (
                <>
                  <div className="w-full h-[180px] sm:h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={invoiceStatusData}
                          cx="50%"
                          cy="50%"
                          innerRadius="50%"
                          outerRadius="80%"
                          paddingAngle={3}
                          dataKey="value"
                          stroke="none"
                        >
                          {invoiceStatusData.map((entry) => (
                            <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || '#9ca3af'} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value) => [Number(value ?? 0)]}
                          contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Legend */}
                  <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-2 justify-center">
                    {invoiceStatusData.map((entry) => (
                      <div key={entry.name} className="flex items-center gap-1.5">
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: STATUS_COLORS[entry.name] || '#9ca3af' }}
                        />
                        <span className="text-[10px] sm:text-xs text-muted-foreground">
                          {t(`invoices.status${entry.name.charAt(0).toUpperCase() + entry.name.slice(1)}`, entry.name)} ({entry.value})
                        </span>
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
                  <th className="text-left px-3 py-2 text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100">{t('customers.id', 'ID')}</th>
                  <th className="text-left px-3 py-2 text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100">{t('customers.name', 'Name')}</th>
                  <th className="text-left px-3 py-2 text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100">{t('customers.mobile', 'Mobile')}</th>
                  <th className="text-left px-3 py-2 text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100">{t('customers.connectionType', 'Type')}</th>
                  <th className="text-left px-3 py-2 text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100">{t('customers.status', 'Status')}</th>
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
                      idx % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800/30'
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
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{customer.name}</p>
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
