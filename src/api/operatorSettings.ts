/** The logged-in operator's own settings (GET/PATCH /organizations/{id}). Django API only. */
import apiClient from '@/lib/apiClient';
import { toCamelCase, toSnakeCase, unwrapApiData } from '@/lib/apiHelpers';
import { endpoints } from './endpoints';

export interface OperatorSettings {
  id: number;
  name: string;
  code: string;
  // Business profile
  businessAddress: string;
  gstin: string;
  contactPhone: string;
  contactEmail: string;
  upiId: string;
  upiPayeeName: string;
  smsDisplayName: string;
  // Billing & reminders
  defaultDueDay: number;
  reminderDaysBefore: number;
  secondReminderDaysBefore: number | null;
  internetRemindersEnabled: boolean;
  internetPaymentSmsEnabled: boolean;
  ownerAlertMode: 'per_payment' | 'daily_summary';
  ownerMobile: string;
  extraAlertMobiles: string;
  // Field staff
  trackingEnabled: boolean;
  requireGpsForCollection: boolean;
  requireCheckinForCollection: boolean;
  // Read-only, set by the app owner
  subscriptionStart: string | null;
  subscriptionEnd: string | null;
  subscriptionState: 'active' | 'expired' | 'not_started';
  daysLeft: number | null;
  maxProviders: number | null;
  maxPlans: number | null;
  providersUsed: number;
  plansUsed: number;
}

export const operatorSettingsApi = {
  get: async (orgId: string | number): Promise<OperatorSettings> =>
    toCamelCase<OperatorSettings>(unwrapApiData(await apiClient.get(`${endpoints.organizations}/${orgId}`))),
  update: async (orgId: string | number, changes: Partial<OperatorSettings>): Promise<OperatorSettings> =>
    toCamelCase<OperatorSettings>(
      unwrapApiData(await apiClient.patch(`${endpoints.organizations}/${orgId}`, toSnakeCase(changes as Record<string, unknown>))),
    ),
};

/** Django field errors → { fieldInCamelCase: message } so forms can show them next to inputs. */
export function fieldErrors(err: unknown): Record<string, string> {
  const data = (err as { response?: { data?: unknown } })?.response?.data;
  if (!data || typeof data !== 'object') return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    const msg = Array.isArray(value) ? value[0] : value;
    if (typeof msg === 'string') out[key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())] = msg;
  }
  return out;
}
