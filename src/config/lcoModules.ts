import type { ModuleKey, SettingsTabKey } from '@/models/types';

/**
 * Menu modules for a cable / broadband operator, with plain names.
 * The app owner enables them per operator; the operator owner then picks them per field staff member.
 * `staff: false` = office only (never given to agents / technicians; the server enforces this too).
 */
export const LCO_MODULES: { key: ModuleKey; label: string; staff: boolean; ready: boolean }[] = [
  { key: 'dashboard', label: 'Dashboard', staff: true, ready: true },
  { key: 'contacts', label: 'Customers', staff: true, ready: true },
  { key: 'collect', label: 'Collect', staff: true, ready: true },
  { key: 'duty', label: 'My Duty (location)', staff: true, ready: true },
  { key: 'live-map', label: 'Live Map', staff: false, ready: true },
  { key: 'cutoff', label: 'Cut-off List', staff: false, ready: true },
  { key: 'invoices', label: 'Sales', staff: true, ready: true },
  { key: 'purchase-invoices', label: 'Purchase', staff: false, ready: true },
  { key: 'inventory-products', label: 'Stock', staff: true, ready: true },
  { key: 'products', label: 'Providers & Plans', staff: false, ready: true },
  { key: 'users', label: 'Staff', staff: false, ready: true },
  { key: 'settings', label: 'Settings', staff: false, ready: true },
  { key: 'sms-log', label: 'SMS Log', staff: false, ready: true },
  // Not built on the LCO Desk server yet — shown as "coming soon" and can't be switched on.
  { key: 'connection-requests', label: 'New Connections', staff: true, ready: false },
  { key: 'complaints', label: 'Complaints', staff: true, ready: false },
  { key: 'expenses', label: 'Expenses', staff: false, ready: false },
  { key: 'reports', label: 'Reports', staff: false, ready: false },
  { key: 'audit-trail', label: 'Audit Log', staff: false, ready: false },
];

export const DEFAULT_OPERATOR_MODULES: ModuleKey[] = LCO_MODULES.filter((m) => m.ready).map((m) => m.key);

export const DEFAULT_AGENT_MODULES: ModuleKey[] = ['dashboard', 'contacts', 'collect', 'duty'];

export const LCO_SETTINGS_TABS: { key: SettingsTabKey; label: string }[] = [
  { key: 'company', label: 'Business Profile' },
  { key: 'products', label: 'Providers & Plans' },
  { key: 'billing', label: 'Billing & UPI' },
  { key: 'sms-templates', label: 'SMS' },
];
export const DEFAULT_SETTINGS_TABS: SettingsTabKey[] = ['company', 'products', 'billing', 'sms-templates'];

export const moduleLabel = (key: string) => LCO_MODULES.find((m) => m.key === key)?.label ?? key;
