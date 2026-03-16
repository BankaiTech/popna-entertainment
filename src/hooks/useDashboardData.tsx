import { useEffect, useState, useMemo, createContext, useContext } from 'react';
import { useStore } from '@/store/useStore';
import { useInventoryStore } from '@/store/useInventoryStore';
import { useAppointmentsStore } from '@/store/useAppointmentsStore';
import { customersApi } from '@/api/api';
import { salesInvoicesApi } from '@/api/invoices';
import { organizationsApi } from '@/api/organizations';
import type { Customer, SalesInvoice, Organization, Category, InventoryProduct } from '@/models/types';
import { MOCK_ORGANIZATION_ID } from '@/models/types';

interface DashboardData {
  loading: boolean;
  // Core stats
  totalCustomers: number;
  totalComplaints: number;
  activeComplaints: number;
  onHoldComplaints: number;
  // Invoices
  invoices: SalesInvoice[];
  totalRevenue: number;
  totalPending: number;
  todaySalesAmount: number;
  // Inventory
  totalProducts: number;
  lowStockTotal: number;
  expiringSoonCount: number;
  // Appointments
  todayAppointmentsCount: number;
  // Recent data
  lastCustomers: Customer[];
  // Organization
  organization: Organization | null;
  // Computed finance
  financeKpis: {
    totalInvoiced: number;
    collected: number;
    pending: number;
    collectionRate: number;
    avgOrderValue: number;
    totalGst: number;
  };
  // Payment aging
  paymentAging: {
    overdue: { count: number; total: number };
    dueThisWeek: { count: number; total: number };
    dueThisMonth: { count: number; total: number };
  };
  // Top products
  topProducts: { name: string; revenue: number; count: number }[];
  // Invoice status
  invoiceStatusData: { name: string; value: number }[];
  // Categories
  categories: Category[];
  inventoryProducts: InventoryProduct[];
}

const DashboardDataContext = createContext<DashboardData | null>(null);

export function DashboardDataProvider({ children }: { children: React.ReactNode }) {
  const { dashboardStats, loading, fetchDashboardStats, initialize, fetchCustomers } = useStore();
  const { categories, products: inventoryProducts, initialize: initInventory } = useInventoryStore();
  const { appointments, fetchAppointments } = useAppointmentsStore();

  const [lastCustomers, setLastCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [todayAppointmentsCount, setTodayAppointmentsCount] = useState(0);
  const [expiringSoonCount, setExpiringSoonCount] = useState(0);
  const [todaySalesAmount, setTodaySalesAmount] = useState(0);

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

  const totalRevenue = useMemo(() =>
    invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.totalAmount, 0),
    [invoices]
  );
  const totalPending = useMemo(() =>
    invoices.filter(inv => inv.status !== 'paid').reduce((sum, inv) => sum + inv.totalAmount, 0),
    [invoices]
  );
  const lowStockTotal = useMemo(() =>
    inventoryProducts.filter(p => p.currentStock != null && p.stockAlert != null && p.currentStock <= p.stockAlert).length,
    [inventoryProducts]
  );

  const financeKpis = useMemo(() => {
    const totalInvoiced = invoices.reduce((s, inv) => s + inv.totalAmount, 0);
    const collected = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.totalAmount, 0);
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
    const unpaid = invoices.filter(i => i.status !== 'paid');
    const overdue = unpaid.filter(i => new Date(i.dueDate) < today);
    const dueThisWeek = unpaid.filter(i => { const d = new Date(i.dueDate); return d >= today && d <= weekFromNow; });
    const dueThisMonth = unpaid.filter(i => { const d = new Date(i.dueDate); return d >= today && d <= monthFromNow; });
    return {
      overdue: { count: overdue.length, total: overdue.reduce((s, i) => s + i.totalAmount, 0) },
      dueThisWeek: { count: dueThisWeek.length, total: dueThisWeek.reduce((s, i) => s + i.totalAmount, 0) },
      dueThisMonth: { count: dueThisMonth.length, total: dueThisMonth.reduce((s, i) => s + i.totalAmount, 0) },
    };
  }, [invoices]);

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

  const invoiceStatusData = useMemo(() => {
    const counts: Record<string, number> = { paid: 0, sent: 0, draft: 0, overdue: 0 };
    invoices.forEach(inv => { counts[inv.status] = (counts[inv.status] || 0) + 1; });
    return Object.entries(counts).filter(([, v]) => v > 0).map(([status, value]) => ({ name: status, value }));
  }, [invoices]);

  const data: DashboardData = {
    loading: !dashboardStats && loading,
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
    organization,
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
