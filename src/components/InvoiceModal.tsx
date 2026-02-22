import { useState, useEffect } from 'react';
import { formatCurrencyINR } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { useStore } from '@/store/useStore';
import type { Customer, Plan, InvoiceType } from '@/models/types';
import { salesInvoicesApi } from '@/api/invoices';
import { MOCK_ORGANIZATION_ID } from '@/models/types';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/Dialog';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  plans: Plan[];
  onSuccess: () => void;
}

const DEFAULT_HSN_SAC = '998314'; // Telecom / broadband services as per GST

const InvoiceModal = ({ isOpen, onClose, customers, plans, onSuccess }: InvoiceModalProps) => {
  const { t } = useTranslation();
  const { fetchCompanyProfile } = useStore();

  useEffect(() => {
    if (isOpen) fetchCompanyProfile();
  }, [isOpen, fetchCompanyProfile]);

  const [selectedCustomerId, setSelectedCustomerId] = useState<number | ''>('');
  const [selectedPlanId, setSelectedPlanId] = useState<number | ''>('');
  const [invoiceType, setInvoiceType] = useState<InvoiceType>('tax_invoice');
  const [placeOfSupply, setPlaceOfSupply] = useState('');
  const [hsnSac, setHsnSac] = useState(DEFAULT_HSN_SAC);
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<'draft' | 'sent' | 'paid' | 'overdue'>('draft');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
  const selectedPlan = plans.find((p) => p.id === selectedPlanId);
  const filteredPlans = selectedCustomer
    ? plans.filter((p) => p.provider === selectedCustomer.connectionType)
    : [];

  const baseAmount = selectedPlan?.price ?? 0;
  const gstRate = selectedPlan?.gstRate ?? 0;
  const gstAmount = invoiceType === 'tax_invoice' ? (baseAmount * gstRate) / 100 : 0;
  const totalAmount = baseAmount + gstAmount;

  useEffect(() => {
    if (issueDate) {
      const issue = new Date(issueDate);
      issue.setDate(issue.getDate() + 30);
      setDueDate(issue.toISOString().split('T')[0]);
    }
  }, [issueDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!selectedCustomer || !selectedPlan) {
      setError(t('invoiceModal.selectBothError', 'Please select both customer and plan'));
      return;
    }
    setSaving(true);
    try {
      const invoiceNumber = `INV-${Date.now()}`;
      await salesInvoicesApi.create({
        organizationId: MOCK_ORGANIZATION_ID,
        invoiceNumber,
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        serviceProvider: selectedPlan.provider,
        planName: selectedPlan.planName,
        amount: baseAmount,
        gstRate,
        gstAmount,
        totalAmount,
        status,
        issueDate,
        dueDate,
        invoiceType,
        placeOfSupply: placeOfSupply.trim() || undefined,
        hsnSac: hsnSac.trim() || undefined,
      });
      onSuccess();
      onClose();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('invoiceModal.createFailed', 'Failed to create invoice'));
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setSelectedCustomerId('');
    setSelectedPlanId('');
    setInvoiceType('tax_invoice');
    setPlaceOfSupply('');
    setHsnSac(DEFAULT_HSN_SAC);
    setIssueDate(new Date().toISOString().split('T')[0]);
    setDueDate('');
    setStatus('draft');
    setError('');
  };

  const customerAddressLines = selectedCustomer
    ? [
      [selectedCustomer.address?.line1, selectedCustomer.address?.line2].filter(Boolean).join(', '),
      [selectedCustomer.address?.city, selectedCustomer.address?.state, selectedCustomer.address?.country].filter(Boolean).join(', '),
    ].filter(Boolean)
    : [];

  return (
    <Dialog open={isOpen} onClose={onClose} size="lg">
      <DialogHeader title={t('invoiceModal.title', 'Create Sales Invoice')} onClose={onClose} />
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
        <DialogBody>
          <div className="p-4 sm:p-6 space-y-6">
            {/* GST fields as per regulations */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">
                  {t('invoiceModal.invoiceType', 'Invoice Type')} <span className="text-destructive">*</span>
                </label>
                <Select
                  value={invoiceType}
                  onChange={(e) => setInvoiceType(e.target.value as InvoiceType)}
                  required
                >
                  <option value="tax_invoice">{t('invoiceModal.taxInvoice', 'Tax Invoice')}</option>
                  <option value="bill_of_supply">{t('invoiceModal.billOfSupply', 'Bill of Supply')}</option>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">{t('invoiceModal.placeOfSupply', 'Place of Supply')}</label>
                <Input
                  value={placeOfSupply}
                  onChange={(e) => setPlaceOfSupply(e.target.value)}
                  placeholder={t('invoiceModal.placeOfSupplyPlaceholder', 'State name or code')}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">{t('invoiceModal.hsnSac', 'HSN / SAC Code')}</label>
                <Input
                  value={hsnSac}
                  onChange={(e) => setHsnSac(e.target.value)}
                  placeholder="998314"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">
                {t('common.customer', 'Customer')} <span className="text-destructive">*</span>
              </label>
              <Select
                value={selectedCustomerId}
                onChange={(e) => {
                  setSelectedCustomerId(Number(e.target.value) || '');
                  setSelectedPlanId('');
                }}
                required
              >
                <option value="">{t('invoiceModal.selectCustomer', 'Select Customer')}</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} - {customer.mobile} ({customer.connectionType})
                  </option>
                ))}
              </Select>
            </div>

            {selectedCustomer && (
              <div className="rounded-lg border border-border bg-muted/20 p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  {t('invoiceModal.billTo', 'Bill To')}
                </p>
                <p className="font-medium text-foreground">{selectedCustomer.name}</p>
                {customerAddressLines.length > 0 && (
                  <p className="text-sm text-muted-foreground mt-1">{customerAddressLines.join(', ')}</p>
                )}
                {selectedCustomer.gstin && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('invoiceModal.gstin', 'GSTIN')}: {selectedCustomer.gstin}
                  </p>
                )}
                {selectedCustomer.mobile && (
                  <p className="text-sm text-muted-foreground">{t('invoiceModal.mobile', 'Mobile')}: {selectedCustomer.mobile}</p>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold mb-2">
                {t('invoiceModal.planService', 'Plan / Service')} <span className="text-destructive">*</span>
              </label>
              <Select
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(Number(e.target.value) || '')}
                required
                disabled={!selectedCustomer}
              >
                <option value="">{t('invoiceModal.selectPlan', 'Select Plan')}</option>
                {filteredPlans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.planName} - ₹{plan.price}{t('plans.perMonth', '/month')}
                  </option>
                ))}
              </Select>
              {selectedCustomer && filteredPlans.length === 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  {t('invoiceModal.noPlansAvailable', 'No plans available for {{connectionType}}', {
                    connectionType: selectedCustomer.connectionType,
                  })}
                </p>
              )}
            </div>

            {selectedPlan && (
              <Card className="bg-gradient-to-br from-blue-50 to-cyan-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{t('invoiceModal.amountBreakdown', 'Amount Breakdown (GST Compliant)')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{t('invoiceModal.baseAmount', 'Base Amount')}:</span>
                    <span className="font-semibold">{formatCurrencyINR(baseAmount)}</span>
                  </div>
                  {invoiceType === 'tax_invoice' && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">{t('invoiceModal.gst', 'GST')} ({gstRate}%):</span>
                      <span className="font-semibold">{formatCurrencyINR(gstAmount)}</span>
                    </div>
                  )}
                  <div className="border-t-2 border-primary/20 pt-3 flex justify-between items-center">
                    <span className="text-base font-bold">{t('invoiceModal.totalAmount', 'Total Amount')}:</span>
                    <span className="text-xl font-bold text-primary">{formatCurrencyINR(totalAmount)}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">
                  {t('invoiceModal.issueDate', 'Issue Date')} <span className="text-destructive">*</span>
                </label>
                <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">
                  {t('invoiceModal.dueDate', 'Due Date')} <span className="text-destructive">*</span>
                </label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">{t('common.status', 'Status')}</label>
              <Select value={status} onChange={(e) => setStatus(e.target.value as 'draft' | 'sent' | 'paid' | 'overdue')}>
                <option value="draft">{t('invoiceModal.statusDraft', 'Draft')}</option>
                <option value="sent">{t('invoiceModal.statusSent', 'Sent')}</option>
                <option value="paid">{t('invoiceModal.statusPaid', 'Paid')}</option>
                <option value="overdue">{t('invoiceModal.statusOverdue', 'Overdue')}</option>
              </Select>
            </div>

            {error && (
              <div className="p-4 bg-destructive/10 border-2 border-destructive/20 rounded-lg text-sm text-destructive">
                {error}
              </div>
            )}
          </div>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button type="submit" disabled={saving || !selectedCustomer || !selectedPlan}>
            {saving ? t('invoiceModal.creating', 'Creating...') : t('invoiceModal.createInvoice', 'Create Invoice')}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
};

export default InvoiceModal;
