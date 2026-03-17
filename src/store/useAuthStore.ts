// Client folder removed - SaaS multi-tenant architecture used
import { create } from 'zustand';
import { loginCustomer } from '@/api/customerAuth';
import { usersApi } from '@/api/users';
import { superadminUsersApi } from '@/api/superadminUsers';
import type { ModuleKey, SAPermissionKey, SuperAdminRole } from '@/models/types';
import { ALL_SA_PERMISSIONS } from '@/models/types';

// SaaS Ready - superadmin for product owner, admin/employee for organizations
export type UserRole = 'superadmin' | 'admin' | 'employee' | 'customer';

interface AuthState {
  isAuthenticated: boolean;
  role: UserRole | null;
  username: string | null;
  customerId: number | null;
  customerMobile: string | null;
  organizationId: string | null;
  allowedModules: ModuleKey[] | null;
  superAdminRole: SuperAdminRole | null;
  saPermissions: SAPermissionKey[] | null;
  login: (username: string, password: string) => Promise<boolean>;
  customerLogin: (mobile: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  initialize: () => void;
  hasSAPermission: (key: SAPermissionKey) => boolean;
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
        allowedModules: null,
        superAdminRole: null,
        saPermissions: null,
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
  return {
    isAuthenticated: false, role: null, username: null, customerId: null,
    customerMobile: null, organizationId: null, allowedModules: null,
    superAdminRole: null, saPermissions: null,
  };
};

const saveAuthToStorage = (state: {
  isAuthenticated: boolean; role: UserRole | null; username: string | null;
  customerId: number | null; customerMobile: string | null;
  organizationId?: string | null; allowedModules?: ModuleKey[] | null;
  superAdminRole?: SuperAdminRole | null; saPermissions?: SAPermissionKey[] | null;
}) => {
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

export const useAuthStore = create<AuthState>((set, get) => ({
  ...loadAuthFromStorage(),
  organizationId: loadAuthFromStorage().organizationId || null,
  allowedModules: loadAuthFromStorage().allowedModules || null,
  superAdminRole: loadAuthFromStorage().superAdminRole || null,
  saPermissions: loadAuthFromStorage().saPermissions || null,

  hasSAPermission: (key: SAPermissionKey) => {
    const { role, superAdminRole, saPermissions } = get();
    if (role !== 'superadmin') return false;
    // Full access for super_admin role or legacy sessions without superAdminRole set
    if (superAdminRole === 'super_admin' || superAdminRole === null) return true;
    return saPermissions?.includes(key) ?? false;
  },

  login: async (username: string, password: string) => {
    let role: UserRole = 'employee';
    let organizationId: string | null = null;
    let allowedModules: ModuleKey[] | null = null;
    let superAdminRole: SuperAdminRole | null = null;
    let saPermissions: SAPermissionKey[] | null = null;

    // 1) Try superadmin users
    const saUsers = await superadminUsersApi.getAll();
    const matchedSA = saUsers.find(
      (u) => u.username.toLowerCase() === username.toLowerCase() && u.password === password && u.status === 'active'
    );

    if (matchedSA) {
      role = 'superadmin';
      superAdminRole = matchedSA.role;
      saPermissions = matchedSA.role === 'super_admin'
        ? [...ALL_SA_PERMISSIONS]
        : (matchedSA.allowedPermissions || []);
    } else {
      // 3) Try org users (admin/employee)
      const allUsers = await usersApi.getAll();
      const matchedUser = allUsers.find(
        (u) => u.username.toLowerCase() === username.toLowerCase() && u.password === password && u.status === 'active'
      );
      if (!matchedUser) return false;
      role = matchedUser.role;
      organizationId = matchedUser.organizationId;
      allowedModules = matchedUser.allowedModules || null;
    }

    const newState = {
      isAuthenticated: true,
      role,
      username,
      customerId: null,
      customerMobile: null,
      organizationId,
      allowedModules,
      superAdminRole,
      saPermissions,
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
        allowedModules: null,
        superAdminRole: null,
        saPermissions: null,
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
      allowedModules: null,
      superAdminRole: null,
      saPermissions: null,
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
