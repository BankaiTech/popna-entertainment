// Line editor shared by Purchase and Sale: item, serial scanning or quantity, price, GST.
import { Trash2 } from 'lucide-react';
import ScanBox from '@/components/ScanBox';
import { rupees, type StockItem } from '@/api/stock';

export interface DraftLine { key: string; item: StockItem; quantity: number; unitPrice: number; gstRate: number; serials: string[] }

export const lineQty = (l: DraftLine) => (l.item.trackSerials ? l.serials.length : l.quantity);
export const lineTotals = (l: DraftLine) => {
  const taxable = Math.round(lineQty(l) * l.unitPrice * 100) / 100;
  const gst = Math.round(taxable * l.gstRate) / 100;
  return { taxable, gst, total: taxable + gst };
};
export const docTotals = (lines: DraftLine[]) =>
  lines.reduce((t, l) => {
    const x = lineTotals(l);
    return { taxable: t.taxable + x.taxable, gst: t.gst + x.gst, total: t.total + x.total };
  }, { taxable: 0, gst: 0, total: 0 });

export const newLine = (item: StockItem, price: number): DraftLine => ({
  key: `${item.id}-${Math.random().toString(36).slice(2)}`, item, quantity: item.trackSerials ? 0 : 1,
  unitPrice: price, gstRate: Number(item.gstRate), serials: [],
});

interface Props {
  lines: DraftLine[];
  onChange: (lines: DraftLine[]) => void;
  validateSerial: (line: DraftLine, serial: string) => Promise<string | null>;
}

const cell = 'h-9 rounded-lg border border-border bg-background px-2 text-sm';

export function DocLines({ lines, onChange, validateSerial }: Props) {
  const update = (key: string, patch: Partial<DraftLine>) => onChange(lines.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const allSerials = lines.flatMap((l) => l.serials);

  return (
    <div className="space-y-3">
      {lines.map((l) => {
        const t = lineTotals(l);
        return (
          <div key={l.key} className="rounded-xl border border-border p-3 space-y-2">
            <div className="flex justify-between gap-2">
              <p className="font-medium text-sm">{l.item.name}</p>
              <button type="button" aria-label="Remove line" onClick={() => onChange(lines.filter((x) => x.key !== l.key))}>
                <Trash2 className="w-4 h-4 text-red-500" />
              </button>
            </div>
            {l.item.trackSerials && (
              <ScanBox codes={l.serials} onChange={(serials) => update(l.key, { serials })}
                placeholder="Scan serial numbers one after another"
                validate={async (code) => (allSerials.includes(code) ? `${code} is already on another line` : validateSerial(l, code))} />
            )}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <label>Qty
                <input type="number" min={0} className={`${cell} w-full`} value={lineQty(l)} disabled={l.item.trackSerials}
                  onChange={(e) => update(l.key, { quantity: Number(e.target.value) })} /></label>
              <label>Price ₹
                <input type="number" min={0} className={`${cell} w-full`} value={l.unitPrice}
                  onChange={(e) => update(l.key, { unitPrice: Number(e.target.value) })} /></label>
              <label>GST %
                <select className={`${cell} w-full`} value={l.gstRate} onChange={(e) => update(l.key, { gstRate: Number(e.target.value) })}>
                  {[0, 5, 12, 18, 28].map((g) => <option key={g} value={g}>{g}</option>)}
                </select></label>
            </div>
            <p className="text-right text-sm">{rupees(t.taxable)} + GST {rupees(t.gst)} = <b>{rupees(t.total)}</b></p>
          </div>
        );
      })}
    </div>
  );
}

export function TotalsBox({ lines }: { lines: DraftLine[] }) {
  const t = docTotals(lines);
  return (
    <dl className="rounded-xl bg-muted/40 p-3 text-sm grid grid-cols-2 gap-1">
      <dt>Taxable</dt><dd className="text-right">{rupees(t.taxable)}</dd>
      <dt>GST (CGST + SGST)</dt><dd className="text-right">{rupees(t.gst)}</dd>
      <dt className="font-bold">Total</dt><dd className="text-right font-bold">{rupees(t.total)}</dd>
    </dl>
  );
}

export const toLineInput = (l: DraftLine) => ({
  itemId: l.item.id, quantity: lineQty(l), unitPrice: l.unitPrice, gstRate: l.gstRate,
  serials: l.item.trackSerials ? l.serials : [],
});
