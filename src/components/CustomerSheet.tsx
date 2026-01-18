import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import Button from './ui/Button';
import Input from './ui/Input';
import Select from './ui/Select';
import type { Customer, Provider, CustomerStatus } from '@/models/types';
import { getConnectionTypeLabel } from '@/lib/providerUtils';

interface CustomerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  customer?: Customer | null;
  onSave: (customer: Omit<Customer, 'id' | 'createdAt'> | Partial<Customer>) => void;
}

const CustomerSheet = ({ isOpen, onClose, customer, onSave }: CustomerSheetProps) => {
  const { role } = useAuthStore();
  // Employees can only view customer details (read-only), cannot add or edit
  const isReadOnly = role === 'employee';
  const [activeTab, setActiveTab] = useState<'info' | 'address'>('info');
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

        {/* Scrollable Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 pb-20 sm:pb-6">
          {activeTab === 'info' && (
            <div className="space-y-4">
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
              <div>
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
          )}

          {activeTab === 'address' && (
            <div className="space-y-4">
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

          {/* Fixed Footer */}
          <div className="flex flex-col sm:flex-row justify-end gap-2 px-4 sm:px-6 py-4 border-t border-border bg-card sticky bottom-0">
            <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
              {isReadOnly ? 'Close' : 'Cancel'}
            </Button>
            {!isReadOnly && (
              <Button type="submit" className="w-full sm:w-auto">{customer ? 'Update' : 'Create'} Customer</Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomerSheet;
