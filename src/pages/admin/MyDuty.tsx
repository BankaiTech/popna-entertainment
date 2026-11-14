// Field staff home: start/end duty, location status, today's collections.
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Play, Square, Wallet, AlertTriangle } from 'lucide-react';
import { dutyApi, paymentsApi, type DutyStatus, type PaymentReceipt } from '@/api/collections';
import { useDutyTracking } from '@/hooks/useDutyTracking';
import { getPosition, GPS_HELP } from '@/lib/geo';
import { showError, showSuccess } from '@/utils/toast';
import { tr } from '@/lib/lt';

const time = (iso?: string | Date | null) =>
  iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—';

const MyDuty = () => {
  const [status, setStatus] = useState<DutyStatus | null>(null);
  const [today, setToday] = useState<PaymentReceipt[]>([]);
  const [busy, setBusy] = useState(false);
  const onDuty = !!status?.onDuty;
  const { lastSentAt, gpsOff } = useDutyTracking(onDuty, status?.pingEverySeconds ?? 120);

  const load = useCallback(async () => {
    try {
      const [s, t] = await Promise.all([dutyApi.status(), paymentsApi.today()]);
      setStatus(s);
      setToday(t);
    } catch (err) {
      showError(err instanceof Error ? err.message : tr('Could not load duty status'));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleDuty = async () => {
    setBusy(true);
    try {
      const gps = await getPosition();
      if (!gps) {
        showError(tr(GPS_HELP));
        return;
      }
      if (onDuty) {
        await dutyApi.checkOut(gps);
        showSuccess(tr('Duty ended. Location tracking stopped.'));
      } else {
        await dutyApi.checkIn(gps);
        showSuccess(tr('Duty started.'));
      }
      await load();
    } catch (err) {
      showError(err instanceof Error ? err.message : tr('Could not update duty'));
    } finally {
      setBusy(false);
    }
  };

  const valid = today.filter((p) => p.status === 'valid');
  const total = valid.reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="max-w-md mx-auto space-y-4 p-1">
      <div className="rounded-2xl border border-border bg-card p-5 text-center space-y-4">
        <div className="flex items-center justify-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${onDuty ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
          <span className="font-semibold">{onDuty ? tr('On duty') : tr('Off duty')}</span>
        </div>
        {onDuty && status?.session && (
          <p className="text-sm text-muted-foreground">Since {time(status.session.startedAt)}</p>
        )}
        <button
          type="button"
          onClick={toggleDuty}
          disabled={busy || status === null}
          className={`w-full py-4 rounded-xl text-white text-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-60 ${
            onDuty ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          {onDuty ? <Square className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          {busy ? tr('Please wait…') : onDuty ? tr('End duty') : tr('Start duty')}
        </button>
        <p className="text-xs text-muted-foreground">
          {tr('Your location is shared with the owner only while you are on duty.')}
        </p>
      </div>

      {onDuty && (
        <div className={`rounded-xl border p-3 text-sm flex items-start gap-2 ${gpsOff ? 'border-red-200 bg-red-50 text-red-700' : 'border-border'}`}>
          {gpsOff ? <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> : <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-green-600" />}
          <span>{gpsOff ? tr(GPS_HELP) : tr('Location sent at {{time}}. Keep this app open while collecting.', { time: time(lastSentAt) })}</span>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold"><Wallet className="w-4 h-4" /> {tr('Today')}</div>
          <div className="text-right">
            <div className="text-lg font-bold">₹{total.toLocaleString('en-IN')}</div>
            <div className="text-xs text-muted-foreground">{valid.length} collections</div>
          </div>
        </div>
        <ul className="divide-y divide-border text-sm max-h-72 overflow-y-auto">
          {today.map((p) => (
            <li key={p.id} className="py-2 flex justify-between gap-2">
              <span className="truncate">
                {p.customerName}
                <span className="block text-xs text-muted-foreground">{p.receiptNo} · {time(p.collectedAt)} · {p.method.toUpperCase()}</span>
              </span>
              <span className={p.status === 'cancelled' ? 'line-through text-muted-foreground' : 'font-medium'}>₹{Number(p.amount)}</span>
            </li>
          ))}
          {today.length === 0 && <li className="py-4 text-center text-muted-foreground">{tr('No collections yet today.')}</li>}
        </ul>
        <Link to="/admin/contacts" className="block text-center py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium">
          {tr('Go to customers to collect')}
        </Link>
      </div>
    </div>
  );
};

export default MyDuty;
