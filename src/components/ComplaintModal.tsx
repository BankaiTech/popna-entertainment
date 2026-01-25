import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useStore } from '@/store/useStore';
import Button from './ui/Button';
import Select from './ui/Select';
import type { Complaint, ComplaintStatus, Customer } from '@/models/types';
import { getConnectionTypeLabel } from '@/lib/providerUtils';

interface ComplaintModalProps {
  isOpen: boolean;
  onClose: () => void;
  complaint?: Complaint | null;
  customers: Customer[];
}

const ComplaintModal = ({ isOpen, onClose, complaint, customers }: ComplaintModalProps) => {
  const { addComplaint, updateComplaint } = useStore();
  const [formData, setFormData] = useState({
    customerId: '',
    customerDescription: '',
    internalDescription: '',
    status: 'active' as ComplaintStatus,
  });
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    if (complaint) {
      setFormData({
        customerId: complaint.customerId.toString(),
        customerDescription: complaint.customerDescription,
        internalDescription: complaint.internalDescription || '',
        status: complaint.status,
      });
      const customer = customers.find((c) => c.id === complaint.customerId);
      setSelectedCustomer(customer || null);
    } else {
      setFormData({
        customerId: '',
        customerDescription: '',
        internalDescription: '',
        status: 'active',
      });
      setSelectedCustomer(null);
    }
  }, [complaint, customers, isOpen]);

  const handleCustomerChange = (customerId: string) => {
    const customer = customers.find((c) => c.id === parseInt(customerId));
    setSelectedCustomer(customer || null);
    setFormData({ ...formData, customerId });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCustomer) {
      alert('Please select a customer');
      return;
    }

    if (complaint) {
      // Update existing complaint - only update internalDescription and status
      await updateComplaint(complaint.id, {
        internalDescription: formData.internalDescription,
        status: formData.status,
      });
    } else {
      // Create new complaint
      await addComplaint({
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        mobile: selectedCustomer.mobile,
        connectionType: selectedCustomer.connectionType,
        customerDescription: formData.customerDescription,
        internalDescription: formData.internalDescription,
        status: formData.status,
      });
    }
    onClose();
  };

  if (!isOpen) return null;

  const statuses: ComplaintStatus[] = ['active', 'on-hold', 'completed'];

  const getStatusLabel = (status: ComplaintStatus) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'on-hold':
        return 'On Hold';
      case 'completed':
        return 'Completed';
      default:
        return status;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-2xl h-[95vh] sm:h-auto sm:max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Compact Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-lg font-semibold">
            {complaint ? 'Edit Complaint' : 'Add New Complaint'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-accent rounded-md transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 pb-20 sm:pb-6">
          <div className="space-y-4">
            {/* Customer Selection (Add mode only) */}
            {!complaint && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Customer <span className="text-destructive">*</span>
                </label>
                <Select
                  value={formData.customerId}
                  onChange={(e) => handleCustomerChange(e.target.value)}
                  required
                >
                  <option value="">Select a customer</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} - {customer.mobile}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            {/* Customer Information Card (Single block for both Add and Edit) */}
            {(selectedCustomer || complaint) && (
              <div className="bg-muted p-4 rounded-md space-y-2 border border-border">
                <p className="text-sm">
                  <span className="font-medium">Customer:</span>{' '}
                  {complaint ? complaint.customerName : selectedCustomer?.name}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Mobile:</span>{' '}
                  {complaint ? complaint.mobile : selectedCustomer?.mobile}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Connection Type:</span>{' '}
                  {getConnectionTypeLabel(
                    complaint ? complaint.connectionType : (selectedCustomer?.connectionType || 'GTPL')
                  )}
                </p>
              </div>
            )}

            {/* Customer Complaint Description - Read-only in Edit mode, Editable in Add mode */}
            {complaint ? (
              <div>
                <label className="block text-sm font-medium mb-2">Customer Complaint</label>
                <div className="w-full px-3 py-2 border border-border rounded-md bg-muted text-foreground resize-none min-h-[100px] flex items-start pt-3">
                  <p className="text-sm whitespace-pre-wrap">{complaint.customerDescription}</p>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Customer Complaint <span className="text-destructive">*</span>
                </label>
                <textarea
                  value={formData.customerDescription}
                  onChange={(e) => setFormData({ ...formData, customerDescription: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                  rows={4}
                  placeholder="Enter customer complaint description..."
                  required
                />
              </div>
            )}

            {/* Internal Notes / Resolution - Always editable */}
            <div>
              <label className="block text-sm font-medium mb-2">Our Notes / Resolution</label>
              <textarea
                value={formData.internalDescription}
                onChange={(e) => setFormData({ ...formData, internalDescription: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                rows={4}
                placeholder="Enter internal notes, resolution steps, or updates..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <Select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as ComplaintStatus })}
              >
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {getStatusLabel(status)}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          </div>

          {/* Fixed Footer — buttons aligned right: Cancel (secondary) left, Save (primary) right */}
          <div className="shrink-0 flex flex-col sm:flex-row justify-end gap-2 px-4 sm:px-6 py-4 border-t border-border bg-card sticky bottom-0">
            <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" className="w-full sm:w-auto">{complaint ? 'Update' : 'Create'} Complaint</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ComplaintModal;
