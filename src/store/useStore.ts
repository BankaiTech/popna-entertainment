import { create } from 'zustand';
import type { Plan, Customer, DashboardStats, Complaint } from '@/models/types';
import { plansApi, customersApi, dashboardApi } from '@/api/api';
import { complaintsApi } from '@/api/complaints';
import { mockPlans, mockCustomers, mockComplaints } from '@/api/mockData';

interface AppState {
  plans: Plan[];
  customers: Customer[];
  complaints: Complaint[];
  dashboardStats: DashboardStats | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
  
  // Actions
  initialize: () => Promise<void>;
  fetchPlans: () => Promise<void>;
  fetchPlansByProvider: (provider: string) => Promise<void>;
  addPlan: (plan: Omit<Plan, 'id'>) => Promise<void>;
  updatePlan: (id: number, plan: Partial<Plan>) => Promise<void>;
  deletePlan: (id: number) => Promise<void>;
  
  fetchCustomers: () => Promise<void>;
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt'>) => Promise<void>;
  updateCustomer: (id: number, customer: Partial<Customer>) => Promise<Customer | void>;
  deleteCustomer: (id: number) => Promise<void>;
  
  fetchComplaints: () => Promise<void>;
  addComplaint: (complaint: Omit<Complaint, 'id' | 'createdAt'>) => Promise<void>;
  updateComplaint: (id: number, complaint: Partial<Complaint>) => Promise<void>;
  
  fetchDashboardStats: () => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  plans: [],
  customers: [],
  complaints: [],
  dashboardStats: null,
  loading: false,
  error: null,
  initialized: false,

  initialize: async () => {
    if (get().initialized) return;
    set({ loading: true });
    try {
      // Initialize with mock data immediately (no loading screen)
      set({ 
        plans: [...mockPlans], 
        customers: [...mockCustomers],
        complaints: [...mockComplaints],
        initialized: true,
        loading: false 
      });
      // Sync customers to localStorage for customer login
      try {
        localStorage.setItem('customers-data', JSON.stringify(mockCustomers));
      } catch (e) {
        // Ignore localStorage errors
      }
      // Sync with API (which has the same mock data initially, but will have updates)
      const [apiPlans, apiCustomers, apiComplaints] = await Promise.all([
        plansApi.getAll(),
        customersApi.getAll(),
        complaintsApi.getAll(),
      ]);
      set({ plans: apiPlans, customers: apiCustomers, complaints: apiComplaints });
      // Sync updated customers to localStorage
      try {
        localStorage.setItem('customers-data', JSON.stringify(apiCustomers));
      } catch (e) {
        // Ignore localStorage errors
      }
      // Calculate and set dashboard stats
      await get().fetchDashboardStats();
    } catch (error) {
      set({ error: 'Failed to initialize', loading: false });
    }
  },

  fetchPlans: async () => {
    if (!get().initialized) {
      await get().initialize();
      return;
    }
    set({ loading: true, error: null });
    try {
      const plans = await plansApi.getAll();
      set({ plans, loading: false });
    } catch (error) {
      set({ error: 'Failed to fetch plans', loading: false });
    }
  },

  fetchPlansByProvider: async (provider: string) => {
    set({ loading: true, error: null });
    try {
      const plans = await plansApi.getByProvider(provider as any);
      set({ plans, loading: false });
    } catch (error) {
      set({ error: 'Failed to fetch plans', loading: false });
    }
  },

  addPlan: async (plan) => {
    set({ loading: true, error: null });
    try {
      const newPlan = await plansApi.create(plan);
      set((state) => ({ plans: [...state.plans, newPlan], loading: false }));
    } catch (error) {
      set({ error: 'Failed to add plan', loading: false });
    }
  },

  updatePlan: async (id, plan) => {
    set({ loading: true, error: null });
    try {
      const updatedPlan = await plansApi.update(id, plan);
      set((state) => ({
        plans: state.plans.map((p) => (p.id === id ? updatedPlan : p)),
        loading: false,
      }));
    } catch (error) {
      set({ error: 'Failed to update plan', loading: false });
    }
  },

  deletePlan: async (id) => {
    set({ loading: true, error: null });
    try {
      await plansApi.delete(id);
      set((state) => ({
        plans: state.plans.filter((p) => p.id !== id),
        loading: false,
      }));
    } catch (error) {
      set({ error: 'Failed to delete plan', loading: false });
    }
  },

  fetchCustomers: async () => {
    if (!get().initialized) {
      await get().initialize();
      return;
    }
    set({ loading: true, error: null });
    try {
      const customers = await customersApi.getAll();
      set({ customers, loading: false });
      // Sync to localStorage for customer login lookup
      // TODO: In real implementation, this would be handled by backend
      try {
        localStorage.setItem('customers-data', JSON.stringify(customers));
      } catch (e) {
        // Ignore localStorage errors
      }
    } catch (error) {
      set({ error: 'Failed to fetch customers', loading: false });
    }
  },

  addCustomer: async (customer) => {
    // Security check: Only admins can add customers
    // TODO: In real implementation, check user role from auth store or API
    // For now, this is handled at UI level, but adding comment for API integration
    // In production, the API should enforce role-based permissions
    set({ loading: true, error: null });
    try {
      const newCustomer = await customersApi.create(customer);
      set((state) => {
        const updatedCustomers = [...state.customers, newCustomer];
        // Sync to localStorage for customer login
        try {
          localStorage.setItem('customers-data', JSON.stringify(updatedCustomers));
        } catch (e) {
          // Ignore localStorage errors
        }
        return { customers: updatedCustomers, loading: false };
      });
      await get().fetchDashboardStats();
    } catch (error) {
      set({ error: 'Failed to add customer', loading: false });
    }
  },

  updateCustomer: async (id, customer) => {
    // UI enforces: only admins edit non-payment fields; both admin and employee may update payment fields (paymentStatus, paymentDescription, paymentUpdatedAt) for GTPL. Store/API do not block payment-only updates.
    // TODO: In real implementation, validate role and allowed fields in API
    set({ loading: true, error: null });
    try {
      const updatedCustomer = await customersApi.update(id, customer);
      set((state) => {
        const updatedCustomers = state.customers.map((c) => (c.id === id ? updatedCustomer : c));
        // Sync to localStorage for customer login
        try {
          localStorage.setItem('customers-data', JSON.stringify(updatedCustomers));
        } catch (e) {
          // Ignore localStorage errors
        }
        return {
          customers: updatedCustomers,
          loading: false,
        };
      });
      await get().fetchDashboardStats();
      return updatedCustomer;
    } catch (error) {
      set({ error: 'Failed to update customer', loading: false });
    }
  },

  deleteCustomer: async (id) => {
    // Security check: Only admins can delete customers
    // TODO: In real implementation, check user role from auth store
    // For now, this is handled at UI level, but adding comment for API integration
    set({ loading: true, error: null });
    try {
      await customersApi.delete(id);
      set((state) => {
        const updatedCustomers = state.customers.filter((c) => c.id !== id);
        // Sync to localStorage for customer login
        try {
          localStorage.setItem('customers-data', JSON.stringify(updatedCustomers));
        } catch (e) {
          // Ignore localStorage errors
        }
        return {
          customers: updatedCustomers,
          loading: false,
        };
      });
      await get().fetchDashboardStats();
    } catch (error) {
      set({ error: 'Failed to delete customer', loading: false });
    }
  },

  fetchComplaints: async () => {
    if (!get().initialized) {
      await get().initialize();
      return;
    }
    set({ loading: true, error: null });
    try {
      const complaints = await complaintsApi.getAll();
      set({ complaints, loading: false });
    } catch (error) {
      set({ error: 'Failed to fetch complaints', loading: false });
    }
  },

  addComplaint: async (complaint) => {
    set({ loading: true, error: null });
    try {
      const newComplaint = await complaintsApi.create(complaint);
      set((state) => ({ complaints: [...state.complaints, newComplaint], loading: false }));
    } catch (error) {
      set({ error: 'Failed to add complaint', loading: false });
    }
  },

  updateComplaint: async (id, complaint) => {
    set({ loading: true, error: null });
    try {
      const updatedComplaint = await complaintsApi.update(id, complaint);
      set((state) => ({
        complaints: state.complaints.map((c) => (c.id === id ? updatedComplaint : c)),
        loading: false,
      }));
    } catch (error) {
      set({ error: 'Failed to update complaint', loading: false });
    }
  },

  fetchDashboardStats: async () => {
    if (!get().initialized) {
      await get().initialize();
      return;
    }
    set({ loading: true, error: null });
    try {
      const stats = await dashboardApi.getStats();
      set({ dashboardStats: stats, loading: false });
    } catch (error) {
      set({ error: 'Failed to fetch dashboard stats', loading: false });
    }
  },
}));
