// Stock items (STB, ONU, router, cable...) with on-hand quantity and serial numbers.
import { useCallback, useEffect, useState } from 'react';
import { Plus, Package, Search } from 'lucide-react';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/Dialog';
import Button from '@/components/ui/Button';
import ScanBox from '@/components/ScanBox';
import { stockApi, CATEGORY_LABEL, rupees, type StockItem, type StockUnit, type StockCategory } from '@/api/stock';
import { fieldErrors } from '@/api/operatorSettings';
import { showError, showSuccess } from '@/utils/toast';

const input = 'w-full h-10 rounded-lg border border-border bg-background px-3 text-sm';
const blank: Partial<StockItem> = {
  name: '', category: 'stb', brand: '', barcode: '', hsnCode: '', unit: 'pcs', trackSerials: true,
  purchasePrice: '0', salePrice: '0', gstRate: '18', lowStockLevel: 0, isActive: true,
};

const Stock = () => {
  const [items, setItems] = useState<StockItem[]>([]);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<Partial<StockItem> | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [viewing, setViewing] = useState<StockItem | null>(null);
  const [units, setUnits] = useState<StockUnit[]>([]);
  const [findSerial, setFindSerial] = useState<string[]>([]);

  const load = useCallback(() => stockApi.items().then(setItems).catch((e) => showError(e.message)), []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!editing) return;
    try {
      await stockApi.saveItem(editing);
      showSuccess('Saved');
      setEditing(null);
      load();
    } catch (err) {
      setErrors(fieldErrors(err));
      showError(err instanceof Error ? err.message : 'Could not save');
    }
  };

  const open = async (item: StockItem) => {
    setViewing(item);
    setUnits(item.trackSerials ? await stockApi.units({ item: item.id }) : []);
  };

  // Scan any serial to see what it is and where it went
  const lookup = async (code: string) => {
    const found = await stockApi.units({ serial: code });
    if (!found.length) return `${code} is not in your stock`;
    const u = found[0];
    showSuccess(`${u.serial}: ${u.itemName} · ${u.status.replace('_', ' ')}${u.customerName ? ` · ${u.customerName}` : ''}`);
    return null;
  };

  const shown = items.filter((i) => !q || `${i.name} ${i.brand} ${i.barcode}`.toLowerCase().includes(q.toLowerCase()));
  const set = (k: keyof StockItem, v: unknown) => setEditing((e) => (e ? { ...e, [k]: v } : e));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-lg sm:text-xl font-bold flex items-center gap-2"><Package className="w-5 h-5" /> Stock</h1>
          <p className="text-sm text-muted-foreground">Set-top boxes, ONUs, routers, cable and accessories</p>
        </div>
        <Button onClick={() => { setErrors({}); setEditing({ ...blank }); }}><Plus className="w-4 h-4 mr-1" /> Add item</Button>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <label className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search items" className={`${input} pl-9`} />
        </label>
        <ScanBox codes={findSerial} onChange={() => setFindSerial([])} validate={lookup} placeholder="Scan a serial to find it" />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
            <tr><th className="p-3">Item</th><th className="p-3">Type</th><th className="p-3 text-right">In stock</th>
              <th className="p-3 text-right">Sale price</th><th className="p-3" /></tr>
          </thead>
          <tbody className="divide-y divide-border">
            {shown.map((i) => (
              <tr key={i.id} className="hover:bg-muted/20 cursor-pointer" onClick={() => open(i)}>
                <td className="p-3">
                  <p className="font-medium">{i.name}</p>
                  <p className="text-xs text-muted-foreground">{[i.brand, i.barcode, i.trackSerials ? 'serials' : ''].filter(Boolean).join(' · ')}</p>
                </td>
                <td className="p-3">{CATEGORY_LABEL[i.category]}</td>
                <td className={`p-3 text-right font-semibold ${i.lowStock ? 'text-red-600' : ''}`}>
                  {Number(i.onHand)} {i.unit}{i.lowStock && <span className="block text-xs font-normal">Low stock</span>}
                </td>
                <td className="p-3 text-right">{rupees(i.salePrice)}</td>
                <td className="p-3 text-right">
                  <button type="button" className="text-blue-600 text-xs" onClick={(e) => { e.stopPropagation(); setErrors({}); setEditing(i); }}>Edit</button>
                </td>
              </tr>
            ))}
            {shown.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No items yet. Add your first item.</td></tr>}
          </tbody>
        </table>
      </div>

      {editing && (
        <Dialog open onClose={() => setEditing(null)}>
          <DialogHeader title={editing.id ? 'Edit item' : 'Add item'} onClose={() => setEditing(null)} />
          <DialogBody>
            <div className="p-4 sm:p-5 grid grid-cols-2 gap-3 text-sm">
              <label className="col-span-2"><span className="block font-medium mb-1">Name</span>
                <input className={input} value={editing.name} onChange={(e) => set('name', e.target.value)} placeholder="GTPL HD Set-top box" />
                {errors.name && <span className="text-xs text-red-600">{errors.name}</span>}</label>
              <label><span className="block font-medium mb-1">Type</span>
                <select className={input} value={editing.category} onChange={(e) => {
                  const c = e.target.value as StockCategory;
                  set('category', c);
                  if (!editing.id) set('trackSerials', ['stb', 'onu', 'router'].includes(c));
                  if (!editing.id) set('unit', c === 'cable' ? 'm' : 'pcs');
                }}>
                  {(Object.keys(CATEGORY_LABEL) as StockCategory[]).map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
                </select></label>
              <label><span className="block font-medium mb-1">Brand</span>
                <input className={input} value={editing.brand} onChange={(e) => set('brand', e.target.value)} /></label>
              <label className="col-span-2"><span className="block font-medium mb-1">Product barcode (optional)</span>
                <input className={`${input} font-mono`} value={editing.barcode} onChange={(e) => set('barcode', e.target.value)}
                  placeholder="Scan the box barcode here" />
                {errors.barcode && <span className="text-xs text-red-600">{errors.barcode}</span>}</label>
              <label className="col-span-2 flex items-center gap-2">
                <input type="checkbox" checked={!!editing.trackSerials} disabled={!!editing.id}
                  onChange={(e) => set('trackSerials', e.target.checked)} />
                <span>Scan a serial number for every piece (STB, ONU, router)</span></label>
              {errors.trackSerials && <span className="col-span-2 text-xs text-red-600">{errors.trackSerials}</span>}
              <label><span className="block font-medium mb-1">Purchase price (₹)</span>
                <input type="number" className={input} value={editing.purchasePrice} onChange={(e) => set('purchasePrice', e.target.value)} /></label>
              <label><span className="block font-medium mb-1">Sale price (₹)</span>
                <input type="number" className={input} value={editing.salePrice} onChange={(e) => set('salePrice', e.target.value)} /></label>
              <label><span className="block font-medium mb-1">GST %</span>
                <select className={input} value={Number(editing.gstRate)} onChange={(e) => set('gstRate', e.target.value)}>
                  {[0, 5, 12, 18, 28].map((g) => <option key={g} value={g}>{g}%</option>)}
                </select></label>
              <label><span className="block font-medium mb-1">HSN code</span>
                <input className={input} value={editing.hsnCode} onChange={(e) => set('hsnCode', e.target.value)} /></label>
              <label><span className="block font-medium mb-1">Unit</span>
                <select className={input} value={editing.unit} onChange={(e) => set('unit', e.target.value)}>
                  <option value="pcs">Pieces</option><option value="m">Metres</option><option value="roll">Rolls</option>
                </select></label>
              <label><span className="block font-medium mb-1">Low stock alert at</span>
                <input type="number" min={0} className={input} value={editing.lowStockLevel} onChange={(e) => set('lowStockLevel', Number(e.target.value))} /></label>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save} disabled={!editing.name}>Save</Button>
          </DialogFooter>
        </Dialog>
      )}

      {viewing && (
        <Dialog open onClose={() => setViewing(null)}>
          <DialogHeader title={viewing.name} onClose={() => setViewing(null)} />
          <DialogBody>
            <div className="p-4 sm:p-5 space-y-3 text-sm">
              <p>In stock: <b>{Number(viewing.onHand)} {viewing.unit}</b> · Sale {rupees(viewing.salePrice)} · GST {Number(viewing.gstRate)}%</p>
              {viewing.trackSerials ? (
                <ul className="divide-y divide-border max-h-80 overflow-y-auto">
                  {units.map((u) => (
                    <li key={u.id} className="py-2 flex justify-between items-center gap-2">
                      <span className="font-mono">{u.serial}</span>
                      <span className="text-xs text-muted-foreground">{u.customerName ?? ''}</span>
                      <select value={u.status} className="h-8 rounded border border-border bg-background text-xs"
                        disabled={u.status === 'sold'}
                        onChange={async (e) => {
                          await stockApi.setUnitStatus(u.id, e.target.value as StockUnit['status']).catch((er) => showError(er.message));
                          open(viewing);
                        }}>
                        <option value="in_stock">In stock</option><option value="sold">Sold</option>
                        <option value="faulty">Faulty</option><option value="returned">Returned</option>
                      </select>
                    </li>
                  ))}
                  {units.length === 0 && <li className="py-3 text-muted-foreground">No serials yet. Add them through a purchase.</li>}
                </ul>
              ) : <p className="text-muted-foreground">Quantity item. Stock changes through purchases and sales.</p>}
            </div>
          </DialogBody>
        </Dialog>
      )}
    </div>
  );
};

export default Stock;
