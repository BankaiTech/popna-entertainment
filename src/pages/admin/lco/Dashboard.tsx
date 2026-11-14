// LCO Desk dashboard — real numbers only (GET /dashboard/stats). No demo widgets.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, Wallet, IndianRupee, AlertTriangle, ScissorsLineDashed, MapPin, UserPlus, FileText, Map as MapIcon,
} from 'lucide-react';
import apiClient from '@/lib/apiClient';
import { unwrapApiData } from '@/lib/apiHelpers';
import { connectionsApi, paymentsApi, type PaymentReceipt } from '@/api/collections';
import { useAuthStore } from '@/store/useAuthStore';
import { formatDateIN } from '@/lib/subscription';
import { tr } from '@/lib/lt';
import i18n from '@/i18n';

interface Stats {
  period: string;
  customers: { total: number; active: number; inactive: number; new_this_month: number };
  by_provider: { provider: string; category: string; active: number; inactive: number }[];
  this_month: { billed: string | number; collected: string | number; pending_bills: number; collection_percent: number };
  today: { total: string | number; count: number; cash: string | number; upi: string | number };
  today_by_agent: { collected_by__name: string; collected_by__username: string; total: string | number; count: number }[];
}

const rs = (v: string | number | undefined) => `₹${Number(v ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

function Card({ title, value, sub, icon: Icon, tone = 'text-blue-600', to }: {
  title: string; value: string; sub?: string; icon: typeof Users; tone?: string; to?: string;
}) {
  const body = (
    <div className="rounded-xl border border-border bg-card p-4 h-full hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
        <Icon className={`w-5 h-5 ${tone}`} />
      </div>
      <p className="text-2xl font-bold mt-2">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}

function Shortcut({ to, icon: Icon, label }: { to: string; icon: typeof Users; label: string }) {
  return (
    <Link to={to} className="flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-medium hover:bg-muted/40">
      <Icon className="w-4 h-4 text-blue-600" /> {label}
    </Link>
  );
}

/** Field staff: their own day. */
function StaffHome() {
  const [today, setToday] = useState<PaymentReceipt[]>([]);
  useEffect(() => {
    paymentsApi.today().then(setToday).catch(() => undefined);
  }, []);
  const valid = today.filter((p) => p.status === 'valid');
  const total = valid.reduce((s, p) => s + Number(p.amount), 0);
  return (
    <div className="space-y-4 max-w-xl">
      <h1 className="text-lg sm:text-xl font-bold">{tr('Today')}</h1>
      <div className="grid grid-cols-2 gap-3">
        <Card title={tr('Collected today')} value={rs(total)} sub={tr('{{n}} payments', { n: valid.length })} icon={Wallet} tone="text-green-600" />
        <Card title={tr('Date')} value={formatDateIN(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date()))} icon={FileText} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Shortcut to="/admin/duty" icon={MapPin} label={tr('My Duty')} />
        <Shortcut to="/admin/collect" icon={Wallet} label={tr('Collect')} />
      </div>
    </div>
  );
}

const LcoDashboard = () => {
  const role = useAuthStore((s) => s.role);
  const [stats, setStats] = useState<Stats | null>(null);
  const [cutoff, setCutoff] = useState<number | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (role !== 'admin') return;
    apiClient.get('/dashboard/stats')
      .then((r) => setStats(unwrapApiData<Stats>(r)))
      .catch((e) => setError(e instanceof Error ? e.message : tr('Could not load the dashboard')));
    connectionsApi.cutoff().then((r) => setCutoff(r.count)).catch(() => undefined);
  }, [role]);

  if (role !== 'admin') return <StaffHome />;
  if (error) return <p className="py-10 text-center text-red-600">{error}</p>;
  if (!stats) return <p className="py-10 text-center text-muted-foreground">{tr('Loading…')}</p>;

  const m = stats.this_month;
  const pending = Math.max(Number(m.billed) - Number(m.collected), 0);
  const [y, mo] = stats.period.split('-');
  const monthName = new Date(Number(y), Number(mo) - 1, 1).toLocaleString(`${i18n.language || 'en'}-IN`, { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-lg sm:text-xl font-bold">{tr('Dashboard')}</h1>
          <p className="text-sm text-muted-foreground">{monthName}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card title={tr('Active customers')} value={String(stats.customers.active)}
          sub={`${tr('{{n}} inactive', { n: stats.customers.inactive })} · ${tr('{{n}} new this month', { n: stats.customers.new_this_month })}`} icon={Users} to="/admin/contacts" />
        <Card title={tr('Collected this month')} value={rs(m.collected)} sub={tr('{{pct}}% of {{amount}} billed', { pct: m.collection_percent, amount: rs(m.billed) })}
          icon={IndianRupee} tone="text-green-600" />
        <Card title={tr('Still to collect')} value={rs(pending)} sub={tr('{{n}} unpaid bills', { n: m.pending_bills })} icon={AlertTriangle}
          tone="text-amber-600" to="/admin/collect" />
        <Card title={tr('To cut off today')} value={cutoff == null ? '—' : String(cutoff)} sub="Unpaid after cut-off / expired"
          icon={ScissorsLineDashed} tone="text-red-600" to="/admin/cutoff" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <section className="rounded-xl border border-border p-4">
          <h2 className="font-semibold mb-3">{tr('Today')}</h2>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div><p className="text-xs text-muted-foreground">{tr('Total')}</p><p className="text-lg font-bold">{rs(stats.today.total)}</p></div>
            <div><p className="text-xs text-muted-foreground">{tr('Cash')}</p><p className="text-lg font-bold">{rs(stats.today.cash)}</p></div>
            <div><p className="text-xs text-muted-foreground">{tr('UPI')}</p><p className="text-lg font-bold">{rs(stats.today.upi)}</p></div>
          </div>
          <h3 className="text-sm font-semibold mt-4 mb-2">{tr('By collector')}</h3>
          {stats.today_by_agent.length === 0 ? (
            <p className="text-sm text-muted-foreground">{tr('No collections yet today.')}</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {stats.today_by_agent.map((a) => (
                <li key={a.collected_by__username} className="py-2 flex justify-between">
                  <span>{a.collected_by__name || a.collected_by__username} <span className="text-xs text-muted-foreground">· {a.count}</span></span>
                  <span className="font-medium">{rs(a.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-border p-4">
          <h2 className="font-semibold mb-3">{tr('Customers by provider')}</h2>
          {stats.by_provider.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No customers yet. Add providers and plans in <Link to="/admin/settings" className="text-blue-600">{tr('Settings')}</Link>, then add customers.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground text-left">
                <tr><th className="pb-2">{tr('Provider')}</th><th className="pb-2">{tr('Type')}</th><th className="pb-2 text-right">{tr('Active')}</th><th className="pb-2 text-right">{tr('Inactive')}</th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {stats.by_provider.map((p) => (
                  <tr key={`${p.provider}-${p.category}`}>
                    <td className="py-2">{p.provider}</td>
                    <td className="py-2 capitalize">{p.category}</td>
                    <td className="py-2 text-right font-medium">{p.active}</td>
                    <td className="py-2 text-right text-muted-foreground">{p.inactive}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Shortcut to="/admin/contacts" icon={UserPlus} label={tr('Add customer')} />
        <Shortcut to="/admin/collect" icon={Wallet} label={tr('Collect')} />
        <Shortcut to="/admin/live-map" icon={MapIcon} label={tr('Live map')} />
        <Shortcut to="/admin/sales" icon={FileText} label={tr('New sale')} />
      </div>
    </div>
  );
};

export default LcoDashboard;
