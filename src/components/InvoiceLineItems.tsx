// Reusable line items editor for multi-item invoices, quotations, and POs
import { useTranslation } from 'react-i18next';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import type { InvoiceLineItem } from '@/models/types';
import { formatCurrencyINR } from '@/lib/utils';
import { Plus, Trash2 } from 'lucide-react';

export interface LineItemOption {
  id: number;
  name: string;
  unitPrice: number;
  taxRate: number;
}

function computeLineTotal(qty: number, unitPrice: number, taxRate: number, discount: number): number {
  const afterDiscount = qty * unitPrice * (1 - discount / 100);
  return Math.round((afterDiscount * (1 + taxRate / 100)) * 100) / 100;
}

interface InvoiceLineItemsProps {
  items: InvoiceLineItem[];
  onChange: (items: InvoiceLineItem[]) => void;
  options: LineItemOption[];
  disabled?: boolean;
  /** Label for the product/plan column */
  productLabel?: string;
}

export default function InvoiceLineItems({
  items,
  onChange,
  options,
  disabled = false,
  productLabel,
}: InvoiceLineItemsProps) {
  const { t } = useTranslation();

  const addRow = () => {
    const defaultOption = options[0];
    const productId = defaultOption?.id ?? 0;
    const productName = defaultOption?.name ?? '';
    const unitPrice = defaultOption?.unitPrice ?? 0;
    const taxRate = defaultOption?.taxRate ?? 0;
    const quantity = 1;
    const discount = 0;
    const lineTotal = computeLineTotal(quantity, unitPrice, taxRate, discount);
    onChange([
      ...items,
      { productId, productName, quantity, unitPrice, taxRate, discount, lineTotal },
    ]);
  };

  const updateRow = (index: number, patch: Partial<InvoiceLineItem>) => {
    const row = { ...items[index], ...patch };
    row.lineTotal = computeLineTotal(
      row.quantity,
      row.unitPrice,
      row.taxRate,
      row.discount
    );
    const next = [...items];
    next[index] = row;
    onChange(next);
  };

  const removeRow = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const setOption = (index: number, opt: LineItemOption | null) => {
    if (!opt) return;
    const row = { ...items[index], productId: opt.id, productName: opt.name, unitPrice: opt.unitPrice, taxRate: opt.taxRate };
    row.lineTotal = computeLineTotal(row.quantity, row.unitPrice, row.taxRate, row.discount);
    const next = [...items];
    next[index] = row;
    onChange(next);
  };

  const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unitPrice * (1 - i.discount / 100), 0);
  const totalTax = items.reduce((sum, i) => sum + (i.lineTotal - i.quantity * i.unitPrice * (1 - i.discount / 100)), 0);
  const total = items.reduce((sum, i) => sum + i.lineTotal, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">{productLabel ?? t('invoiceLineItems.lineItems', 'Line Items')}</span>
        {!disabled && (
          <Button type="button" variant="outline" size="sm" onClick={addRow} disabled={options.length === 0}>
            <Plus className="w-4 h-4 mr-1" />
            {t('invoiceLineItems.addLine', 'Add line')}
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">
          {t('invoiceLineItems.noLines', 'No line items. Click "Add line" to add products or services.')}
        </p>
      ) : (
        <>
          <div className="overflow-x-auto border border-border rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-2 font-medium">{productLabel ?? t('invoiceLineItems.product', 'Product / Service')}</th>
                  <th className="text-right p-2 w-24">{t('invoiceLineItems.quantity', 'Qty')}</th>
                  <th className="text-right p-2 w-28">{t('invoiceLineItems.unitPrice', 'Unit Price')}</th>
                  <th className="text-right p-2 w-20">{t('invoiceLineItems.tax', 'Tax %')}</th>
                  <th className="text-right p-2 w-20">{t('invoiceLineItems.discount', 'Disc %')}</th>
                  <th className="text-right p-2 w-28">{t('invoiceLineItems.total', 'Total')}</th>
                  {!disabled && <th className="w-10 p-2" />}
                </tr>
              </thead>
              <tbody>
                {items.map((row, index) => (
                  <tr key={index} className="border-b border-border last:border-0">
                    <td className="p-2">
                      <Select
                        value={row.productId}
                        onChange={(e) => {
                          const id = Number(e.target.value);
                          const opt = options.find((o) => o.id === id);
                          if (opt) setOption(index, opt);
                        }}
                        disabled={disabled}
                        className="min-w-[160px]"
                      >
                        <option value="">{t('invoiceLineItems.select', 'Select')}</option>
                        {options.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.name} — {formatCurrencyINR(o.unitPrice)}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td className="p-2">
                      <Input
                        type="number"
                        min={0.01}
                        step={1}
                        value={row.quantity}
                        onChange={(e) => updateRow(index, { quantity: Math.max(0, Number(e.target.value) || 0) })}
                        disabled={disabled}
                        className="text-right w-full"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={row.unitPrice}
                        onChange={(e) => updateRow(index, { unitPrice: Math.max(0, Number(e.target.value) || 0) })}
                        disabled={disabled}
                        className="text-right w-full"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={0.5}
                        value={row.taxRate}
                        onChange={(e) => updateRow(index, { taxRate: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })}
                        disabled={disabled}
                        className="text-right w-full"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={0.5}
                        value={row.discount}
                        onChange={(e) => updateRow(index, { discount: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })}
                        disabled={disabled}
                        className="text-right w-full"
                      />
                    </td>
                    <td className="p-2 text-right font-medium">{formatCurrencyINR(row.lineTotal)}</td>
                    {!disabled && (
                      <td className="p-2">
                        <button
                          type="button"
                          onClick={() => removeRow(index)}
                          className="p-1.5 text-destructive hover:bg-destructive/10 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end gap-6 text-sm border-t border-border pt-2">
            <span>{t('invoiceLineItems.subtotal', 'Subtotal')}: {formatCurrencyINR(subtotal)}</span>
            <span>{t('invoiceLineItems.taxTotal', 'Tax')}: {formatCurrencyINR(totalTax)}</span>
            <span className="font-semibold">{t('invoiceLineItems.grandTotal', 'Total')}: {formatCurrencyINR(total)}</span>
          </div>
        </>
      )}
    </div>
  );
}

export { computeLineTotal };
