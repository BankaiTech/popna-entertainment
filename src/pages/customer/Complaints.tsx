// Customer app: report a problem and follow it until it is fixed.
import { useCallback, useEffect, useState } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Plus, Wrench } from 'lucide-react';
import { useLt } from '@/lib/lt';
import { customerPortalApi, type ComplaintCategory, type PortalComplaint } from '@/api/customerPortal';
import { showError, showSuccess } from '@/utils/toast';
import {
  CATEGORIES, categoryLabel, complaintStatusClass, complaintStatusLabel, fmtDate, type PortalContext,
} from './portalShared';

const CustomerComplaints = () => {
  const tr = useLt();
  const { profile } = useOutletContext<PortalContext>();
  const [params, setParams] = useSearchParams();
  const [rows, setRows] = useState<PortalComplaint[] | null>(null);
  const [showForm, setShowForm] = useState(params.get('new') === '1');
  const [category, setCategory] = useState<ComplaintCategory | ''>('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    customerPortalApi.complaints().then(setRows).catch((e: Error) => { setRows([]); showError(tr(e.message)); });
  }, [tr]);
  useEffect(() => { load(); }, [load]);

  const closeForm = () => {
    setShowForm(false);
    setCategory('');
    setDescription('');
    if (params.get('new')) setParams({}, { replace: true });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category) {
      showError(tr('Choose the problem.'));
      return;
    }
    setSaving(true);
    try {
      const c = await customerPortalApi.raiseComplaint(category, description.trim());
      showSuccess(tr('Complaint {{no}} sent to your operator.', { no: c.ticketNo }));
      closeForm();
      load();
    } catch (err) {
      showError(tr((err as Error).message));
    } finally {
      setSaving(false);
    }
  };

  const cancel = async (c: PortalComplaint) => {
    if (!window.confirm(tr('Close complaint {{no}}? Do this only if the problem is fixed.', { no: c.ticketNo }))) return;
    try {
      await customerPortalApi.cancelComplaint(c.id);
      load();
    } catch (err) {
      showError(tr((err as Error).message));
    }
  };

  if (profile?.complaintsEnabled === false) {
    return (
      <p className="mt-10 text-center text-sm text-gray-500">
        {tr('Complaints are not available. Please call your cable operator.')}
      </p>
    );
  }

  const isNet = profile?.category === 'internet';
  const choices = CATEGORIES.filter((c) => (isNet ? c.internet : c.cable));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl md:text-2xl font-bold">{tr('Complaints')}</h1>
        {!showForm && (
          <button type="button" onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 text-white text-sm font-semibold px-3 py-2">
            <Plus className="w-4 h-4" /> {tr('New complaint')}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={submit} className="md:max-w-2xl rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 p-4 space-y-3">
          <fieldset>
            <legend className="text-sm font-semibold mb-2">{tr('What is the problem?')}</legend>
            <div className="grid gap-2 md:grid-cols-2">
              {choices.map((c) => (
                <label key={c.key}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm cursor-pointer ${
                    category === c.key ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 'border-gray-200 dark:border-slate-700'}`}>
                  <input type="radio" name="category" value={c.key} checked={category === c.key}
                    onChange={() => setCategory(c.key)} className="accent-blue-600" />
                  {c.label()}
                </label>
              ))}
            </div>
          </fieldset>
          <div>
            <label htmlFor="c-desc" className="text-sm font-semibold">{tr('Details (optional)')}</label>
            <textarea id="c-desc" rows={3} maxLength={500} value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={tr('Example: no channels since morning, red light on the box')}
              className="mt-1 w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={closeForm}
              className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold">{tr('Cancel')}</button>
            <button type="submit" disabled={saving}
              className="flex-1 rounded-xl bg-blue-600 text-white py-2.5 text-sm font-semibold disabled:opacity-60">
              {saving ? tr('Sending...') : tr('Send')}
            </button>
          </div>
        </form>
      )}

      {rows === null && (
        <div className="space-y-3" aria-busy="true">
          {[0, 1].map((i) => <div key={i} className="h-24 rounded-2xl bg-gray-200/70 dark:bg-slate-800 animate-pulse" />)}
        </div>
      )}
      {rows?.length === 0 && !showForm && (
        <div className="text-center py-16 text-gray-500">
          <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-gray-300" />
          {tr('No complaints. If something is not working, tap New complaint.')}
        </div>
      )}
      <div className="grid gap-3 md:grid-cols-2 md:gap-4">
      {rows?.map((c) => {
        const open = c.status === 'open' || c.status === 'assigned';
        return (
          <article key={c.id} className="rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold">{categoryLabel(c.category)}</p>
                <p className="text-xs text-gray-500">{c.ticketNo} · {fmtDate(c.createdAt)}</p>
              </div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${complaintStatusClass(c.status)}`}>
                {complaintStatusLabel(c.status)}
              </span>
            </div>
            {c.description && <p className="mt-2 text-sm text-gray-700 break-words">{c.description}</p>}
            {c.technician && open && (
              <p className="mt-2 flex items-center gap-1.5 text-sm text-blue-700">
                <Wrench className="w-4 h-4" /> {tr('Technician: {{name}}', { name: c.technician })}
              </p>
            )}
            {c.status === 'resolved' && (
              <p className="mt-2 text-sm text-green-700 break-words">
                {tr('Fixed on {{date}}', { date: fmtDate(c.resolvedAt) })}
                {c.resolutionNote ? ` — ${c.resolutionNote}` : ''}
              </p>
            )}
            {open && (
              <button type="button" onClick={() => cancel(c)}
                className="mt-3 text-xs font-semibold text-gray-500 underline">
                {tr('Problem fixed? Close this complaint')}
              </button>
            )}
          </article>
        );
      })}
      </div>
    </div>
  );
};

export default CustomerComplaints;
