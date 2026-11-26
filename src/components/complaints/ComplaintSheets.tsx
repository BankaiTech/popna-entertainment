// Complaint dialogs: details, assign, mark fixed (with GPS), close / reopen, new complaint.
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2, Clock, ExternalLink, Loader2, LocateFixed, MapPin, Navigation, Phone, RotateCcw, Search,
  Smartphone, Tv, UserCheck, Users, Wrench, XCircle, AlertTriangle, Hand,
} from 'lucide-react';
import i18n from '@/i18n';
import { useLt } from '@/lib/lt';
import { getPosition, GPS_HELP, type GeoPoint } from '@/lib/geo';
import { ticketsApi, isOpenTicket, type Ticket, type TicketAction } from '@/api/complaintTickets';
import { customersApi } from '@/api/api';
import type { ComplaintCategory } from '@/api/customerPortal';
import type { Customer, User } from '@/models/types';
import { CATEGORIES, categoryLabel } from '@/pages/customer/portalShared';
import { showError, showSuccess } from '@/utils/toast';
import { Sheet, SheetButton } from './Sheet';
import { PointMap, googleMapsUrl } from './ComplaintMap';

type Tr = ReturnType<typeof useLt>;

/* ---------- shared bits ---------- */

const locale = () => `${(i18n.language || 'en').slice(0, 2)}-IN`;

export const fmtDateTime = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString(locale(), { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '';

/** "3 hours ago" in the user's language. */
export function timeAgo(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  const rtf = new Intl.RelativeTimeFormat(locale(), { numeric: 'auto' });
  if (Math.abs(mins) < 60) return rtf.format(-Math.max(mins, 0), 'minute');
  const hours = Math.round(mins / 60);
  if (hours < 24) return rtf.format(-hours, 'hour');
  return rtf.format(-Math.round(hours / 24), 'day');
}

export const staffStatusLabel = (tr: Tr, t: Pick<Ticket, 'status' | 'assignedTo'>) =>
  t.status === 'open' ? tr('Not assigned')
    : t.status === 'assigned' ? tr('Assigned')
      : t.status === 'resolved' ? tr('Fixed') : tr('Closed');

export const staffStatusClass = (s: string) =>
  ({ open: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200',
    assigned: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
    resolved: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200',
    cancelled: 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300' }[s] ?? 'bg-gray-100 text-gray-700');

const actionLabel = (tr: Tr, a: TicketAction | string) =>
  ({ raised: tr('Complaint raised'), assigned: tr('Assigned'), unassigned: tr('Made open for all staff'),
    taken: tr('Taken by staff'), resolved: tr('Fixed'), reopened: tr('Reopened'), cancelled: tr('Closed') } as Record<string, string>)[a] ?? a;

const actionDot = (a: string) =>
  ({ raised: 'bg-amber-500', assigned: 'bg-blue-500', taken: 'bg-blue-500', unassigned: 'bg-amber-400',
    resolved: 'bg-green-600', reopened: 'bg-violet-500', cancelled: 'bg-gray-400' } as Record<string, string>)[a] ?? 'bg-gray-400';

const fieldCls = 'w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

function Chips({ items, onPick }: { items: string[]; onPick: (s: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((s) => (
        <button key={s} type="button" onClick={() => onPick(s)}
          className="px-3 py-1.5 rounded-full border border-gray-300 dark:border-gray-600 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800">
          {s}
        </button>
      ))}
    </div>
  );
}

const addPhrase = (note: string, phrase: string) =>
  (note.trim() ? `${note.trim().replace(/[.,]$/, '')}, ${phrase}` : phrase).slice(0, 300);

const directionsUrl = (t: Ticket) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([t.customerAddress, t.customerArea].filter(Boolean).join(', '))}`;

/* ---------- details ---------- */

export function DetailsSheet({
  ticket, isOffice, onClose, onAssign, onTake, onResolve, onCancel, onReopen, busy,
}: {
  ticket: Ticket; isOffice: boolean; busy: boolean; onClose: () => void;
  onAssign: () => void; onTake: () => void; onResolve: () => void; onCancel: () => void; onReopen: () => void;
}) {
  const tr = useLt();
  const t = ticket;
  const open = isOpenTicket(t);
  const lat = t.resolvedLatitude != null ? Number(t.resolvedLatitude) : null;
  const lng = t.resolvedLongitude != null ? Number(t.resolvedLongitude) : null;
  const hasPoint = lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng);

  let footer: React.ReactNode = null;
  if (isOffice && open) {
    footer = (
      <>
        <SheetButton kind="secondary" onClick={onCancel} disabled={busy}><XCircle className="w-4 h-4" />{tr('Close')}</SheetButton>
        <SheetButton kind="secondary" onClick={onAssign} disabled={busy}><UserCheck className="w-4 h-4" />{t.assignedTo ? tr('Change') : tr('Assign')}</SheetButton>
        <SheetButton main kind="success" onClick={onResolve} disabled={busy}><CheckCircle2 className="w-4 h-4" />{tr('Mark fixed')}</SheetButton>
      </>
    );
  } else if (isOffice) {
    footer = <SheetButton kind="secondary" onClick={onReopen} disabled={busy}><RotateCcw className="w-4 h-4" />{tr('Reopen')}</SheetButton>;
  } else if (t.status === 'open' && !t.assignedTo) {
    footer = <SheetButton onClick={onTake} disabled={busy}><Hand className="w-4 h-4" />{busy ? tr('Saving...') : tr('I will go')}</SheetButton>;
  } else if (open) {
    footer = <SheetButton kind="success" onClick={onResolve} disabled={busy}><CheckCircle2 className="w-4 h-4" />{tr('Mark fixed')}</SheetButton>;
  }

  return (
    <Sheet wide onClose={onClose} footer={footer}
      title={<span className="inline-flex flex-wrap items-center gap-2">{categoryLabel(t.category)}
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${staffStatusClass(t.status)}`}>{staffStatusLabel(tr, t)}</span>
      </span>}
      subtitle={<span className="inline-flex flex-wrap items-center gap-x-2">
        <span className="font-mono">{t.ticketNo}</span>· {fmtDateTime(t.createdAt)}
        {t.raisedByCustomer && <span className="inline-flex items-center gap-0.5 text-violet-600 dark:text-violet-400"><Smartphone className="w-3.5 h-3.5" />{tr('from customer app')}</span>}
      </span>}>
      <div className="space-y-4">
        {/* Customer */}
        <section className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{tr('Customer')}</p>
          <p className="mt-1 font-semibold break-words">{t.customerName}</p>
          <div className="mt-1 space-y-1 text-sm text-gray-600 dark:text-gray-300">
            {t.planName && <p className="break-words">{t.planName}</p>}
            {t.customerStb && <p className="inline-flex items-center gap-1.5 font-mono break-all"><Tv className="w-4 h-4 shrink-0" />{t.customerStb}</p>}
            {(t.customerAddress || t.customerArea) && (
              <p className="flex items-start gap-1.5 break-words"><MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                {[t.customerAddress, t.customerArea].filter(Boolean).join(', ')}</p>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {t.customerMobile && (
              <a href={`tel:+91${t.customerMobile}`}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 text-sm font-medium">
                <Phone className="w-4 h-4" />{tr('Call')} {t.customerMobile}
              </a>
            )}
            {(t.customerAddress || t.customerArea) && (
              <a href={directionsUrl(t)} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-sm font-medium">
                <Navigation className="w-4 h-4" />{tr('Find on map')}
              </a>
            )}
          </div>
        </section>

        {/* Problem */}
        {t.description && (
          <section>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{tr('Problem')}</p>
            <p className="mt-1 text-sm whitespace-pre-line break-words rounded-xl bg-gray-50 dark:bg-gray-800 px-3 py-2">{t.description}</p>
          </section>
        )}

        {/* Who */}
        <section className="flex items-center gap-2 text-sm">
          {t.assignedTo ? (
            <><Wrench className="w-4 h-4 text-blue-600" /><span>{tr('Assigned to')} <b>{t.assignedToName}</b></span></>
          ) : open ? (
            <><Users className="w-4 h-4 text-amber-600" /><span className="text-amber-800 dark:text-amber-300">{tr('Not assigned. Every staff member can see it and take it.')}</span></>
          ) : null}
        </section>

        {/* Fixed: note and where */}
        {t.status === 'resolved' && (
          <section className="rounded-xl border border-green-200 dark:border-green-900 bg-green-50/60 dark:bg-green-950/40 p-4 space-y-3">
            <div>
              <p className="text-sm font-semibold text-green-800 dark:text-green-300">
                {tr('Fixed by {{name}}', { name: t.resolvedByName || '—' })} · {fmtDateTime(t.resolvedAt)}
              </p>
              {t.resolutionNote && <p className="mt-1 text-sm break-words">{t.resolutionNote}</p>}
            </div>
            {hasPoint ? (
              <>
                <PointMap lat={lat as number} lng={lng as number} accuracy={t.resolvedAccuracyM} label={t.resolvedByName || t.ticketNo} />
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600 dark:text-gray-400">
                  <span>{t.resolvedAccuracyM ? tr('Location accurate to about {{m}} m', { m: Math.round(t.resolvedAccuracyM) }) : tr('Location where it was closed')}</span>
                  <a href={googleMapsUrl(lat as number, lng as number)} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-blue-700 dark:text-blue-300">
                    {tr('Open in Google Maps')}<ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </>
            ) : (
              <p className="text-xs text-gray-500">{tr('Closed from the office. No location was saved.')}</p>
            )}
          </section>
        )}

        {/* History */}
        {t.updates.length > 0 && (
          <section>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-2">{tr('History')}</p>
            <ol className="relative border-l border-gray-200 dark:border-gray-700 ml-1.5 space-y-3">
              {t.updates.map((u, i) => (
                <li key={i} className="ml-4">
                  <span className={`absolute -left-[5px] mt-1.5 w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-gray-900 ${actionDot(u.action)}`} />
                  <p className="text-sm font-medium">{actionLabel(tr, u.action)}
                    <span className="font-normal text-gray-500"> · {u.byCustomer ? tr('Customer') : u.by}</span></p>
                  {u.note && u.note !== u.by && <p className="text-sm text-gray-600 dark:text-gray-300 break-words">{u.note}</p>}
                  <p className="text-xs text-gray-400 inline-flex items-center gap-1"><Clock className="w-3 h-3" />{fmtDateTime(u.createdAt)}</p>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
    </Sheet>
  );
}

/* ---------- assign ---------- */

const jobLabel = (tr: Tr, u: User) => (u.lcoRole === 'technician' ? tr('Technician') : tr('Collection agent'));

export function AssignSheet({ ticket, staff, onClose, onDone }: {
  ticket: Ticket; staff: User[]; onClose: () => void; onDone: (t: Ticket) => void;
}) {
  const tr = useLt();
  const [picked, setPicked] = useState<number | null>(ticket.assignedTo);
  const [q, setQ] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    const sorted = [...staff].sort((a, b) => (a.name || a.username).localeCompare(b.name || b.username));
    return s ? sorted.filter((u) => `${u.name} ${u.username}`.toLowerCase().includes(s)) : sorted;
  }, [staff, q]);

  const save = async () => {
    if (picked === ticket.assignedTo) { onClose(); return; }
    setSaving(true);
    try {
      const t = await ticketsApi.assign(ticket.id, picked, note.trim());
      showSuccess(picked ? tr('Assigned') : tr('Now open for all staff'));
      onDone(t);
    } catch (e) {
      showError(tr((e as Error).message));
    } finally {
      setSaving(false);
    }
  };

  const option = (id: number | null, title: string, sub: string, icon: React.ReactNode) => (
    <label key={id ?? 'none'}
      className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer ${picked === id
        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/60 ring-1 ring-blue-500' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
      <input type="radio" name="assignee" className="sr-only" checked={picked === id} onChange={() => setPicked(id)} />
      <span className="w-9 h-9 shrink-0 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-sm font-semibold text-gray-600 dark:text-gray-300">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium break-words">{title}</span>
        <span className="block text-xs text-gray-500 break-words">{sub}</span>
      </span>
      <span className={`w-5 h-5 shrink-0 rounded-full border-2 ${picked === id ? 'border-blue-600 bg-blue-600 shadow-[inset_0_0_0_3px_white] dark:shadow-[inset_0_0_0_3px_#0f172a]' : 'border-gray-300 dark:border-gray-600'}`} />
    </label>
  );

  return (
    <Sheet onClose={onClose} dismissable={false}
      title={tr('Assign complaint')} subtitle={`${ticket.ticketNo} · ${ticket.customerName}`}
      footer={<>
        <SheetButton kind="secondary" onClick={onClose}>{tr('Cancel')}</SheetButton>
        <SheetButton onClick={save} disabled={saving}>{saving ? tr('Saving...') : tr('Save')}</SheetButton>
      </>}>
      <div className="space-y-3">
        {option(null, tr('Not assigned'), tr('Every staff member with Complaints sees it. The first one to tap "I will go" gets it.'), <Users className="w-4 h-4" />)}
        {staff.length > 6 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr('Search staff')} className={`${fieldCls} pl-9`} />
          </div>
        )}
        {staff.length === 0 ? (
          <p className="text-sm rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-200 p-3">
            {tr('No staff can open Complaints yet. In Staff, give the Complaints page to a technician.')}
          </p>
        ) : (
          <div className="space-y-2" role="radiogroup" aria-label={tr('Assign to')}>
            {list.map((u) => option(u.id, u.name || u.username, jobLabel(tr, u),
              (u.name || u.username).slice(0, 1).toUpperCase()))}
          </div>
        )}
        <div>
          <label htmlFor="assign-note" className="text-sm font-medium">{tr('Note for staff (optional)')}</label>
          <input id="assign-note" value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} className={`${fieldCls} mt-1`} />
        </div>
      </div>
    </Sheet>
  );
}

/* ---------- mark fixed ---------- */

type Gps = { state: 'idle' | 'finding' | 'ok' | 'off'; point: GeoPoint | null };

export function ResolveSheet({ ticket, isOffice, onClose, onDone }: {
  ticket: Ticket; isOffice: boolean; onClose: () => void; onDone: (t: Ticket) => void;
}) {
  const tr = useLt();
  const [note, setNote] = useState('');
  const [gps, setGps] = useState<Gps>({ state: 'idle', point: null });
  const [saving, setSaving] = useState(false);
  const needsGps = !isOffice;

  const locate = useCallback(async () => {
    setGps({ state: 'finding', point: null });
    const p = await getPosition(20_000);
    setGps(p ? { state: 'ok', point: p } : { state: 'off', point: null });
  }, []);

  useEffect(() => { if (needsGps) void locate(); }, [needsGps, locate]);

  const fixes = [tr('Signal restored'), tr('Wire joined / replaced'), tr('Box replaced'), tr('Adapter replaced'),
    tr('Router restarted'), tr('Recharge done')];

  const save = async () => {
    if (note.trim().length < 3) { showError(tr('Please write a short note.')); return; }
    if (needsGps && !gps.point) { showError(tr(GPS_HELP)); return; }
    setSaving(true);
    try {
      const t = await ticketsApi.resolve(ticket.id, note.trim(), gps.point);
      showSuccess(tr('Marked fixed'));
      onDone(t);
    } catch (e) {
      showError(tr((e as Error).message));
    } finally {
      setSaving(false);
    }
  };

  const acc = gps.point ? Math.round(gps.point.accuracy) : 0;

  return (
    <Sheet onClose={onClose} dismissable={false}
      title={tr('Mark fixed')} subtitle={`${ticket.ticketNo} · ${ticket.customerName} · ${categoryLabel(ticket.category)}`}
      footer={<>
        <SheetButton kind="secondary" onClick={onClose}>{tr('Cancel')}</SheetButton>
        <SheetButton kind="success" onClick={save}
          disabled={saving || note.trim().length < 3 || (needsGps && !gps.point)}>
          <CheckCircle2 className="w-4 h-4" />{saving ? tr('Saving...') : tr('Mark fixed')}
        </SheetButton>
      </>}>
      <div className="space-y-4">
        <div>
          <label htmlFor="fix-note" className="text-sm font-medium">{tr('What was done?')}</label>
          <textarea id="fix-note" rows={3} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)}
            placeholder={tr('Example: replaced the adapter, signal OK')} className={`${fieldCls} mt-1`} />
          <div className="mt-2"><Chips items={fixes} onPick={(s) => setNote((n) => addPhrase(n, s))} /></div>
          <p className="text-xs text-gray-500 mt-2">{tr('The customer sees this note in their app.')}</p>
        </div>

        {/* Location */}
        <section className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium inline-flex items-center gap-1.5"><LocateFixed className="w-4 h-4 text-blue-600" />{tr('Your location')}</p>
            {gps.state !== 'finding' && (needsGps || gps.state !== 'idle') && (
              <button type="button" onClick={locate} className="text-xs font-medium text-blue-700 dark:text-blue-300">{tr('Refresh')}</button>
            )}
          </div>
          {gps.state === 'idle' && !needsGps && (
            <>
              <p className="text-xs text-gray-500">{tr('Optional. Add it only if you are at the customer\'s place now.')}</p>
              <button type="button" onClick={locate}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-sm font-medium">
                <LocateFixed className="w-4 h-4" />{tr('Add my location')}
              </button>
            </>
          )}
          {gps.state === 'finding' && (
            <p className="text-sm text-gray-600 dark:text-gray-300 inline-flex items-center gap-2" role="status">
              <Loader2 className="w-4 h-4 animate-spin" />{tr('Finding your location…')}
            </p>
          )}
          {gps.state === 'off' && (
            <div role="alert" className="text-sm rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 p-3 space-y-2">
              <p className="flex items-start gap-1.5"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />{tr(GPS_HELP)}</p>
              <button type="button" onClick={locate} className="font-semibold underline">{tr('Try again')}</button>
            </div>
          )}
          {gps.state === 'ok' && gps.point && (
            <>
              <PointMap lat={gps.point.latitude} lng={gps.point.longitude} accuracy={gps.point.accuracy} className="h-40" />
              <p className={`text-xs ${acc > 200 ? 'text-amber-700 dark:text-amber-300' : 'text-gray-500'}`}>
                {acc > 200
                  ? tr('Location is rough (about {{m}} m). Step outside and tap Refresh for a better one.', { m: acc })
                  : acc >= 1 ? tr('Location accurate to about {{m}} m', { m: acc }) : tr('Location found')}
              </p>
            </>
          )}
          {needsGps && (
            <p className="text-xs text-gray-500">{tr('Saved with the complaint so the office can see where it was fixed.')}</p>
          )}
        </section>
      </div>
    </Sheet>
  );
}

/* ---------- close / reopen ---------- */

export function NoteSheet({ kind, ticket, onClose, onDone }: {
  kind: 'cancel' | 'reopen'; ticket: Ticket; onClose: () => void; onDone: (t: Ticket) => void;
}) {
  const tr = useLt();
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const cancel = kind === 'cancel';

  const save = async () => {
    if (cancel && note.trim().length < 3) { showError(tr('Please write a short note.')); return; }
    setSaving(true);
    try {
      const t = cancel ? await ticketsApi.cancel(ticket.id, note.trim()) : await ticketsApi.reopen(ticket.id, note.trim());
      showSuccess(tr('Saved'));
      onDone(t);
    } catch (e) {
      showError(tr((e as Error).message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet onClose={onClose} dismissable={false}
      title={cancel ? tr('Close complaint') : tr('Reopen complaint')} subtitle={`${ticket.ticketNo} · ${ticket.customerName}`}
      footer={<>
        <SheetButton kind="secondary" onClick={onClose}>{tr('Cancel')}</SheetButton>
        <SheetButton kind={cancel ? 'danger' : 'primary'} onClick={save} disabled={saving || (cancel && note.trim().length < 3)}>
          {saving ? tr('Saving...') : cancel ? tr('Close complaint') : tr('Reopen')}
        </SheetButton>
      </>}>
      <div className="space-y-3">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {cancel ? tr('Use this when no work is needed. The customer sees the reason.')
            : tr('It goes back to the same staff member. If nobody had it, every staff member sees it again.')}
        </p>
        <div>
          <label htmlFor="ticket-note" className="text-sm font-medium">{cancel ? tr('Reason for closing') : tr('Note (optional)')}</label>
          <textarea id="ticket-note" rows={3} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} className={`${fieldCls} mt-1`} />
        </div>
        {cancel && <Chips items={[tr('Duplicate complaint'), tr('Customer says it is working now'), tr('Not a network problem')]}
          onPick={(s) => setNote((n) => addPhrase(n, s))} />}
      </div>
    </Sheet>
  );
}

/* ---------- new complaint (office) ---------- */

export function NewComplaintSheet({ staff, onClose, onDone }: {
  staff: User[]; onClose: () => void; onDone: (t: Ticket) => void;
}) {
  const tr = useLt();
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<Customer | null>(null);
  const [category, setCategory] = useState<ComplaintCategory | null>(null);
  const [description, setDescription] = useState('');
  const [assignee, setAssignee] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    customersApi.getAll().then(setCustomers).catch(() => setCustomers([]));
  }, []);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!customers || q.length < 2) return [];
    return customers.filter((c) => [c.name, c.mobile, c.stbNumber, c.boxNumber, c.area]
      .some((v) => (v ?? '').toString().toLowerCase().includes(q))).slice(0, 8);
  }, [customers, query]);

  const save = async () => {
    if (!picked) { showError(tr('Choose the customer.')); return; }
    if (!category) { showError(tr('Choose the problem.')); return; }
    setSaving(true);
    try {
      let t = await ticketsApi.create(picked.id, category, description.trim());
      if (assignee) {
        try {
          t = await ticketsApi.assign(t.id, Number(assignee));
        } catch (e) {
          showError(tr((e as Error).message));
        }
      }
      showSuccess(tr('Complaint {{no}} created', { no: t.ticketNo }));
      onDone(t);
    } catch (e) {
      showError(tr((e as Error).message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet onClose={onClose} dismissable={false} title={tr('New complaint')}
      footer={<>
        <SheetButton kind="secondary" onClick={onClose}>{tr('Cancel')}</SheetButton>
        <SheetButton onClick={save} disabled={saving || !picked || !category}>{saving ? tr('Saving...') : tr('Save')}</SheetButton>
      </>}>
      <div className="space-y-4">
        <div>
          <label htmlFor="nc-customer" className="text-sm font-medium">{tr('Customer')}</label>
          {picked ? (
            <div className="mt-1 flex items-center justify-between gap-2 rounded-xl border border-blue-300 bg-blue-50 dark:bg-blue-950/60 dark:border-blue-800 px-3 py-2.5 text-sm">
              <span className="min-w-0">
                <span className="block font-medium break-words">{picked.name}</span>
                <span className="block text-xs text-gray-600 dark:text-gray-400 break-words">{[picked.mobile, picked.stbNumber, picked.area].filter(Boolean).join(' · ')}</span>
              </span>
              <button type="button" className="text-xs font-semibold text-blue-700 dark:text-blue-300 shrink-0" onClick={() => setPicked(null)}>
                {tr('Change')}
              </button>
            </div>
          ) : (
            <>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input id="nc-customer" value={query} onChange={(e) => setQuery(e.target.value)} autoComplete="off" autoFocus
                  placeholder={tr('Type name, mobile or box number')} className={`${fieldCls} pl-9`} />
              </div>
              {customers === null && <p className="mt-1 text-xs text-gray-500">{tr('Loading...')}</p>}
              {query.trim().length >= 2 && customers !== null && matches.length === 0 && (
                <p className="mt-1 text-xs text-gray-500">{tr('No customer found.')}</p>
              )}
              {matches.length > 0 && (
                <ul className="mt-1 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800 max-h-60 overflow-y-auto">
                  {matches.map((c) => (
                    <li key={c.id}>
                      <button type="button" onClick={() => setPicked(c)}
                        className="w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800">
                        <span className="font-medium break-words">{c.name}</span>
                        <span className="block text-xs text-gray-500 break-words">{[c.mobile, c.stbNumber, c.area].filter(Boolean).join(' · ')}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>

        <fieldset>
          <legend className="text-sm font-medium">{tr('Problem')}</legend>
          <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {CATEGORIES.map((c) => (
              <label key={c.key}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm cursor-pointer ${category === c.key
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/60 ring-1 ring-blue-500 font-medium' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                <input type="radio" name="nc-cat" className="sr-only" checked={category === c.key} onChange={() => setCategory(c.key)} />
                {c.label()}
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="nc-desc" className="text-sm font-medium">{tr('Details (optional)')}</label>
          <textarea id="nc-desc" rows={3} maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} className={`${fieldCls} mt-1`} />
        </div>

        <div>
          <label htmlFor="nc-assign" className="text-sm font-medium">{tr('Assign to')}</label>
          <select id="nc-assign" value={assignee} onChange={(e) => setAssignee(e.target.value)} className={`${fieldCls} mt-1`}>
            <option value="">{tr('Not assigned (all staff see it)')}</option>
            {staff.map((u) => <option key={u.id} value={u.id}>{u.name || u.username} · {jobLabel(tr, u)}</option>)}
          </select>
        </div>
      </div>
    </Sheet>
  );
}
