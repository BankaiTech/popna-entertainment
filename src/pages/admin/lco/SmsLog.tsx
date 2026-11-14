// Every SMS sent to customers: proof when someone says "I never got the SMS".
import { useCallback, useEffect, useState } from 'react';
import { MessageSquare, RefreshCw, Search, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { smsLogApi, type SmsLogFilters, type SmsLogPage, type SmsSummary, type SmsLogRow } from '@/api/smsLog';
import { useLt } from '@/lib/lt';
import { showError, showSuccess } from '@/utils/toast';
import { useAuthStore } from '@/store/useAuthStore';

const PAGE = 50;
const input = 'h-10 rounded-lg border border-border bg-background px-3 text-sm min-w-0';
const TONE: Record<string, string> = {
  sent: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300',
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  sending: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  failed: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
};
const KIND: Record<string, string> = {
  payment_receipt: 'Payment receipt', due_reminder: 'Due reminder',
  owner_payment_alert: 'Owner alert (old)', owner_daily_summary: 'Daily summary (old)',
};
const STATUS: Record<string, string> = { sent: 'Sent', pending: 'Waiting', sending: 'Sending', failed: 'Failed' };

const when = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

function Counter({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-xl border border-border px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold ${tone ?? ''}`}>{value}</p>
    </div>
  );
}

const SmsLog = () => {
  const tr = useLt();
  const role = useAuthStore((s) => s.role);
  const [filters, setFilters] = useState<SmsLogFilters>({ page: 1 });
  const [search, setSearch] = useState('');
  const [data, setData] = useState<SmsLogPage | null>(null);
  const [summary, setSummary] = useState<SmsSummary | null>(null);
  const [open, setOpen] = useState<SmsLogRow | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [page, sum] = await Promise.all([smsLogApi.list(filters), smsLogApi.summary()]);
      setData(page);
      setSummary(sum);
    } catch (e) {
      showError(e instanceof Error ? e.message : tr('Could not load'));
    } finally {
      setLoading(false);
    }
  }, [filters, tr]);
  useEffect(() => { load(); }, [load]);

  // Search as you type (after a short pause)
  useEffect(() => {
    const id = window.setTimeout(() => setFilters((f) => (f.search === search ? f : { ...f, search, page: 1 })), 400);
    return () => window.clearTimeout(id);
  }, [search]);

  const set = (key: keyof SmsLogFilters, value: string) => setFilters((f) => ({ ...f, [key]: value, page: 1 }));
  const page = filters.page ?? 1;
  const pages = data ? Math.max(1, Math.ceil(data.count / PAGE)) : 1;

  const retry = async (row: SmsLogRow) => {
    try {
      await smsLogApi.retry(row.id);
      showSuccess(tr('Will be sent again in a minute'));
      setOpen(null);
      load();
    } catch (e) {
      showError(e instanceof Error ? e.message : tr('Could not retry'));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-lg sm:text-xl font-bold flex items-center gap-2"><MessageSquare className="w-5 h-5" /> {tr('SMS Log')}</h1>
          <p className="text-sm text-muted-foreground">{tr('Every SMS sent to your customers')}</p>
        </div>
        <button type="button" onClick={load} className="h-10 px-3 rounded-lg border border-border text-sm inline-flex items-center gap-1.5">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> {tr('Refresh')}
        </button>
      </div>

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Counter label={tr('Sent today')} value={summary.today.sent} tone="text-green-700 dark:text-green-400" />
          <Counter label={tr('Failed today')} value={summary.today.failed} tone={summary.today.failed ? 'text-red-600' : ''} />
          <Counter label={tr('Waiting')} value={summary.today.pending + summary.today.sending} />
          <Counter label={tr('Sent this month')} value={summary.thisMonth.sent} />
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-2">
        <label className="relative col-span-2">
          <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={tr('Customer name or mobile')}
            className={`${input} w-full pl-9`} />
        </label>
        <select className={input} value={filters.status ?? ''} onChange={(e) => set('status', e.target.value)} aria-label={tr('Status')}>
          <option value="">{tr('All statuses')}</option>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{tr(v)}</option>)}
        </select>
        <select className={input} value={filters.kind ?? ''} onChange={(e) => set('kind', e.target.value)} aria-label={tr('Type')}>
          <option value="">{tr('All types')}</option>
          <option value="payment_receipt">{tr('Payment receipt')}</option>
          <option value="due_reminder">{tr('Due reminder')}</option>
        </select>
        <input type="date" className={input} value={filters.from ?? ''} onChange={(e) => set('from', e.target.value)} aria-label={tr('From')} />
        <input type="date" className={input} value={filters.to ?? ''} onChange={(e) => set('to', e.target.value)} aria-label={tr('To')} />
      </div>

      {/* Phone: cards. Wider screens: table. */}
      <div className="rounded-xl border border-border overflow-hidden">
        <ul className="divide-y divide-border md:hidden">
          {data?.results.map((r) => (
            <li key={r.id}>
              <button type="button" onClick={() => setOpen(r)} className="w-full text-left p-3 hover:bg-muted/30">
                <div className="flex justify-between gap-2">
                  <span className="font-medium truncate">{r.customerName || r.mobile}</span>
                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold ${TONE[r.status]}`}>{tr(STATUS[r.status])}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {r.mobile} · {tr(KIND[r.kind] ?? r.kind)} · {r.language === 'ta' ? 'தமிழ்' : 'English'} · {when(r.sentAt ?? r.createdAt)}
                </p>
              </button>
            </li>
          ))}
        </ul>
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className="p-3">{tr('Customer')}</th><th className="p-3">{tr('Mobile')}</th><th className="p-3">{tr('Type')}</th>
                <th className="p-3">{tr('Language')}</th><th className="p-3">{tr('Time')}</th><th className="p-3">{tr('Status')}</th><th className="p-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data?.results.map((r) => (
                <tr key={r.id} className="hover:bg-muted/20 cursor-pointer" onClick={() => setOpen(r)}>
                  <td className="p-3 font-medium">{r.customerName || '—'}</td>
                  <td className="p-3 font-mono text-xs">{r.mobile}</td>
                  <td className="p-3">{tr(KIND[r.kind] ?? r.kind)}</td>
                  <td className="p-3">{r.language === 'ta' ? 'தமிழ்' : 'English'}</td>
                  <td className="p-3 whitespace-nowrap">{when(r.sentAt ?? r.createdAt)}</td>
                  <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${TONE[r.status]}`}>{tr(STATUS[r.status])}</span></td>
                  <td className="p-3 text-right text-blue-600 text-xs">{tr('View')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data && data.results.length === 0 && <p className="p-6 text-center text-muted-foreground">{tr('No SMS found.')}</p>}
      </div>

      {data && data.count > PAGE && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{tr('{{n}} SMS', { n: data.count })}</span>
          <div className="flex items-center gap-2">
            <button type="button" disabled={page <= 1} onClick={() => setFilters((f) => ({ ...f, page: page - 1 }))}
              className="h-9 w-9 rounded-lg border border-border disabled:opacity-40 inline-flex items-center justify-center" aria-label={tr('Previous')}>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span>{page} / {pages}</span>
            <button type="button" disabled={page >= pages} onClick={() => setFilters((f) => ({ ...f, page: page + 1 }))}
              className="h-9 w-9 rounded-lg border border-border disabled:opacity-40 inline-flex items-center justify-center" aria-label={tr('Next')}>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setOpen(null)}>
          <div className="w-full sm:max-w-md bg-background rounded-t-2xl sm:rounded-2xl p-4 space-y-3 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="flex justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold truncate">{open.customerName || open.mobile}</p>
                <p className="text-xs text-muted-foreground">{open.mobile} · {tr(KIND[open.kind] ?? open.kind)}</p>
              </div>
              <span className={`self-start shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold ${TONE[open.status]}`}>{tr(STATUS[open.status])}</span>
            </div>
            <pre className="whitespace-pre-wrap break-words text-sm rounded-lg bg-muted/40 border border-border p-3 font-sans">{open.message}</pre>
            <dl className="grid grid-cols-2 gap-1 text-xs">
              <dt className="text-muted-foreground">{tr('Created')}</dt><dd>{when(open.createdAt)}</dd>
              <dt className="text-muted-foreground">{tr('Sent')}</dt><dd>{open.sentAt ? when(open.sentAt) : '—'}</dd>
              <dt className="text-muted-foreground">{tr('Attempts')}</dt><dd>{open.attempts}</dd>
              <dt className="text-muted-foreground">{tr('Template')}</dt><dd className="font-mono break-all">{open.templateId || '—'}</dd>
            </dl>
            {open.lastError && <p className="text-xs text-red-600 break-words">{tr('Error')}: {open.lastError}</p>}
            <div className="flex gap-2 justify-end">
              {open.status === 'failed' && (role === 'admin') && (
                <button type="button" onClick={() => retry(open)} className="h-10 px-4 rounded-lg bg-blue-600 text-white text-sm inline-flex items-center gap-1.5">
                  <RotateCcw className="w-4 h-4" /> {tr('Send again')}
                </button>
              )}
              <button type="button" onClick={() => setOpen(null)} className="h-10 px-4 rounded-lg border border-border text-sm">{tr('Close')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmsLog;
