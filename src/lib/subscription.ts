import { tr } from '@/lib/lt';
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
  // Accepts a date (2026-11-17) or a date-time from the server (2026-11-17T10:48:05+05:30).
  const [y, m, d] = value.slice(0, 10).split('-');
  return d && m && y ? `${d}-${m}-${y}` : value;
}

/** "17-11-2026, 06:15 PM" (India time) for a server date-time. */
export function formatDateTimeIN(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return formatDateIN(value);
  const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
  return `${formatDateIN(d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }))}, ${time.toUpperCase()}`;
}

export function subscriptionMessage(state: SubscriptionState, start?: string | null, end?: string | null): string {
  // Built here (not the server's English sentence) so it shows in the person's language.
  if (state === 'not_started') {
    return tr('Your LCO Desk subscription starts on {{date}}.', { date: formatDateIN(start) });
  }
  return tr('Your LCO Desk subscription ended on {{date}}. Contact LCO Desk to renew.', { date: formatDateIN(end) });
}
