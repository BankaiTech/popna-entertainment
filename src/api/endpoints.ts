/**
 * Central REST endpoint paths for the Popna backend API.
 * Base URL is configured via VITE_API_BASE_URL (default: http://127.0.0.1:3000/api).
 */
export const endpoints = {
  auth: {
    login: '/auth/login',
    logout: '/auth/logout',
    refresh: '/auth/refresh',
    me: '/auth/me',
  },
  users: '/users',
  superadminUsers: '/superadmin/users',
  organizations: '/organizations',
  contacts: '/contacts',
  inventory: '/inventory',
  inventoryLowStock: '/inventory/low-stock',
  activities: '/activities',
  invoices: '/invoices',
  pos: '/pos',
  documents: '/documents',
  subscriptions: '/subscriptions',
  settings: '/settings',
  settingsWebsite: '/settings/website',
  auditLog: '/audit-log',
  smsLogs: '/sms-logs',
  smsSend: '/sms/send',
  signupRequests: '/signup-requests',
  dashboardStats: '/dashboard/stats',
  dashboardLastCustomers: '/dashboard/last-customers',
  customerDashboard: '/customer/dashboard',
} as const;
