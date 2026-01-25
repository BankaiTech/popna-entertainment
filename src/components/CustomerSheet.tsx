import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import Button from './ui/Button';
import Input from './ui/Input';
import Select from './ui/Select';
import type { Customer, Provider, CustomerStatus } from '@/models/types';
import { getConnectionTypeLabel } from '@/lib/providerUtils';

type PaymentFormData = { paymentStatus: 'paid' | 'not_paid'; paymentDescription: string; dateTimeLocal: string };

interface CustomerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  customer?: Customer | null;
  onSave: (customer: Omit<Customer, 'id' | 'createdAt'> | Partial<Customer>) => void;
  /** GTPL only. Admin and Employee can update. */
  onUpdatePayment?: (customerId: number, data: { paymentStatus: 'paid' | 'not_paid'; paymentDescription: string; paymentUpdatedAt: string }) => Promise<void>;
}

const CustomerSheet = ({ isOpen, onClose, customer, onSave, onUpdatePayment }: CustomerSheetProps) => {
  const { role } = useAuthStore();
  // Employees can only view customer details (read-only), cannot add or edit. Payment update is allowed for both Admin and Employee.
  const isReadOnly = role === 'employee';
  const [activeTab, setActiveTab] = useState<'info' | 'address'>('info');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState<PaymentFormData>({ paymentStatus: 'not_paid', paymentDescription: '', dateTimeLocal: '' });
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    connectionType: 'GTPL' as Provider,
    package: '',
    status: 'Active' as CustomerStatus,
    description: '',
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
        address: customer.address,
      });
    } else {
      setFormData({
        name: '',
        email: '',
        mobile: '',
        connectionType: 'GTPL',
        package: '',
        status: 'Active',
        description: '',
        address: {
          line1: '',
          line2: '',
          city: '',
          state: '',
          country: 'India',
        },
      });
    }
  }, [customer, isOpen]);

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
    if (customer) {
      onSave(formData);
    } else {
      onSave(formData);
    }
    onClose();
  };

  const providers: Provider[] = ['GTPL', 'BSNL', 'Railwire', 'Krishiinet'];
  const statuses: CustomerStatus[] = ['Active', 'Inactive'];

  // Security check: Employees cannot add customers - close modal if opened in add mode
  useEffect(() => {
    if (isOpen && isReadOnly && !customer) {
      alert('You do not have permission to add customers.');
      onClose();
    }
  }, [isOpen, isReadOnly, customer, onClose]);

  const openPaymentModal = () => {
    if (!customer) return;
    setPaymentForm({
      paymentStatus: (customer.paymentStatus ?? 'not_paid') as 'paid' | 'not_paid',
      paymentDescription: customer.paymentDescription ?? '',
      dateTimeLocal: customer.paymentUpdatedAt ? new Date(customer.paymentUpdatedAt).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
    });
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const desc = paymentForm.paymentDescription.trim();
    if (!desc) { alert('Description is required.'); return; }
    if (!paymentForm.dateTimeLocal) { alert('Date & Time is required.'); return; }
    const paymentUpdatedAt = new Date(paymentForm.dateTimeLocal).toISOString();
    if (!onUpdatePayment || !customer) return;
    try {
      // TODO: Replace with direct GTPL billing API when available; parent uses updateCustomer for now.
      // Allowed for both admin and employee when customer.connectionType === 'GTPL'; only payment fields are sent.
      await onUpdatePayment(customer.id, { paymentStatus: paymentForm.paymentStatus, paymentDescription: desc, paymentUpdatedAt });
      setIsPaymentModalOpen(false);
      alert('Payment status updated successfully.');
    } catch (err) {
      alert('Failed to update payment status. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-card rounded-t-xl sm:rounded-xl shadow-lg w-full sm:w-[600px] max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Compact Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-lg font-semibold">
            {isReadOnly ? 'Customer Details' : customer ? 'Edit Customer' : 'Add New Customer'}
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
            Information
          </button>
          <button
            onClick={() => setActiveTab('address')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'address'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Address
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
                  <label className="block text-sm font-medium mb-2">Connection Type</label>
                  <Select
                    value={formData.connectionType}
                    onChange={(e) => setFormData({ ...formData, connectionType: e.target.value as Provider })}
                    disabled={isReadOnly}
                  >
                    {providers.map((provider) => (
                      <option key={provider} value={provider}>
                        {getConnectionTypeLabel(provider)}
                      </option>
                    ))}
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

              {/* GTPL only: Payment status. Admin and Employee can update. */}
              {customer?.connectionType === 'GTPL' && (
                <div className="mt-4 pt-4 border-t border-border space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">GTPL Payment Status</h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-muted-foreground">Current payment status:</span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        customer.paymentStatus === 'paid'
                          ? 'bg-green-500 text-white dark:bg-green-600 dark:text-white'
                          : customer.paymentStatus === 'not_paid'
                            ? 'bg-red-500 text-white dark:bg-red-600 dark:text-white'
                            : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {customer.paymentStatus === 'paid' ? 'Paid' : customer.paymentStatus === 'not_paid' ? 'Not Paid' : '—'}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Last updated: </span>
                    {customer.paymentUpdatedAt
                      ? new Date(customer.paymentUpdatedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
                      : '—'}
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Payment description: </span>
                    {customer.paymentDescription || '—'}
                  </div>
                  <Button type="button" onClick={openPaymentModal} className="min-h-[44px] touch-manipulation">
                    Update Payment Status
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
              {isReadOnly ? 'Close' : 'Cancel'}
            </Button>
            {!isReadOnly && (
              <Button type="submit" className="w-full sm:w-auto">{customer ? 'Update' : 'Create'} Customer</Button>
            )}
          </div>
        </form>
      </div>

      {/* Update Payment modal — GTPL only; shown when isPaymentModalOpen */}
      {isPaymentModalOpen && customer?.connectionType === 'GTPL' && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
          onClick={() => setIsPaymentModalOpen(false)}
        >
          <div
            className="bg-card rounded-t-xl sm:rounded-xl shadow-lg w-full sm:max-w-md max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="text-lg font-semibold">Update Payment Status</h3>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="p-1.5 hover:bg-accent rounded-md transition-colors min-h-[44px] touch-manipulation"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handlePaymentSave} className="flex flex-col flex-1 min-h-0">
              {/* Body scrolls; Save/Cancel footer is always visible on mobile */}
              <div className="flex-1 min-h-0 overflow-y-auto">
                <div className="p-4 sm:p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Payment Status <span className="text-destructive">*</span></label>
                    <Select
                      value={paymentForm.paymentStatus}
                      onChange={(e) => setPaymentForm({ ...paymentForm, paymentStatus: e.target.value as 'paid' | 'not_paid' })}
                      required
                    >
                      <option value="paid">Paid</option>
                      <option value="not_paid">Not Paid</option>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Description <span className="text-destructive">*</span></label>
                    <textarea
                      value={paymentForm.paymentDescription}
                      onChange={(e) => setPaymentForm({ ...paymentForm, paymentDescription: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                      rows={3}
                      placeholder="Enter payment details..."
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Date & Time <span className="text-destructive">*</span></label>
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
                  Cancel
                </Button>
                <Button type="submit" className="w-full sm:w-auto min-h-[44px] touch-manipulation">Save</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerSheet;
