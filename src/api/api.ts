// Replace with real API call later
import type { Plan, Customer, DashboardStats, Provider } from '@/models/types';
import { MOCK_ORGANIZATION_ID } from '@/models/types';
import apiClient from '@/lib/apiClient';
import { isMockMode, toCamelCase, toSnakeCase, unwrapApiData } from '@/lib/apiHelpers';
import { mockPlans, mockCustomers, mockPlansExtra, mockCustomersExtra } from './mockData';
import { complaintsApi } from './complaints';
import { connectionRequestsApi } from './connectionRequests';
import { salesInvoicesApi } from './invoices';
import { productsApi } from './products';
import { useAuthStore } from '@/store/useAuthStore';
import { endpoints } from './endpoints';

// Multi-tenant ready - backend will enforce org isolation. All data scoped by organizationId.
// In-memory storage for mock data (simulates backend) — all orgs combined
let plansData: Plan[] = [...mockPlans, ...mockPlansExtra];
let customersData: Customer[] = [...mockCustomers, ...mockCustomersExtra];

function getCurrentOrgId(): string {
  const { organizationId, customerId, role } = useAuthStore.getState();
  if (organizationId) return organizationId;
  // For customer role, infer org from customer record
  if (role === 'customer' && customerId) {
    const allCusts = [...mockCustomers, ...mockCustomersExtra];
    const found = allCusts.find((c) => c.id === customerId);
    if (found?.organizationId) return found.organizationId;
  }
  return MOCK_ORGANIZATION_ID;
}

const emptyAddress = { line1: '', line2: '', city: '', state: '', country: 'India' };

function mapContactToCustomer(raw: Record<string, unknown>): Customer {
  const c = toCamelCase<Record<string, unknown>>(raw);
  return {
    id: Number(c.id),
    organizationId: String(c.organizationId ?? getCurrentOrgId()),
    name: String(c.name ?? ''),
    email: String(c.email ?? ''),
    mobile: String(c.mobile ?? ''),
    password: c.password != null ? String(c.password) : undefined,
    connectionType: (c.connectionType ?? c.contactType ?? '') as Provider,
    package: String(c.package ?? c.planName ?? ''),
    status: (c.status === 'Inactive' || c.status === 'inactive' ? 'Inactive' : 'Active') as Customer['status'],
    description: c.description != null ? String(c.description) : undefined,
    address: (c.address as Customer['address']) ?? emptyAddress,
    additionalAddresses: c.additionalAddresses as Customer['additionalAddresses'],
    createdAt: String(c.createdAt ?? new Date().toISOString()),
    paymentStatus: c.paymentStatus as Customer['paymentStatus'],
    paymentDescription: c.paymentDescription != null ? String(c.paymentDescription) : undefined,
    paymentUpdatedAt: c.paymentUpdatedAt != null ? String(c.paymentUpdatedAt) : undefined,
    paymentMethod: c.paymentMethod as Customer['paymentMethod'],
    collectedAmount: c.collectedAmount != null ? Number(c.collectedAmount) : undefined,
    balanceAmount: c.balanceAmount != null ? Number(c.balanceAmount) : undefined,
  };
}

function contactPayload(customer: Partial<Customer>): Record<string, unknown> {
  const payload: Record<string, unknown> = { ...customer };
  if (customer.connectionType) payload.contact_type = 'customer';
  return toSnakeCase(payload);
}

// Plans API
export const plansApi = {
  getAll: async (): Promise<Plan[]> => {
    const orgId = getCurrentOrgId();
    return Promise.resolve(plansData.filter((p) => p.organizationId === orgId));
  },
  getByProvider: async (provider: Provider): Promise<Plan[]> => {
    const orgId = getCurrentOrgId();
    return Promise.resolve(plansData.filter((p) => p.organizationId === orgId && p.provider === provider));
  },
  getById: async (id: number): Promise<Plan> => {
    // Replace with real API call later
    const plan = plansData.find((p) => p.id === id);
    if (!plan) throw new Error('Plan not found');
    return Promise.resolve(plan);
  },
  create: async (plan: Omit<Plan, 'id'>): Promise<Plan> => {
    const newPlan: Plan = {
      ...plan,
      organizationId: plan.organizationId ?? MOCK_ORGANIZATION_ID,
      id: Math.max(...plansData.map((p) => p.id), 0) + 1,
    };
    plansData.push(newPlan);
    return Promise.resolve(newPlan);
  },
  update: async (id: number, plan: Partial<Plan>): Promise<Plan> => {
    // Replace with real API call later
    const index = plansData.findIndex((p) => p.id === id);
    if (index === -1) throw new Error('Plan not found');
    plansData[index] = { ...plansData[index], ...plan };
    return Promise.resolve(plansData[index]);
  },
  delete: async (id: number): Promise<void> => {
    // Replace with real API call later
    const index = plansData.findIndex((p) => p.id === id);
    if (index === -1) throw new Error('Plan not found');
    plansData.splice(index, 1);
    return Promise.resolve();
  },
};

// Customers API (backend: /contacts)
export const customersApi = {
  getAll: async (): Promise<Customer[]> => {
    if (isMockMode()) {
      const orgId = getCurrentOrgId();
      return Promise.resolve(customersData.filter((c) => c.organizationId === orgId));
    }
    const response = await apiClient.get(endpoints.contacts);
    const list = unwrapApiData<Record<string, unknown>[]>(response);
    return (Array.isArray(list) ? list : []).map(mapContactToCustomer);
  },
  getById: async (id: number): Promise<Customer> => {
    if (isMockMode()) {
      const customer = customersData.find((c) => c.id === id);
      if (!customer) throw new Error('Customer not found');
      return Promise.resolve(customer);
    }
    const response = await apiClient.get(`${endpoints.contacts}/${id}`);
    return mapContactToCustomer(unwrapApiData<Record<string, unknown>>(response));
  },
  create: async (customer: Omit<Customer, 'id' | 'createdAt'>): Promise<Customer> => {
    if (isMockMode()) {
      const newCustomer: Customer = {
        ...customer,
        organizationId: customer.organizationId ?? MOCK_ORGANIZATION_ID,
        id: Math.max(...customersData.map((c) => c.id), 0) + 1,
        createdAt: new Date().toISOString(),
      };
      customersData.push(newCustomer);
      return Promise.resolve(newCustomer);
    }
    const response = await apiClient.post(endpoints.contacts, contactPayload(customer));
    return mapContactToCustomer(unwrapApiData<Record<string, unknown>>(response));
  },
  update: async (id: number, customer: Partial<Customer>): Promise<Customer> => {
    if (isMockMode()) {
      const index = customersData.findIndex((c) => c.id === id);
      if (index === -1) throw new Error('Customer not found');
      customersData[index] = { ...customersData[index], ...customer };
      return Promise.resolve(customersData[index]);
    }
    const response = await apiClient.patch(`${endpoints.contacts}/${id}`, contactPayload(customer));
    return mapContactToCustomer(unwrapApiData<Record<string, unknown>>(response));
  },
  delete: async (id: number): Promise<void> => {
    if (isMockMode()) {
      const index = customersData.findIndex((c) => c.id === id);
      if (index === -1) throw new Error('Customer not found');
      customersData.splice(index, 1);
      return Promise.resolve();
    }
    await apiClient.delete(`${endpoints.contacts}/${id}`);
  },
};

// Dashboard API
// Note: DashboardStats type is kept for backward compatibility.
// The Dashboard UI component now calculates stats dynamically from products.
// Multi-tenant ready - backend will calculate stats per organization.
export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    if (!isMockMode()) {
      const response = await apiClient.get(endpoints.dashboardStats);
      return toCamelCase<DashboardStats>(unwrapApiData(response));
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

    // Payment Metrics - from invoices
    const totalAmountCollected = invoices
      .filter((inv) => inv.status === 'paid')
      .reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalPendingAmount = invoices
      .filter((inv) => inv.status !== 'paid')
      .reduce((sum, inv) => sum + inv.totalAmount, 0);
    const overdueAmount = invoices
      .filter((inv) => inv.status === 'overdue')
      .reduce((sum, inv) => sum + inv.totalAmount, 0);

    // Complaint Metrics
    const totalComplaints = complaints.length;
    const activeComplaints = complaints.filter((c) => c.status === 'active').length;
    const onHoldComplaints = complaints.filter((c) => c.status === 'on-hold').length;

    // Connection Metrics
    const newConnectionRequests = connectionRequests.filter((cr) => cr.status === 'New').length;
    const convertedConnections = connectionRequests.filter((cr) => cr.status === 'Converted').length;

    // Plan & Product Metrics
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
    if (!isMockMode()) {
      const response = await apiClient.get(endpoints.dashboardLastCustomers, { params: { limit } });
      const list = unwrapApiData<Record<string, unknown>[]>(response);
      return (Array.isArray(list) ? list : []).map(mapContactToCustomer);
    }
    const customers = await customersApi.getAll();
    return customers
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  },
};
