import { useEffect, useState, useMemo, createContext, useContext } from 'react';
import { useStore } from '@/store/useStore';
import { useInventoryStore } from '@/store/useInventoryStore';
import { useAppointmentsStore } from '@/store/useAppointmentsStore';
import { useOrganizationStore } from '@/store/useOrganizationStore';
import { useAuthStore } from '@/store/useAuthStore';
import { dashboardApi } from '@/api/api';
import { salesInvoicesApi } from '@/api/invoices';
import { useMountFetch } from '@/hooks/useMountFetch';
import type { Customer, SalesInvoice, Organization, Category, InventoryProduct } from '@/models/types';

interface DashboardData {
  loading: boolean;
  totalCustomers: number;
  totalComplaints: number;
  activeComplaints: number;
  onHoldComplaints: number;
  invoices: SalesInvoice[];
  totalRevenue: number;
  totalPending: number;
  todaySalesAmount: number;
  totalProducts: number;
  lowStockTotal: number;
  expiringSoonCount: number;
  todayAppointmentsCount: number;
  lastCustomers: Customer[];
  organization: Organization | null;
  financeKpis: {
    totalInvoiced: number;
    collected: number;
    pending: number;
    collectionRate: number;
    avgOrderValue: number;
    totalGst: number;
  };
  paymentAging: {
    overdue: { count: number; total: number };
    dueThisWeek: { count: number; total: number };
    dueThisMonth: { count: number; total: number };
  };
  topProducts: { name: string; revenue: number; count: number }[];
  invoiceStatusData: { name: string; value: number }[];
  categories: Category[];
  inventoryProducts: InventoryProduct[];
}

const DashboardDataContext = createContext<DashboardData | null>(null);

export function DashboardDataProvider({ children }: { children: React.ReactNode }) {
  const organizationId = useAuthStore((s) => s.organizationId);
  const currentOrganization = useOrganizationStore((s) => s.currentOrganization);

  const dashboardStats = useStore((s) => s.dashboardStats);
  const storeLoading = useStore((s) => s.loading);
  const storeCustomers = useStore((s) => s.customers);
  const initialize = useStore((s) => s.initialize);

  const categories = useInventoryStore((s) => s.categories);
  const inventoryProducts = useInventoryStore((s) => s.products);
  const initInventory = useInventoryStore((s) => s.initialize);

  const appointments = useAppointmentsStore((s) => s.appointments);
  const fetchAppointments = useAppointmentsStore((s) => s.fetchAppointments);

  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [lastCustomers, setLastCustomers] = useState<Customer[]>([]);
  const [bootstrapping, setBootstrapping] = useState(true);

  // Single coordinated load per org — useMountFetch + store asyncOnce prevent 3–4× duplicates
  useMountFetch(
    async (signal) => {
      setBootstrapping(true);
      try {
        // initialize already loads customers/plans/complaints/products + dashboard stats once
        await initialize();
        if (signal.cancelled) return;

        await initInventory();
        if (signal.cancelled) return;

        const [inv, last] = await Promise.all([
          salesInvoicesApi.getAll().catch(() => [] as SalesInvoice[]),
          dashboardApi.getLastCustomers(5).catch(() => {
            const fromStore = useStore.getState().customers;
            return [...fromStore]
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .slice(0, 5);
          }),
        ]);
        if (signal.cancelled) return;

        setInvoices(inv);
        setLastCustomers(last);

        await fetchAppointments().catch(() => undefined);
      } catch (err) {
        if (!signal.cancelled) console.error('Dashboard data load failed:', err);
      } finally {
        if (!signal.cancelled) setBootstrapping(false);
      }
    },
    [organizationId]
  );

  // Prefer store customers if last-customers endpoint returned empty but store has data
  useEffect(() => {
    if (lastCustomers.length > 0 || storeCustomers.length === 0) return;
    const sorted = [...storeCustomers]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
    setLastCustomers(sorted);
  }, [storeCustomers, lastCustomers.length]);

  const todayAppointmentsCount = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayStart = new Date(today).getTime();
    const todayEnd = todayStart + 24 * 60 * 60 * 1000;
    return appointments.filter((a) => {
      const d = new Date(a.scheduledAt).getTime();
      return d >= todayStart && d < todayEnd;
    }).length;
  }, [appointments]);

  const expiringSoonCount = useMemo(() => {
    const in30Days = new Date();
    in30Days.setDate(in30Days.getDate() + 30);
    const limit = in30Days.getTime();
    const now = Date.now();
    return inventoryProducts.filter((p) => {
      if (!p.expiryDate) return false;
      const exp = new Date(p.expiryDate).getTime();
      return exp <= limit && exp >= now;
    }).length;
  }, [inventoryProducts]);

  const todaySalesAmount = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return invoices
      .filter((inv) => inv.issueDate === today && (inv.status === 'paid' || inv.status === 'sent'))
      .reduce((sum, inv) => sum + (inv.totalAmount ?? inv.amount + (inv.gstAmount ?? 0)), 0);
  }, [invoices]);

  const totalRevenue = useMemo(
    () => invoices.filter((inv) => inv.status === 'paid').reduce((sum, inv) => sum + inv.totalAmount, 0),
    [invoices]
  );
  const totalPending = useMemo(
    () => invoices.filter((inv) => inv.status !== 'paid').reduce((sum, inv) => sum + inv.totalAmount, 0),
    [invoices]
  );
  const lowStockTotal = useMemo(
    () =>
      inventoryProducts.filter(
        (p) => p.currentStock != null && p.stockAlert != null && p.currentStock <= p.stockAlert
      ).length,
    [inventoryProducts]
  );

  const financeKpis = useMemo(() => {
    const totalInvoiced = invoices.reduce((s, inv) => s + inv.totalAmount, 0);
    const collected = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.totalAmount, 0);
    const pending = totalInvoiced - collected;
    const collectionRate = totalInvoiced > 0 ? Math.round((collected / totalInvoiced) * 100) : 0;
    const avgOrderValue = invoices.length > 0 ? Math.round(totalInvoiced / invoices.length) : 0;
    const totalGst = invoices.reduce((s, i) => s + (i.gstAmount ?? 0), 0);
    return { totalInvoiced, collected, pending, collectionRate, avgOrderValue, totalGst };
  }, [invoices]);

  const paymentAging = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekFromNow = new Date(today.getTime() + 7 * 86400000);
    const monthFromNow = new Date(today.getTime() + 30 * 86400000);
    const unpaid = invoices.filter((i) => i.status !== 'paid');
    const overdue = unpaid.filter((i) => new Date(i.dueDate) < today);
    const dueThisWeek = unpaid.filter((i) => {
      const d = new Date(i.dueDate);
      return d >= today && d <= weekFromNow;
    });
    const dueThisMonth = unpaid.filter((i) => {
      const d = new Date(i.dueDate);
      return d >= today && d <= monthFromNow;
    });
    return {
      overdue: { count: overdue.length, total: overdue.reduce((s, i) => s + i.totalAmount, 0) },
      dueThisWeek: { count: dueThisWeek.length, total: dueThisWeek.reduce((s, i) => s + i.totalAmount, 0) },
      dueThisMonth: { count: dueThisMonth.length, total: dueThisMonth.reduce((s, i) => s + i.totalAmount, 0) },
    };
  }, [invoices]);

  const topProducts = useMemo(() => {
    const grouped: Record<string, { name: string; revenue: number; count: number }> = {};
    invoices.forEach((inv) => {
      const key = inv.planName || inv.serviceProvider;
      if (!grouped[key]) grouped[key] = { name: key, revenue: 0, count: 0 };
      grouped[key].revenue += inv.totalAmount;
      grouped[key].count += 1;
    });
    return Object.values(grouped).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [invoices]);

  const invoiceStatusData = useMemo(() => {
    const counts: Record<string, number> = { paid: 0, sent: 0, draft: 0, overdue: 0 };
    invoices.forEach((inv) => {
      counts[inv.status] = (counts[inv.status] || 0) + 1;
    });
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([status, value]) => ({ name: status, value }));
  }, [invoices]);

  const data: DashboardData = {
    loading: bootstrapping || (!dashboardStats && storeLoading),
    totalCustomers: dashboardStats?.totalCustomers ?? 0,
    totalComplaints: dashboardStats?.totalComplaints ?? 0,
    activeComplaints: dashboardStats?.activeComplaints ?? 0,
    onHoldComplaints: dashboardStats?.onHoldComplaints ?? 0,
    invoices,
    totalRevenue,
    totalPending,
    todaySalesAmount,
    totalProducts: inventoryProducts.length,
    lowStockTotal,
    expiringSoonCount,
    todayAppointmentsCount,
    lastCustomers,
    organization: currentOrganization,
    financeKpis,
    paymentAging,
    topProducts,
    invoiceStatusData,
    categories,
    inventoryProducts,
  };

  return (
    <DashboardDataContext.Provider value={data}>
      {children}
    </DashboardDataContext.Provider>
  );
}

export function useDashboardData(): DashboardData {
  const ctx = useContext(DashboardDataContext);
  if (!ctx) throw new Error('useDashboardData must be used within DashboardDataProvider');
  return ctx;
}
