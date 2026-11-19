/**
 * After a Cashfree payment, ask our server to check the order with Cashfree (never trust the
 * browser alone), show the result, and tell the Plan page to reload.
 *  - Browser tab: Cashfree sends the operator back with ?order_id=lcod_... (useCashfreeReturn).
 *  - Installed app: the popup closes and UpiPayPanel calls checkOnlinePayment directly.
 */
import { useEffect } from 'react';
import { PAYMENTS_CHANGED_EVENT, platformBillingApi, type PlatformPayment } from '@/api/platformBilling';
import { showError, showInfo, showSuccess } from '@/utils/toast';
import { tr } from '@/lib/lt';

const wait = (ms: number) => new Promise((r) => window.setTimeout(r, ms));

/**
 * finished = Cashfree said the payment went through, so keep checking for a few seconds while
 * the bank confirms. Not finished (popup closed) = check once.
 */
export async function checkOnlinePayment(orderId: string, finished = true): Promise<PlatformPayment | null> {
  try {
    let p = await platformBillingApi.verify(orderId);
    for (let i = 0; finished && p.status === 'created' && i < 4; i += 1) {
      await wait(2500);
      p = await platformBillingApi.verify(orderId);
    }
    if (p.status === 'approved') {
      if (p.kind === 'sms') {
        showSuccess(tr('Payment received. {{n}} SMS added.', { n: p.quantity }));
      } else {
        showSuccess(tr('Payment received. Subscription renewed.'));
        window.setTimeout(() => window.location.reload(), 1500); // opens the app again if it had ended
        return p;
      }
    } else if (p.status === 'rejected') {
      showError(tr('Payment was not completed.'));
    } else if (finished) {
      showInfo(tr('Payment is being confirmed. Check again in a few minutes.'));
    } else {
      showInfo(tr('Payment not finished. If you paid, it will show here in a few minutes.'));
    }
    window.dispatchEvent(new Event(PAYMENTS_CHANGED_EVENT));
    return p;
  } catch (e) {
    showError(e instanceof Error ? e.message : tr('Could not check the payment now.'));
    return null;
  }
}

export function useCashfreeReturn(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const url = new URL(window.location.href);
    const orderId = url.searchParams.get('order_id');
    if (!orderId || !orderId.startsWith('lcod_')) return;
    // Remove it first, so a page refresh does not check again.
    url.searchParams.delete('order_id');
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
    checkOnlinePayment(orderId);
  }, [enabled]);
}
