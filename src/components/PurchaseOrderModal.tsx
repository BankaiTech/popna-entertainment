import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/Dialog';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import type { PurchaseOrder, PurchaseOrderItem, PurchaseOrderStatus, Vendor } from '@/models/types';
import { MOCK_ORGANIZATION_ID } from '@/models/types';
import { vendorsApi } from '@/api/purchaseInvoices';
import { formatCurrencyINR } from '@/lib/utils';

interface PurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseOrder?: PurchaseOrder | null;
  onSave: (po: Omit<PurchaseOrder, 'id' | 'createdAt' | 'poNumber'>) => Promise<void>;
  onUpdate: (id: number, po: Partial<PurchaseOrder>) => Promise<void>;
}

interface LineForm extends PurchaseOrderItem {}

const emptyLine = (): LineForm => ({
  productId: 0,
  productName: '',
  quantity: 1,
  unitPrice: 0,
  taxRate: 0,
  lineTotal: 0,
  receivedQuantity: 0,
});

const PurchaseOrderModal = ({
  isOpen,
  onClose,
  purchaseOrder,
  onSave,
  onUpdate,
}: PurchaseOrderModalProps) => {
  const { t } = useTranslation();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorId, setVendorId] = useState<number | ''>('');
  const [vendorName, setVendorName] = useState('');
  const [status, setStatus] = useState<PurchaseOrderStatus>('draft');
  const [expectedDate, setExpectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<LineForm[]>([emptyLine()]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      vendorsApi.getAll().then(setVendors).catch(() => undefined);
    }
  }, [isOpen]);

  useEffect(() => {
    if (purchaseOrder) {
      setVendorId(purchaseOrder.vendorId);
      setVendorName(purchaseOrder.vendorName);
      setStatus(purchaseOrder.status);
      setExpectedDate(purchaseOrder.expectedDate || new Date().toISOString().slice(0, 10));
      setNotes(purchaseOrder.notes || '');
      setItems(purchaseOrder.items.map((it) => ({ ...it })));
    } else {
      setVendorId('');
      setVendorName('');
      setStatus('draft');
      setExpectedDate(new Date().toISOString().slice(0, 10));
      setNotes('');
      setItems([emptyLine()]);
    }
  }, [purchaseOrder, isOpen]);

  const recalcLine = (line: LineForm): LineForm => {
    const base = line.quantity * line.unitPrice;
    const taxAmount = base * (line.taxRate || 0) / 100;
    return {
      ...line,
      lineTotal: Number((base + taxAmount).toFixed(2)),
    };
  };

  const totals = (() => {
    const subtotal = items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);
    const taxTotal = items.reduce((sum, it) => {
      const base = it.quantity * it.unitPrice;
      return sum + base * (it.taxRate || 0) / 100;
    }, 0);
    const grandTotal = items.reduce((sum, it) => sum + it.lineTotal, 0);
    return { subtotal, taxTotal, grandTotal };
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
    if (!vendorId || items.length === 0 || items.some((it) => !it.productName || it.quantity <= 0)) {
      return;
    }
    setLoading(true);
    try {
      const payload: Omit<PurchaseOrder, 'id' | 'createdAt' | 'poNumber'> = {
        organizationId: MOCK_ORGANIZATION_ID,
        vendorId: vendorId as number,
        vendorName,
        items: items.map((it) => ({ ...it })),
        subtotal: Number(totals.subtotal.toFixed(2)),
        taxTotal: Number(totals.taxTotal.toFixed(2)),
        grandTotal: Number(totals.grandTotal.toFixed(2)),
        status,
        expectedDate,
        notes: notes.trim() || undefined,
      };

      if (purchaseOrder) {
        await onUpdate(purchaseOrder.id, payload);
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
          title={
            purchaseOrder
              ? t('purchaseOrders.editTitle', 'Edit Purchase Order')
              : t('purchaseOrders.addTitle', 'New Purchase Order')
          }
          onClose={onClose}
        />
        <DialogBody>
          <div className="p-4 sm:p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>
                  {t('purchaseOrders.vendor', 'Vendor')} *
                </label>
                <Select
                  value={vendorId === '' ? '' : String(vendorId)}
                  onChange={(e) => {
                    const value = e.target.value;
                    const id = value ? Number(value) : '';
                    setVendorId(id);
                    if (id) {
                      const v = vendors.find((vv) => vv.id === id);
                      setVendorName(v?.name ?? '');
                    } else {
                      setVendorName('');
                    }
                  }}
                  required
                >
                  <option value="">{t('purchaseOrders.selectVendor', 'Select vendor')}</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className={labelClass}>{t('purchaseOrders.status', 'Status')}</label>
                <Select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as PurchaseOrderStatus)}
                >
                  <option value="draft">{t('purchaseOrders.statusDraft', 'Draft')}</option>
                  <option value="sent">{t('purchaseOrders.statusSent', 'Sent')}</option>
                  <option value="partial">{t('purchaseOrders.statusPartial', 'Partial Received')}</option>
                  <option value="received">{t('purchaseOrders.statusReceived', 'Received')}</option>
                  <option value="cancelled">{t('purchaseOrders.statusCancelled', 'Cancelled')}</option>
                </Select>
              </div>
              <div>
                <label className={labelClass}>{t('purchaseOrders.expectedDate', 'Expected Date')}</label>
                <Input
                  type="date"
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>{t('purchaseOrders.notes', 'Notes')}</label>
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
                  {t('purchaseOrders.items', 'Line items')}
                </h3>
                <Button type="button" size="xs" onClick={handleAddItem}>
                  {t('purchaseOrders.addItem', 'Add Item')}
                </Button>
              </div>
              <div className="space-y-3">
                {items.map((item, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-1 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 items-end border border-gray-200 dark:border-gray-700 rounded-lg p-3"
                  >
                    <div className="sm:col-span-2">
                      <label className={labelClass}>{t('purchaseOrders.product', 'Item')} *</label>
                      <Input
                        value={item.productName}
                        onChange={(e) => handleItemChange(index, { productName: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className={labelClass}>{t('purchaseOrders.qty', 'Qty')}</label>
                      <Input
                        type="number"
                        min={1}
                        value={item.quantity || ''}
                        onChange={(e) => handleItemChange(index, { quantity: Number(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>{t('purchaseOrders.unitPrice', 'Unit Price')}</label>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={item.unitPrice || ''}
                        onChange={(e) => handleItemChange(index, { unitPrice: Number(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>{t('purchaseOrders.taxRate', 'Tax %')}</label>
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
                      <label className={labelClass}>{t('purchaseOrders.receivedQty', 'Received')}</label>
                      <Input
                        type="number"
                        min={0}
                        value={item.receivedQuantity ?? 0}
                        onChange={(e) => handleItemChange(index, { receivedQuantity: Number(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {t('purchaseOrders.lineTotal', 'Total')}
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
                    {t('purchaseOrders.subtotal', 'Subtotal')}:
                  </span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {formatCurrencyINR(totals.subtotal || 0)}
                  </span>
                </div>
                <div className="flex justify-between gap-6">
                  <span className="text-gray-600 dark:text-gray-300">
                    {t('purchaseOrders.taxTotal', 'Tax total')}:
                  </span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {formatCurrencyINR(totals.taxTotal || 0)}
                  </span>
                </div>
                <div className="flex justify-between gap-6 text-base">
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {t('purchaseOrders.grandTotal', 'Grand total')}:
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
            {purchaseOrder ? t('common.update', 'Update') : t('common.save', 'Save')}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
};

export default PurchaseOrderModal;

