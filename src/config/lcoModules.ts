import type { ModuleKey, SettingsTabKey } from '@/models/types';

/**
 * Menu modules for a cable / broadband operator, with plain names.
 * The app owner enables them per operator; the operator owner then picks them per field staff member.
 * `staff: false` = office only (never given to agents / technicians; the server enforces this too).
 */
export const LCO_MODULES: { key: ModuleKey; label: string; staff: boolean }[] = [
  { key: 'dashboard', label: 'Dashboard', staff: true },
  { key: 'contacts', label: 'Customers', staff: true },
  { key: 'collect', label: 'Collect', staff: true },
  { key: 'duty', label: 'My Duty (location)', staff: true },
  { key: 'live-map', label: 'Live Map', staff: false },
  { key: 'cutoff', label: 'Cut-off List', staff: false },
  { key: 'payments', label: 'Payments', staff: true },
  { key: 'invoices', label: 'Sales', staff: true },
  { key: 'purchase-invoices', label: 'Purchase', staff: true },
  { key: 'inventory-products', label: 'Stock', staff: true },
  { key: 'products', label: 'Providers & Plans', staff: true },
  { key: 'connection-requests', label: 'New Connections', staff: true },
  { key: 'complaints', label: 'Complaints', staff: true },
  { key: 'expenses', label: 'Expenses', staff: true },
  { key: 'reports', label: 'Reports', staff: true },
  { key: 'users', label: 'Staff', staff: false },
  { key: 'settings', label: 'Settings', staff: false },
  { key: 'audit-trail', label: 'Audit Log', staff: false },
];

export const DEFAULT_OPERATOR_MODULES: ModuleKey[] = [
  'dashboard', 'contacts', 'collect', 'duty', 'live-map', 'cutoff', 'payments', 'invoices', 'purchase-invoices',
  'inventory-products', 'products', 'connection-requests', 'complaints', 'reports', 'users', 'settings',
];

/** What a new collection agent gets unless the owner changes it. */
export const DEFAULT_AGENT_MODULES: ModuleKey[] = ['dashboard', 'contacts', 'collect', 'duty'];

export const LCO_SETTINGS_TABS: { key: SettingsTabKey; label: string }[] = [
  { key: 'company', label: 'Business Profile' },
  { key: 'products', label: 'Providers & Plans' },
  { key: 'billing', label: 'Billing & UPI' },
  { key: 'sms-templates', label: 'SMS' },
];
export const DEFAULT_SETTINGS_TABS: SettingsTabKey[] = ['company', 'products', 'billing', 'sms-templates'];

export const moduleLabel = (key: string) => LCO_MODULES.find((m) => m.key === key)?.label ?? key;
