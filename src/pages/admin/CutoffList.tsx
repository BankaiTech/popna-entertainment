// Who should be switched off today in the provider's portal (GTPL / RailWire / BSNL).
import { useEffect, useMemo, useState } from 'react';
import { Phone, ScissorsLineDashed } from 'lucide-react';
import { connectionsApi, type CutoffRow } from '@/api/collections';
import { formatDateIN } from '@/lib/subscription';
import { showError } from '@/utils/toast';
import { tr } from '@/lib/lt';

type Tab = 'all' | 'cable' | 'internet';

const CutoffList = () => {
  const [rows, setRows] = useState<CutoffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('all');
  const [area, setArea] = useState('');

  useEffect(() => {
    connectionsApi
      .cutoff()
      .then((r) => setRows(r.customers))
      .catch((err) => showError(err instanceof Error ? err.message : tr('Could not load the cut-off list')))
      .finally(() => setLoading(false));
  }, []);

  const areas = useMemo(() => [...new Set(rows.map((r) => r.area).filter(Boolean))] as string[], [rows]);
  const shown = rows.filter((r) => (tab === 'all' || r.category === tab) && (!area || r.area === area));
  const count = (t: Tab) => rows.filter((r) => t === 'all' || r.category === t).length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg sm:text-xl font-bold flex items-center gap-2"><ScissorsLineDashed className="w-5 h-5" /> {tr('Cut-off list')}</h1>
        <p className="text-sm text-muted-foreground">
          {tr('Cable: unpaid after this month\'s cut-off date. Internet: plan expired. Deactivate these in the provider\'s portal.')}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        {(['all', 'cable', 'internet'] as Tab[]).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-full text-sm border ${tab === t ? 'bg-blue-600 text-white border-blue-600' : 'border-border'}`}>
            {t === 'all' ? tr('All') : t === 'cable' ? tr('Cable') : tr('Internet')} ({count(t)})
          </button>
        ))}
        {areas.length > 0 && (
          <select value={area} onChange={(e) => setArea(e.target.value)} className="h-9 rounded-lg border border-border bg-background px-2 text-sm">
            <option value="">{tr('All areas')}</option>
            {areas.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        )}
      </div>

      {loading ? (
        <p className="py-10 text-center text-muted-foreground">{tr('Loading…')}</p>
      ) : shown.length === 0 ? (
        <p className="py-10 text-center text-muted-foreground">{tr('Nobody to cut off. 🎉')}</p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {shown.map((r) => (
            <li key={`${r.category}-${r.customerId}`} className="p-3 flex items-start justify-between gap-3">
              <div className="min-w-0 text-sm">
                <p className="font-semibold truncate">{r.name}</p>
                <p className="text-xs text-muted-foreground">
                  {r.provider} · {r.category === 'cable' ? tr('Cable') : tr('Internet')}{r.area ? ` · ${r.area}` : ''}
                  {r.boxNumber ? ` · Box ${r.boxNumber}` : ''}
                </p>
                <p className="text-xs text-red-600 mt-0.5">
                  {r.category === 'cable' ? tr('Cut-off date') : tr('Expired on')} {formatDateIN(r.since)}
                  {r.balance ? ` · Due ₹${Number(r.balance).toLocaleString('en-IN')}` : ''}
                </p>
              </div>
              <a href={`tel:${r.mobile}`} className="shrink-0 inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-border text-sm">
                <Phone className="w-4 h-4" /> {tr('Call')}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default CutoffList;
