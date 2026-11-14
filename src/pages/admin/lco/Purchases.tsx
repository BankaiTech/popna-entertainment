// Purchases: buy stock from a supplier. Scan serials for STB / ONU / router.
import { useCallback, useEffect, useState } from 'react';
import { Plus, ShoppingCart } from 'lucide-react';
import Button from '@/components/ui/Button';
import ScanBox from '@/components/ScanBox';
import { stockApi, rupees, type Purchase, type StockItem, type Supplier } from '@/api/stock';
import { showError, showSuccess } from '@/utils/toast';
import { formatDateIN, todayInIndia } from '@/lib/subscription';
import { DocLines, TotalsBox, newLine, toLineInput, type DraftLine } from './DocLines';
import { tr } from '@/lib/lt';

const input = 'w-full h-10 rounded-lg border border-border bg-background px-3 text-sm';

const Purchases = () => {
  const [list, setList] = useState<Purchase[]>([]);
  const [items, setItems] = useState<StockItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [creating, setCreating] = useState(false);
  const [supplierId, setSupplierId] = useState<number | ''>('');
  const [newSupplier, setNewSupplier] = useState('');
  const [billNo, setBillNo] = useState('');
  const [billDate, setBillDate] = useState(todayInIndia());
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [saving, setSaving] = useState(false);
  const [scanned, setScanned] = useState<string[]>([]);

  const load = useCallback(async () => {
    try {
      const [p, i, s] = await Promise.all([stockApi.purchases(), stockApi.items({ is_active: true }), stockApi.suppliers()]);
      setList(p); setItems(i); setSuppliers(s);
    } catch (e) { showError(e instanceof Error ? e.message : tr('Could not load')); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const addItem = (item: StockItem) => {
    if (lines.some((l) => l.item.id === item.id)) return;
    setLines((ls) => [...ls, newLine(item, Number(item.purchasePrice))]);
  };

  // Scan a product barcode to add that item
  const scanProduct = async (code: string) => {
    const item = items.find((i) => i.barcode === code);
    if (!item) return tr('No item with barcode {{code}}. Add it in Stock first.', { code });
    addItem(item);
    return null;
  };

  const save = async () => {
    setSaving(true);
    try {
      let sid = supplierId;
      if (!sid && newSupplier.trim()) sid = (await stockApi.addSupplier({ name: newSupplier.trim() })).id;
      if (!sid) { showError(tr('Choose or add a supplier.')); return; }
      const p = await stockApi.createPurchase({ supplierId: Number(sid), billNo, billDate, lines: lines.map(toLineInput) });
      showSuccess(`${tr('Purchase saved')} · ${rupees(p.grandTotal)}`);
      setCreating(false); setLines([]); setBillNo(''); setNewSupplier(''); setSupplierId('');
      load();
    } catch (e) { showError(e instanceof Error ? e.message : tr('Could not save')); }
    finally { setSaving(false); }
  };

  if (creating) {
    return (
      <div className="space-y-4 max-w-2xl">
        <h1 className="text-lg font-bold">{tr('New purchase')}</h1>
        <div className="grid sm:grid-cols-3 gap-3 text-sm">
          <label className="sm:col-span-3"><span className="block font-medium mb-1">{tr('Supplier')}</span>
            <select className={input} value={supplierId} onChange={(e) => setSupplierId(e.target.value ? Number(e.target.value) : '')}>
              <option value="">{tr('New supplier…')}</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select></label>
          {!supplierId && <input className={`${input} sm:col-span-3`} placeholder={tr('New supplier name')} value={newSupplier} onChange={(e) => setNewSupplier(e.target.value)} />}
          <label><span className="block font-medium mb-1">{tr('Bill no.')}</span><input className={input} value={billNo} onChange={(e) => setBillNo(e.target.value)} /></label>
          <label><span className="block font-medium mb-1">{tr('Bill date')}</span><input type="date" className={input} value={billDate} max={todayInIndia()} onChange={(e) => setBillDate(e.target.value)} /></label>
          <label><span className="block font-medium mb-1">{tr('Add item')}</span>
            <select className={input} value="" onChange={(e) => { const it = items.find((i) => i.id === Number(e.target.value)); if (it) addItem(it); }}>
              <option value="">{tr('Choose…')}</option>
              {items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select></label>
        </div>
        <ScanBox codes={scanned} onChange={() => setScanned([])} validate={scanProduct} placeholder={tr('Or scan a product barcode to add it')} />
        <DocLines lines={lines} onChange={setLines}
          validateSerial={async (_l, code) => ((await stockApi.units({ serial: code })).length ? tr('{{code}} is already in your stock', { code }) : null)} />
        {lines.length > 0 && <TotalsBox lines={lines} />}
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => setCreating(false)}>{tr('Cancel')}</Button>
          <Button onClick={save} disabled={saving || lines.length === 0}>{saving ? tr('Saving…') : tr('Save purchase')}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-end gap-2">
        <h1 className="text-lg sm:text-xl font-bold flex items-center gap-2"><ShoppingCart className="w-5 h-5" /> {tr('Purchases')}</h1>
        <Button onClick={() => setCreating(true)}><Plus className="w-4 h-4 mr-1" /> {tr('New purchase')}</Button>
      </div>
      <ul className="divide-y divide-border rounded-xl border border-border text-sm">
        {list.map((p) => (
          <li key={p.id} className="p-3 flex justify-between gap-3">
            <span>
              <b>{p.supplierName}</b> {p.billNo && <span className="text-muted-foreground">· Bill {p.billNo}</span>}
              <span className="block text-xs text-muted-foreground">
                {formatDateIN(p.billDate)} · {p.lines.map((l) => `${l.itemName} × ${Number(l.quantity)}`).join(', ')}
              </span>
            </span>
            <span className="font-semibold">{rupees(p.grandTotal)}</span>
          </li>
        ))}
        {list.length === 0 && <li className="p-6 text-center text-muted-foreground">{tr('No purchases yet.')}</li>}
      </ul>
    </div>
  );
};

export default Purchases;
