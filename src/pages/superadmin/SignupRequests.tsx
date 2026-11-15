/**
 * People who filled the public sign-up form. The app owner calls them, then creates the operator
 * in Organizations. Status + call notes are saved on the server.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { UserPlus, Trash2, Phone, MessageCircle, MapPin, Mail, RefreshCw } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import {
  signupRequestsApi, SIGNUP_STATUSES, type SignupRequest, type SignupStatus,
} from '@/api/signupRequests';
import { useAuthStore } from '@/store/useAuthStore';
import { showError, showSuccess } from '@/utils/toast';
import { useLt } from '@/lib/lt';
import { cn } from '@/lib/utils';

const STATUS_STYLE: Record<SignupStatus, string> = {
  new: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
  contacted: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
  joined: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800',
  not_interested: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
};

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English', ta: 'தமிழ்', hi: 'हिन्दी', te: 'తెలుగు', kn: 'ಕನ್ನಡ', ml: 'മലയാളം',
};

export default function SignupRequests() {
  const tr = useLt();
  const { t } = useTranslation();
  const { hasSAPermission } = useAuthStore();
  const allowed = hasSAPermission('sa_signup_requests');
  const [rows, setRows] = useState<SignupRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<SignupStatus | 'all'>('all');
  const [notes, setNotes] = useState<Record<number, string>>({});

  const statusLabel = (s: SignupStatus) => ({
    new: tr('New'), contacted: tr('Contacted'), joined: tr('Joined'), not_interested: tr('Not interested'),
  })[s];
  const serviceLabel = (s: string) => ({ cable: tr('Cable TV'), internet: tr('Internet'), both: tr('Cable TV + Internet') } as Record<string, string>)[s] ?? s;
  const sizeLabel = (s: string) => ({
    under_500: tr('Under 500 customers'), '500_2000': tr('500 - 2,000 customers'),
    '2000_5000': tr('2,000 - 5,000 customers'), over_5000: tr('Over 5,000 customers'),
  } as Record<string, string>)[s] ?? '';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await signupRequestsApi.getAll();
      setRows(data);
      setNotes(Object.fromEntries(data.map((r) => [r.id, r.notes])));
    } catch (e) {
      showError(e instanceof Error ? e.message : tr('Could not load sign-ups'));
    } finally {
      setLoading(false);
    }
  }, [tr]);

  useEffect(() => { if (allowed) load(); }, [allowed, load]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length };
    for (const s of SIGNUP_STATUSES) c[s] = rows.filter((r) => r.status === s).length;
    return c;
  }, [rows]);
  const visible = filter === 'all' ? rows : rows.filter((r) => r.status === filter);

  if (!allowed) return <Navigate to="/superadmin/dashboard" replace />;

  const save = async (row: SignupRequest, changes: { status?: SignupStatus; notes?: string }) => {
    try {
      const updated = await signupRequestsApi.update(row.id, changes);
      setRows((prev) => prev.map((r) => (r.id === row.id ? updated : r)));
      showSuccess(tr('Saved'));
    } catch (e) {
      showError(e instanceof Error ? e.message : tr('Could not save'));
    }
  };

  const remove = async (row: SignupRequest) => {
    if (!window.confirm(tr('Delete this sign-up?'))) return;
    try {
      await signupRequestsApi.delete(row.id);
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      showSuccess(tr('Deleted'));
    } catch (e) {
      showError(e instanceof Error ? e.message : tr('Could not delete'));
    }
  };

  const when = (iso: string) =>
    new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
            <UserPlus className="w-5 h-5 shrink-0" />
            {t('nav.signupRequests', 'Signup Requests')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {tr('Operators who asked to join from the login page. Call them, then create their account in Organizations.')}
          </p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading} className="shrink-0 w-full sm:w-auto">
          <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
          {tr('Refresh')}
        </Button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {(['all', ...SIGNUP_STATUSES] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={cn(
              'shrink-0 px-3 py-1.5 rounded-full text-sm border transition-colors',
              filter === s ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground border-border hover:bg-muted',
            )}
          >
            {s === 'all' ? tr('All') : statusLabel(s)} ({counts[s] ?? 0})
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-10">{tr('Loading...')}</p>
      ) : visible.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">{tr('No sign-ups yet.')}</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          {visible.map((r) => {
            const wa = `https://wa.me/91${r.mobile}`;
            return (
              <Card key={r.id} className="min-w-0">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate">{r.businessName}</p>
                      <p className="text-sm text-muted-foreground truncate">{r.name}</p>
                    </div>
                    <span className={cn('shrink-0 text-xs px-2 py-0.5 rounded-full border', STATUS_STYLE[r.status])}>
                      {statusLabel(r.status)}
                    </span>
                  </div>

                  <div className="text-sm space-y-1">
                    <p className="flex items-center gap-2"><Phone className="w-4 h-4 text-muted-foreground shrink-0" /><span className="font-mono">{r.mobile}</span></p>
                    <p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-muted-foreground shrink-0" /><span className="truncate">{r.city}</span></p>
                    {r.email && <p className="flex items-center gap-2 min-w-0"><Mail className="w-4 h-4 text-muted-foreground shrink-0" /><span className="truncate">{r.email}</span></p>}
                  </div>

                  <div className="flex flex-wrap gap-1.5 text-xs">
                    <span className="px-2 py-0.5 rounded bg-muted">{serviceLabel(r.service)}</span>
                    {r.customerCount && <span className="px-2 py-0.5 rounded bg-muted">{sizeLabel(r.customerCount)}</span>}
                    {r.language && <span className="px-2 py-0.5 rounded bg-muted">{LANGUAGE_NAMES[r.language] ?? r.language}</span>}
                    {r.submitCount > 1 && <span className="px-2 py-0.5 rounded bg-muted">{tr('Sent')} ×{r.submitCount}</span>}
                  </div>

                  {r.message && <p className="text-sm bg-muted/50 rounded-lg p-2 whitespace-pre-wrap break-words">{r.message}</p>}

                  <div className="grid grid-cols-2 gap-2">
                    <a href={`tel:+91${r.mobile}`} className="inline-flex items-center justify-center gap-1.5 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
                      <Phone className="w-4 h-4" />{tr('Call')}
                    </a>
                    <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1.5 h-9 rounded-lg border border-green-600 text-green-700 dark:text-green-400 text-sm font-medium">
                      <MessageCircle className="w-4 h-4" />{tr('WhatsApp')}
                    </a>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <select
                      value={r.status}
                      onChange={(e) => save(r, { status: e.target.value as SignupStatus })}
                      className="h-9 rounded-lg border border-border bg-background px-2 text-sm sm:w-44"
                      aria-label={tr('Status')}
                    >
                      {SIGNUP_STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
                    </select>
                    <input
                      value={notes[r.id] ?? ''}
                      onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                      onBlur={() => { if ((notes[r.id] ?? '') !== r.notes) save(r, { notes: notes[r.id] ?? '' }); }}
                      placeholder={tr('Call notes')}
                      className="h-9 w-full sm:flex-1 min-w-0 rounded-lg border border-border bg-background px-3 text-sm"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{when(r.createdAt)}</span>
                    <Button variant="ghost" size="xs" onClick={() => remove(r)} aria-label={tr('Delete')}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
