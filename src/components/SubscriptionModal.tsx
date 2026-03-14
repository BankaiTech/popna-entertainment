import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/Dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import type { Subscription, SubscriptionStatus, BillingCycle } from '@/models/types';
import { MOCK_ORGANIZATION_ID } from '@/models/types';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscription?: Subscription | null;
  onSave: (sub: Omit<Subscription, 'id' | 'createdAt'>) => Promise<void>;
  onUpdate: (id: number, sub: Partial<Subscription>) => Promise<void>;
}

const STATUSES: SubscriptionStatus[] = ['active', 'paused', 'cancelled', 'expired'];

const labelClass = 'block text-sm font-medium text-foreground mb-2';

const SubscriptionModal = ({ isOpen, onClose, subscription, onSave, onUpdate }: SubscriptionModalProps) => {
  const { t } = useTranslation();
  const { customers, fetchCustomers } = useStore();
  const [loading, setLoading] = useState(false);
  const [customerId, setCustomerId] = useState<number | ''>('');
  const [customerName, setCustomerName] = useState('');
  const [planName, setPlanName] = useState('');
  const [amount, setAmount] = useState<number | ''>(0);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [startDate, setStartDate] = useState('');
  const [nextBillingDate, setNextBillingDate] = useState('');
  const [status, setStatus] = useState<SubscriptionStatus>('active');
  const [autoRenew, setAutoRenew] = useState(true);

  useEffect(() => {
    if (isOpen && customers.length === 0) {
      fetchCustomers().catch(() => undefined);
    }
  }, [isOpen, customers.length, fetchCustomers]);

  useEffect(() => {
    if (subscription) {
      setCustomerId(subscription.customerId);
      setCustomerName(subscription.customerName);
      setPlanName(subscription.planName);
      setAmount(subscription.amount);
      setBillingCycle(subscription.billingCycle);
      setStartDate(subscription.startDate);
      setNextBillingDate(subscription.nextBillingDate);
      setStatus(subscription.status);
      setAutoRenew(subscription.autoRenew);
    } else {
      const today = new Date().toISOString().slice(0, 10);
      setCustomerId('');
      setCustomerName('');
      setPlanName('');
      setAmount(0);
      setBillingCycle('monthly');
      setStartDate(today);
      setNextBillingDate('');
      setStatus('active');
      setAutoRenew(true);
    }
  }, [subscription, isOpen]);

  useEffect(() => {
    if (customerId && customers.length) {
      const c = customers.find((x) => x.id === customerId);
      if (c) setCustomerName(c.name);
    }
  }, [customerId, customers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !planName.trim() || amount === '' || Number(amount) < 0 || !startDate) return;
    setLoading(true);
    try {
      const nextDate = nextBillingDate || (() => {
        const d = new Date(startDate);
        if (billingCycle === 'monthly') d.setMonth(d.getMonth() + 1);
        else if (billingCycle === 'quarterly') d.setMonth(d.getMonth() + 3);
        else d.setFullYear(d.getFullYear() + 1);
        return d.toISOString().slice(0, 10);
      })();
      const payload = {
        organizationId: MOCK_ORGANIZATION_ID,
        customerId: customerId || 0,
        customerName: customerName.trim(),
        planName: planName.trim(),
        amount: Number(amount),
        billingCycle,
        startDate,
        nextBillingDate: nextDate,
        status,
        autoRenew,
      };
      if (subscription) {
        await onUpdate(subscription.id, payload);
      } else {
        await onSave(payload);
      }
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} size="lg">
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
        <DialogHeader
          title={subscription ? t('subscriptions.editSubscription', 'Edit Subscription') : t('subscriptions.addSubscription', 'Add Subscription')}
          onClose={onClose}
        />
        <DialogBody>
          <div className="p-4 sm:p-6 space-y-6">
            {/* Customer */}
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('subscriptions.customer', 'Customer')}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>{t('subscriptions.customer', 'Customer')} *</label>
                  <Select
                    value={customerId === '' ? '' : String(customerId)}
                    onChange={(e) => setCustomerId(e.target.value === '' ? '' : Number(e.target.value))}
                  >
                    <option value="">{t('subscriptions.selectCustomer', 'Select customer')}</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} – {c.mobile}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className={labelClass}>{t('subscriptions.customerName', 'Customer name')}</label>
                  <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder={t('common.name', 'Name')} required />
                </div>
              </div>
            </div>

            {/* Plan & billing */}
            <Card className="bg-muted/30 dark:bg-muted/20 border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-foreground">
                  {t('subscriptions.planAndBilling', 'Plan & billing')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>{t('subscriptions.planName', 'Plan name')} *</label>
                    <Input value={planName} onChange={(e) => setPlanName(e.target.value)} placeholder={t('subscriptions.planPlaceholder', 'Plan name')} required />
                  </div>
                  <div>
                    <label className={labelClass}>{t('subscriptions.amount', 'Amount')} *</label>
                    <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))} min={0} step={0.01} required />
                  </div>
                  <div>
                    <label className={labelClass}>{t('subscriptions.billingCycle', 'Billing cycle')}</label>
                    <Select value={billingCycle} onChange={(e) => setBillingCycle(e.target.value as BillingCycle)}>
                      <option value="monthly">{t('subscriptions.monthly', 'Monthly')}</option>
                      <option value="quarterly">{t('subscriptions.quarterly', 'Quarterly')}</option>
                      <option value="yearly">{t('subscriptions.yearly', 'Yearly')}</option>
                    </Select>
                  </div>
                  <div>
                    <label className={labelClass}>{t('subscriptions.startDate', 'Start date')} *</label>
                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
                  </div>
                  <div>
                    <label className={labelClass}>{t('subscriptions.nextBillingDate', 'Next billing date')}</label>
                    <Input type="date" value={nextBillingDate} onChange={(e) => setNextBillingDate(e.target.value)} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Status & options */}
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('subscriptions.statusAndOptions', 'Status & options')}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>{t('common.status', 'Status')}</label>
                  <Select value={status} onChange={(e) => setStatus(e.target.value as SubscriptionStatus)}>
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{t(`subscriptions.status${s.charAt(0).toUpperCase() + s.slice(1)}`, s)}</option>
                    ))}
                  </Select>
                </div>
                <div className="flex items-end pb-2">
                  <label className={cn('flex items-center gap-2 cursor-pointer')}>
                    <input
                      type="checkbox"
                      checked={autoRenew}
                      onChange={(e) => setAutoRenew(e.target.checked)}
                      className="rounded border-gray-300 dark:border-gray-600 text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-foreground">{t('subscriptions.autoRenew', 'Auto renew')}</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </DialogBody>
        <DialogFooter className="flex flex-row justify-end gap-2 pt-4 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button type="submit" loading={loading} disabled={!customerName.trim() || !planName.trim() || amount === '' || Number(amount) < 0 || !startDate}>
            {subscription ? t('common.update', 'Update') : t('common.save', 'Save')}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
};

export default SubscriptionModal;
