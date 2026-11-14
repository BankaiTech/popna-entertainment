import { tr } from '@/lib/lt';
import { cn } from '@/lib/utils';
import type { Customer } from '@/models/types';

type Status = NonNullable<Customer['serviceStatus']>;

const STYLES: Record<Status, { text: string; tone: string }> = {
  active: { text: 'Active', tone: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200' },
  due: { text: 'Due', tone: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200' },
  cut_off: { text: 'Cut-off', tone: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200' },
  expiring: { text: 'Expiring', tone: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200' },
  expired: { text: 'Expired', tone: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200' },
  not_started: { text: 'Not activated', tone: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
};

/** Cable: Active / Due / Cut-off. Internet: Active / Expiring / Expired / Not activated. */
export function ServiceStatusBadge({ status, className }: { status?: Customer['serviceStatus']; className?: string }) {
  if (!status || status === 'active') return null;
  const s = STYLES[status];
  return <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap', s.tone, className)}>{tr(s.text)}</span>;
}

export default ServiceStatusBadge;
