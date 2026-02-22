// Client folder removed — SaaS multi-tenant architecture used
import { create } from 'zustand';
import { loginCustomer } from '@/api/customerAuth';

// SaaS Ready — superadmin for product owner, admin/employee for organizations
export type UserRole = 'superadmin' | 'admin' | 'employee' | 'customer';

interface AuthState {
  isAuthenticated: boolean;
  role: UserRole | null;
  username: string | null;
  customerId: number | null;
  customerMobile: string | null;
  /** Organization ID for admin/employee users */
  organizationId: string | null;
  login: (username: string, password: string) => boolean;
  customerLogin: (mobile: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  initialize: () => void;
}

const loadAuthFromStorage = () => {
  try {
    const customerAuth = localStorage.getItem('customer_auth');
    const customerId = localStorage.getItem('customer_id');
    const customerMobile = localStorage.getItem('customer_mobile');

    if (customerAuth === 'true' && customerId && customerMobile) {
      return {
        isAuthenticated: true,
        role: 'customer' as UserRole,
        username: customerMobile,
        customerId: parseInt(customerId, 10),
        customerMobile,
        organizationId: null,
      };
    }

    const stored = localStorage.getItem('auth-storage');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.role === 'customer' && parsed.customerId && !parsed.customerMobile) {
        const mobile = localStorage.getItem('customer_mobile');
        if (mobile) {
          parsed.customerMobile = mobile;
        }
      }
      return parsed;
    }
  } catch {
    // Ignore errors
  }
  return { isAuthenticated: false, role: null, username: null, customerId: null, customerMobile: null, organizationId: null };
};

const saveAuthToStorage = (state: { isAuthenticated: boolean; role: UserRole | null; username: string | null; customerId: number | null; customerMobile: string | null; organizationId?: string | null }) => {
  try {
    if (state.role === 'customer') {
      localStorage.setItem('customer_auth', state.isAuthenticated.toString());
      if (state.customerId) {
        localStorage.setItem('customer_id', state.customerId.toString());
      }
      if (state.customerMobile) {
        localStorage.setItem('customer_mobile', state.customerMobile);
      }
      localStorage.setItem('auth-storage', JSON.stringify(state));
    } else {
      localStorage.setItem('auth-storage', JSON.stringify(state));
      localStorage.removeItem('customer_auth');
      localStorage.removeItem('customer_id');
      localStorage.removeItem('customer_mobile');
    }
  } catch {
    // Ignore errors
  }
};

export const useAuthStore = create<AuthState>((set) => ({
  ...loadAuthFromStorage(),
  organizationId: loadAuthFromStorage().organizationId || null,
  login: (username: string, password: string) => {
    // Mock authentication for superadmin/admin/employee
    if (password !== 'test123') {
      return false;
    }

    let role: UserRole = 'employee';
    let organizationId: string | null = null;

    if (username === 'superadmin') {
      // SaaS Product Owner — Master Controller access
      role = 'superadmin';
      organizationId = null;
    } else if (username === 'bankaitech') {
      role = 'admin';
      organizationId = 'org_001';
    } else if (username === 'bankaitech-emp') {
      role = 'employee';
      organizationId = 'org_001';
    } else {
      return false;
    }

    const newState = {
      isAuthenticated: true,
      role,
      username,
      customerId: null,
      customerMobile: null,
      organizationId,
    };
    set(newState);
    saveAuthToStorage(newState);
    return true;
  },
  customerLogin: async (mobile: string, password: string) => {
    const result = await loginCustomer(mobile, password);

    if (result.success && result.customerId && result.customerMobile) {
      const newState = {
        isAuthenticated: true,
        role: 'customer' as UserRole,
        username: result.customerMobile,
        customerId: result.customerId,
        customerMobile: result.customerMobile,
        organizationId: null,
      };
      set(newState);
      saveAuthToStorage(newState);
      return { success: true };
    }

    return {
      success: false,
      message: result.message || 'Invalid mobile number or password',
    };
  },
  logout: () => {
    const newState = {
      isAuthenticated: false,
      role: null,
      username: null,
      customerId: null,
      customerMobile: null,
      organizationId: null,
    };
    set(newState);
    saveAuthToStorage(newState);
    localStorage.removeItem('auth-storage');
    localStorage.removeItem('customer_auth');
    localStorage.removeItem('customer_id');
    localStorage.removeItem('customer_mobile');
  },
  initialize: () => {
    const stored = loadAuthFromStorage();
    set(stored);
  },
}));
