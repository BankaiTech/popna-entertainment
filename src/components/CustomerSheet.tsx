// Payment Collection System — SaaS Ready
import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useStore } from '@/store/useStore';
import Button from './ui/Button';
import Input from './ui/Input';
import Select from './ui/Select';
import type { Customer, Provider, CustomerStatus } from '@/models/types';
import { getConnectionTypeLabel } from '@/lib/providerUtils';

type PaymentFormData = { paymentStatus: 'paid' | 'not_paid'; paymentDescription: string; dateTimeLocal: string; collectedAmount: number };

interface CustomerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  customer?: Customer | null;
  onSave: (customer: Omit<Customer, 'id' | 'createdAt'> | Partial<Customer>) => void;
  // SaaS Ready — payment applies to ALL product types
  onUpdatePayment?: (customerId: number, data: { paymentStatus: 'paid' | 'not_paid'; paymentDescription: string; paymentUpdatedAt: string; collectedAmount?: number; balanceAmount?: number }) => Promise<void>;
}

const CustomerSheet = ({ isOpen, onClose, customer, onSave, onUpdatePayment }: CustomerSheetProps) => {
  const { t } = useTranslation();
  const { role } = useAuthStore();
  const { products, fetchActiveProducts, plans } = useStore();
  
  // Fetch products when component mounts
  useEffect(() => {
    fetchActiveProducts();
  }, [fetchActiveProducts]);
  
  // Employees can only view customer details (read-only), cannot add or edit. Payment update is allowed for both Admin and Employee.
  const isReadOnly = role === 'employee';
  const [activeTab, setActiveTab] = useState<'info' | 'address'>('info');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState<PaymentFormData>({ paymentStatus: 'not_paid', paymentDescription: '', dateTimeLocal: '', collectedAmount: 0 });
  
  // Products fully dynamic — no hardcoded service names. Options from Admin → Settings → Products only.
  const availableProviders = Array.isArray(products) ? products.map((p) => p.name) : [];
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    connectionType: '' as Provider,
    package: '',
    status: 'Active' as CustomerStatus,
    description: '',
    gstin: '' as string | undefined,
    address: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      country: 'India',
    },
  });

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name,
        email: customer.email,
        mobile: customer.mobile,
        connectionType: customer.connectionType,
        package: customer.package,
        status: customer.status,
        description: customer.description || '',
        gstin: customer.gstin || undefined,
        address: customer.address,
      });
    } else {
      // Multi-tenant ready — use first available product as default
      const defaultProvider = availableProviders.length > 0 ? availableProviders[0] : '';
      setFormData({
        name: '',
        email: '',
        mobile: '',
        connectionType: defaultProvider,
        package: '',
        status: 'Active',
        description: '',
        gstin: undefined,
        address: {
          line1: '',
          line2: '',
          city: '',
          state: '',
          country: 'India',
        },
      });
    }
  }, [customer, isOpen, availableProviders]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Security check: Employees cannot add or edit customers
    if (isReadOnly) {
      if (customer) {
        alert('You do not have permission to edit customer details.');
      } else {
        alert('You do not have permission to add customers.');
      }
      return;
    }
    
    // Optional GSTIN field for GST invoice support - validation
    if (formData.gstin && formData.gstin.trim() !== '') {
      const gstinValue = formData.gstin.trim().toUpperCase();
      if (gstinValue.length !== 15) {
        alert('GSTIN must be exactly 15 characters');
        return;
      }
      if (!/^[A-Z0-9]{15}$/.test(gstinValue)) {
        alert('GSTIN must contain only alphanumeric characters');
        return;
      }
      formData.gstin = gstinValue;
    } else {
      formData.gstin = undefined;
    }
    
    if (customer) {
      onSave(formData);
    } else {
      onSave(formData);
    }
    onClose();
  };

  const statuses: CustomerStatus[] = ['Active', 'Inactive'];
  
  // SaaS Ready — Payment applies to ALL product types (no cable-only restriction)
  const customerPlan = useMemo(() => {
    if (!customer || !Array.isArray(plans)) return null;
    return plans.find((p) => p.planName === customer.package && p.provider === customer.connectionType) || null;
  }, [customer, plans]);

  // Security check: Employees cannot add customers - close modal if opened in add mode
  useEffect(() => {
    if (isOpen && isReadOnly && !customer) {
      alert('You do not have permission to add customers.');
      onClose();
    }
  }, [isOpen, isReadOnly, customer, onClose]);

  const planAmount = customerPlan?.price ?? 0;
  const gstRate = customerPlan?.gstRate ?? 0;
  const gstAmount = planAmount * (gstRate / 100);
  const totalAmount = planAmount + gstAmount;

  const openPaymentModal = () => {
    if (!customer) return;
    setPaymentForm({
      paymentStatus: (customer.paymentStatus ?? 'not_paid') as 'paid' | 'not_paid',
      paymentDescription: customer.paymentDescription ?? '',
      dateTimeLocal: customer.paymentUpdatedAt ? new Date(customer.paymentUpdatedAt).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
      collectedAmount: customer.collectedAmount ?? 0,
    });
    setIsPaymentModalOpen(true);
  };

  const balanceAmount = Math.max(0, totalAmount - (paymentForm.collectedAmount || 0));
  const isFullyPaid = paymentForm.collectedAmount >= totalAmount;

  const handlePaymentSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const desc = paymentForm.paymentDescription.trim();
    if (!desc) { alert(t('payment.descriptionRequired', 'Description is required.')); return; }
    if (!paymentForm.dateTimeLocal) { alert(t('payment.dateRequired', 'Date & Time is required.')); return; }
    if (paymentForm.collectedAmount < 0) { alert(t('payment.invalidAmount', 'Collected amount cannot be negative.')); return; }
    const paymentUpdatedAt = new Date(paymentForm.dateTimeLocal).toISOString();
    const computedStatus: 'paid' | 'not_paid' = isFullyPaid ? 'paid' : 'not_paid';
    if (!onUpdatePayment || !customer) return;
    try {
      await onUpdatePayment(customer.id, {
        paymentStatus: computedStatus,
        paymentDescription: desc,
        paymentUpdatedAt,
        collectedAmount: paymentForm.collectedAmount,
        balanceAmount: isFullyPaid ? 0 : balanceAmount,
      });
      setIsPaymentModalOpen(false);
      alert(t('payment.updateSuccess', 'Payment status updated successfully.'));
    } catch (err) {
      alert(t('payment.updateFailed', 'Failed to update payment status. Please try again.'));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-card rounded-t-modal sm:rounded-modal shadow-soft-xl w-full sm:w-[600px] max-h-[90vh] overflow-hidden flex flex-col border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Compact Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-lg font-semibold">
            {isReadOnly ? t('customerSheet.details', 'Customer Details') : customer ? t('customerSheet.edit', 'Edit Customer') : t('customerSheet.add', 'Add New Customer')}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-accent rounded-md transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab('info')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'info'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('customerSheet.information', 'Information')}
          </button>
          <button
            onClick={() => setActiveTab('address')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'address'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('customerSheet.address', 'Address')}
          </button>
        </div>

        {/* Scrollable Content — form is flex column; body scrolls, footer always visible (no overlay on mobile) */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 pb-24 sm:pb-6">
          {activeTab === 'info' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Name <span className="text-destructive">*</span>
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    disabled={isReadOnly}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled={isReadOnly}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Mobile</label>
                  <Input
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    disabled={isReadOnly}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    GSTIN <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
                  </label>
                  <Input
                    value={formData.gstin || ''}
                    onChange={(e) => {
                      const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15);
                      setFormData({
                        ...formData,
                        gstin: value || undefined,
                      });
                    }}
                    placeholder="15-character GSTIN"
                    maxLength={15}
                    disabled={isReadOnly}
                    className="uppercase"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {formData.gstin && formData.gstin.length !== 15 ? 'GSTIN must be 15 characters' : 'Optional GSTIN field for GST invoice support'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Connection Type</label>
                  <Select
                    value={formData.connectionType}
                    onChange={(e) => setFormData({ ...formData, connectionType: e.target.value as Provider })}
                    disabled={isReadOnly}
                  >
                    {availableProviders.length === 0 ? (
                      <option value="">No products — add in Settings → Products</option>
                    ) : (
                      availableProviders.map((provider) => (
                        <option key={provider} value={provider}>
                          {getConnectionTypeLabel(provider, products)}
                        </option>
                      ))
                    )}
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Package</label>
                  <Input
                    value={formData.package}
                    onChange={(e) => setFormData({ ...formData, package: e.target.value })}
                    disabled={isReadOnly}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Status</label>
                  <Select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as CustomerStatus })}
                    disabled={isReadOnly}
                  >
                    {statuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="col-span-full">
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none disabled:bg-muted disabled:cursor-not-allowed"
                    rows={4}
                    placeholder="Enter customer description..."
                    disabled={isReadOnly}
                  />
                </div>
              </div>

              {/* Payment Collection System — SaaS Ready (ALL product types) */}
              {customer && (
                <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                  <h3 className="text-sm font-semibold text-gray-900">{t('payment.title', 'Payment Status')}</h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-gray-600">{t('payment.currentStatus', 'Current payment status')}:</span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        customer.paymentStatus === 'paid'
                          ? 'bg-green-500 text-white'
                          : 'bg-red-500 text-white'
                      }`}
                    >
                      {customer.paymentStatus === 'paid' ? t('customers.paid', 'Paid') : t('customers.unpaid', 'Unpaid')}
                    </span>
                  </div>
                  {customer.collectedAmount != null && customer.collectedAmount > 0 && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">{t('payment.collected', 'Collected')}: </span>
                      <span className="font-medium">₹{customer.collectedAmount.toFixed(2)}</span>
                      {customer.balanceAmount != null && customer.balanceAmount > 0 && (
                        <span className="ml-3 text-red-600">
                          {t('payment.balance', 'Balance')}: ₹{customer.balanceAmount.toFixed(2)}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="text-sm">
                    <span className="text-muted-foreground">{t('payment.lastUpdated', 'Last updated')}: </span>
                    {customer.paymentUpdatedAt
                      ? new Date(customer.paymentUpdatedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
                      : '—'}
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">{t('payment.description', 'Payment description')}: </span>
                    {customer.paymentDescription || '—'}
                  </div>
                  <Button type="button" onClick={openPaymentModal} className="min-h-[44px] touch-manipulation">
                    {t('payment.collectPayment', 'Collect Payment')}
                  </Button>
                </div>
              )}
            </>
          )}

          {activeTab === 'address' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Address Line 1</label>
                <Input
                  value={formData.address.line1}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address, line1: e.target.value },
                    })
                  }
                  disabled={isReadOnly}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Address Line 2</label>
                <Input
                  value={formData.address.line2}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address, line2: e.target.value },
                    })
                  }
                  disabled={isReadOnly}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">City</label>
                <Input
                  value={formData.address.city}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address, city: e.target.value },
                    })
                  }
                  disabled={isReadOnly}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">State</label>
                <Input
                  value={formData.address.state}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address, state: e.target.value },
                    })
                  }
                  disabled={isReadOnly}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  GSTIN <span className="text-xs text-muted-foreground">(Optional)</span>
                </label>
                <Input
                  value={formData.gstin || ''}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15);
                    setFormData({
                      ...formData,
                      gstin: value || undefined,
                    });
                  }}
                  placeholder="15-character GSTIN"
                  maxLength={15}
                  disabled={isReadOnly}
                  className="uppercase"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.gstin && formData.gstin.length !== 15 ? 'GSTIN must be 15 characters' : 'Optional GSTIN field for GST invoice support'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Country</label>
                <Input
                  value={formData.address.country}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address, country: e.target.value },
                    })
                  }
                  disabled={isReadOnly}
                />
              </div>
            </div>
          )}

          </div>

          {/* Footer — shrink-0 so always visible; body scrolls above it (pb-24 on mobile for clearance) */}
          <div className="shrink-0 flex flex-col sm:flex-row justify-end gap-2 px-4 sm:px-6 py-4 border-t border-border bg-card">
            <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
              {isReadOnly ? t('common.close', 'Close') : t('common.cancel', 'Cancel')}
            </Button>
            {!isReadOnly && (
              <Button type="submit" className="w-full sm:w-auto">{customer ? t('common.update', 'Update') : t('common.create', 'Create')} {t('customers.customer', 'Customer')}</Button>
            )}
          </div>
        </form>
      </div>

      {/* Payment Collection Dialog — SaaS Ready (ALL product types) */}
      {isPaymentModalOpen && customer && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
          onClick={() => setIsPaymentModalOpen(false)}
        >
          <div
            className="bg-card rounded-t-modal sm:rounded-modal shadow-soft-xl w-full sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="text-lg font-semibold">{t('payment.collectPayment', 'Collect Payment')}</h3>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="p-1.5 hover:bg-accent rounded-md transition-colors min-h-[44px] touch-manipulation"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handlePaymentSave} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 min-h-0 overflow-y-auto">
                <div className="p-4 sm:p-6 space-y-4">
                  {/* Read-only plan & amount details */}
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2 border border-border">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('payment.planName', 'Plan Name')}</span>
                      <span className="font-medium">{customer.package || '—'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('payment.planAmount', 'Plan Amount')}</span>
                      <span className="font-medium">₹{planAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('payment.gstAmount', 'GST Amount')} ({gstRate}%)</span>
                      <span className="font-medium">₹{gstAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold border-t border-border pt-2">
                      <span>{t('payment.totalAmount', 'Total Amount')}</span>
                      <span>₹{totalAmount.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Collected Amount input */}
                  <div>
                    <label className="block text-sm font-medium mb-2">{t('payment.collectedAmount', 'Collected Amount')} <span className="text-destructive">*</span></label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={paymentForm.collectedAmount || ''}
                      onChange={(e) => setPaymentForm({ ...paymentForm, collectedAmount: parseFloat(e.target.value) || 0 })}
                      required
                    />
                  </div>

                  {/* Auto-calculated balance — hidden if fully paid */}
                  {!isFullyPaid && paymentForm.collectedAmount > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex justify-between items-center">
                      <span className="text-sm font-medium text-red-700">{t('payment.balanceAmount', 'Balance Amount')}</span>
                      <span className="text-lg font-bold text-red-700">₹{balanceAmount.toFixed(2)}</span>
                    </div>
                  )}

                  {isFullyPaid && paymentForm.collectedAmount > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                      <span className="text-sm font-medium text-green-700">{t('payment.fullyPaid', 'Fully Paid')}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium mb-2">{t('payment.description', 'Description')} <span className="text-destructive">*</span></label>
                    <textarea
                      value={paymentForm.paymentDescription}
                      onChange={(e) => setPaymentForm({ ...paymentForm, paymentDescription: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                      rows={3}
                      placeholder={t('payment.descriptionPlaceholder', 'Enter payment details...')}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">{t('payment.dateTime', 'Date & Time')} <span className="text-destructive">*</span></label>
                    <input
                      type="datetime-local"
                      value={paymentForm.dateTimeLocal}
                      onChange={(e) => setPaymentForm({ ...paymentForm, dateTimeLocal: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      required
                    />
                  </div>
                </div>
              </div>
              <div className="shrink-0 flex flex-col sm:flex-row justify-end gap-2 px-4 sm:px-6 py-4 border-t border-border bg-card">
                <Button type="button" variant="outline" onClick={() => setIsPaymentModalOpen(false)} className="w-full sm:w-auto min-h-[44px] touch-manipulation">
                  {t('common.cancel', 'Cancel')}
                </Button>
                <Button type="submit" className="w-full sm:w-auto min-h-[44px] touch-manipulation">{t('common.submit', 'Submit')}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerSheet;
