/**
 * Operators' UPI payments to LCO Desk (SMS packs and renewals).
 * Check the UTR in your bank / UPI app, then Approve: SMS credits are added or the subscription
 * is extended automatically. Reject with a short reason if the money did not arrive.
 */
import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Wallet, RefreshCw, Check, X } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import {
  platformBillingApi, PAYMENTS_CHANGED_EVENT, UPI_APPS, type PaymentStatus, type PlatformPayment,
} from '@/api/platformBilling';
import { useAuthStore } from '@/store/useAuthStore';
import { formatDateTimeIN } from '@/lib/subscription';
import { showError, showSuccess } from '@/utils/toast';
import { useLt } from '@/lib/lt';
import { cn } from '@/lib/utils';

const rupees = (v: string | number) =>
  `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function Payments() {
  const tr = useLt();
  const { t } = useTranslation();
  const { hasSAPermission } = useAuthStore();
  const allowed = hasSAPermission('sa_payments');
  const [filter, setFilter] = useState<PaymentStatus | 'all'>('pending');
  const [rows, setRows] = useState<PlatformPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await platformBillingApi.list(filter === 'all' ? undefined : filter));
    } catch (e) {
      showError(e instanceof Error ? e.message : tr('Could not load'));
    } finally {
      setLoading(false);
    }
  }, [filter, tr]);
  useEffect(() => { if (allowed) load(); }, [allowed, load]);

  if (!allowed) return <Navigate to="/superadmin/dashboard" replace />;

  const decide = async (p: PlatformPayment, approve: boolean) => {
    let note = '';
    if (approve) {
      const what = p.kind === 'sms' ? tr('{{n}} SMS', { n: p.quantity }) : tr('Renewal {{n}} months', { n: p.quantity });
      if (!window.confirm(tr('Approve {{amount}} from {{name}} ({{what}})? Check that the money reached your account first.',
        { amount: rupees(p.amount), name: p.organizationName, what }))) return;
    } else {
      const reason = window.prompt(tr('Reason for rejecting (the operator sees this):'), tr('Payment not received'));
      if (reason === null) return;
      note = reason;
    }
    setBusyId(p.id);
    try {
      if (approve) await platformBillingApi.approve(p.id);
      else await platformBillingApi.reject(p.id, note);
      showSuccess(approve ? tr('Approved') : tr('Rejected'));
      window.dispatchEvent(new Event(PAYMENTS_CHANGED_EVENT));
      await load();
    } catch (e) {
      showError(e instanceof Error ? e.message : tr('Could not save'));
    } finally {
      setBusyId(null);
    }
  };

  const statusLabel = (s: PaymentStatus) => ({ pending: tr('Waiting for check'), approved: tr('Approved'), rejected: tr('Rejected') })[s];
  const appLabel = (a: string) => UPI_APPS.find((x) => x.id === a)?.label ?? a;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold flex items-center gap-2">
            <Wallet className="w-5 h-5 shrink-0" />{t('nav.payments', 'Payments')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {tr('Operators who tapped Paid. Find the payment in your bank app (note "Sms payment org_ID" or "Renewal Payment org_ID"), then approve. SMS balance or the end date updates by itself.')}
          </p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading} className="shrink-0 w-full sm:w-auto">
          <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />{tr('Refresh')}
        </Button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {(['pending', 'approved', 'rejected', 'all'] as const).map((s) => (
          <button key={s} type="button" onClick={() => setFilter(s)}
            className={cn('shrink-0 px-3 py-1.5 rounded-full text-sm border',
              filter === s ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border hover:bg-muted')}>
            {s === 'all' ? tr('All') : statusLabel(s)}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-10">{tr('Loading...')}</p>
      ) : rows.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">{tr('No payments here.')}</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          {rows.map((p) => (
            <Card key={p.id} className="min-w-0">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{p.organizationName}</p>
                    <p className="text-xs text-muted-foreground">{p.organizationCode} · {tr('ID')} {p.organization}</p>
                  </div>
                  <p className="text-lg font-bold shrink-0">{rupees(p.amount)}</p>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                  <span className="text-muted-foreground">{tr('For')}</span>
                  <span>{p.kind === 'sms' ? tr('{{n}} SMS', { n: p.quantity }) : tr('Renewal {{n}} months', { n: p.quantity })}</span>
                  <span className="text-muted-foreground">{tr('Paid to')}</span>
                  <span>{appLabel(p.upiApp) || '-'}</span>
                  <span className="text-muted-foreground">UTR</span>
                  <span className="font-mono break-all">{p.utr || tr('Not given')}</span>
                  <span className="text-muted-foreground">{tr('Marked paid on')}</span>
                  <span>{formatDateTimeIN(p.createdAt)}{p.createdByName ? ` · ${p.createdByName}` : ''}</span>
                  {p.decidedAt && (<>
                    <span className="text-muted-foreground">{tr('Checked on')}</span>
                    <span>{formatDateTimeIN(p.decidedAt)}</span>
                  </>)}
                  {p.status !== 'pending' && (<>
                    <span className="text-muted-foreground">{tr('Status')}</span>
                    <span>{statusLabel(p.status)}{p.adminNote ? ` · ${p.adminNote}` : ''}</span>
                  </>)}
                </div>
                {p.status === 'pending' && (
                  <div className="grid grid-cols-2 gap-2">
                    <Button onClick={() => decide(p, true)} disabled={busyId === p.id}>
                      <Check className="w-4 h-4 mr-1.5" />{tr('Approve')}
                    </Button>
                    <Button variant="outline" onClick={() => decide(p, false)} disabled={busyId === p.id}>
                      <X className="w-4 h-4 mr-1.5" />{tr('Reject')}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
