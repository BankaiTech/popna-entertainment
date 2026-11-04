import type { SubscriptionState } from '@/models/types';

/** Message shown on the login page after a forced logout. */
export const SUBSCRIPTION_MSG_KEY = 'lcodesk_subscription_message';

/** Fired by the API client when the server says the subscription is not active. */
export const SUBSCRIPTION_EVENT = 'lcodesk:subscription-inactive';
export type SubscriptionEventDetail = { code: string; message: string };

// The gate shows the "subscription ended" screen. When it isn't on screen (e.g. login page),
// the API client falls back to logging out directly.
let gateMounted = 0;
export const markGateMounted = (on: boolean) => {
  gateMounted += on ? 1 : -1;
};
export const isGateMounted = () => gateMounted > 0;

/** Today's date in India as YYYY-MM-DD (not the device's UTC date). */
export function todayInIndia(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
}

/** Same rule as the server: the end date itself is still usable. */
export function getSubscriptionState(start?: string | null, end?: string | null): SubscriptionState {
  const today = todayInIndia();
  if (start && today < start) return 'not_started';
  if (end && today > end) return 'expired';
  return 'active';
}

/** '2026-11-30' → '30-11-2026' */
export function formatDateIN(value?: string | null): string {
  if (!value) return '—';
  const [y, m, d] = value.split('-');
  return d && m && y ? `${d}-${m}-${y}` : value;
}

export function subscriptionMessage(state: SubscriptionState, start?: string | null, end?: string | null): string {
  if (state === 'not_started') {
    return `Your LCO Desk subscription starts on ${formatDateIN(start)}.`;
  }
  return `Your LCO Desk subscription ended on ${formatDateIN(end)}. Contact LCO Desk to renew.`;
}
