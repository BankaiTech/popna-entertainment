/**
 * Settings > Plan & SMS (owner / manager).
 * Subscription + renewal, SMS used this month, a live estimate of SMS needed per month
 * (from today's customers and reminder settings), buying SMS, and payment history.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, MessageSquare, Calculator, Receipt, AlertTriangle } from 'lucide-react';
import { platformBillingApi, type MyPlan, type PlatformPayment } from '@/api/platformBilling';
import UpiPayPanel from '@/components/billing/UpiPayPanel';
import { formatDateIN } from '@/lib/subscription';
import { useLt } from '@/lib/lt';
import { cn } from '@/lib/utils';

const rupees = (v: number | string) =>
  `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function Section({ icon: Icon, title, children }: { icon: typeof MessageSquare; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border p-4 sm:p-5 space-y-4 min-w-0">
      <h3 className="font-semibold flex items-center gap-2"><Icon className="w-5 h-5 text-primary shrink-0" />{title}</h3>
      {children}
    </section>
  );
}

function Row({ label, value, strong }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <div className={cn('flex justify-between gap-4 text-sm', strong && 'font-semibold pt-2 border-t border-border')}>
      <span className={strong ? '' : 'text-muted-foreground'}>{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

export function RenewSection({ plan, onChanged }: { plan: MyPlan; onChanged: () => void }) {
  const tr = useLt();
  const [months, setMonths] = useState(1);
  const fee = plan.subscription.monthlyFee ? Number(plan.subscription.monthlyFee) : null;
  const state = plan.subscription.state;
  const stateLabel = state === 'expired' ? tr('Expired') : state === 'not_started' ? tr('Not started') : tr('Active');

  return (
    <Section icon={CalendarClock} title={tr('LCO Desk subscription')}>
      <div className="space-y-2">
        <Row label={tr('Status')} value={
          <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium',
            state === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300')}>{stateLabel}</span>
        } />
        <Row label={tr('Valid till')} value={plan.subscription.end ? formatDateIN(plan.subscription.end) : '-'} />
        {plan.subscription.daysLeft != null && plan.subscription.daysLeft >= 0 && (
          <Row label={tr('Days left')} value={plan.subscription.daysLeft} />
        )}
        <Row label={tr('Monthly fee')} value={fee != null ? rupees(fee) : tr('Not set')} />
        <Row label={tr('Your ID')} value={<span className="font-mono">{plan.organizationId}</span>} />
      </div>

      {fee == null ? (
        <p className="text-sm text-muted-foreground">{tr('Your monthly fee is not set yet. Contact LCO Desk to renew.')}</p>
      ) : (
        <div className="space-y-3">
          <div>
            <span className="block text-sm font-medium mb-1.5">{tr('Renew for')}</span>
            <div className="grid grid-cols-4 gap-2">
              {[1, 3, 6, 12].map((m) => (
                <button key={m} type="button" onClick={() => setMonths(m)}
                  className={cn('h-10 rounded-lg border text-sm font-medium',
                    months === m ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card')}>
                  {m === 1 ? tr('1 month') : tr('{{n}} months', { n: m })}
                </button>
              ))}
            </div>
          </div>
          <Row label={tr('Amount to pay')} value={rupees(fee * months)} strong />
          <UpiPayPanel
            key={`renew-${months}`}
            kind="renewal" quantity={months} amount={fee * months} note={plan.pay.renewalNote}
            payeeName={plan.pay.payeeName} upiIds={plan.pay.upiIds} onClaimed={onChanged}
          />
        </div>
      )}
    </Section>
  );
}

function PaymentHistory({ payments }: { payments: PlatformPayment[] }) {
  const tr = useLt();
  if (payments.length === 0) return null;
  const status = (s: PlatformPayment['status']) => ({
    pending: [tr('Waiting for check'), 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'],
    approved: [tr('Approved'), 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'],
    rejected: [tr('Rejected'), 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'],
  } as const)[s];
  return (
    <Section icon={Receipt} title={tr('Your payments to LCO Desk')}>
      <ul className="divide-y divide-border -my-2">
        {payments.map((p) => {
          const [label, cls] = status(p.status);
          return (
            <li key={p.id} className="py-2.5 flex flex-wrap items-center justify-between gap-2 text-sm">
              <div className="min-w-0">
                <p className="font-medium">
                  {p.kind === 'sms' ? tr('{{n}} SMS', { n: p.quantity }) : (p.quantity === 1 ? tr('Renewal 1 month') : tr('Renewal {{n}} months', { n: p.quantity }))}
                  {' · '}{rupees(p.amount)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDateIN(p.createdAt)} · UTR <span className="font-mono">{p.utr}</span>
                </p>
                {p.status === 'rejected' && p.adminNote && <p className="text-xs text-red-600">{p.adminNote}</p>}
              </div>
              <span className={cn('text-xs px-2 py-0.5 rounded-full', cls)}>{label}</span>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

export default function PlanAndSms() {
  const tr = useLt();
  const [plan, setPlan] = useState<MyPlan | null>(null);
  const [error, setError] = useState('');
  const [qty, setQty] = useState(0);

  const load = useCallback(async () => {
    try {
      const p = await platformBillingApi.myPlan();
      setPlan(p);
      setQty((q) => q || Math.max(100, Math.ceil(p.estimate.extra / 50) * 50));
    } catch (e) {
      setError(e instanceof Error ? e.message : tr('Could not load'));
    }
  }, [tr]);
  useEffect(() => { load(); }, [load]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!plan) return <p className="text-sm text-muted-foreground py-8 text-center">{tr('Loading...')}</p>;

  const { sms, estimate } = plan;
  const rate = Number(sms.rate);
  const freeLeft = Math.max(0, sms.freeLimit - sms.freeUsed);
  const pct = sms.freeLimit ? Math.min(100, Math.round((sms.freeUsed / sms.freeLimit) * 100)) : 100;
  const packs = Array.from(new Set([Math.max(50, Math.ceil(estimate.extra / 50) * 50), 500, 1000, 2000])).sort((a, b) => a - b);
  const qtyValid = Number.isInteger(qty) && qty >= 1 && qty <= 100000;

  return (
    <div className="space-y-4 sm:space-y-5">
      <div>
        <h2 className="text-base sm:text-lg font-semibold">{tr('Plan & SMS')}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {tr('{{free}} SMS free every month. After that, ₹{{rate}} per SMS from SMS you buy.', { free: sms.freeLimit, rate: rate.toFixed(2) })}
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-5">
        <Section icon={MessageSquare} title={tr('SMS this month')}>
          <div>
            <div className="flex justify-between text-sm mb-1.5">
              <span>{tr('Free SMS used')}</span>
              <span className="font-medium">{sms.freeUsed} / {sms.freeLimit}</span>
            </div>
            <div className="h-2.5 rounded-full bg-muted overflow-hidden">
              <div className={cn('h-full rounded-full', pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-green-500')} style={{ width: `${pct}%` }} />
            </div>
          </div>
          <div className="space-y-2">
            <Row label={tr('Free SMS left this month')} value={freeLeft} />
            <Row label={tr('Paid SMS used this month')} value={sms.creditsUsed} />
            <Row label={tr('Paid SMS balance')} value={<span className="font-semibold">{sms.creditsLeft}</span>} />
          </div>
          {sms.blocked > 0 && (
            <div className="flex gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-800 dark:text-red-300">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <p>
                {tr('{{n}} SMS were not sent this month because the balance ran out. Buy SMS, then retry them from the', { n: sms.blocked })}{' '}
                <Link to="/admin/sms-log?status=failed" className="underline font-medium">{tr('SMS Log')}</Link>.
              </p>
            </div>
          )}
        </Section>

        <Section icon={Calculator} title={tr('SMS you need per month')}>
          <div className="space-y-2">
            <Row label={tr('Cable customers with mobile')} value={estimate.cableCustomers} />
            <Row label={tr('Internet customers with SMS allowed')} value={estimate.internetCustomers} />
            <Row label={tr('Payment receipts')} value={estimate.receipts} />
            <Row label={estimate.reminderStages > 1 ? tr('Due reminders (2 per customer)') : tr('Due reminders (1 per customer)')} value={estimate.reminders} />
            <Row label={tr('Total per month')} value={estimate.total} strong />
            <Row label={tr('Free')} value={`- ${estimate.free}`} />
            <Row label={tr('SMS to buy per month')} value={estimate.extra} strong />
            <Row label={tr('Cost per month')} value={rupees(estimate.extraCost)} strong />
          </div>
          <p className="text-xs text-muted-foreground">
            {tr('Worked out from your active customers and your reminder settings. It changes when you add customers or turn internet SMS on or off.')}
          </p>
        </Section>
      </div>

      <Section icon={MessageSquare} title={tr('Buy SMS')}>
        <div className="flex flex-wrap gap-2">
          {packs.map((n) => (
            <button key={n} type="button" onClick={() => setQty(n)}
              className={cn('h-10 px-4 rounded-lg border text-sm font-medium',
                qty === n ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card')}>
              {n} SMS
            </button>
          ))}
        </div>
        <label className="block max-w-xs">
          <span className="block text-sm font-medium mb-1">{tr('Number of SMS')}</span>
          <input type="number" min={1} max={100000} inputMode="numeric" value={qty || ''}
            onChange={(e) => setQty(Math.floor(Number(e.target.value)))}
            className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm" />
        </label>
        <Row label={tr('{{n}} SMS × ₹{{rate}}', { n: qtyValid ? qty : 0, rate: rate.toFixed(2) })}
          value={rupees(qtyValid ? qty * rate : 0)} strong />
        {qtyValid && (
          <UpiPayPanel
            key={`sms-${qty}`}
            kind="sms" quantity={qty} amount={Math.round(qty * rate * 100) / 100} note={plan.pay.smsNote}
            payeeName={plan.pay.payeeName} upiIds={plan.pay.upiIds} onClaimed={load}
          />
        )}
      </Section>

      <RenewSection plan={plan} onChanged={load} />
      <PaymentHistory payments={plan.payments} />
    </div>
  );
}
