/**
 * Checks the operator's subscription when the dashboard opens.
 * Expired / not started → shows a message, then logs out and goes to the login page.
 *
 * This is the friendly part. The real protection is on the server: every operator API call
 * is refused once the subscription has ended (see backend core/mixins.py → require_org).
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarX2 } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useOrganizationStore } from '@/store/useOrganizationStore';
import { authApi } from '@/api/auth';
import { isMockMode } from '@/lib/apiHelpers';
import {
  SUBSCRIPTION_EVENT,
  SUBSCRIPTION_MSG_KEY,
  getSubscriptionState,
  markGateMounted,
  subscriptionMessage,
  type SubscriptionEventDetail,
} from '@/lib/subscription';
import type { SubscriptionState } from '@/models/types';
import { tr } from '@/lib/lt';
import { platformBillingApi, type MyPlan } from '@/api/platformBilling';
import { RenewSection } from '@/components/settings/lco/PlanAndSms';

const REDIRECT_SECONDS = 6;

export function SubscriptionGate({ children }: { children: React.ReactNode }) {
  const role = useAuthStore((s) => s.role);
  const logout = useAuthStore((s) => s.logout);
  const org = useOrganizationStore((s) => s.currentOrganization);
  const navigate = useNavigate();
  const isOperatorUser = role === 'admin' || role === 'employee';

  const [checked, setChecked] = useState(!isOperatorUser);
  const [blocked, setBlocked] = useState<{ state: SubscriptionState; message: string } | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(REDIRECT_SECONDS);
  // Owner whose subscription ended: show renewal (pay by UPI) here instead of logging out.
  const [renewPlan, setRenewPlan] = useState<MyPlan | null>(null);
  const canRenew = !isMockMode() && role === 'admin' && blocked?.state === 'expired';
  useEffect(() => {
    if (!canRenew) return;
    platformBillingApi.myPlan().then(setRenewPlan).catch(() => setRenewPlan(null));
  }, [canRenew]);
  const reloadPlan = () => { platformBillingApi.myPlan().then(setRenewPlan).catch(() => undefined); };

  // Any API call refused for subscription reasons (e.g. it ended while the app was open).
  useEffect(() => {
    markGateMounted(true);
    const onInactive = (e: Event) => {
      const { code, message } = (e as CustomEvent<SubscriptionEventDetail>).detail;
      setBlocked((prev) => prev ?? { state: code === 'subscription_not_started' ? 'not_started' : 'expired', message });
      setChecked(true);
    };
    window.addEventListener(SUBSCRIPTION_EVENT, onInactive);
    return () => {
      markGateMounted(false);
      window.removeEventListener(SUBSCRIPTION_EVENT, onInactive);
    };
  }, []);

  useEffect(() => {
    if (!isOperatorUser) {
      setChecked(true);
      return;
    }
    let cancelled = false;
    (async () => {
      let state: SubscriptionState = 'active';
      let start: string | null | undefined;
      let end: string | null | undefined;
      if (isMockMode()) {
        start = org?.subscriptionStart;
        end = org?.subscriptionEnd;
        state = getSubscriptionState(start, end);
      } else {
        try {
          const sub = (await authApi.me()).subscription;
          if (sub) {
            ({ state, start, end } = sub);
          }
        } catch {
          // Network problem: don't block here. The server still refuses every API call if expired.
        }
      }
      if (cancelled) return;
      if (state !== 'active') {
        setBlocked((prev) => prev ?? { state, message: subscriptionMessage(state, start, end) });
      }
      setChecked(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [isOperatorUser, org?.id, org?.subscriptionStart, org?.subscriptionEnd]);

  const goToLogin = () => {
    if (blocked) sessionStorage.setItem(SUBSCRIPTION_MSG_KEY, blocked.message);
    logout();
    navigate('/login', { replace: true });
  };

  useEffect(() => {
    if (!blocked || canRenew) return; // owners stay on the renewal screen
    if (secondsLeft <= 0) {
      goToLogin();
      return;
    }
    const id = window.setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [blocked, secondsLeft, canRenew]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (blocked && canRenew && renewPlan) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 sm:p-6">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="rounded-2xl border border-red-200 dark:border-red-900 bg-white dark:bg-gray-900 p-5 text-center space-y-2">
            <CalendarX2 className="w-10 h-10 mx-auto text-red-500" />
            <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">{tr('Subscription ended')}</h1>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {tr('Renew below. After LCO Desk approves your payment, log in again to continue.')}
            </p>
          </div>
          <div className="rounded-2xl bg-white dark:bg-gray-900 p-1">
            <RenewSection plan={renewPlan} onChanged={reloadPlan} />
          </div>
          <button type="button" onClick={goToLogin}
            className="w-full py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 text-sm font-medium bg-white dark:bg-gray-900">
            {tr('Log out')}
          </button>
        </div>
      </div>
    );
  }

  if (blocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-6">
        <div className="max-w-md w-full rounded-2xl border border-red-200 dark:border-red-900 bg-white dark:bg-gray-900 p-8 text-center space-y-4 shadow-sm">
          <CalendarX2 className="w-12 h-12 mx-auto text-red-500" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {blocked.state === 'expired' ? tr('Subscription ended') : tr('Subscription not started')}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">{blocked.message}</p>
          <p className="text-xs text-gray-400">{tr('Going to the login page in {{n}} seconds…', { n: secondsLeft })}</p>
          <button
            type="button"
            onClick={goToLogin}
            className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"
          >
            {tr('Go to login now')}
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default SubscriptionGate;
