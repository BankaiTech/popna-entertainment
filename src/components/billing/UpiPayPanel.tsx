/**
 * Pay LCO Desk by UPI with a QR code (works with personal UPI IDs; app links get blocked by banks).
 * The QR carries our UPI ID, the amount and the note ("Sms payment org_12"), so scanning fills them in.
 * After paying, the operator taps Paid (UTR optional). The app owner checks the bank app and approves.
 * When Cashfree is set up on the server, "Pay online" comes first: paid and added at once, no manual check.
 */
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { CheckCircle2, Copy, CreditCard, Download, QrCode } from 'lucide-react';
import Button from '@/components/ui/Button';
import {
  UPI_APPS, isPhone, payOnline, platformBillingApi, upiQuery, type OnlineGateway, type PaymentKind, type UpiApp,
} from '@/api/platformBilling';
import { showError, showSuccess } from '@/utils/toast';
import { checkOnlinePayment } from '@/lib/cashfreeReturn';
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
  /** An online gateway is set up on the server. */
  online?: boolean;
  onlineMode?: 'sandbox' | 'production';
  /** Which gateways (one button each). Default: Cashfree when `online`. */
  gateways?: OnlineGateway[];
}

const GATEWAY_LABEL: Record<OnlineGateway, string> = { cashfree: 'Cashfree', payu: 'PayU' };

export default function UpiPayPanel({
  kind, quantity, amount, note, payeeName, upiIds, onClaimed, online = false, onlineMode = 'sandbox', gateways,
}: Props) {
  const ready: OnlineGateway[] = gateways ?? (online ? ['cashfree'] : []);
  const tr = useLt();
  const [open, setOpen] = useState(false);
  const [app, setApp] = useState<UpiApp>('gpay');
  const [qr, setQr] = useState('');
  const [utr, setUtr] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const valid = amount > 0 && quantity > 0;
  const upiId = upiIds[app];

  useEffect(() => {
    if (!open || !valid) return;
    const link = `upi://pay?${upiQuery(upiId, payeeName, amount, note)}`;
    QRCode.toDataURL(link, { width: 260, margin: 2 }).then(setQr).catch(() => setQr(''));
  }, [open, valid, upiId, payeeName, amount, note]);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showSuccess(tr('Copied'));
    } catch {
      showError(tr('Could not copy'));
    }
  };

  const startOnline = async (gateway: OnlineGateway) => {
    setBusy(true);
    try {
      // Browser tab: leaves this page for the gateway. Cashfree in the installed app: popup, resolves when it closes.
      const { orderId, inApp, finished } = await payOnline(kind, quantity, onlineMode, gateway);
      if (inApp) {
        await checkOnlinePayment(orderId, finished);
        setBusy(false);
        onClaimed();
      }
    } catch (e) {
      showError(e instanceof Error ? e.message : tr('Could not open the payment page.'));
      setBusy(false);
    }
  };

  const cancel = () => { setOpen(false); setUtr(''); setError(''); };

  const paid = async () => {
    const ref = utr.trim();
    if (ref && !/^[A-Za-z0-9]{6,30}$/.test(ref)) {
      setError(tr('The UPI reference / UTR number should be 6-30 letters or digits.'));
      return;
    }
    setBusy(true);
    setError('');
    try {
      await platformBillingApi.claim({ kind, quantity, upiApp: app, utr: ref });
      setSent(true);
      setOpen(false);
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
          <p className="font-medium text-green-900 dark:text-green-200">{tr('Thank you. We will check your payment.')}</p>
          <p className="text-green-800/80 dark:text-green-300/80">{tr('LCO Desk will check and approve it, usually within a day. You can see the status below.')}</p>
        </div>
      </div>
    );
  }

  if (!open) {
    if (ready.length === 0) {
      return (
        <Button onClick={() => setOpen(true)} disabled={!valid} className="w-full sm:w-auto">
          <QrCode className="w-4 h-4 mr-2" />
          {tr('Pay ₹{{amount}} by UPI', { amount: amount.toFixed(2) })}
        </Button>
      );
    }
    return (
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row gap-2">
          {ready.map((gateway, i) => (
            <Button key={gateway} onClick={() => startOnline(gateway)} disabled={!valid || busy}
              variant={i === 0 ? 'primary' : 'outline'} className="w-full sm:w-auto">
              <CreditCard className="w-4 h-4 mr-2" />
              {busy ? tr('Opening...') : ready.length === 1
                ? tr('Pay ₹{{amount}} online', { amount: amount.toFixed(2) })
                : tr('Pay ₹{{amount}} with {{gateway}}', { amount: amount.toFixed(2), gateway: GATEWAY_LABEL[gateway] })}
            </Button>
          ))}
          <Button variant="outline" onClick={() => setOpen(true)} disabled={!valid || busy} className="w-full sm:w-auto">
            <QrCode className="w-4 h-4 mr-2" />{tr('Pay by UPI QR')}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {tr('Online: UPI, card or net banking. Added at once. UPI QR: added after LCO Desk checks it.')}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border-2 border-primary/30 p-4 space-y-4">
      <div>
        <p className="text-sm font-medium mb-2">{tr('Pay to')}</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {UPI_APPS.map((a) => (
            <button key={a.id} type="button" onClick={() => setApp(a.id)}
              className={cn('h-10 rounded-lg border text-sm font-medium',
                app === a.id ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card')}>
              {a.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="shrink-0 rounded-xl bg-white p-2 border border-border">
          {qr ? <img src={qr} alt={tr('UPI QR code')} className="w-52 h-52" /> : <div className="w-52 h-52" />}
        </div>
        <div className="text-sm space-y-2 w-full min-w-0">
          <p className="font-medium">{tr('Scan with any UPI app. The amount and note fill in by themselves.')}</p>
          {isPhone() && (
            <p className="text-xs text-muted-foreground">
              {tr('On this phone? Download the QR, then in your UPI app tap Scan and pick it from the gallery. Or pay to the UPI ID below.')}
            </p>
          )}
          <dl className="grid grid-cols-[auto,1fr,auto] gap-x-2 gap-y-1.5 items-center">
            <dt className="text-muted-foreground">{tr('UPI ID')}</dt>
            <dd className="font-mono truncate">{upiId}</dd>
            <button type="button" onClick={() => copy(upiId)} aria-label={tr('Copy')} className="p-1 text-muted-foreground hover:text-foreground">
              <Copy className="w-4 h-4" />
            </button>
            <dt className="text-muted-foreground">{tr('Amount')}</dt>
            <dd className="font-semibold">₹{amount.toFixed(2)}</dd>
            <span />
            <dt className="text-muted-foreground">{tr('Note')}</dt>
            <dd className="font-mono truncate">{note}</dd>
            <button type="button" onClick={() => copy(note)} aria-label={tr('Copy')} className="p-1 text-muted-foreground hover:text-foreground">
              <Copy className="w-4 h-4" />
            </button>
          </dl>
          {qr && (
            <a href={qr} download={`lcodesk-${note.replace(/\s+/g, '-').toLowerCase()}.png`}
              className="inline-flex items-center gap-1.5 text-primary text-sm font-medium">
              <Download className="w-4 h-4" />{tr('Download QR')}
            </a>
          )}
        </div>
      </div>

      <label className="block">
        <span className="block text-sm font-medium mb-1">{tr('UTR / UPI reference number (optional)')}</span>
        <input value={utr} onChange={(e) => setUtr(e.target.value.replace(/\s/g, ''))} maxLength={30}
          placeholder={tr('e.g. 412345678901')}
          className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm font-mono" />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={cancel} disabled={busy}>{tr('Cancel')}</Button>
        <Button onClick={paid} disabled={busy}>{busy ? tr('Sending...') : tr('Paid')}</Button>
      </div>
    </div>
  );
}
