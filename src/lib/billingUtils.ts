import type { Customer, Product } from '@/models/types';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const startOfDay = (d: Date): Date => {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

/**
 * Compute the next billing due date for a customer based on product config.
 *
 * - Cable:
 *   Uses product.cutoffDate (day of month, 1–28): next occurrence of that day.
 * - Internet:
 *   30 days from paymentUpdatedAt when paid; otherwise today.
 */
export function getNextDueDateForCustomer(customer: Customer, product?: Product | null): Date | null {
  if (!product) return null;

  const today = startOfDay(new Date());

  if (product.productType === 'cable') {
    const cutoff = product.cutoffDate && product.cutoffDate >= 1 && product.cutoffDate <= 28
      ? product.cutoffDate
      : 1;

    const year = today.getFullYear();
    const month = today.getMonth();

    const thisMonthCutoff = startOfDay(new Date(year, month, cutoff));
    if (today.getTime() <= thisMonthCutoff.getTime()) {
      return thisMonthCutoff;
    }
    // Next month
    return startOfDay(new Date(year, month + 1, cutoff));
  }

  // Internet: 30 days from last payment for paid customers; otherwise today
  let baseDate: Date;
  if (customer.paymentStatus === 'paid' && customer.paymentUpdatedAt) {
    baseDate = startOfDay(new Date(customer.paymentUpdatedAt));
  } else {
    baseDate = today;
  }

  const next = new Date(baseDate);
  next.setDate(next.getDate() + 30);
  return startOfDay(next);
}

export function diffInDays(from: Date, to: Date): number {
  const a = startOfDay(from).getTime();
  const b = startOfDay(to).getTime();
  return Math.round((b - a) / MS_PER_DAY);
}

