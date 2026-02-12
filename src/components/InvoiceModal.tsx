import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { X } from 'lucide-react';
import { useStore } from '@/store/useStore';
import type { Customer, Plan, Provider } from '@/models/types';
import { salesInvoicesApi } from '@/api/invoices';
import { MOCK_ORGANIZATION_ID } from '@/models/types';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  plans: Plan[];
  onSuccess: () => void;
}

const InvoiceModal = ({ isOpen, onClose, customers, plans, onSuccess }: InvoiceModalProps) => {
  const { companyProfile, fetchCompanyProfile } = useStore();
  
  useEffect(() => {
    if (isOpen) {
      fetchCompanyProfile();
    }
  }, [isOpen, fetchCompanyProfile]);
  
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | ''>('');
  const [selectedPlanId, setSelectedPlanId] = useState<number | ''>('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<'draft' | 'sent' | 'paid' | 'overdue'>('draft');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchCompanyProfile();
    }
  }, [isOpen, fetchCompanyProfile]);

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
  const selectedPlan = plans.find((p) => p.id === selectedPlanId);

  // Filter plans based on selected customer's connection type
  const filteredPlans = selectedCustomer
    ? plans.filter((p) => p.provider === selectedCustomer.connectionType)
    : [];

  // Calculate amounts
  const baseAmount = selectedPlan?.price || 0;
  const gstRate = selectedPlan?.gstRate || 0;
  const gstAmount = (baseAmount * gstRate) / 100;
  const totalAmount = baseAmount + gstAmount;

  // Auto-set due date to 30 days from issue date
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
      setError('Please select both customer and plan');
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
      });

      onSuccess();
      onClose();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create invoice');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setSelectedCustomerId('');
    setSelectedPlanId('');
    setIssueDate(new Date().toISOString().split('T')[0]);
    setDueDate('');
    setStatus('draft');
    setError('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-card rounded-modal shadow-soft-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col border border-border">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-2xl font-bold gradient-text">Create Sales Invoice</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Customer Selection */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Customer <span className="text-destructive">*</span>
            </label>
            <Select
              value={selectedCustomerId}
              onChange={(e) => {
                setSelectedCustomerId(Number(e.target.value) || '');
                setSelectedPlanId(''); // Reset plan when customer changes
              }}
              required
            >
              <option value="">Select Customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} - {customer.mobile} ({customer.connectionType})
                </option>
              ))}
            </Select>
          </div>

          {/* Plan Selection */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Plan / Service <span className="text-destructive">*</span>
            </label>
            <Select
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(Number(e.target.value) || '')}
              required
              disabled={!selectedCustomer}
            >
              <option value="">Select Plan</option>
              {filteredPlans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.planName} - ₹{plan.price}/month
                </option>
              ))}
            </Select>
            {selectedCustomer && filteredPlans.length === 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                No plans available for {selectedCustomer.connectionType}
              </p>
            )}
          </div>

          {/* Amount Breakdown */}
          {selectedPlan && (
            <Card className="bg-gradient-to-br from-blue-50 to-cyan-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Amount Breakdown (GST Compliant)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Base Amount:</span>
                  <span className="font-semibold">₹{baseAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">GST ({gstRate}%):</span>
                  <span className="font-semibold">₹{gstAmount.toFixed(2)}</span>
                </div>
                <div className="border-t-2 border-primary/20 pt-3 flex justify-between items-center">
                  <span className="text-base font-bold">Total Amount:</span>
                  <span className="text-xl font-bold text-primary">₹{totalAmount.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2">
                Issue Date <span className="text-destructive">*</span>
              </label>
              <Input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">
                Due Date <span className="text-destructive">*</span>
              </label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-semibold mb-2">Status</label>
            <Select value={status} onChange={(e) => setStatus(e.target.value as any)}>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </Select>
          </div>

          {error && (
            <div className="p-4 bg-destructive/10 border-2 border-destructive/20 rounded-lg text-sm text-destructive">
              {error}
            </div>
          )}
        </form>

        <div className="flex justify-end gap-3 p-6 border-t border-border bg-muted/30">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !selectedCustomer || !selectedPlan}>
            {saving ? 'Creating...' : 'Create Invoice'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default InvoiceModal;
