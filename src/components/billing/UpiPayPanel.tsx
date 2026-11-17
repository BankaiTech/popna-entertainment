/**
 * Pay LCO Desk by UPI, then tell us the UTR.
 * Phone: tapping an app opens it with our UPI ID, the amount and the note ("Sms payment 12") filled in.
 * Laptop: shows a QR code for the chosen app's UPI ID to scan with the phone.
 * After paying, the operator types the UTR; the app owner checks it and approves.
 */
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { CheckCircle2, Smartphone } from 'lucide-react';
import Button from '@/components/ui/Button';
import {
  UPI_APPS, isPhone, platformBillingApi, upiAppLink, upiQuery, type PaymentKind, type UpiApp,
} from '@/api/platformBilling';
import { useLt } from '@/lib/lt';
import { cn } from '@/lib/utils';

interface Props {
  kind: PaymentKind;
  quantity: number;
  amount: number;
  note: string;
  payeeName: string;
  upiIds: Record<UpiApp, string>;
  onClaimed: () => void;
}

const APP_STYLE: Record<UpiApp, string> = {
  gpay: 'border-blue-200 hover:border-blue-400',
  phonepe: 'border-purple-200 hover:border-purple-400',
  paytm: 'border-sky-200 hover:border-sky-400',
  bhim: 'border-orange-200 hover:border-orange-400',
};

export default function UpiPayPanel({ kind, quantity, amount, note, payeeName, upiIds, onClaimed }: Props) {
  const tr = useLt();
  const [app, setApp] = useState<UpiApp | null>(null);
  const [qr, setQr] = useState('');
  const [utr, setUtr] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const phone = isPhone();
  const valid = amount > 0 && quantity > 0;

  // Laptop: QR for the chosen app's UPI ID (any UPI app on the phone can scan it).
  useEffect(() => {
    if (!app || phone || !valid) { setQr(''); return; }
    const link = `upi://pay?${upiQuery(upiIds[app], payeeName, amount, note)}`;
    QRCode.toDataURL(link, { width: 220, margin: 1 }).then(setQr).catch(() => setQr(''));
  }, [app, phone, valid, upiIds, payeeName, amount, note]);

  const choose = (a: UpiApp) => {
    setApp(a);
    setSent(false);
    if (phone && valid) window.location.href = upiAppLink(a, upiQuery(upiIds[a], payeeName, amount, note));
  };

  const submit = async () => {
    if (!app) { setError(tr('Choose the app you paid with')); return; }
    if (!/^[A-Za-z0-9]{6,30}$/.test(utr.trim())) {
      setError(tr('Enter the UPI reference / UTR number shown in your payment app'));
      return;
    }
    setBusy(true);
    setError('');
    try {
      await platformBillingApi.claim({ kind, quantity, upiApp: app, utr: utr.trim() });
      setSent(true);
      setUtr('');
      onClaimed();
    } catch (e) {
      setError(e instanceof Error ? e.message : tr('Could not send'));
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 p-4 text-sm flex gap-3">
        <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-green-900 dark:text-green-200">{tr('Payment details sent.')}</p>
          <p className="text-green-800/80 dark:text-green-300/80">{tr('LCO Desk will check and approve it, usually within a day. You can see the status below.')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">{tr('1. Pay with')}</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {UPI_APPS.map((a) => (
          <button
            key={a.id}
            type="button"
            disabled={!valid}
            onClick={() => choose(a.id)}
            className={cn(
              'h-12 rounded-xl border-2 bg-card text-sm font-semibold transition-colors disabled:opacity-50',
              APP_STYLE[a.id],
              app === a.id && 'ring-2 ring-primary border-primary',
            )}
          >
            {a.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {tr('Note added to the payment')}: <span className="font-mono">{note}</span>
      </p>

      {app && !phone && (
        <div className="flex flex-col sm:flex-row items-center gap-4 rounded-xl border border-border p-3">
          {qr ? <img src={qr} alt={tr('UPI QR code')} className="w-44 h-44" /> : null}
          <div className="text-sm space-y-1 text-center sm:text-left">
            <p className="flex items-center gap-1.5 justify-center sm:justify-start font-medium">
              <Smartphone className="w-4 h-4" />{tr('Scan with your phone')}
            </p>
            <p className="text-muted-foreground">{tr('UPI ID')}: <span className="font-mono text-foreground">{upiIds[app]}</span></p>
            <p className="text-muted-foreground">{tr('Amount')}: <span className="font-semibold text-foreground">₹{amount.toFixed(2)}</span></p>
          </div>
        </div>
      )}

      {app && phone && (
        <p className="text-xs text-muted-foreground">
          {tr('App did not open? Pay ₹{{amount}} to this UPI ID', { amount: amount.toFixed(2) })}:{' '}
          <span className="font-mono text-foreground select-all">{upiIds[app]}</span>
        </p>
      )}

      {app && (
        <div className="space-y-2">
          <p className="text-sm font-medium">{tr('2. After paying, enter the UTR / UPI reference number')}</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={utr}
              onChange={(e) => setUtr(e.target.value.replace(/\s/g, ''))}
              placeholder={tr('e.g. 412345678901')}
              inputMode="text"
              maxLength={30}
              className="h-10 flex-1 min-w-0 rounded-lg border border-border bg-background px-3 text-sm font-mono"
            />
            <Button onClick={submit} disabled={busy} className="shrink-0">{busy ? tr('Sending...') : tr('I have paid')}</Button>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}
