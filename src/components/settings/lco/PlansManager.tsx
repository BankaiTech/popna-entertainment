/**
 * Plans and prices for each provider (GTPL Basic Pack ₹230, RailWire 40 Mbps ₹500 + 18% GST...).
 * Real backend only: /api/plans. The server enforces the plan limit set by the app owner,
 * picks cable/internet from the provider, and refuses to delete a plan customers still use.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/Dialog';
import { plansApi, planMonthly, planPriceWithGst } from '@/api/api';
import type { Plan, Product } from '@/models/types';
import { showError, showSuccess } from '@/utils/toast';
import { useLt } from '@/lib/lt';

const input = 'w-full h-10 rounded-lg border border-border bg-background px-3 text-sm';
const GST_RATES = [0, 5, 12, 18, 28];

/** One plan row in the form. Several rows = several plans saved together. */
interface Row {
  key: number;
  planName: string;
  price: string;
  gstRate: string;
  installationAmount: string;
  description: string;
}

interface Draft {
  id?: number; // editing one existing plan
  provider: string;
  rows: Row[];
}

let rowKey = 0;
const emptyRow = (gstRate = '0'): Row => ({
  key: ++rowKey, planName: '', price: '', gstRate, installationAmount: '0', description: '',
});

const rupees = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;

export default function PlansManager({ providers }: { providers: Product[] }) {
  const tr = useLt();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    try {
      setPlans(await plansApi.getAll());
    } catch (e) {
      showError(e instanceof Error ? e.message : tr('Could not load plans'));
    } finally {
      setLoading(false);
    }
  }, [tr]);
  useEffect(() => { load(); }, [load]);

  const activeProviders = providers.filter((p) => p.isActive);
  const groups = useMemo(() => {
    const names = Array.from(new Set([...providers.map((p) => p.name), ...plans.map((p) => p.provider)]));
    return names
      .map((name) => ({ name, plans: plans.filter((p) => p.provider.toLowerCase() === name.toLowerCase()) }))
      .filter((g) => g.plans.length > 0);
  }, [providers, plans]);

  const open = (d: Draft) => { setFormError(''); setDraft(d); };
  const setRow = (key: number, k: keyof Row, v: string) =>
    setDraft((d) => (d ? { ...d, rows: d.rows.map((r) => (r.key === key ? { ...r, [k]: v } : r)) } : d));
  const addRow = () => setDraft((d) => (d ? { ...d, rows: [...d.rows, emptyRow(d.rows[d.rows.length - 1]?.gstRate)] } : d));
  const removeRow = (key: number) => setDraft((d) => (d && d.rows.length > 1 ? { ...d, rows: d.rows.filter((r) => r.key !== key) } : d));

  const save = async () => {
    if (!draft) return;
    setFormError('');
    if (!draft.provider) return setFormError(tr('Choose the provider.'));
    const seen = new Set<string>();
    const bodies: Partial<Plan>[] = [];
    for (const [i, r] of draft.rows.entries()) {
      const label = draft.rows.length > 1 ? `${tr('Plan')} ${i + 1}: ` : '';
      const name = r.planName.trim();
      const price = Number(r.price);
      if (!name) return setFormError(label + tr('Enter the plan name.'));
      if (r.price === '' || !(price >= 0)) return setFormError(label + tr('Enter the price.'));
      const k = name.toLowerCase();
      if (seen.has(k)) return setFormError(label + tr('This plan name is used twice.'));
      seen.add(k);
      bodies.push({
        planName: name, price, gstRate: Number(r.gstRate) || 0,
        installationAmount: Number(r.installationAmount) || 0, description: r.description.trim(),
      });
    }
    setSaving(true);
    try {
      if (draft.id) await plansApi.update(draft.id, { provider: draft.provider as Plan['provider'], ...bodies[0] });
      else if (bodies.length === 1) await plansApi.create({ provider: draft.provider, ...bodies[0] } as Omit<Plan, 'id'>);
      else await plansApi.createMany(draft.provider, bodies);
      showSuccess(bodies.length > 1 ? tr('{{n}} plans saved', { n: bodies.length }) : tr('Plan saved'));
      setDraft(null);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : tr('Could not save'));
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (p: Plan) => {
    try {
      await plansApi.update(p.id, { isActive: !(p.isActive ?? true) });
      await load();
    } catch (e) {
      showError(e instanceof Error ? e.message : tr('Could not save'));
    }
  };

  const remove = async (p: Plan) => {
    if (!window.confirm(tr('Delete this plan?'))) return;
    try {
      await plansApi.delete(p.id);
      showSuccess(tr('Plan deleted'));
      await load();
    } catch (e) {
      showError(e instanceof Error ? e.message : tr('Could not delete'));
    }
  };

  return (
    <section className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base sm:text-lg font-semibold">{tr('Plans and prices')}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {tr('Each plan belongs to a provider. Customers are billed the price of their plan every month.')}
          </p>
        </div>
        <Button
          onClick={() => open({ provider: activeProviders[0]?.name ?? '', rows: [emptyRow()] })}
          disabled={activeProviders.length === 0}
          className="shrink-0 w-full sm:w-auto"
        >
          <Plus className="w-4 h-4 mr-2" />
          {tr('Add plan')}
        </Button>
      </div>

      {activeProviders.length === 0 && (
        <p className="text-sm text-muted-foreground">{tr('Add a provider above first.')}</p>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground py-6 text-center">{tr('Loading...')}</p>
      ) : groups.length === 0 ? (
        <div className="py-10 text-center border-2 border-dashed border-border rounded-xl text-sm text-muted-foreground">
          {tr('No plans yet.')}
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <div key={g.name} className="rounded-xl border border-border overflow-hidden">
              <div className="px-4 py-2 bg-muted/40 text-sm font-semibold">{g.name}</div>
              <ul className="divide-y divide-border">
                {g.plans.map((p) => {
                  const total = planMonthly(p);
                  const active = p.isActive ?? true;
                  return (
                    <li key={p.id} className={`px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2 ${active ? '' : 'opacity-60'}`}>
                      <div className="min-w-0 flex-1 basis-40">
                        <p className="font-medium text-sm truncate">{p.planName}</p>
                        <p className="text-sm font-semibold">
                          {rupees(total)}<span className="text-xs font-normal text-muted-foreground"> {tr('per month')}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {p.gstRate ? tr('{{price}} + {{gst}}% GST', { price: rupees(p.price), gst: p.gstRate }) : tr('No GST')}
                          {p.installationAmount ? ` · ${tr('Installation')} ${rupees(p.installationAmount)}` : ''}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggle(p)}
                        className={`text-xs px-2.5 py-1 rounded-full border ${active ? 'border-green-300 text-green-700 bg-green-50 dark:bg-green-900/20 dark:text-green-400' : 'border-border text-muted-foreground'}`}
                      >
                        {active ? tr('Active') : tr('Inactive')}
                      </button>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost" size="xs" aria-label={tr('Edit')}
                          onClick={() => open({
                            id: p.id, provider: p.provider, rows: [{
                              key: ++rowKey, planName: p.planName, price: String(p.price),
                              gstRate: String(p.gstRate || 0), installationAmount: String(p.installationAmount || 0),
                              description: p.description || '',
                            }],
                          })}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="xs" aria-label={tr('Delete')} onClick={() => remove(p)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}

      {draft && (
        <Dialog open onClose={() => setDraft(null)}>
          <DialogHeader
            title={draft.id ? tr('Edit plan') : draft.rows.length > 1 ? tr('Add {{n}} plans', { n: draft.rows.length }) : tr('Add plan')}
            onClose={() => setDraft(null)}
          />
          <DialogBody>
            <div className="p-4 sm:p-5 space-y-4 text-sm">
              <label className="block"><span className="block font-medium mb-1">{tr('Provider')}</span>
                <select className={input} value={draft.provider} disabled={!!draft.id}
                  onChange={(e) => setDraft({ ...draft, provider: e.target.value })}>
                  {(draft.id ? providers : activeProviders).map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
                </select></label>

              {draft.rows.map((r, i) => {
                const price = Number(r.price);
                const after = r.price !== '' && price >= 0 ? planPriceWithGst(price, Number(r.gstRate) || 0) : null;
                return (
                  <fieldset key={r.key} className="rounded-xl border border-border p-3 space-y-3">
                    {!draft.id && draft.rows.length > 1 && (
                      <div className="flex items-center justify-between">
                        <legend className="text-xs font-semibold text-muted-foreground">{tr('Plan')} {i + 1}</legend>
                        <button type="button" onClick={() => removeRow(r.key)} aria-label={tr('Remove')}
                          className="p-1 rounded hover:bg-muted text-muted-foreground"><X className="w-4 h-4" /></button>
                      </div>
                    )}
                    <label className="block"><span className="block font-medium mb-1">{tr('Plan name')}</span>
                      <input className={input} value={r.planName} onChange={(e) => setRow(r.key, 'planName', e.target.value)}
                        placeholder={tr('e.g. Basic Pack or 40 Mbps')} /></label>
                    <div className="grid grid-cols-2 gap-3">
                      <label><span className="block font-medium mb-1">{tr('Price before GST (₹)')}</span>
                        <input type="number" min={0} step="0.01" inputMode="decimal" className={input} value={r.price}
                          onChange={(e) => setRow(r.key, 'price', e.target.value)} /></label>
                      <label><span className="block font-medium mb-1">{tr('GST')}</span>
                        <select className={input} value={r.gstRate} onChange={(e) => setRow(r.key, 'gstRate', e.target.value)}>
                          {GST_RATES.map((g) => <option key={g} value={g}>{g}%</option>)}
                        </select></label>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-primary/5 border border-primary/20 px-3 py-2">
                      <span className="text-muted-foreground">{tr('Customer pays per month (after GST)')}</span>
                      <span className="text-base font-bold text-primary">{after === null ? '—' : rupees(after)}</span>
                    </div>
                    {draft.id && (
                      <>
                        <label className="block"><span className="block font-medium mb-1">{tr('Installation charge (₹)')}</span>
                          <input type="number" min={0} inputMode="decimal" className={input} value={r.installationAmount}
                            onChange={(e) => setRow(r.key, 'installationAmount', e.target.value)} /></label>
                        <label className="block"><span className="block font-medium mb-1">{tr('Note (optional)')}</span>
                          <input className={input} value={r.description} onChange={(e) => setRow(r.key, 'description', e.target.value)} /></label>
                      </>
                    )}
                  </fieldset>
                );
              })}

              {!draft.id && (
                <Button type="button" variant="outline" onClick={addRow} className="w-full" disabled={draft.rows.length >= 30}>
                  <Plus className="w-4 h-4 mr-2" /> {tr('Add another plan')}
                </Button>
              )}
              {draft.id && (
                <p className="text-xs text-muted-foreground">
                  {tr('A new price is billed from the next bill. This month\'s unpaid bills keep their amount.')}
                </p>
              )}
              {formError && <p role="alert" className="text-sm text-red-600">{formError}</p>}
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)}>{tr('Cancel')}</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? tr('Saving…') : draft.rows.length > 1 ? tr('Save {{n}} plans', { n: draft.rows.length }) : tr('Save')}
            </Button>
          </DialogFooter>
        </Dialog>
      )}
    </section>
  );
}
