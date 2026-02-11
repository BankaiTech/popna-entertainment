import { create } from 'zustand';
import type { Plan, Customer, DashboardStats, Complaint, Product, CompanyProfile, WebsiteSettings } from '@/models/types';
import { MOCK_ORGANIZATION_ID } from '@/models/types';
import { plansApi, customersApi, dashboardApi } from '@/api/api';
import { complaintsApi } from '@/api/complaints';
import { productsApi } from '@/api/products';
import { companyProfileApi } from '@/api/companyProfile';
import { websiteSettingsApi } from '@/api/websiteSettings';
import { mockPlans, mockCustomers, mockComplaints } from '@/api/mockData';

// Mock data for immediate initialization (API-ready structure)
const mockProducts: Product[] = [
  {
    id: 1,
    organizationId: MOCK_ORGANIZATION_ID,
    name: 'GTPL',
    productType: 'cable',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    organizationId: MOCK_ORGANIZATION_ID,
    name: 'BSNL',
    productType: 'internet',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 3,
    organizationId: MOCK_ORGANIZATION_ID,
    name: 'Railwire',
    productType: 'internet',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 4,
    organizationId: MOCK_ORGANIZATION_ID,
    name: 'Krishiinet',
    productType: 'internet',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
];

const mockCompanyProfile: CompanyProfile = {
  id: 1,
  organizationId: MOCK_ORGANIZATION_ID,
  companyName: 'BankaiTech',
  gstin: '29ABCDE1234F1Z5',
  addressLine1: '123 Business Street',
  addressLine2: 'Suite 100',
  city: 'Bangalore',
  state: 'Karnataka',
  country: 'India',
  pincode: '560001',
  contactNumber: '+91 9876543210',
  email: 'info@bankaitech.com',
  updatedAt: new Date().toISOString(),
};

const mockWebsiteSettings: WebsiteSettings = {
  id: 1,
  organizationId: MOCK_ORGANIZATION_ID,
  heroTitle: 'Welcome to BankaiTech',
  heroSubtitle: 'Cable & Internet Services',
  heroDescription: 'Choose the right plan for your home or business.',
  heroImage: undefined,
  highlightSectionTitle: 'Our Services',
  highlightCards: [
    {
      title: 'High Speed',
      description: 'Experience blazing fast internet speeds with our premium plans',
      icon: 'Zap',
    },
    {
      title: '24/7 Support',
      description: 'Our dedicated support team is available round the clock to assist you',
      icon: 'Clock',
    },
    {
      title: 'Easy Installation',
      description: 'Quick and hassle-free installation process with minimal downtime',
      icon: 'Shield',
    },
  ],
  ctaButtonText: 'Get Started',
  ctaButtonLink: '/contact',
  updatedAt: new Date().toISOString(),
};

interface AppState {
  plans: Plan[];
  customers: Customer[];
  complaints: Complaint[];
  dashboardStats: DashboardStats | null;
  // Multi-tenant ready — backend will isolate by organization
  products: Product[];
  companyProfile: CompanyProfile | null;
  websiteSettings: WebsiteSettings | null;
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
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt' | 'organizationId'> & { organizationId?: string }) => Promise<void>;
  updateCustomer: (id: number, customer: Partial<Customer>) => Promise<Customer | void>;
  deleteCustomer: (id: number) => Promise<void>;
  
  fetchComplaints: () => Promise<void>;
  addComplaint: (complaint: Omit<Complaint, 'id' | 'createdAt' | 'organizationId'> & { organizationId?: string }) => Promise<void>;
  updateComplaint: (id: number, complaint: Partial<Complaint>) => Promise<void>;
  
  fetchDashboardStats: () => Promise<void>;
  
  // Product Management - Multi-tenant ready
  fetchProducts: () => Promise<void>;
  fetchActiveProducts: () => Promise<void>;
  addProduct: (product: Omit<Product, 'id' | 'createdAt'>) => Promise<void>;
  updateProduct: (id: number, product: Partial<Product>) => Promise<void>;
  deleteProduct: (id: number) => Promise<void>;
  
  // Company Profile - Multi-tenant ready
  fetchCompanyProfile: () => Promise<void>;
  updateCompanyProfile: (profile: Partial<CompanyProfile>) => Promise<void>;
  
  // Website Settings - Multi-tenant ready
  fetchWebsiteSettings: () => Promise<void>;
  updateWebsiteSettings: (settings: Partial<WebsiteSettings>) => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  plans: [],
  customers: [],
  complaints: [],
  dashboardStats: null,
  products: mockProducts, // Initialize with mock data immediately
  companyProfile: mockCompanyProfile, // Initialize with mock data immediately
  websiteSettings: mockWebsiteSettings, // Initialize with mock data immediately
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
        products: [...mockProducts], // Initialize with mock products
        companyProfile: { ...mockCompanyProfile }, // Initialize with mock company profile
        websiteSettings: { ...mockWebsiteSettings }, // Initialize with mock website settings
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
      // Multi-tenant ready — backend will isolate by organization
      try {
        const [apiPlans, apiCustomers, apiComplaints, apiProducts, apiCompanyProfile, apiWebsiteSettings] = await Promise.all([
          plansApi.getAll(),
          customersApi.getAll(),
          complaintsApi.getAll(),
          productsApi.getAll().catch(() => mockProducts),
          companyProfileApi.get().catch(() => mockCompanyProfile),
          websiteSettingsApi.get().catch(() => mockWebsiteSettings),
        ]);
        set({ 
          plans: apiPlans, 
          customers: apiCustomers, 
          complaints: apiComplaints,
          products: apiProducts || mockProducts,
          companyProfile: apiCompanyProfile || mockCompanyProfile,
          websiteSettings: apiWebsiteSettings || mockWebsiteSettings,
        });
      } catch (error) {
        console.error('Error loading data:', error);
        // Keep mock data if API fails
        set({ 
          products: mockProducts,
          companyProfile: mockCompanyProfile,
          websiteSettings: mockWebsiteSettings,
        });
      }
      // Sync updated customers to localStorage
      try {
        const currentCustomers = get().customers;
        localStorage.setItem('customers-data', JSON.stringify(currentCustomers));
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
    // Multi-tenant ready — backend will enforce org isolation
    set({ loading: true, error: null });
    try {
      const newCustomer = await customersApi.create({
        ...customer,
        organizationId: customer.organizationId ?? MOCK_ORGANIZATION_ID,
      });
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
      const newComplaint = await complaintsApi.create({
        ...complaint,
        organizationId: complaint.organizationId ?? MOCK_ORGANIZATION_ID,
      });
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

  // Product Management - Multi-tenant ready — backend will isolate by organization
  fetchProducts: async () => {
    set({ loading: true, error: null });
    try {
      const apiProducts = await productsApi.getAll();
      set({ products: apiProducts || mockProducts, loading: false });
    } catch (error) {
      console.error('Failed to fetch products:', error);
      set({ error: 'Failed to fetch products', loading: false, products: mockProducts });
    }
  },

  fetchActiveProducts: async () => {
    set({ loading: true, error: null });
    try {
      const apiProducts = await productsApi.getActive();
      set({ products: apiProducts || mockProducts.filter(p => p.isActive), loading: false });
    } catch (error) {
      console.error('Failed to fetch active products:', error);
      set({ error: 'Failed to fetch active products', loading: false, products: mockProducts.filter(p => p.isActive) });
    }
  },

  addProduct: async (product) => {
    set({ loading: true, error: null });
    try {
      const newProduct = await productsApi.create({
        ...product,
        organizationId: product.organizationId ?? MOCK_ORGANIZATION_ID,
      });
      set((state) => ({ products: [...state.products, newProduct], loading: false }));
    } catch (error) {
      set({ error: 'Failed to add product', loading: false });
    }
  },

  updateProduct: async (id, product) => {
    set({ loading: true, error: null });
    try {
      const updatedProduct = await productsApi.update(id, product);
      set((state) => ({
        products: state.products.map((p) => (p.id === id ? updatedProduct : p)),
        loading: false,
      }));
    } catch (error) {
      set({ error: 'Failed to update product', loading: false });
    }
  },

  deleteProduct: async (id) => {
    set({ loading: true, error: null });
    try {
      await productsApi.delete(id);
      set((state) => ({
        products: state.products.filter((p) => p.id !== id),
        loading: false,
      }));
    } catch (error) {
      set({ error: 'Failed to delete product', loading: false });
    }
  },

  // Company Profile - Multi-tenant ready — backend will isolate by organization
  fetchCompanyProfile: async () => {
    set({ loading: true, error: null });
    try {
      const profile = await companyProfileApi.get();
      set({ companyProfile: profile || mockCompanyProfile, loading: false });
    } catch (error) {
      console.error('Failed to fetch company profile:', error);
      set({ error: 'Failed to fetch company profile', loading: false, companyProfile: mockCompanyProfile });
    }
  },

  updateCompanyProfile: async (profile) => {
    set({ loading: true, error: null });
    try {
      const updatedProfile = await companyProfileApi.update(profile);
      set({ companyProfile: updatedProfile, loading: false });
    } catch (error) {
      set({ error: 'Failed to update company profile', loading: false });
    }
  },

  // Website Settings - Multi-tenant ready — backend will isolate by organization
  fetchWebsiteSettings: async () => {
    set({ loading: true, error: null });
    try {
      const settings = await websiteSettingsApi.get();
      set({ websiteSettings: settings || mockWebsiteSettings, loading: false });
    } catch (error) {
      console.error('Failed to fetch website settings:', error);
      set({ error: 'Failed to fetch website settings', loading: false, websiteSettings: mockWebsiteSettings });
    }
  },

  updateWebsiteSettings: async (settings) => {
    set({ loading: true, error: null });
    try {
      const updatedSettings = await websiteSettingsApi.update(settings);
      set({ websiteSettings: updatedSettings, loading: false });
    } catch (error) {
      set({ error: 'Failed to update website settings', loading: false });
    }
  },
}));
