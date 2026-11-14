// Collection list: customers with money due, by area, earliest due date first. Tap to collect.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Wallet } from 'lucide-react';
import { customersApi } from '@/api/api';
import CollectPaymentDialog from '@/components/CollectPaymentDialog';
import ServiceStatusBadge from '@/components/ServiceStatusBadge';
import { formatDateIN } from '@/lib/subscription';
import { showError } from '@/utils/toast';
import type { Customer } from '@/models/types';
import { tr } from '@/lib/lt';

const CollectRoute = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [area, setArea] = useState('');
  const [category, setCategory] = useState<'' | 'cable' | 'internet'>('');
  const [q, setQ] = useState('');
  const [collecting, setCollecting] = useState<Customer | null>(null);

  const load = useCallback(async () => {
    try {
      setCustomers(await customersApi.getAll());
    } catch (err) {
      showError(err instanceof Error ? err.message : tr('Could not load customers'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const due = useMemo(
    () =>
      customers
        .filter((c) => c.status === 'Active' && c.paymentStatus !== 'paid' && (c.balanceAmount ?? 0) > 0)
        .sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999')),
    [customers],
  );
  const areas = useMemo(() => [...new Set(due.map((c) => c.area).filter(Boolean))].sort() as string[], [due]);
  const needle = q.trim().toLowerCase();
  const shown = due.filter(
    (c) =>
      (!area || c.area === area) &&
      (!category || c.category === category) &&
      (!needle || c.name.toLowerCase().includes(needle) || c.mobile.includes(needle) || (c.boxNumber ?? '').toLowerCase().includes(needle)),
  );
  const totalDue = shown.reduce((s, c) => s + (c.balanceAmount ?? 0), 0);

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h1 className="text-lg sm:text-xl font-bold flex items-center gap-2"><Wallet className="w-5 h-5" /> {tr('Collect')}</h1>
          <p className="text-sm text-muted-foreground">{shown.length} customers · ₹{totalDue.toLocaleString('en-IN')} due</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <select value={area} onChange={(e) => setArea(e.target.value)} className="h-10 rounded-lg border border-border bg-background px-2 text-sm">
          <option value="">{tr('All areas')}</option>
          {areas.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={category} onChange={(e) => setCategory(e.target.value as typeof category)} className="h-10 rounded-lg border border-border bg-background px-2 text-sm">
          <option value="">{tr('Cable + Internet')}</option>
          <option value="cable">{tr('Cable')}</option>
          <option value="internet">{tr('Internet')}</option>
        </select>
        <label className="col-span-2 relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr('Name, mobile or box number')}
            className="w-full h-10 rounded-lg border border-border bg-background pl-9 pr-3 text-sm" />
        </label>
      </div>

      {loading ? (
        <p className="py-10 text-center text-muted-foreground">{tr('Loading…')}</p>
      ) : shown.length === 0 ? (
        <p className="py-10 text-center text-muted-foreground">{tr('Nothing due here.')}</p>
      ) : (
        <ul className="space-y-2">
          {shown.map((c) => (
            <li key={c.id} className="rounded-xl border border-border p-3 flex items-center justify-between gap-3">
              <div className="min-w-0 text-sm">
                <p className="font-semibold truncate flex items-center gap-2">{c.name} <ServiceStatusBadge status={c.serviceStatus} /></p>
                <p className="text-xs text-muted-foreground truncate">
                  {c.area ?? tr('No area')} · {c.connectionType}{c.boxNumber ? ` · ${tr('Box')} ${c.boxNumber}` : ''}
                </p>
                {c.dueDate && (
                  <p className="text-xs text-muted-foreground">
                    {c.category === 'internet' ? tr('Expires') : tr('Cut-off')} {formatDateIN(c.dueDate)}
                  </p>
                )}
              </div>
              <button type="button" onClick={() => setCollecting(c)}
                className="shrink-0 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold">
                ₹{(c.balanceAmount ?? 0).toLocaleString('en-IN')}
              </button>
            </li>
          ))}
        </ul>
      )}

      {collecting && (
        <CollectPaymentDialog customer={collecting} onClose={() => setCollecting(null)} onCollected={load} />
      )}
    </div>
  );
};

export default CollectRoute;
