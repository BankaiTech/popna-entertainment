// Replace with real API call later
import type { Plan, Customer, DashboardStats, Provider } from '@/models/types';
import { MOCK_ORGANIZATION_ID } from '@/models/types';
import { apiGetList, apiGetOne, apiDelete, apiPatch, apiPost, inventoryResource } from '@/api/resources';
import { useMockApi } from '@/lib/http';
import { mockPlans, mockCustomers, mockPlansExtra, mockCustomersExtra } from './mockData';
import { complaintsApi } from './complaints';
import { connectionRequestsApi } from './connectionRequests';
import { salesInvoicesApi } from './invoices';
import { productsApi } from './products';
import { useAuthStore } from '@/store/useAuthStore';

// Multi-tenant ready - backend will enforce org isolation. All data scoped by organizationId.
let plansData: Plan[] = [...mockPlans, ...mockPlansExtra];
let customersData: Customer[] = [...mockCustomers, ...mockCustomersExtra];

function getCurrentOrgId(): string {
  const { organizationId, customerId, role } = useAuthStore.getState();
  if (organizationId) return organizationId;
  if (role === 'customer' && customerId) {
    const allCusts = [...mockCustomers, ...mockCustomersExtra];
    const found = allCusts.find((c) => c.id === customerId);
    if (found?.organizationId) return found.organizationId;
  }
  return MOCK_ORGANIZATION_ID;
}

// Plans API — real: /inventory?catalogType=isp_plan
export const plansApi = {
  getAll: async (): Promise<Plan[]> => {
    if (useMockApi()) {
      const orgId = getCurrentOrgId();
      return Promise.resolve(plansData.filter((p) => p.organizationId === orgId));
    }
    return inventoryResource.list<Plan>({ catalogType: 'isp_plan' });
  },
  getByProvider: async (provider: Provider): Promise<Plan[]> => {
    if (useMockApi()) {
      const orgId = getCurrentOrgId();
      return Promise.resolve(plansData.filter((p) => p.organizationId === orgId && p.provider === provider));
    }
    const all = await inventoryResource.list<Plan>({ catalogType: 'isp_plan' });
    return all.filter((p) => p.provider === provider);
  },
  getById: async (id: number): Promise<Plan> => {
    if (useMockApi()) {
      const plan = plansData.find((p) => p.id === id);
      if (!plan) throw new Error('Plan not found');
      return Promise.resolve(plan);
    }
    return inventoryResource.get<Plan>(id);
  },
  create: async (plan: Omit<Plan, 'id'>): Promise<Plan> => {
    if (useMockApi()) {
      const newPlan: Plan = {
        ...plan,
        organizationId: plan.organizationId ?? MOCK_ORGANIZATION_ID,
        id: Math.max(...plansData.map((p) => p.id), 0) + 1,
      };
      plansData.push(newPlan);
      return Promise.resolve(newPlan);
    }
    return inventoryResource.create<Plan>({ catalogType: 'isp_plan', ...plan });
  },
  update: async (id: number, plan: Partial<Plan>): Promise<Plan> => {
    if (useMockApi()) {
      const index = plansData.findIndex((p) => p.id === id);
      if (index === -1) throw new Error('Plan not found');
      plansData[index] = { ...plansData[index], ...plan };
      return Promise.resolve(plansData[index]);
    }
    return inventoryResource.update<Plan>(id, { ...plan });
  },
  delete: async (id: number): Promise<void> => {
    if (useMockApi()) {
      const index = plansData.findIndex((p) => p.id === id);
      if (index === -1) throw new Error('Plan not found');
      plansData.splice(index, 1);
      return Promise.resolve();
    }
    await inventoryResource.remove(id);
  },
};

// Customers API — real: /contacts
export const customersApi = {
  getAll: async (): Promise<Customer[]> => {
    if (useMockApi()) {
      const orgId = getCurrentOrgId();
      return Promise.resolve(customersData.filter((c) => c.organizationId === orgId));
    }
    return apiGetList<Customer>('/contacts', { type: 'customer' });
  },
  getById: async (id: number): Promise<Customer> => {
    if (useMockApi()) {
      const customer = customersData.find((c) => c.id === id);
      if (!customer) throw new Error('Customer not found');
      return Promise.resolve(customer);
    }
    return apiGetOne<Customer>(`/contacts/${id}`);
  },
  create: async (customer: Omit<Customer, 'id' | 'createdAt'>): Promise<Customer> => {
    if (useMockApi()) {
      const newCustomer: Customer = {
        ...customer,
        organizationId: customer.organizationId ?? MOCK_ORGANIZATION_ID,
        id: Math.max(...customersData.map((c) => c.id), 0) + 1,
        createdAt: new Date().toISOString(),
      };
      customersData.push(newCustomer);
      return Promise.resolve(newCustomer);
    }
    return apiPost<Customer>('/contacts', { type: 'customer', ...customer });
  },
  update: async (id: number, customer: Partial<Customer>): Promise<Customer> => {
    if (useMockApi()) {
      const index = customersData.findIndex((c) => c.id === id);
      if (index === -1) throw new Error('Customer not found');
      customersData[index] = { ...customersData[index], ...customer };
      return Promise.resolve(customersData[index]);
    }
    return apiPatch<Customer>(`/contacts/${id}`, customer);
  },
  delete: async (id: number): Promise<void> => {
    if (useMockApi()) {
      const index = customersData.findIndex((c) => c.id === id);
      if (index === -1) throw new Error('Customer not found');
      customersData.splice(index, 1);
      return Promise.resolve();
    }
    await apiDelete(`/contacts/${id}`);
  },
};

// Dashboard API
export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    if (!useMockApi()) {
      return apiGetOne<DashboardStats>('/dashboard/stats');
    }

    const [customers, complaints, connectionRequests, invoices, plans, products] = await Promise.all([
      customersApi.getAll(),
      complaintsApi.getAll(),
      connectionRequestsApi.getAll(),
      salesInvoicesApi.getAll(),
      plansApi.getAll(),
      productsApi.getAll(),
    ]);

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const newCustomersThisMonth = customers.filter((c) => {
      const created = new Date(c.createdAt);
      return created.getMonth() === currentMonth && created.getFullYear() === currentYear;
    }).length;

    const activeByProvider: Record<string, number> = {};
    const inactiveByProvider: Record<string, number> = {};

    customers.forEach((customer) => {
      const key = customer.connectionType || '';
      if (customer.status === 'Active') {
        activeByProvider[key] = (activeByProvider[key] ?? 0) + 1;
      } else {
        inactiveByProvider[key] = (inactiveByProvider[key] ?? 0) + 1;
      }
    });

    const totalAmountCollected = invoices
      .filter((inv) => inv.status === 'paid')
      .reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalPendingAmount = invoices
      .filter((inv) => inv.status !== 'paid')
      .reduce((sum, inv) => sum + inv.totalAmount, 0);
    const overdueAmount = invoices
      .filter((inv) => inv.status === 'overdue')
      .reduce((sum, inv) => sum + inv.totalAmount, 0);

    const totalComplaints = complaints.length;
    const activeComplaints = complaints.filter((c) => c.status === 'active').length;
    const onHoldComplaints = complaints.filter((c) => c.status === 'on-hold').length;

    const newConnectionRequests = connectionRequests.filter((cr) => cr.status === 'New').length;
    const convertedConnections = connectionRequests.filter((cr) => cr.status === 'Converted').length;

    const totalActivePlans = plans.length;
    const totalProducts = products.filter((p) => p.isActive).length;

    return {
      totalCustomers: customers.length,
      newCustomersThisMonth,
      activeCustomers: customers.filter((c) => c.status === 'Active').length,
      inactiveCustomers: customers.filter((c) => c.status === 'Inactive').length,
      activeByProvider,
      inactiveByProvider,
      totalAmountCollected,
      totalPendingAmount,
      overdueAmount,
      totalComplaints,
      activeComplaints,
      onHoldComplaints,
      newConnectionRequests,
      convertedConnections,
      totalActivePlans,
      totalProducts,
    };
  },
  getLastCustomers: async (limit: number = 5): Promise<Customer[]> => {
    if (!useMockApi()) {
      return apiGetList<Customer>('/dashboard/last-customers', { limit });
    }
    const customers = await customersApi.getAll();
    return customers
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  },

  /** Customer portal summary: GET /customer/dashboard */
  getCustomerDashboard: async <T = Record<string, unknown>>(): Promise<T> => {
    if (!useMockApi()) {
      return apiGetOne<T>('/customer/dashboard');
    }
    const [customers, invoices] = await Promise.all([
      customersApi.getAll(),
      salesInvoicesApi.getAll(),
    ]);
    const { customerId } = useAuthStore.getState();
    const customer = customers.find((c) => c.id === customerId) ?? null;
    return {
      customer,
      invoices: invoices.filter((inv) => inv.customerId === customerId),
      subscription: customer
        ? {
            planName: customer.package,
            status: customer.status,
            nextDueDate: null,
          }
        : null,
    } as T;
  },
};
