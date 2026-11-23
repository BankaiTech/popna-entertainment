// A customer's payment history (live app). The owner can cancel a wrong payment, with a reason.
// Payments are never edited or deleted: cancelling reopens the bill and is kept in the audit log.
import { useCallback, useEffect, useState } from 'react';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/Dialog';
import Button from './ui/Button';
import Input from './ui/Input';
import { paymentsApi, type PaymentReceipt } from '@/api/collections';
import { useAuthStore } from '@/store/useAuthStore';
import type { Customer } from '@/models/types';
import { tr } from '@/lib/lt';
import i18n from '@/i18n';

interface Props {
  customer: Customer;
  onClose: () => void;
  onChanged?: () => void;
}

const money = (v: string | number) => `₹${Number(v).toLocaleString('en-IN')}`;
const month = (iso: string) => {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  const locale = `${(i18n.language || 'en').slice(0, 2)}-IN`;
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(locale, { month: 'short', year: 'numeric' });
};

const CustomerPaymentsDialog = ({ customer, onClose, onChanged }: Props) => {
  const isOffice = useAuthStore((s) => s.role === 'admin');
  const [rows, setRows] = useState<PaymentReceipt[] | null>(null);
  const [error, setError] = useState('');
  const [cancelId, setCancelId] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      setRows(await paymentsApi.forCustomer(customer.id));
    } catch (err) {
      setRows([]);
      setError(err instanceof Error ? err.message : tr('Could not load payments.'));
    }
  }, [customer.id]);

  useEffect(() => { void load(); }, [load]);

  const confirmCancel = async () => {
    if (cancelId == null) return;
    if (reason.trim().length < 3) {
      setError(tr('Write why this payment is cancelled.'));
      return;
    }
    setBusy(true);
    setError('');
    try {
      await paymentsApi.cancel(cancelId, reason.trim());
      setCancelId(null);
      setReason('');
      await load();
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : tr('Could not cancel the payment.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onClose={onClose}>
      <DialogHeader title={tr('Payments')} onClose={onClose} />
      <DialogBody>
        <div className="p-4 sm:p-5 space-y-3">
          <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
            <p className="font-semibold">{customer.name}</p>
            <p className="text-xs text-muted-foreground">{customer.mobile} · {customer.connectionType} · {customer.package}</p>
          </div>

          {rows === null && <p className="text-sm text-muted-foreground">{tr('Loading…')}</p>}
          {rows !== null && rows.length === 0 && !error && (
            <p className="text-sm text-muted-foreground">{tr('No payments yet.')}</p>
          )}

          <ul className="space-y-2">
            {(rows ?? []).map((p) => {
              const cancelled = p.status === 'cancelled';
              const at = new Date(p.collectedAt);
              return (
                <li key={p.id} className={`rounded-lg border p-3 text-sm ${cancelled ? 'border-border opacity-70' : 'border-border'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className={`font-semibold ${cancelled ? 'line-through' : ''}`}>
                        {money(p.amount)}
                        {Number(p.discount) > 0 && (
                          <span className="font-normal text-muted-foreground"> + {tr('discount')} {money(p.discount)}</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {p.receiptNo} · {at.toLocaleDateString('en-IN')} {at.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {tr('For')} {month(p.period)} · {p.method === 'cash' ? tr('Cash') : p.method.toUpperCase()} · {p.collectedByName}
                      </p>
                      {cancelled && (
                        <p className="text-xs text-red-600 mt-1">{tr('Cancelled')}: {p.cancelReason}</p>
                      )}
                    </div>
                    {isOffice && !cancelled && cancelId !== p.id && (
                      <button type="button" onClick={() => { setCancelId(p.id); setReason(''); setError(''); }}
                        className="shrink-0 text-xs font-medium text-red-600 hover:underline">
                        {tr('Cancel payment')}
                      </button>
                    )}
                  </div>
                  {cancelId === p.id && (
                    <div className="mt-3 space-y-2">
                      <Input value={reason} maxLength={300} autoFocus onChange={(e) => setReason(e.target.value)}
                        placeholder={tr('Reason, e.g. wrong amount entered')} />
                      <p className="text-xs text-muted-foreground">
                        {tr('Only the owner can cancel. The bill becomes unpaid again for this amount.')}
                      </p>
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" onClick={() => setCancelId(null)} disabled={busy}>{tr('Keep')}</Button>
                        <Button type="button" onClick={confirmCancel} disabled={busy}
                          className="bg-red-600 hover:bg-red-700">
                          {busy ? tr('Saving…') : tr('Cancel payment')}
                        </Button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        </div>
      </DialogBody>
      <DialogFooter>
        <Button onClick={onClose} className="w-full">{tr('Done')}</Button>
      </DialogFooter>
    </Dialog>
  );
};

export default CustomerPaymentsDialog;
