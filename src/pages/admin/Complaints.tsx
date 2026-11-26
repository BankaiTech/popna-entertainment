// Complaints. Customers raise them in the customer app, or the office adds them on a phone call.
// Office (owner / manager): sees all, assigns to one staff member or leaves it open for everyone.
// Field staff: see complaints nobody has taken plus their own; "I will go" takes one; marking fixed saves GPS.
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2, Hand, List, Map as MapIcon, MapPin, Plus, RefreshCw, Search, Smartphone, Users, Wrench, Inbox,
} from 'lucide-react';
import { useLt } from '@/lib/lt';
import { useAuthStore } from '@/store/useAuthStore';
import {
  ticketsApi, ticketInTab, isOpenTicket,
  type FieldSummary, type OfficeSummary, type Ticket, type TicketTab,
} from '@/api/complaintTickets';
import { usersApi } from '@/api/users';
import { isMockMode } from '@/lib/apiHelpers';
import type { User } from '@/models/types';
import { categoryLabel } from '@/pages/customer/portalShared';
import { showError, showSuccess } from '@/utils/toast';
import {
  AssignSheet, DetailsSheet, NewComplaintSheet, NoteSheet, ResolveSheet, staffStatusClass, staffStatusLabel, timeAgo,
} from '@/components/complaints/ComplaintSheets';
import { PointsMap, type MapPoint } from '@/components/complaints/ComplaintMap';

type Open =
  | { kind: 'details' | 'assign' | 'resolve' | 'cancel' | 'reopen'; id: number }
  | { kind: 'new' }
  | null;

const Complaints = () => {
  const tr = useLt();
  const role = useAuthStore((s) => s.role);
  const isOffice = role === 'admin';
  const [tab, setTab] = useState<TicketTab>(isOffice ? 'open' : 'pool');
  const [rows, setRows] = useState<Ticket[] | null>(null);
  const [summary, setSummary] = useState<OfficeSummary | FieldSummary | null>(null);
  const [search, setSearch] = useState('');
  const [staff, setStaff] = useState<User[]>([]);
  const [open, setOpen] = useState<Open>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [view, setView] = useState<'list' | 'map'>('list');

  const loadSummary = useCallback(() => {
    ticketsApi.summary().then(setSummary).catch(() => undefined);
  }, []);

  const load = useCallback((quiet = false) => {
    if (!quiet) setRows(null);
    ticketsApi.list(tab).then(setRows).catch((e: Error) => { setRows((r) => r ?? []); showError(tr(e.message)); });
    loadSummary();
  }, [tab, tr, loadSummary]);
  useEffect(() => { load(); }, [load]);

  // New complaints show up when the app comes back to the screen.
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') load(true); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [load]);

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
    return rows.filter((r) => [r.ticketNo, r.customerName, r.customerMobile, r.customerStb, r.customerArea, r.assignedToName]
      .some((v) => (v ?? '').toLowerCase().includes(q)));
  }, [rows, search]);

  const current = open && 'id' in open ? rows?.find((r) => r.id === open.id) ?? null : null;

  /** After an action: update the row (or drop it if it left this tab) and refresh the counts. */
  const replace = (t: Ticket) => {
    setRows((prev) => {
      if (!prev) return prev;
      const exists = prev.some((r) => r.id === t.id);
      if (!ticketInTab(t, tab)) return prev.filter((r) => r.id !== t.id);
      return exists ? prev.map((r) => (r.id === t.id ? t : r)) : [t, ...prev];
    });
    loadSummary();
  };

  const afterAction = (t: Ticket) => {
    replace(t);
    // Keep the details open when it is still in this list; otherwise close everything.
    setOpen(ticketInTab(t, tab) ? { kind: 'details', id: t.id } : null);
  };

  const take = async (t: Ticket) => {
    setBusy(t.id);
    try {
      const updated = await ticketsApi.take(t.id);
      showSuccess(tr('It is yours now. Find it in My complaints.'));
      // Go to My complaints with it open: call the customer or get directions right away.
      if (tab !== 'mine') setTab('mine');
      setOpen({ kind: 'details', id: updated.id });
    } catch (e) {
      showError(tr((e as Error).message));
      load(true);
      setOpen(null);
    } finally {
      setBusy(null);
    }
  };

  const office = summary && 'counts' in summary ? summary : null;
  const field = summary && !('counts' in summary) ? summary : null;
  const tabs: { key: TicketTab; label: string; count?: number }[] = isOffice
    ? [
      { key: 'open', label: tr('Open'), count: office?.open },
      { key: 'unassigned', label: tr('Not assigned'), count: office?.unassigned },
      { key: 'assigned', label: tr('Assigned'), count: office?.counts.assigned },
      { key: 'resolved', label: tr('Fixed'), count: office?.counts.resolved },
      { key: 'cancelled', label: tr('Closed'), count: office?.counts.cancelled },
      { key: 'all', label: tr('All') },
    ]
    : [
      { key: 'pool', label: tr('Open for all'), count: field?.unassigned },
      { key: 'mine', label: tr('My complaints'), count: field?.mineOpen },
      { key: 'done', label: tr('Done'), count: field?.mineClosed },
    ];

  const mapPoints: MapPoint[] = useMemo(() => shown
    .filter((t) => t.resolvedLatitude != null && t.resolvedLongitude != null)
    .map((t) => ({
      id: t.id, lat: Number(t.resolvedLatitude), lng: Number(t.resolvedLongitude),
      label: `${t.ticketNo} · ${t.customerName} · ${t.resolvedByName}`,
    }))
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng)), [shown]);
  const mapAllowed = isOffice && (tab === 'resolved' || tab === 'all');
  const showMap = mapAllowed && view === 'map';
  const pickOnMap = useCallback((id: number) => setOpen({ kind: 'details', id }), []);

  const emptyText = isOffice
    ? (tab === 'open' || tab === 'unassigned' ? tr('No open complaints.') : tr('Nothing here.'))
    : tab === 'pool' ? tr('No new complaints right now.')
      : tab === 'mine' ? tr('Nothing given to you. Take one from Open for all.') : tr('Nothing here.');

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{tr('Complaints')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {isOffice
              ? tr('Assign a complaint to one staff member, or leave it open so any of them can take it.')
              : tr('Take a complaint, fix it, then mark it fixed at the customer\'s place.')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => load()} aria-label={tr('Refresh')}
            className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
            <RefreshCw className="w-4 h-4" />
          </button>
          {isOffice && (
            <button type="button" onClick={() => setOpen({ kind: 'new' })}
              className="inline-flex items-center gap-1.5 min-h-[42px] px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold">
              <Plus className="w-4 h-4" />{tr('New complaint')}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="-mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto">
        <div role="tablist" aria-label={tr('Complaints')} className="inline-flex gap-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-800">
          {tabs.map((f) => {
            const active = tab === f.key;
            return (
              <button key={f.key} role="tab" aria-selected={active} type="button"
                onClick={() => { setTab(f.key); setView('list'); }}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${active
                  ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-300'}`}>
                {f.label}
                {f.count != null && (
                  <span className={`min-w-[1.25rem] px-1.5 rounded-full text-xs ${active
                    ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`}>{f.count}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} type="search"
            placeholder={tr('Search name, mobile, box number, ticket')} aria-label={tr('Search')}
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm" />
        </div>
        {mapAllowed && (
          <div className="inline-flex rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shrink-0">
            {(['list', 'map'] as const).map((v) => (
              <button key={v} type="button" onClick={() => setView(v)} aria-pressed={view === v}
                className={`inline-flex items-center gap-1 px-3 text-sm ${view === v ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300'}`}>
                {v === 'list' ? <List className="w-4 h-4" /> : <MapIcon className="w-4 h-4" />}
                <span className="hidden sm:inline">{v === 'list' ? tr('List') : tr('Map')}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {rows === null && (
        <div className="space-y-3" aria-busy="true">
          {[0, 1, 2].map((i) => <div key={i} className="h-28 rounded-2xl bg-gray-200/70 dark:bg-gray-800 animate-pulse" />)}
        </div>
      )}

      {rows !== null && showMap && (
        mapPoints.length ? (
          <div className="space-y-2">
            <PointsMap points={mapPoints} onPick={pickOnMap} />
            <p className="text-xs text-gray-500">{tr('Each dot is where a complaint was marked fixed. Tap a dot for details.')}</p>
          </div>
        ) : (
          <div className="text-center py-16 text-gray-500">
            <MapPin className="w-10 h-10 mx-auto mb-2 text-gray-300" />{tr('No fixed complaints with a location yet.')}
          </div>
        )
      )}

      {rows !== null && !showMap && shown.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          {tab === 'pool' || tab === 'open' ? <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            : <Inbox className="w-10 h-10 mx-auto mb-2 text-gray-300" />}
          {emptyText}
        </div>
      )}

      {!showMap && (
        <ul className="grid gap-3 lg:grid-cols-2">
          {shown.map((t) => {
            const isOpen = isOpenTicket(t);
            const unassigned = t.status === 'open' && !t.assignedTo;
            const stripe = { open: 'border-l-amber-500', assigned: 'border-l-blue-500', resolved: 'border-l-green-600', cancelled: 'border-l-gray-400' }[t.status];
            return (
              <li key={t.id}
                className={`rounded-2xl border border-gray-200 dark:border-gray-700 border-l-4 ${stripe} bg-white dark:bg-gray-900 shadow-sm flex flex-col`}>
                <button type="button" onClick={() => setOpen({ kind: 'details', id: t.id })}
                  className="text-left p-4 pb-3 flex-1 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-gray-900 dark:text-white break-words">{categoryLabel(t.category)}</p>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${staffStatusClass(t.status)}`}>
                      {staffStatusLabel(tr, t)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-medium text-gray-800 dark:text-gray-200 break-words">{t.customerName}</p>
                  {(t.customerArea || t.customerAddress) && (
                    <p className="text-xs text-gray-500 break-words flex items-start gap-1">
                      <MapPin className="w-3.5 h-3.5 shrink-0 mt-px" />{[t.customerAddress, t.customerArea].filter(Boolean).join(', ')}
                    </p>
                  )}
                  {t.description && <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 line-clamp-2 break-words">{t.description}</p>}
                  <p className="mt-2 text-xs text-gray-500 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-mono">{t.ticketNo}</span>
                    <span>· {timeAgo(t.createdAt)}</span>
                    {t.raisedByCustomer && <span className="inline-flex items-center gap-0.5 text-violet-600 dark:text-violet-400"><Smartphone className="w-3 h-3" />{tr('from customer app')}</span>}
                  </p>
                </button>
                <div className="flex items-center gap-2 px-4 pb-3 pt-2 border-t border-gray-100 dark:border-gray-800">
                  <span className="min-w-0 flex-1 text-xs inline-flex items-center gap-1.5">
                    {t.assignedTo ? (
                      <><Wrench className="w-3.5 h-3.5 text-blue-600 shrink-0" /><span className="truncate">{t.status === 'resolved' && t.resolvedByName ? t.resolvedByName : t.assignedToName}</span></>
                    ) : unassigned ? (
                      <><Users className="w-3.5 h-3.5 text-amber-600 shrink-0" /><span className="text-amber-800 dark:text-amber-300 truncate">{tr('Open for all staff')}</span></>
                    ) : null}
                  </span>
                  {isOffice && isOpen && (
                    <button type="button" onClick={() => setOpen({ kind: 'assign', id: t.id })}
                      className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800">
                      {t.assignedTo ? tr('Change') : tr('Assign')}
                    </button>
                  )}
                  {!isOffice && unassigned && (
                    <button type="button" onClick={() => take(t)} disabled={busy === t.id}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold disabled:opacity-50">
                      <Hand className="w-3.5 h-3.5" />{busy === t.id ? tr('Saving...') : tr('I will go')}
                    </button>
                  )}
                  {isOpen && (isOffice || !unassigned) && (
                    <button type="button" onClick={() => setOpen({ kind: 'resolve', id: t.id })}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />{tr('Mark fixed')}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {current && open?.kind === 'details' && (
        <DetailsSheet ticket={current} isOffice={isOffice} busy={busy === current.id}
          onClose={() => setOpen(null)}
          onAssign={() => setOpen({ kind: 'assign', id: current.id })}
          onTake={() => take(current)}
          onResolve={() => setOpen({ kind: 'resolve', id: current.id })}
          onCancel={() => setOpen({ kind: 'cancel', id: current.id })}
          onReopen={() => setOpen({ kind: 'reopen', id: current.id })} />
      )}
      {current && open?.kind === 'assign' && (
        <AssignSheet ticket={current} staff={staff} onClose={() => setOpen(null)} onDone={afterAction} />
      )}
      {current && open?.kind === 'resolve' && (
        <ResolveSheet ticket={current} isOffice={isOffice} onClose={() => setOpen(null)} onDone={afterAction} />
      )}
      {current && (open?.kind === 'cancel' || open?.kind === 'reopen') && (
        <NoteSheet kind={open.kind} ticket={current} onClose={() => setOpen(null)} onDone={afterAction} />
      )}
      {open?.kind === 'new' && (
        <NewComplaintSheet staff={staff} onClose={() => setOpen(null)}
          onDone={(t) => { setOpen(null); replace(t); }} />
      )}
    </div>
  );
};

export default Complaints;
