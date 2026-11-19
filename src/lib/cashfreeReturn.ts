/**
 * Cashfree sends the operator back to Settings > Plan & SMS with ?order_id=lcod_...
 * We ask our server to check the order with Cashfree (never trust the URL alone),
 * show the result, and tell the Plan page to reload.
 */
import { useEffect } from 'react';
import { PAYMENTS_CHANGED_EVENT, platformBillingApi } from '@/api/platformBilling';
import { showError, showInfo, showSuccess } from '@/utils/toast';
import { useLt } from '@/lib/lt';

export function useCashfreeReturn(enabled: boolean) {
  const tr = useLt();
  useEffect(() => {
    if (!enabled) return;
    const url = new URL(window.location.href);
    const orderId = url.searchParams.get('order_id');
    if (!orderId || !orderId.startsWith('lcod_')) return;
    // Remove it first, so a page refresh does not check again.
    url.searchParams.delete('order_id');
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);

    platformBillingApi.verify(orderId)
      .then((p) => {
        if (p.status === 'approved') {
          if (p.kind === 'sms') {
            showSuccess(tr('Payment received. {{n}} SMS added.', { n: p.quantity }));
          } else {
            showSuccess(tr('Payment received. Subscription renewed.'));
            window.setTimeout(() => window.location.reload(), 1500); // opens the app again if it had ended
            return;
          }
        } else if (p.status === 'rejected') {
          showError(tr('Payment was not completed.'));
        } else {
          showInfo(tr('Payment is being confirmed. Check again in a few minutes.'));
        }
        window.dispatchEvent(new Event(PAYMENTS_CHANGED_EVENT));
      })
      .catch((e) => showError(e instanceof Error ? e.message : tr('Could not check the payment now.')));
  }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps
}
