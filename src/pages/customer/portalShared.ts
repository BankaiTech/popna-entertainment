import i18n from '@/i18n';
import { tr } from '@/lib/lt';
import type { ComplaintCategory, PortalProfile } from '@/api/customerPortal';

/** Login page opens on the tab used last time on this phone. */
export const LOGIN_AS_KEY = 'login-as';

export type PortalContext = { profile: PortalProfile | null; reload: () => void };

const locale = () => `${(i18n.language || 'en').slice(0, 2)}-IN`;

export const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString(locale(), { day: 'numeric', month: 'short', year: 'numeric' }) : '';

export const fmtMonth = (iso: string) =>
  new Date(iso).toLocaleDateString(locale(), { month: 'long', year: 'numeric' });

export const rupees = (v: string | number) => {
  const n = Number(v) || 0;
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
};

export const billStatusLabel = (status: string, balance: string) => {
  if (status === 'paid') return tr('Paid');
  if (status === 'partial') return tr('Part paid');
  return Number(balance) <= 0 ? tr('Free connection') : tr('Not paid');
};

export const billStatusClass = (status: string) =>
  status === 'paid' ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
    : status === 'partial' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
      : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300';

export const methodLabel = (m: string) => (m === 'upi' ? 'UPI' : m === 'cash' ? tr('Cash') : m.toUpperCase());

/** Problems a customer can report. Labels are translated at render time. */
export const CATEGORIES: { key: ComplaintCategory; label: () => string; cable: boolean; internet: boolean }[] = [
  { key: 'no_signal', label: () => tr('No signal / no channels'), cable: true, internet: false },
  { key: 'box', label: () => tr('Set-top box / remote problem'), cable: true, internet: true },
  { key: 'cable', label: () => tr('Cable cut / wire problem'), cable: true, internet: true },
  { key: 'no_internet', label: () => tr('No internet'), cable: false, internet: true },
  { key: 'slow_internet', label: () => tr('Slow internet'), cable: false, internet: true },
  { key: 'billing', label: () => tr('Bill / payment question'), cable: true, internet: true },
  { key: 'other', label: () => tr('Other'), cable: true, internet: true },
];

export const categoryLabel = (key: string) => CATEGORIES.find((c) => c.key === key)?.label() ?? key;

export const complaintStatusLabel = (s: string) =>
  ({ open: tr('Received'), assigned: tr('Technician assigned'), resolved: tr('Fixed'), cancelled: tr('Closed') }[s] ?? s);

export const complaintStatusClass = (s: string) =>
  ({ open: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
    assigned: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
    resolved: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
    cancelled: 'bg-gray-100 text-gray-600' }[s] ?? 'bg-gray-100 text-gray-600');
