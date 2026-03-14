import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/Dialog';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import type { Customer, Quotation, QuotationItem, QuotationStatus } from '@/models/types';
import { MOCK_ORGANIZATION_ID } from '@/models/types';
import { useStore } from '@/store/useStore';
import { formatCurrencyINR } from '@/lib/utils';

interface QuotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotation?: Quotation | null;
  onSave: (quotation: Omit<Quotation, 'id' | 'createdAt' | 'quotationNumber'>) => Promise<void>;
  onUpdate: (id: number, quotation: Partial<Quotation>) => Promise<void>;
}

interface LineForm extends QuotationItem {}

const emptyLine = (): LineForm => ({
  productId: 0,
  productName: '',
  quantity: 1,
  unitPrice: 0,
  taxRate: 0,
  discount: 0,
  lineTotal: 0,
});

const QuotationModal = ({ isOpen, onClose, quotation, onSave, onUpdate }: QuotationModalProps) => {
  const { t } = useTranslation();
  const { customers, fetchCustomers } = useStore();
  const [loading, setLoading] = useState(false);
  const [customerId, setCustomerId] = useState<number | ''>('');
  const [customerName, setCustomerName] = useState('');
  const [status, setStatus] = useState<QuotationStatus>('draft');
  const [validUntil, setValidUntil] = useState<string>(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<LineForm[]>([emptyLine()]);

  useEffect(() => {
    if (isOpen && customers.length === 0) {
      fetchCustomers().catch(() => undefined);
    }
  }, [isOpen, customers.length, fetchCustomers]);

  useEffect(() => {
    if (quotation) {
      setCustomerId(quotation.customerId);
      setCustomerName(quotation.customerName);
      setStatus(quotation.status);
      setValidUntil(quotation.validUntil);
      setNotes(quotation.notes || '');
      setItems(quotation.items.map((it) => ({ ...it })));
    } else {
      setCustomerId('');
      setCustomerName('');
      setStatus('draft');
      setValidUntil(new Date().toISOString().slice(0, 10));
      setNotes('');
      setItems([emptyLine()]);
    }
  }, [quotation, isOpen]);

  const selectedCustomer: Customer | undefined =
    customerId ? customers.find((c) => c.id === customerId) : undefined;

  const recalcLine = (line: LineForm): LineForm => {
    const base = line.quantity * line.unitPrice;
    const afterDiscount = base * (1 - (line.discount || 0) / 100);
    const taxAmount = afterDiscount * (line.taxRate || 0) / 100;
    return {
      ...line,
      lineTotal: Number((afterDiscount + taxAmount).toFixed(2)),
    };
  };

  const totals = (() => {
    const subtotal = items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);
    const taxTotal = items.reduce((sum, it) => {
      const base = it.quantity * it.unitPrice;
      const afterDiscount = base * (1 - (it.discount || 0) / 100);
      return sum + afterDiscount * (it.taxRate || 0) / 100;
    }, 0);
    const discountAmount = items.reduce((sum, it) => {
      const base = it.quantity * it.unitPrice;
      return sum + base * ((it.discount || 0) / 100);
    }, 0);
    const grandTotal = items.reduce((sum, it) => sum + it.lineTotal, 0);
    return { subtotal, taxTotal, discountAmount, grandTotal };
  })();

  const handleItemChange = (index: number, patch: Partial<LineForm>) => {
    setItems((prev) => {
      const next = [...prev];
      const merged = { ...next[index], ...patch };
      next[index] = recalcLine(merged);
      return next;
    });
  };

  const handleAddItem = () => {
    setItems((prev) => [...prev, emptyLine()]);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || items.length === 0 || items.some((it) => !it.productName || it.quantity <= 0)) {
      return;
    }
    setLoading(true);
    try {
      const payload: Omit<Quotation, 'id' | 'createdAt' | 'quotationNumber'> = {
        organizationId: MOCK_ORGANIZATION_ID,
        customerId: customerId as number,
        customerName: selectedCustomer?.name || customerName,
        items: items.map((it) => ({ ...it })),
        subtotal: Number(totals.subtotal.toFixed(2)),
        taxTotal: Number(totals.taxTotal.toFixed(2)),
        discountAmount: Number(totals.discountAmount.toFixed(2)),
        grandTotal: Number(totals.grandTotal.toFixed(2)),
        status,
        validUntil,
        notes: notes.trim() || undefined,
      };

      if (quotation) {
        await onUpdate(quotation.id, payload);
      } else {
        await onSave(payload);
      }
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

  return (
    <Dialog open={isOpen} onClose={onClose} size="xl">
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
        <DialogHeader
          title={quotation ? t('quotations.editTitle', 'Edit Quotation') : t('quotations.addTitle', 'New Quotation')}
          onClose={onClose}
        />
        <DialogBody>
          <div className="p-4 sm:p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>
                  {t('quotations.customer', 'Customer')} *
                </label>
                <select
                  value={customerId === '' ? '' : String(customerId)}
                  onChange={(e) => {
                    const value = e.target.value;
                    const id = value ? Number(value) : '';
                    setCustomerId(id);
                    if (id) {
                      const c = customers.find((cu) => cu.id === id);
                      setCustomerName(c?.name ?? '');
                    } else {
                      setCustomerName('');
                    }
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                  required
                >
                  <option value="">{t('quotations.selectCustomer', 'Select customer')}</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} • {c.mobile}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>{t('quotations.status', 'Status')}</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as QuotationStatus)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                >
                  <option value="draft">{t('quotations.statusDraft', 'Draft')}</option>
                  <option value="sent">{t('quotations.statusSent', 'Sent')}</option>
                  <option value="accepted">{t('quotations.statusAccepted', 'Accepted')}</option>
                  <option value="rejected">{t('quotations.statusRejected', 'Rejected')}</option>
                  <option value="expired">{t('quotations.statusExpired', 'Expired')}</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>{t('quotations.validUntil', 'Valid Until')}</label>
                <Input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>{t('quotations.notes', 'Notes')}</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                  rows={2}
                />
              </div>
            </div>

            {/* Line items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {t('quotations.items', 'Line items')}
                </h3>
                <Button type="button" size="xs" onClick={handleAddItem}>
                  {t('quotations.addItem', 'Add Item')}
                </Button>
              </div>
              <div className="space-y-3">
                {items.map((item, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-1 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 items-end border border-gray-200 dark:border-gray-700 rounded-lg p-3"
                  >
                    <div className="sm:col-span-2">
                      <label className={labelClass}>{t('quotations.product', 'Item / Service')} *</label>
                      <Input
                        value={item.productName}
                        onChange={(e) => handleItemChange(index, { productName: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className={labelClass}>{t('quotations.qty', 'Qty')}</label>
                      <Input
                        type="number"
                        min={1}
                        value={item.quantity || ''}
                        onChange={(e) => handleItemChange(index, { quantity: Number(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>{t('quotations.unitPrice', 'Unit Price')}</label>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={item.unitPrice || ''}
                        onChange={(e) => handleItemChange(index, { unitPrice: Number(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>{t('quotations.taxRate', 'Tax %')}</label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={0.01}
                        value={item.taxRate || ''}
                        onChange={(e) => handleItemChange(index, { taxRate: Number(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>{t('quotations.discount', 'Disc %')}</label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={0.01}
                        value={item.discount || ''}
                        onChange={(e) => handleItemChange(index, { discount: Number(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {t('quotations.lineTotal', 'Total')}
                      </p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {formatCurrencyINR(item.lineTotal || 0)}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="text-xs text-red-600 dark:text-red-400 hover:underline"
                      >
                        {t('common.delete', 'Delete')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="flex flex-col items-end gap-1 text-sm">
                <div className="flex justify-between gap-6">
                  <span className="text-gray-600 dark:text-gray-300">
                    {t('quotations.subtotal', 'Subtotal')}:
                  </span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {formatCurrencyINR(totals.subtotal || 0)}
                  </span>
                </div>
                <div className="flex justify-between gap-6">
                  <span className="text-gray-600 dark:text-gray-300">
                    {t('quotations.taxTotal', 'Tax total')}:
                  </span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {formatCurrencyINR(totals.taxTotal || 0)}
                  </span>
                </div>
                <div className="flex justify-between gap-6">
                  <span className="text-gray-600 dark:text-gray-300">
                    {t('quotations.discountAmount', 'Discount amount')}:
                  </span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {formatCurrencyINR(totals.discountAmount || 0)}
                  </span>
                </div>
                <div className="flex justify-between gap-6 text-base">
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {t('quotations.grandTotal', 'Grand total')}:
                  </span>
                  <span className="font-bold text-gray-900 dark:text-gray-100">
                    {formatCurrencyINR(totals.grandTotal || 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button type="submit" loading={loading}>
            {quotation ? t('common.update', 'Update') : t('common.save', 'Save')}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
};

export default QuotationModal;

