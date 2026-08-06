// Client folder removed - SaaS multi-tenant architecture used
import { create } from 'zustand';
import { loginCustomer } from '@/api/customerAuth';
import { usersApi } from '@/api/users';
import { superadminUsersApi } from '@/api/superadminUsers';
import { authApi } from '@/api/auth';
import { useMockApi } from '@/lib/http';
import { useOrganizationStore } from '@/store/useOrganizationStore';
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
  /** JWT access token for real backend */
  token: string | null;
  refreshToken: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  customerLogin: (mobile: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  initialize: () => void;
  hasSAPermission: (key: SAPermissionKey) => boolean;
}

type StoredAuth = {
  isAuthenticated: boolean;
  role: UserRole | null;
  username: string | null;
  customerId: number | null;
  customerMobile: string | null;
  organizationId: string | null;
  allowedModules: ModuleKey[] | null;
  superAdminRole: SuperAdminRole | null;
  saPermissions: SAPermissionKey[] | null;
  token: string | null;
  refreshToken: string | null;
};

const emptyAuth = (): StoredAuth => ({
  isAuthenticated: false,
  role: null,
  username: null,
  customerId: null,
  customerMobile: null,
  organizationId: null,
  allowedModules: null,
  superAdminRole: null,
  saPermissions: null,
  token: null,
  refreshToken: null,
});

const loadAuthFromStorage = (): StoredAuth => {
  try {
    const customerAuth = localStorage.getItem('customer_auth');
    const customerId = localStorage.getItem('customer_id');
    const customerMobile = localStorage.getItem('customer_mobile');

    if (customerAuth === 'true' && customerId && customerMobile) {
      const stored = localStorage.getItem('auth-storage');
      let token: string | null = null;
      let refreshToken: string | null = null;
      let organizationId: string | null = null;
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<StoredAuth>;
        token = parsed.token ?? null;
        refreshToken = parsed.refreshToken ?? null;
        organizationId = parsed.organizationId ?? null;
      }
      return {
        ...emptyAuth(),
        isAuthenticated: true,
        role: 'customer',
        username: customerMobile,
        customerId: parseInt(customerId, 10),
        customerMobile,
        organizationId,
        token,
        refreshToken,
      };
    }

    const stored = localStorage.getItem('auth-storage');
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<StoredAuth> & { accessToken?: string };
      return {
        ...emptyAuth(),
        ...parsed,
        token: parsed.token ?? parsed.accessToken ?? null,
        refreshToken: parsed.refreshToken ?? null,
        organizationId: parsed.organizationId ?? null,
        allowedModules: parsed.allowedModules ?? null,
        superAdminRole: parsed.superAdminRole ?? null,
        saPermissions: parsed.saPermissions ?? null,
      };
    }
  } catch {
    // Ignore errors
  }
  return emptyAuth();
};

const saveAuthToStorage = (state: StoredAuth) => {
  try {
    if (state.organizationId) {
      localStorage.setItem('current_org_id', state.organizationId);
    } else {
      localStorage.removeItem('current_org_id');
    }

    if (state.role === 'customer') {
      localStorage.setItem('customer_auth', state.isAuthenticated.toString());
      if (state.customerId) localStorage.setItem('customer_id', state.customerId.toString());
      if (state.customerMobile) localStorage.setItem('customer_mobile', state.customerMobile);
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

function mapBackendRole(role: string | undefined): {
  role: UserRole;
  superAdminRole: SuperAdminRole | null;
} {
  const r = (role || 'employee').toLowerCase();
  if (r === 'superadmin' || r === 'super_admin') {
    return { role: 'superadmin', superAdminRole: 'super_admin' };
  }
  if (r === 'manager') {
    return { role: 'superadmin', superAdminRole: 'manager' };
  }
  if (r === 'admin') return { role: 'admin', superAdminRole: null };
  if (r === 'customer') return { role: 'customer', superAdminRole: null };
  return { role: 'employee', superAdminRole: null };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  ...loadAuthFromStorage(),

  hasSAPermission: (key: SAPermissionKey) => {
    const { role, superAdminRole, saPermissions } = get();
    if (role !== 'superadmin') return false;
    if (superAdminRole === 'super_admin' || superAdminRole === null) return true;
    return saPermissions?.includes(key) ?? false;
  },

  login: async (username: string, password: string) => {
    // ── Real backend ────────────────────────────────────────────────────────
    if (!useMockApi()) {
      try {
        const result = await authApi.login(username, password);
        const mapped = mapBackendRole(String(result.user.role));
        const isCustomer = mapped.role === 'customer';

        const newState: StoredAuth = {
          isAuthenticated: true,
          role: mapped.role,
          username: result.user.username || username,
          customerId: isCustomer ? (result.user.customerId ?? result.user.id ?? null) : null,
          customerMobile: isCustomer ? (result.user.mobile ?? result.user.username ?? null) : null,
          organizationId: result.user.organizationId ?? null,
          allowedModules: result.user.allowedModules ?? null,
          superAdminRole: result.user.superAdminRole ?? mapped.superAdminRole,
          saPermissions:
            mapped.role === 'superadmin' && mapped.superAdminRole === 'super_admin'
              ? [...ALL_SA_PERMISSIONS]
              : (result.user.allowedPermissions ?? null),
          token: result.accessToken,
          refreshToken: result.refreshToken ?? null,
        };
        set(newState);
        saveAuthToStorage(newState);
        return true;
      } catch {
        return false;
      }
    }

    // ── Mock fallback ───────────────────────────────────────────────────────
    let role: UserRole = 'employee';
    let organizationId: string | null = null;
    let allowedModules: ModuleKey[] | null = null;
    let superAdminRole: SuperAdminRole | null = null;
    let saPermissions: SAPermissionKey[] | null = null;

    const saUsers = await superadminUsersApi.getAll();
    const matchedSA = saUsers.find(
      (u) => u.username.toLowerCase() === username.toLowerCase() && u.password === password && u.status === 'active'
    );

    if (matchedSA) {
      role = 'superadmin';
      superAdminRole = matchedSA.role;
      saPermissions =
        matchedSA.role === 'super_admin' ? [...ALL_SA_PERMISSIONS] : matchedSA.allowedPermissions || [];
    } else {
      const allUsers = await usersApi.getAll();
      const matchedUser = allUsers.find(
        (u) =>
          u.username.toLowerCase() === username.toLowerCase() && u.password === password && u.status === 'active'
      );
      if (!matchedUser) return false;
      role = matchedUser.role;
      organizationId = matchedUser.organizationId;
      allowedModules = matchedUser.allowedModules || null;
    }

    const newState: StoredAuth = {
      isAuthenticated: true,
      role,
      username,
      customerId: null,
      customerMobile: null,
      organizationId,
      allowedModules,
      superAdminRole,
      saPermissions,
      token: null,
      refreshToken: null,
    };
    set(newState);
    saveAuthToStorage(newState);
    return true;
  },

  customerLogin: async (mobile: string, password: string) => {
    // Real backend: unified login accepts mobile as username
    if (!useMockApi()) {
      try {
        const result = await authApi.login(mobile, password);
        const mapped = mapBackendRole(String(result.user.role));
        if (mapped.role !== 'customer') {
          return { success: false, message: 'Invalid mobile number or password' };
        }
        const newState: StoredAuth = {
          isAuthenticated: true,
          role: 'customer',
          username: result.user.mobile ?? result.user.username ?? mobile,
          customerId: result.user.customerId ?? result.user.id ?? null,
          customerMobile: result.user.mobile ?? result.user.username ?? mobile,
          organizationId: result.user.organizationId ?? null,
          allowedModules: null,
          superAdminRole: null,
          saPermissions: null,
          token: result.accessToken,
          refreshToken: result.refreshToken ?? null,
        };
        set(newState);
        saveAuthToStorage(newState);
        return { success: true };
      } catch {
        return { success: false, message: 'Invalid mobile number or password' };
      }
    }

    const result = await loginCustomer(mobile, password);
    if (result.success && result.customerId && result.customerMobile) {
      const newState: StoredAuth = {
        isAuthenticated: true,
        role: 'customer',
        username: result.customerMobile,
        customerId: result.customerId,
        customerMobile: result.customerMobile,
        organizationId: null,
        allowedModules: null,
        superAdminRole: null,
        saPermissions: null,
        token: null,
        refreshToken: null,
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
    if (!useMockApi()) {
      void authApi.logout();
    }
    useOrganizationStore.getState().clearOrganizationCache();
    const newState = emptyAuth();
    set(newState);
    saveAuthToStorage(newState);
    localStorage.removeItem('auth-storage');
    localStorage.removeItem('customer_auth');
    localStorage.removeItem('customer_id');
    localStorage.removeItem('customer_mobile');
    localStorage.removeItem('current_org_id');
  },

  initialize: () => {
    const stored = loadAuthFromStorage();
    set(stored);
  },
}));
