// Collect a payment against the Django API: amount, cash/UPI, GPS, then show the receipt.
import { useState } from 'react';
import { CheckCircle2, MapPin } from 'lucide-react';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/Dialog';
import Button from './ui/Button';
import Input from './ui/Input';
import { paymentsApi, type PaymentReceipt } from '@/api/collections';
import { getPosition, GPS_HELP } from '@/lib/geo';
import { formatDateIN } from '@/lib/subscription';
import { useAuthStore } from '@/store/useAuthStore';
import type { Customer } from '@/models/types';

interface Props {
  customer: Customer;
  onClose: () => void;
  onCollected?: () => void;
}

const STATUS_TEXT: Record<string, string> = {
  due: 'Due', cut_off: 'Cut-off passed', expiring: 'Expiring soon', expired: 'Expired',
  not_started: 'Not activated', active: 'Active',
};

const CollectPaymentDialog = ({ customer, onClose, onCollected }: Props) => {
  const isOffice = useAuthStore((s) => s.role === 'admin');
  const balance = customer.balanceAmount ?? 0;
  const [amount, setAmount] = useState<string>(balance > 0 ? String(balance) : '');
  const [discount, setDiscount] = useState<string>('');
  const [method, setMethod] = useState<'cash' | 'upi'>('cash');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<PaymentReceipt | null>(null);

  const amountNum = Number(amount || 0);
  const discountNum = Number(discount || 0);
  const remaining = Math.max(balance - amountNum - discountNum, 0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (amountNum + discountNum <= 0) return setError('Enter the amount collected.');
    if (amountNum + discountNum > balance) return setError(`Amount is more than the balance (₹${balance}).`);
    setSaving(true);
    try {
      const gps = await getPosition();
      if (!gps && !isOffice) {
        setError(GPS_HELP);
        return;
      }
      const r = await paymentsApi.collect({
        customerId: customer.id, amount: amountNum, method, discount: discountNum, note, gps,
      });
      setReceipt(r);
      onCollected?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the payment.');
    } finally {
      setSaving(false);
    }
  };

  if (receipt) {
    const at = new Date(receipt.collectedAt);
    return (
      <Dialog open onClose={onClose}>
        <DialogHeader title="Payment saved" onClose={onClose} />
        <DialogBody>
          <div className="p-5 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 mx-auto text-green-600" />
            <p className="text-3xl font-bold">₹{Number(receipt.amount).toLocaleString('en-IN')}</p>
            <dl className="text-sm grid grid-cols-2 gap-y-1 text-left max-w-xs mx-auto">
              <dt className="text-muted-foreground">Receipt</dt><dd className="font-mono">{receipt.receiptNo}</dd>
              <dt className="text-muted-foreground">Customer</dt><dd>{receipt.customerName}</dd>
              <dt className="text-muted-foreground">Date</dt><dd>{at.toLocaleDateString('en-IN')}</dd>
              <dt className="text-muted-foreground">Time</dt><dd>{at.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</dd>
              <dt className="text-muted-foreground">Collected by</dt><dd>{receipt.collectedByName}</dd>
              <dt className="text-muted-foreground">Mode</dt><dd>{receipt.method.toUpperCase()}</dd>
            </dl>
            {customer.category !== 'internet' && (
              <p className="text-xs text-muted-foreground">SMS receipt sent to the customer and owner.</p>
            )}
          </div>
        </DialogBody>
        <DialogFooter>
          <Button onClick={onClose} className="w-full">Done</Button>
        </DialogFooter>
      </Dialog>
    );
  }

  return (
    <Dialog open onClose={onClose}>
      <DialogHeader title="Collect payment" onClose={onClose} />
      <form onSubmit={submit} className="flex flex-col flex-1 min-h-0">
        <DialogBody>
          <div className="p-4 sm:p-5 space-y-4">
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
              <p className="font-semibold">{customer.name}</p>
              <p className="text-xs text-muted-foreground">
                {customer.mobile} · {customer.connectionType} · {customer.package}
              </p>
              <div className="flex justify-between mt-2">
                <span>Balance</span><span className="font-bold">₹{balance.toLocaleString('en-IN')}</span>
              </div>
              {customer.dueDate && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{customer.category === 'internet' ? 'Expires on' : 'Cut-off date'}</span>
                  <span>{formatDateIN(customer.dueDate)} · {STATUS_TEXT[customer.serviceStatus ?? 'active']}</span>
                </div>
              )}
            </div>

            <label className="block text-sm">
              <span className="block font-medium mb-1">Amount collected (₹)</span>
              <Input type="number" inputMode="decimal" min={0} step="0.01" value={amount}
                onChange={(e) => setAmount(e.target.value)} autoFocus />
            </label>

            <div className="grid grid-cols-2 gap-2">
              {(['cash', 'upi'] as const).map((m) => (
                <button key={m} type="button" onClick={() => setMethod(m)}
                  className={`py-2.5 rounded-lg border text-sm font-medium ${method === m ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300' : 'border-border'}`}>
                  {m === 'cash' ? 'Cash' : 'UPI'}
                </button>
              ))}
            </div>

            {isOffice && (
              <label className="block text-sm">
                <span className="block font-medium mb-1">Discount (₹) — owner / manager only</span>
                <Input type="number" min={0} step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0" />
              </label>
            )}

            <label className="block text-sm">
              <span className="block font-medium mb-1">Note (optional)</span>
              <Input value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} />
            </label>

            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Remaining after this</span>
              <span className="font-semibold">₹{remaining.toLocaleString('en-IN')}</span>
            </div>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3" /> Your location is saved with this collection.
            </p>
            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          </div>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save payment'}</Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
};

export default CollectPaymentDialog;
