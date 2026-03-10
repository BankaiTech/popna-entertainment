// Payment Collection System - SaaS Ready
// Standalone modal: opened directly from Unpaid badge in Customer table.
// Separate from Edit Customer sheet - no payment controls inside edit.
// Professional payment modal applied. Supports permanent discount (customer/plan) and instant discount.
import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '@/store/useStore';
import { useAuthStore } from '@/store/useAuthStore';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/Dialog';
import Button from './ui/Button';
import Input from './ui/Input';
import Select from './ui/Select';
import type { Customer, PaymentMethod } from '@/models/types';
import { showError } from '@/utils/toast';

interface PaymentCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
  onSubmit: (
    customerId: number,
    data: {
      paymentStatus: 'paid' | 'not_paid';
      paymentDescription: string;
      paymentUpdatedAt: string;
      paymentMethod?: PaymentMethod;
      collectedAmount: number;
      balanceAmount: number;
      collectedByUsername?: string;
    }
  ) => Promise<void>;
}

const PaymentCollectionModal = ({ isOpen, onClose, customer, onSubmit }: PaymentCollectionModalProps) => {
  const { t } = useTranslation();
  const { plans } = useStore();
  const { username } = useAuthStore();

  const customerPlan = useMemo(() => {
    if (!Array.isArray(plans)) return null;
    return plans.find((p) => p.planName === customer.package && p.provider === customer.connectionType) || null;
  }, [customer, plans]);

  const permanentDiscountPercent = customer.permanentDiscount ?? customerPlan?.permanentDiscount ?? 0;
  const planAmount = customerPlan?.price ?? 0;
  const planAfterPermanentDiscount = planAmount * (1 - permanentDiscountPercent / 100);
  const gstRate = customerPlan?.gstRate ?? 0;
  const gstAmount = planAfterPermanentDiscount * (gstRate / 100);
  const totalAmount = planAfterPermanentDiscount + gstAmount;

  const [collectedAmount, setCollectedAmount] = useState<number>(customer.collectedAmount ?? 0);
  const [instantDiscount, setInstantDiscount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(customer.paymentMethod ?? 'upi');
  const [saving, setSaving] = useState(false);

  // Reset state when modal opens or customer changes
  useEffect(() => {
    if (isOpen) {
      setCollectedAmount(customer.collectedAmount ?? 0);
      setInstantDiscount(0);
      setPaymentMethod(customer.paymentMethod ?? 'upi');
    }
  }, [isOpen, customer.id, customer.collectedAmount, customer.paymentMethod]);

  const amountAfterInstantDiscount = Math.max(0, totalAmount - instantDiscount);
  const balanceAmount = Math.max(0, amountAfterInstantDiscount - (collectedAmount || 0));
  const overpaidAmount = collectedAmount > amountAfterInstantDiscount ? collectedAmount - amountAfterInstantDiscount : 0;
  const isFullyPaid = amountAfterInstantDiscount > 0 && collectedAmount >= amountAfterInstantDiscount;

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (collectedAmount < 0) { showError(t('payment.invalidAmount', 'Collected amount cannot be negative.')); return; }

    const paymentUpdatedAt = new Date().toISOString();
    const computedStatus: 'paid' | 'not_paid' = isFullyPaid ? 'paid' : 'not_paid';

    setSaving(true);
    try {
      await onSubmit(customer.id, {
        paymentStatus: computedStatus,
        paymentDescription: '',
        paymentUpdatedAt,
        paymentMethod,
        collectedAmount,
        balanceAmount: isFullyPaid ? 0 : balanceAmount,
        ...(computedStatus === 'paid' && username ? { collectedByUsername: username } : {}),
      });
      onClose();
    } catch {
      showError(t('payment.updateFailed', 'Failed to update payment status. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose}>
      <DialogHeader title={t('payment.collectPayment', 'Collect Payment')} onClose={onClose} />
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
        <DialogBody>
          <div className="p-4 sm:p-5 space-y-3">
            {/* Customer info */}
            <div className="bg-muted/30 rounded-lg p-3 border border-border">
              <p className="text-sm font-semibold">{customer.name}</p>
              <p className="text-xs text-muted-foreground">{customer.mobile} &middot; {customer.connectionType}</p>
            </div>

            {/* Read-only plan & amount details */}
            <div className="bg-muted/50 rounded-lg p-3 space-y-1.5 border border-border">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('payment.planName', 'Plan Name')}</span>
                <span className="font-medium">{customer.package || '-'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('payment.planAmount', 'Plan Amount')}</span>
                <span className="font-medium">₹{planAmount.toFixed(2)}</span>
              </div>
              {permanentDiscountPercent > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('payment.permanentDiscount', 'Permanent Discount')} ({permanentDiscountPercent}%)</span>
                  <span className="font-medium">-₹{(planAmount - planAfterPermanentDiscount).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('payment.gstAmount', 'GST Amount')} ({gstRate}%)</span>
                <span className="font-medium">₹{gstAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold border-t border-border pt-1.5">
                <span>{t('payment.totalAmount', 'Total Amount')}</span>
                <span>₹{totalAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* Instant discount + Payment method (stacked to avoid label overlap in Tamil/Malayalam) */}
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1 whitespace-nowrap">{t('payment.instantDiscount', 'Instant Discount')} <span className="text-xs text-muted-foreground">({t('common.optional', 'Optional')})</span></label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={instantDiscount || ''}
                  onChange={(e) => setInstantDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                  placeholder="0"
                />
                {instantDiscount > 0 && (
                  <p className="text-xs text-muted-foreground mt-1 whitespace-nowrap">
                    {t('payment.amountAfterDiscount', 'Amount after discount')}: ₹{amountAfterInstantDiscount.toFixed(2)}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('payment.paymentMethod', 'Payment Method')}</label>
                <Select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                >
                  <option value="upi">{t('payment.methodUpi', 'UPI')}</option>
                  <option value="cash">{t('payment.methodCash', 'Cash')}</option>
                  <option value="card">{t('payment.methodCard', 'Card')}</option>
                  <option value="other">{t('payment.methodOther', 'Other')}</option>
                </Select>
              </div>
            </div>

            {/* Collected Amount */}
            <div>
              <label className="block text-sm font-medium mb-1">
                {t('payment.collectedAmount', 'Collected Amount')} <span className="text-destructive">*</span>
              </label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={collectedAmount || ''}
                onChange={(e) => setCollectedAmount(parseFloat(e.target.value) || 0)}
                required
              />
            </div>

            {/* Balance / Overpaid / Fully Paid indicators */}
            {!isFullyPaid && collectedAmount > 0 && overpaidAmount === 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 flex justify-between items-center">
                <span className="text-sm font-medium text-red-700">{t('payment.balanceAmount', 'Balance Amount')}</span>
                <span className="text-base font-bold text-red-700">₹{balanceAmount.toFixed(2)}</span>
              </div>
            )}

            {overpaidAmount > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex justify-between items-center">
                <span className="text-sm font-medium text-amber-700">{t('payment.overpaidAmount', 'Overpaid Amount')}</span>
                <span className="text-base font-bold text-amber-700">₹{overpaidAmount.toFixed(2)}</span>
              </div>
            )}

            {isFullyPaid && collectedAmount > 0 && overpaidAmount === 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-2.5 text-center">
                <span className="text-sm font-medium text-green-700">{t('payment.fullyPaid', 'Fully Paid')}</span>
              </div>
            )}
          </div>
        </DialogBody>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto min-h-[44px] touch-manipulation">
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button type="submit" disabled={saving} className="w-full sm:w-auto min-h-[44px] touch-manipulation">
            {saving ? t('common.saving', 'Saving...') : t('common.submit', 'Submit')}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
};

export default PaymentCollectionModal;
// SaaS datagrid, payment, employee flow revamp completed
