// Sales: sell / install stock with a GST invoice. Scan any STB serial or product barcode to add it.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FileText, Plus, Printer } from 'lucide-react';
import Button from '@/components/ui/Button';
import ScanBox from '@/components/ScanBox';
import { stockApi, rupees, type Sale, type StockItem } from '@/api/stock';
import { customersApi } from '@/api/api';
import { operatorSettingsApi, type OperatorSettings } from '@/api/operatorSettings';
import { useAuthStore } from '@/store/useAuthStore';
import type { Customer } from '@/models/types';
import { showError, showSuccess } from '@/utils/toast';
import { formatDateIN } from '@/lib/subscription';
import { DocLines, TotalsBox, newLine, toLineInput, type DraftLine } from './DocLines';
import { tr } from '@/lib/lt';

const input = 'w-full h-10 rounded-lg border border-border bg-background px-3 text-sm';

function Invoice({ sale, org, onClose }: { sale: Sale; org: OperatorSettings | null; onClose: () => void }) {
  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex gap-2 print:hidden">
        <Button onClick={() => window.print()}><Printer className="w-4 h-4 mr-1" /> {tr('Print')}</Button>
        <Button variant="outline" onClick={onClose}>{tr('Back')}</Button>
      </div>
      <div className="rounded-xl border border-border p-5 bg-white text-black text-sm space-y-3">
        <div className="flex justify-between gap-4">
          <div>
            <p className="text-lg font-bold">{org?.name}</p>
            <p className="whitespace-pre-line text-xs">{org?.businessAddress}</p>
            {org?.gstin && <p className="text-xs">GSTIN: {org.gstin}</p>}
            {org?.contactPhone && <p className="text-xs">Ph: {org.contactPhone}</p>}
          </div>
          <div className="text-right">
            <p className="font-bold">{tr('TAX INVOICE')}</p>
            <p>{sale.invoiceNo}</p>
            <p>{formatDateIN(sale.saleDate)}</p>
          </div>
        </div>
        <p>{tr('Bill to:')} <b>{sale.customerName || 'Walk-in customer'}</b> {sale.customerMobile && `· ${sale.customerMobile}`}</p>
        <table className="w-full text-xs border-t border-b">
          <thead><tr className="text-left"><th className="py-1">{tr('Item')}</th><th>{tr('HSN')}</th><th className="text-right">{tr('Qty')}</th><th className="text-right">{tr('Rate')}</th><th className="text-right">{tr('GST%')}</th><th className="text-right">{tr('Amount')}</th></tr></thead>
          <tbody>
            {sale.lines.map((l) => (
              <tr key={l.id} className="border-t align-top">
                <td className="py-1">{l.itemName}{l.serials.length > 0 && <span className="block font-mono text-[10px]">S/N: {l.serials.join(', ')}</span>}</td>
                <td>{l.hsnCode}</td><td className="text-right">{Number(l.quantity)}</td><td className="text-right">{Number(l.unitPrice).toFixed(2)}</td>
                <td className="text-right">{Number(l.gstRate)}</td><td className="text-right">{Number(l.taxable).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <dl className="ml-auto w-56 grid grid-cols-2 gap-y-0.5 text-xs">
          <dt>{tr('Taxable')}</dt><dd className="text-right">{Number(sale.taxableTotal).toFixed(2)}</dd>
          <dt>{tr('CGST')}</dt><dd className="text-right">{Number(sale.cgst).toFixed(2)}</dd>
          <dt>{tr('SGST')}</dt><dd className="text-right">{Number(sale.sgst).toFixed(2)}</dd>
          <dt className="font-bold text-sm">{tr('Total')}</dt><dd className="text-right font-bold text-sm">{rupees(sale.grandTotal)}</dd>
        </dl>
        <p className="text-xs">Paid by: {sale.paymentMethod === 'credit' ? tr('Credit (to be paid)') : sale.paymentMethod.toUpperCase()}</p>
      </div>
    </div>
  );
}

const Sales = () => {
  const orgId = useAuthStore((s) => s.organizationId);
  const [list, setList] = useState<Sale[]>([]);
  const [items, setItems] = useState<StockItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [org, setOrg] = useState<OperatorSettings | null>(null);
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState<Sale | null>(null);
  const [customerQ, setCustomerQ] = useState('');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [walkIn, setWalkIn] = useState({ name: '', mobile: '' });
  const [method, setMethod] = useState<Sale['paymentMethod']>('cash');
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [scanned, setScanned] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, i] = await Promise.all([stockApi.sales(), stockApi.items({ is_active: true })]);
      setList(s); setItems(i);
    } catch (e) { showError(e instanceof Error ? e.message : tr('Could not load')); }
  }, []);
  useEffect(() => {
    load();
    customersApi.getAll().then(setCustomers).catch(() => undefined);
    if (orgId) operatorSettingsApi.get(orgId).then(setOrg).catch(() => undefined);
  }, [load, orgId]);

  const matches = useMemo(() => {
    const q = customerQ.trim().toLowerCase();
    return q.length < 2 ? [] : customers.filter((c) => c.name.toLowerCase().includes(q) || c.mobile.includes(q)).slice(0, 6);
  }, [customerQ, customers]);

  const addItem = (item: StockItem, serial?: string) =>
    setLines((ls) => {
      const existing = ls.find((l) => l.item.id === item.id);
      if (existing) {
        return ls.map((l) => (l.key !== existing.key ? l
          : serial ? { ...l, serials: [...l.serials, serial] } : { ...l, quantity: l.quantity + 1 }));
      }
      const line = newLine(item, Number(item.salePrice));
      return [...ls, serial ? { ...line, serials: [serial] } : line];
    });

  // One scan box for everything: a serial adds that box; a product barcode adds one piece.
  const scanAny = async (code: string) => {
    if (lines.some((l) => l.serials.includes(code))) return tr('{{code}} is already on this bill', { code });
    const units = await stockApi.units({ serial: code });
    if (units.length) {
      const u = units[0];
      if (u.status !== 'in_stock') return `${code}: ${({ in_stock: tr('In stock'), sold: tr('Sold'), faulty: tr('Faulty'), returned: tr('Returned') })[u.status]}${u.customerName ? ` (${u.customerName})` : ''}`;
      const item = items.find((i) => i.id === u.item);
      if (!item) return tr('{{code}}: item is inactive', { code });
      addItem(item, code);
      return null;
    }
    const item = items.find((i) => i.barcode === code);
    if (!item) return tr('{{code}} not found in stock', { code });
    if (item.trackSerials) return tr('{{item}}: scan the serial number on the box, not the product barcode', { item: item.name });
    addItem(item);
    return null;
  };

  const save = async () => {
    setSaving(true);
    try {
      const sale = await stockApi.createSale({
        customerId: customer?.id ?? null, customerName: customer ? '' : walkIn.name, customerMobile: customer ? '' : walkIn.mobile,
        paymentMethod: method, lines: lines.map(toLineInput),
      });
      showSuccess(tr('Invoice {{no}} saved', { no: sale.invoiceNo }));
      setCreating(false); setLines([]); setCustomer(null); setCustomerQ(''); setWalkIn({ name: '', mobile: '' });
      setViewing(sale);
      load();
    } catch (e) { showError(e instanceof Error ? e.message : tr('Could not save')); }
    finally { setSaving(false); }
  };

  if (viewing) return <Invoice sale={viewing} org={org} onClose={() => setViewing(null)} />;

  if (creating) {
    return (
      <div className="space-y-4 max-w-2xl">
        <h1 className="text-lg font-bold">{tr('New sale')}</h1>
        <div className="space-y-2 text-sm">
          <span className="block font-medium">{tr('Customer')}</span>
          {customer ? (
            <div className="flex justify-between rounded-lg border border-border p-2">
              <span>{customer.name} · {customer.mobile}</span>
              <button type="button" className="text-blue-600 text-xs" onClick={() => setCustomer(null)}>{tr('Change')}</button>
            </div>
          ) : (
            <>
              <input className={input} placeholder={tr('Search customer by name or mobile')} value={customerQ} onChange={(e) => setCustomerQ(e.target.value)} />
              {matches.map((c) => (
                <button key={c.id} type="button" className="block w-full text-left px-3 py-2 rounded-lg hover:bg-muted" onClick={() => setCustomer(c)}>
                  {c.name} · {c.mobile}
                </button>
              ))}
              <div className="grid grid-cols-2 gap-2">
                <input className={input} placeholder={tr('Or walk-in name')} value={walkIn.name} onChange={(e) => setWalkIn({ ...walkIn, name: e.target.value })} />
                <input className={input} placeholder={tr('Mobile')} value={walkIn.mobile} onChange={(e) => setWalkIn({ ...walkIn, mobile: e.target.value })} />
              </div>
            </>
          )}
        </div>
        <ScanBox codes={scanned} onChange={() => setScanned([])} validate={scanAny} placeholder={tr('Scan box serial or product barcode')} />
        <select className={input} value="" onChange={(e) => { const it = items.find((i) => i.id === Number(e.target.value)); if (it) addItem(it); }}>
          <option value="">{tr('Or add an item without scanning…')}</option>
          {items.map((i) => <option key={i.id} value={i.id}>{i.name} ({Number(i.onHand)} in stock)</option>)}
        </select>
        <DocLines lines={lines} onChange={setLines}
          validateSerial={async (l, code) => {
            const u = (await stockApi.units({ serial: code, item: l.item.id }))[0];
            return !u ? tr('{{code}} is not a {{item}} in your stock', { code, item: l.item.name }) : u.status !== 'in_stock' ? `${code}: ${({ in_stock: tr('In stock'), sold: tr('Sold'), faulty: tr('Faulty'), returned: tr('Returned') })[u.status]}` : null;
          }} />
        {lines.length > 0 && <TotalsBox lines={lines} />}
        <div className="grid grid-cols-3 gap-2">
          {(['cash', 'upi', 'credit'] as const).map((m) => (
            <button key={m} type="button" onClick={() => setMethod(m)}
              className={`py-2 rounded-lg border text-sm ${method === m ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300' : 'border-border'}`}>
              {m === 'cash' ? tr('Cash') : m === 'upi' ? tr('UPI') : tr('Pay later')}
            </button>
          ))}
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => setCreating(false)}>{tr('Cancel')}</Button>
          <Button onClick={save} disabled={saving || lines.length === 0}>{saving ? tr('Saving…') : tr('Save & make invoice')}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-end gap-2">
        <h1 className="text-lg sm:text-xl font-bold flex items-center gap-2"><FileText className="w-5 h-5" /> {tr('Sales')}</h1>
        <Button onClick={() => setCreating(true)}><Plus className="w-4 h-4 mr-1" /> {tr('New sale')}</Button>
      </div>
      <ul className="divide-y divide-border rounded-xl border border-border text-sm">
        {list.map((s) => (
          <li key={s.id} className="p-3 flex justify-between gap-3 cursor-pointer hover:bg-muted/20" onClick={() => setViewing(s)}>
            <span>
              <b>{s.invoiceNo}</b> · {s.customerName || 'Walk-in'}
              <span className="block text-xs text-muted-foreground">{formatDateIN(s.saleDate)} · {s.lines.map((l) => l.itemName).join(', ')}</span>
            </span>
            <span className="font-semibold">{rupees(s.grandTotal)}</span>
          </li>
        ))}
        {list.length === 0 && <li className="p-6 text-center text-muted-foreground">{tr('No sales yet.')}</li>}
      </ul>
    </div>
  );
};

export default Sales;
