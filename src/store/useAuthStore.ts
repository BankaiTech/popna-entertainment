import { create } from 'zustand';
import { loginCustomer } from '@/api/customerAuth';

export type UserRole = 'admin' | 'employee' | 'customer';

interface AuthState {
  isAuthenticated: boolean;
  role: UserRole | null;
  username: string | null;
  customerId: number | null; // For customer role
  customerMobile: string | null; // For customer role
  login: (username: string, password: string) => boolean;
  customerLogin: (mobile: string, password: string) => { success: boolean; message?: string };
  logout: () => void;
  initialize: () => void;
}

// Load from localStorage on initialization
const loadAuthFromStorage = () => {
  try {
    // Try new customer auth format first
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
      };
    }
    
    // Fallback to old admin/employee auth format
    const stored = localStorage.getItem('auth-storage');
    if (stored) {
      const parsed = JSON.parse(stored);
      // Ensure customerMobile is set if it's a customer
      if (parsed.role === 'customer' && parsed.customerId && !parsed.customerMobile) {
        // Try to get mobile from customer_id
        const mobile = localStorage.getItem('customer_mobile');
        if (mobile) {
          parsed.customerMobile = mobile;
        }
      }
      return parsed;
    }
  } catch (e) {
    // Ignore errors
  }
  return { isAuthenticated: false, role: null, username: null, customerId: null, customerMobile: null };
};

// Save to localStorage
const saveAuthToStorage = (state: { isAuthenticated: boolean; role: UserRole | null; username: string | null; customerId: number | null; customerMobile: string | null }) => {
  try {
    if (state.role === 'customer') {
      // Save customer auth in separate keys
      localStorage.setItem('customer_auth', state.isAuthenticated.toString());
      if (state.customerId) {
        localStorage.setItem('customer_id', state.customerId.toString());
      }
      if (state.customerMobile) {
        localStorage.setItem('customer_mobile', state.customerMobile);
      }
      // Also save in auth-storage for compatibility
      localStorage.setItem('auth-storage', JSON.stringify(state));
    } else {
      // Admin/Employee auth
      localStorage.setItem('auth-storage', JSON.stringify(state));
      // Clear customer-specific keys
      localStorage.removeItem('customer_auth');
      localStorage.removeItem('customer_id');
      localStorage.removeItem('customer_mobile');
    }
  } catch (e) {
    // Ignore errors
  }
};

export const useAuthStore = create<AuthState>((set) => ({
  ...loadAuthFromStorage(),
  login: (username: string, password: string) => {
    // Mock authentication for admin/employee
    if (password !== 'test123') {
      return false;
    }
    
    let role: UserRole = 'employee';
    if (username === 'popna') {
      role = 'admin';
    } else if (username === 'popna-emp') {
      role = 'employee';
    } else {
      return false;
    }

    const newState = {
      isAuthenticated: true,
      role,
      username,
      customerId: null,
      customerMobile: null,
    };
    set(newState);
    saveAuthToStorage(newState);
    return true;
  },
  customerLogin: (mobile: string, password: string) => {
    // Replace with secure auth & hashing later
    const result = loginCustomer(mobile, password);

    if (result.success && result.customerId && result.customerMobile) {
      const newState = {
        isAuthenticated: true,
        role: 'customer' as UserRole,
        username: result.customerMobile,
        customerId: result.customerId,
        customerMobile: result.customerMobile,
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
    };
    set(newState);
    saveAuthToStorage(newState);
    // Clear all auth-related localStorage
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
