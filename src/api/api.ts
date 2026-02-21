// Replace with real API call later
import type { Plan, Customer, DashboardStats, Provider } from '@/models/types';
import { MOCK_ORGANIZATION_ID } from '@/models/types';
import { mockPlans, mockCustomers } from './mockData';

// Multi-tenant ready — backend will enforce org isolation. All data scoped by organizationId.
// In-memory storage for mock data (simulates backend)
let plansData: Plan[] = [...mockPlans];
let customersData: Customer[] = [...mockCustomers];

// Plans API
export const plansApi = {
  getAll: async (): Promise<Plan[]> => {
    // Replace with real API call later
    return Promise.resolve([...plansData]);
  },
  getByProvider: async (provider: Provider): Promise<Plan[]> => {
    // Replace with real API call later
    return Promise.resolve(plansData.filter((p) => p.provider === provider));
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

// Customers API
export const customersApi = {
  getAll: async (): Promise<Customer[]> => {
    // Replace with real API call later
    return Promise.resolve([...customersData]);
  },
  getById: async (id: number): Promise<Customer> => {
    // Replace with real API call later
    const customer = customersData.find((c) => c.id === id);
    if (!customer) throw new Error('Customer not found');
    return Promise.resolve(customer);
  },
  create: async (customer: Omit<Customer, 'id' | 'createdAt'>): Promise<Customer> => {
    const newCustomer: Customer = {
      ...customer,
      organizationId: customer.organizationId ?? MOCK_ORGANIZATION_ID,
      id: Math.max(...customersData.map((c) => c.id), 0) + 1,
      createdAt: new Date().toISOString(),
    };
    customersData.push(newCustomer);
    return Promise.resolve(newCustomer);
  },
  update: async (id: number, customer: Partial<Customer>): Promise<Customer> => {
    // SaaS Ready — Payment Collection System: collectedAmount, balanceAmount, paymentStatus apply to ALL product types.
    const index = customersData.findIndex((c) => c.id === id);
    if (index === -1) throw new Error('Customer not found');
    customersData[index] = { ...customersData[index], ...customer };
    return Promise.resolve(customersData[index]);
  },
  delete: async (id: number): Promise<void> => {
    // Replace with real API call later
    const index = customersData.findIndex((c) => c.id === id);
    if (index === -1) throw new Error('Customer not found');
    customersData.splice(index, 1);
    return Promise.resolve();
  },
};

// Dashboard API
// Note: DashboardStats type is kept for backward compatibility.
// The Dashboard UI component now calculates stats dynamically from products.
// Multi-tenant ready — backend will calculate stats per organization.
export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    // Replace with real API call later
    // Multi-tenant ready — backend will isolate by organization
    const customers = await customersApi.getAll();
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

    return {
      totalCustomers: customers.length,
      newCustomersThisMonth,
      activeCustomers: customers.filter((c) => c.status === 'Active').length,
      inactiveCustomers: customers.filter((c) => c.status === 'Inactive').length,
      activeByProvider,
      inactiveByProvider,
    };
  },
  getLastCustomers: async (limit: number = 5): Promise<Customer[]> => {
    // Replace with real API call later
    const customers = await customersApi.getAll();
    return customers
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  },
};
