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
    if (!blocked) return;
    if (secondsLeft <= 0) {
      goToLogin();
      return;
    }
    const id = window.setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [blocked, secondsLeft]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (blocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-6">
        <div className="max-w-md w-full rounded-2xl border border-red-200 dark:border-red-900 bg-white dark:bg-gray-900 p-8 text-center space-y-4 shadow-sm">
          <CalendarX2 className="w-12 h-12 mx-auto text-red-500" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {blocked.state === 'expired' ? 'Subscription ended' : 'Subscription not started'}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">{blocked.message}</p>
          <p className="text-xs text-gray-400">Going to the login page in {secondsLeft} seconds…</p>
          <button
            type="button"
            onClick={goToLogin}
            className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"
          >
            Go to login now
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default SubscriptionGate;
