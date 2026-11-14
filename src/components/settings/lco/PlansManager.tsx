/**
 * Plans and prices for each provider (GTPL Basic Pack ₹230, RailWire 40 Mbps ₹500 + 18% GST...).
 * Real backend only: /api/plans. The server enforces the plan limit set by the app owner,
 * picks cable/internet from the provider, and refuses to delete a plan customers still use.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/Dialog';
import { plansApi } from '@/api/api';
import type { Plan, Product } from '@/models/types';
import { showError, showSuccess } from '@/utils/toast';
import { useLt } from '@/lib/lt';

const input = 'w-full h-10 rounded-lg border border-border bg-background px-3 text-sm';

interface Draft {
  id?: number;
  provider: string;
  planName: string;
  price: string;
  gstRate: string;
  installationAmount: string;
  description: string;
}

const emptyDraft = (provider: string): Draft => ({
  provider, planName: '', price: '', gstRate: '0', installationAmount: '0', description: '',
});

const rupees = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export default function PlansManager({ providers }: { providers: Product[] }) {
  const tr = useLt();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

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

  const set = (k: keyof Draft, v: string) => setDraft((d) => (d ? { ...d, [k]: v } : d));

  const save = async () => {
    if (!draft) return;
    const price = Number(draft.price);
    if (!draft.provider || !draft.planName.trim() || !(price >= 0) || draft.price === '') {
      showError(tr('Enter provider, plan name and price'));
      return;
    }
    const body: Partial<Plan> = {
      provider: draft.provider as Plan['provider'],
      planName: draft.planName.trim(),
      price,
      gstRate: Number(draft.gstRate) || 0,
      installationAmount: Number(draft.installationAmount) || 0,
      description: draft.description.trim(),
    };
    setSaving(true);
    try {
      if (draft.id) await plansApi.update(draft.id, body);
      else await plansApi.create(body as Omit<Plan, 'id'>);
      showSuccess(tr('Plan saved'));
      setDraft(null);
      await load();
    } catch (e) {
      showError(e instanceof Error ? e.message : tr('Could not save'));
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
          onClick={() => setDraft(emptyDraft(activeProviders[0]?.name ?? ''))}
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
                  const total = p.price * (1 + (p.gstRate || 0) / 100);
                  const active = p.isActive ?? true;
                  return (
                    <li key={p.id} className={`px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2 ${active ? '' : 'opacity-60'}`}>
                      <div className="min-w-0 flex-1 basis-40">
                        <p className="font-medium text-sm truncate">{p.planName}</p>
                        <p className="text-xs text-muted-foreground">
                          {rupees(p.price)}
                          {p.gstRate ? ` + ${p.gstRate}% GST = ${rupees(total)}` : ''}
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
                          onClick={() => setDraft({
                            id: p.id, provider: p.provider, planName: p.planName, price: String(p.price),
                            gstRate: String(p.gstRate || 0), installationAmount: String(p.installationAmount || 0),
                            description: p.description || '',
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
          <DialogHeader title={draft.id ? tr('Edit plan') : tr('Add plan')} onClose={() => setDraft(null)} />
          <DialogBody>
            <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <label className="sm:col-span-2"><span className="block font-medium mb-1">{tr('Provider')}</span>
                <select className={input} value={draft.provider} disabled={!!draft.id} onChange={(e) => set('provider', e.target.value)}>
                  {(draft.id ? providers : activeProviders).map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
                </select></label>
              <label className="sm:col-span-2"><span className="block font-medium mb-1">{tr('Plan name')}</span>
                <input className={input} value={draft.planName} onChange={(e) => set('planName', e.target.value)} placeholder={tr('e.g. Basic Pack or 40 Mbps')} /></label>
              <label><span className="block font-medium mb-1">{tr('Monthly price (₹, before GST)')}</span>
                <input type="number" min={0} inputMode="decimal" className={input} value={draft.price} onChange={(e) => set('price', e.target.value)} /></label>
              <label><span className="block font-medium mb-1">{tr('GST')}</span>
                <select className={input} value={draft.gstRate} onChange={(e) => set('gstRate', e.target.value)}>
                  {[0, 5, 12, 18, 28].map((g) => <option key={g} value={g}>{g}%</option>)}
                </select></label>
              <label><span className="block font-medium mb-1">{tr('Installation charge (₹)')}</span>
                <input type="number" min={0} inputMode="decimal" className={input} value={draft.installationAmount} onChange={(e) => set('installationAmount', e.target.value)} /></label>
              <label className="sm:col-span-2"><span className="block font-medium mb-1">{tr('Note (optional)')}</span>
                <input className={input} value={draft.description} onChange={(e) => set('description', e.target.value)} /></label>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)}>{tr('Cancel')}</Button>
            <Button onClick={save} disabled={saving}>{tr('Save')}</Button>
          </DialogFooter>
        </Dialog>
      )}
    </section>
  );
}
