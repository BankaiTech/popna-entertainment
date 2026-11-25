// Complaints: customers raise them from the customer app (or the office raises them on a call).
// Owner / manager assign a technician; the technician fixes it and writes what was done.
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus, Search, Phone, MapPin, Tv, Wrench, CheckCircle2, RotateCcw, XCircle, Smartphone, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useLt } from '@/lib/lt';
import { useAuthStore } from '@/store/useAuthStore';
import { ticketsApi, type Ticket } from '@/api/complaintTickets';
import { customersApi } from '@/api/api';
import { usersApi } from '@/api/users';
import { isMockMode } from '@/lib/apiHelpers';
import type { ComplaintCategory } from '@/api/customerPortal';
import type { Customer, User } from '@/models/types';
import { Dialog, DialogBody, DialogFooter, DialogHeader } from '@/components/ui/Dialog';
import Button from '@/components/ui/Button';
import { showError, showSuccess } from '@/utils/toast';
import {
  CATEGORIES, categoryLabel, complaintStatusClass, fmtDate,
} from '@/pages/customer/portalShared';

type Filter = 'open' | 'resolved' | 'cancelled' | 'all';
type NoteAction = { kind: 'resolve' | 'cancel' | 'reopen'; ticket: Ticket };

const Complaints = () => {
  const tr = useLt();
  const role = useAuthStore((s) => s.role);
  const isOffice = role === 'admin';
  const [filter, setFilter] = useState<Filter>('open');
  const [rows, setRows] = useState<Ticket[] | null>(null);
  const [search, setSearch] = useState('');
  const [staff, setStaff] = useState<User[]>([]);
  const [noteAction, setNoteAction] = useState<NoteAction | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  const load = useCallback(() => {
    setRows(null);
    const params = filter === 'open' ? { open: true } : filter === 'all' ? {} : { status: filter };
    ticketsApi.list(params).then(setRows).catch((e: Error) => { setRows([]); showError(tr(e.message)); });
  }, [filter, tr]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!isOffice || isMockMode()) return;
    usersApi.getAll()
      .then((all) => setStaff(all.filter((u) => ['technician', 'agent'].includes(u.lcoRole ?? '')
        && u.status === 'active'
        // only people who can open Complaints, or they would never see the job
        && (u.allowedModules ?? []).includes('complaints'))))
      .catch(() => setStaff([]));
  }, [isOffice]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!rows || !q) return rows ?? [];
    return rows.filter((r) => [r.ticketNo, r.customerName, r.customerMobile, r.customerStb, r.customerArea]
      .some((v) => (v ?? '').toLowerCase().includes(q)));
  }, [rows, search]);

  const replace = (t: Ticket) => {
    setRows((prev) => {
      if (!prev) return prev;
      const stillShown = filter === 'all' || (filter === 'open' ? ['open', 'assigned'].includes(t.status) : t.status === filter);
      return stillShown ? prev.map((r) => (r.id === t.id ? t : r)) : prev.filter((r) => r.id !== t.id);
    });
  };

  const assign = async (t: Ticket, userId: number) => {
    setBusy(t.id);
    try {
      replace(await ticketsApi.assign(t.id, userId));
      showSuccess(tr('Assigned'));
    } catch (e) {
      showError(tr((e as Error).message));
    } finally {
      setBusy(null);
    }
  };

  const filters: { key: Filter; label: string }[] = [
    { key: 'open', label: tr('Open') },
    { key: 'resolved', label: tr('Fixed') },
    { key: 'cancelled', label: tr('Closed') },
    { key: 'all', label: tr('All') },
  ];

  const statusLabel = (s: string) =>
    ({ open: tr('New'), assigned: tr('Assigned'), resolved: tr('Fixed'), cancelled: tr('Closed') }[s] ?? s);

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{tr('Complaints')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {isOffice
              ? tr('Complaints from the customer app and phone calls. Assign a technician and track until fixed.')
              : tr('Complaints given to you. Mark fixed after the work is done.')}
          </p>
        </div>
        {isOffice && (
          <Button onClick={() => setNewOpen(true)} className="gap-1.5">
            <Plus className="w-4 h-4" /> {tr('New complaint')}
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex gap-1 p-1 rounded-lg bg-gray-100 dark:bg-gray-800 overflow-x-auto">
          {filters.map((f) => (
            <button key={f.key} type="button" onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap ${filter === f.key
                ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-300'}`}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={tr('Search name, mobile, box number, ticket')}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm" />
        </div>
      </div>

      {rows === null && (
        <div className="space-y-3" aria-busy="true">
          {[0, 1, 2].map((i) => <div key={i} className="h-32 rounded-xl bg-gray-200/70 dark:bg-gray-800 animate-pulse" />)}
        </div>
      )}
      {rows !== null && shown.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-gray-300" />
          {filter === 'open' ? tr('No open complaints.') : tr('Nothing here.')}
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        {shown.map((t) => {
          const open = t.status === 'open' || t.status === 'assigned';
          return (
            <article key={t.id}
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white">{categoryLabel(t.category)}</p>
                  <p className="text-xs text-gray-500">
                    {t.ticketNo} · {fmtDate(t.createdAt)}
                    {t.raisedByCustomer && (
                      <span className="ml-1.5 inline-flex items-center gap-0.5 text-violet-600">
                        <Smartphone className="w-3 h-3" /> {tr('from customer app')}
                      </span>
                    )}
                  </p>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${complaintStatusClass(t.status)}`}>
                  {statusLabel(t.status)}
                </span>
              </div>

              <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                <p className="font-medium break-words">{t.customerName}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                  {t.customerMobile && (
                    <a href={`tel:+91${t.customerMobile}`} className="inline-flex items-center gap-1 text-blue-600">
                      <Phone className="w-3 h-3" /> {t.customerMobile}
                    </a>
                  )}
                  {t.customerStb && (
                    <span className="inline-flex items-center gap-1 font-mono break-all"><Tv className="w-3 h-3" /> {t.customerStb}</span>
                  )}
                  {(t.customerArea || t.customerAddress) && (
                    <span className="inline-flex items-center gap-1 break-words">
                      <MapPin className="w-3 h-3" /> {[t.customerAddress, t.customerArea].filter(Boolean).join(', ')}
                    </span>
                  )}
                </div>
              </div>

              {t.description && (
                <p className="text-sm bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2 break-words">{t.description}</p>
              )}
              {t.status === 'resolved' && t.resolutionNote && (
                <p className="text-sm text-green-700 dark:text-green-400 break-words">
                  {tr('Fixed')}: {t.resolutionNote}
                </p>
              )}

              {/* Technician */}
              {isOffice && open ? (
                <label className="flex items-center gap-2 text-sm">
                  <Wrench className="w-4 h-4 text-gray-400 shrink-0" />
                  <select value={t.assignedTo ?? ''} disabled={busy === t.id}
                    onChange={(e) => e.target.value && assign(t, Number(e.target.value))}
                    aria-label={tr('Technician')}
                    className="flex-1 min-w-0 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1.5 text-sm">
                    <option value="">{tr('Assign technician…')}</option>
                    {staff.map((u) => <option key={u.id} value={u.id}>{u.name || u.username}</option>)}
                  </select>
                </label>
              ) : t.assignedToName ? (
                <p className="text-xs text-gray-500 inline-flex items-center gap-1">
                  <Wrench className="w-3 h-3" /> {t.assignedToName}
                </p>
              ) : null}

              <div className="flex flex-wrap gap-2 pt-1 mt-auto">
                {open && (
                  <Button size="xs" variant="success" onClick={() => setNoteAction({ kind: 'resolve', ticket: t })}>
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> {tr('Mark fixed')}
                  </Button>
                )}
                {isOffice && open && (
                  <Button size="xs" variant="outline" onClick={() => setNoteAction({ kind: 'cancel', ticket: t })}>
                    <XCircle className="w-3.5 h-3.5 mr-1" /> {tr('Close')}
                  </Button>
                )}
                {isOffice && !open && (
                  <Button size="xs" variant="outline" onClick={() => setNoteAction({ kind: 'reopen', ticket: t })}>
                    <RotateCcw className="w-3.5 h-3.5 mr-1" /> {tr('Reopen')}
                  </Button>
                )}
                {t.updates.length > 0 && (
                  <button type="button" onClick={() => setExpanded(expanded === t.id ? null : t.id)}
                    className="ml-auto text-xs text-gray-500 inline-flex items-center gap-0.5">
                    {tr('History')} {expanded === t.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                )}
              </div>

              {expanded === t.id && (
                <ol className="border-t border-gray-100 dark:border-gray-800 pt-2 space-y-1 text-xs text-gray-600 dark:text-gray-400">
                  {t.updates.map((u, i) => (
                    <li key={i} className="break-words">
                      <span className="text-gray-400">{fmtDate(u.createdAt)}</span>{' '}
                      <b>{statusWord(tr, u.action)}</b>
                      {u.byCustomer ? ` · ${tr('Customer')}` : u.by ? ` · ${u.by}` : ''}
                      {u.note ? ` — ${u.note}` : ''}
                    </li>
                  ))}
                </ol>
              )}
            </article>
          );
        })}
      </div>

      {noteAction && (
        <NoteDialog action={noteAction} onClose={() => setNoteAction(null)}
          onDone={(t) => { replace(t); setNoteAction(null); }} />
      )}
      {newOpen && (
        <NewComplaintDialog onClose={() => setNewOpen(false)}
          onDone={(t) => { setNewOpen(false); if (filter === 'open' || filter === 'all') setRows((p) => [t, ...(p ?? [])]); }} />
      )}
    </div>
  );
};

function statusWord(tr: (s: string) => string, action: string) {
  return ({ raised: tr('Raised'), assigned: tr('Assigned'), resolved: tr('Fixed'), reopened: tr('Reopened'),
    cancelled: tr('Closed') } as Record<string, string>)[action] ?? action;
}

function NoteDialog({ action, onClose, onDone }: {
  action: NoteAction; onClose: () => void; onDone: (t: Ticket) => void;
}) {
  const tr = useLt();
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const { kind, ticket } = action;
  const required = kind !== 'reopen';
  const title = kind === 'resolve' ? tr('Mark fixed') : kind === 'cancel' ? tr('Close complaint') : tr('Reopen complaint');
  const label = kind === 'resolve' ? tr('What was done?') : kind === 'cancel' ? tr('Reason for closing') : tr('Note (optional)');

  const save = async () => {
    if (required && note.trim().length < 3) {
      showError(tr('Please write a short note.'));
      return;
    }
    setSaving(true);
    try {
      const fn = kind === 'resolve' ? ticketsApi.resolve : kind === 'cancel' ? ticketsApi.cancel : ticketsApi.reopen;
      onDone(await fn(ticket.id, note.trim()));
      showSuccess(tr('Saved'));
    } catch (e) {
      showError(tr((e as Error).message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose} closeOnOverlayClick={false}>
      <DialogHeader title={`${title} · ${ticket.ticketNo}`} onClose={onClose} />
      <DialogBody>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{ticket.customerName} — {categoryLabel(ticket.category)}</p>
        <label htmlFor="ticket-note" className="text-sm font-medium">{label}</label>
        <textarea id="ticket-note" rows={3} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)}
          placeholder={kind === 'resolve' ? tr('Example: replaced the adapter, signal OK') : ''}
          className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-2 text-sm" />
        {kind === 'resolve' && (
          <p className="text-xs text-gray-500 mt-1">{tr('The customer sees this note in their app.')}</p>
        )}
      </DialogBody>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>{tr('Cancel')}</Button>
        <Button onClick={save} disabled={saving}>{saving ? tr('Saving...') : tr('Save')}</Button>
      </DialogFooter>
    </Dialog>
  );
}

function NewComplaintDialog({ onClose, onDone }: { onClose: () => void; onDone: (t: Ticket) => void }) {
  const tr = useLt();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<Customer | null>(null);
  const [category, setCategory] = useState<ComplaintCategory>('no_signal');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    customersApi.getAll().then(setCustomers).catch(() => setCustomers([]));
  }, []);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return customers.filter((c) => [c.name, c.mobile, c.stbNumber, c.boxNumber, c.area]
      .some((v) => (v ?? '').toLowerCase().includes(q))).slice(0, 8);
  }, [customers, query]);

  const save = async () => {
    if (!picked) {
      showError(tr('Choose the customer.'));
      return;
    }
    setSaving(true);
    try {
      const t = await ticketsApi.create(picked.id, category, description.trim());
      showSuccess(tr('Complaint {{no}} created', { no: t.ticketNo }));
      onDone(t);
    } catch (e) {
      showError(tr((e as Error).message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose} closeOnOverlayClick={false} size="md">
      <DialogHeader title={tr('New complaint')} onClose={onClose} />
      <DialogBody className="space-y-3">
        <div>
          <label htmlFor="nc-customer" className="text-sm font-medium">{tr('Customer')}</label>
          {picked ? (
            <div className="mt-1 flex items-center justify-between gap-2 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950 px-3 py-2 text-sm">
              <span className="min-w-0 break-words">{picked.name} · {picked.mobile || picked.stbNumber}</span>
              <button type="button" className="text-xs text-blue-700 underline shrink-0" onClick={() => setPicked(null)}>
                {tr('Change')}
              </button>
            </div>
          ) : (
            <>
              <input id="nc-customer" value={query} onChange={(e) => setQuery(e.target.value)} autoComplete="off"
                placeholder={tr('Type name, mobile or box number')}
                className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm" />
              {matches.length > 0 && (
                <ul className="mt-1 rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800 max-h-56 overflow-y-auto">
                  {matches.map((c) => (
                    <li key={c.id}>
                      <button type="button" onClick={() => setPicked(c)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800">
                        <span className="font-medium">{c.name}</span>
                        <span className="block text-xs text-gray-500">{[c.mobile, c.stbNumber, c.area].filter(Boolean).join(' · ')}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
        <div>
          <label htmlFor="nc-cat" className="text-sm font-medium">{tr('Problem')}</label>
          <select id="nc-cat" value={category} onChange={(e) => setCategory(e.target.value as ComplaintCategory)}
            className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-2 text-sm">
            {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label()}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="nc-desc" className="text-sm font-medium">{tr('Details (optional)')}</label>
          <textarea id="nc-desc" rows={3} maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-2 text-sm" />
        </div>
      </DialogBody>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>{tr('Cancel')}</Button>
        <Button onClick={save} disabled={saving}>{saving ? tr('Saving...') : tr('Save')}</Button>
      </DialogFooter>
    </Dialog>
  );
}

export default Complaints;
