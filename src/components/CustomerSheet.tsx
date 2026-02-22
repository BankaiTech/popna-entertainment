// SaaS Ready — Customer Edit/Add Sheet (payment collection is a separate modal)
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useStore } from '@/store/useStore';
import Button from './ui/Button';
import Input from './ui/Input';
import Select from './ui/Select';
import type { Customer, Provider, CustomerStatus } from '@/models/types';
import { getConnectionTypeLabel, isCableProvider } from '@/lib/providerUtils';

interface CustomerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  customer?: Customer | null;
  onSave: (customer: Omit<Customer, 'id' | 'createdAt'> | Partial<Customer>) => void;
}

const CustomerSheet = ({ isOpen, onClose, customer, onSave }: CustomerSheetProps) => {
  const { t } = useTranslation();
  const { role } = useAuthStore();
  const { products, fetchActiveProducts } = useStore();

  // Fetch products when component mounts
  useEffect(() => {
    fetchActiveProducts();
  }, [fetchActiveProducts]);

  // Employees can only view customer details (read-only), cannot add or edit. Payment update is allowed for both Admin and Employee.
  const isReadOnly = role === 'employee';
  const [activeTab, setActiveTab] = useState<'info' | 'address'>('info');

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
    boxNumber: '',
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
        boxNumber: customer.boxNumber || '',
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
        boxNumber: '',
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
        alert(t('customers.noPermissionEdit', 'You do not have permission to edit customer details.'));
      } else {
        alert(t('customers.noPermissionAdd', 'You do not have permission to add customers.'));
      }
      return;
    }

    if (formData.gstin && formData.gstin.trim() !== '') {
      const gstinValue = formData.gstin.trim().toUpperCase();
      if (gstinValue.length !== 15) {
        alert(t('customerSheet.gstinLengthError', 'GSTIN must be exactly 15 characters'));
        return;
      }
      if (!/^[A-Z0-9]{15}$/.test(gstinValue)) {
        alert(t('customerSheet.gstinAlphanumericError', 'GSTIN must contain only alphanumeric characters'));
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

  useEffect(() => {
    if (isOpen && isReadOnly && !customer) {
      alert(t('customers.noPermissionAdd', 'You do not have permission to add customers.'));
      onClose();
    }
  }, [isOpen, isReadOnly, customer, onClose, t]);

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
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'info'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            {t('customerSheet.information', 'Information')}
          </button>
          <button
            onClick={() => setActiveTab('address')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'address'
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
                      {t('customerSheet.name', 'Name')} <span className="text-destructive">*</span>
                    </label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      disabled={isReadOnly}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">{t('customerSheet.email', 'Email')}</label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      disabled={isReadOnly}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">{t('customerSheet.mobile', 'Mobile')}</label>
                    <Input
                      value={formData.mobile}
                      onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                      disabled={isReadOnly}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      {t('customerSheet.gstin', 'GSTIN')} <span className="text-xs text-muted-foreground font-normal">({t('common.optional', 'Optional')})</span>
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
                      placeholder={t('customerSheet.gstinPlaceholder', '15-character GSTIN')}
                      maxLength={15}
                      disabled={isReadOnly}
                      className="uppercase"
                    />
                    {/* GSTIN hint removed */}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">{t('customerSheet.connectionType', 'Connection Type')}</label>
                    <Select
                      value={formData.connectionType}
                      onChange={(e) => setFormData({ ...formData, connectionType: e.target.value as Provider })}
                      disabled={isReadOnly}
                    >
                      {availableProviders.length === 0 ? (
                        <option value="">{t('customerSheet.noProducts', 'No products — add in Settings → Products')}</option>
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
                    <label className="block text-sm font-medium mb-2">{t('customerSheet.package', 'Package')}</label>
                    <Input
                      value={formData.package}
                      onChange={(e) => setFormData({ ...formData, package: e.target.value })}
                      disabled={isReadOnly}
                    />
                  </div>
                  {/* Box Number — only for cable product customers */}
                  {isCableProvider(formData.connectionType, products) && (
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        {t('customerSheet.boxNumber', 'Box Number')} <span className="text-xs text-muted-foreground font-normal">({t('common.optional', 'Optional')})</span>
                      </label>
                      <Input
                        value={formData.boxNumber}
                        onChange={(e) => setFormData({ ...formData, boxNumber: e.target.value })}
                        placeholder={t('customerSheet.boxNumberPlaceholder', 'Enter box number')}
                        disabled={isReadOnly}
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium mb-2">{t('customerSheet.status', 'Status')}</label>
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
                    <label className="block text-sm font-medium mb-2">{t('customerSheet.description', 'Description')}</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none disabled:bg-muted disabled:cursor-not-allowed"
                      rows={4}
                      placeholder={t('customerSheet.descriptionPlaceholder', 'Enter customer description...')}
                      disabled={isReadOnly}
                    />
                  </div>
                </div>

              </>
            )}

            {activeTab === 'address' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">{t('customerSheet.addressLine1', 'Address Line 1')}</label>
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
                  <label className="block text-sm font-medium mb-2">{t('customerSheet.addressLine2', 'Address Line 2')}</label>
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
                  <label className="block text-sm font-medium mb-2">{t('customerSheet.city', 'City')}</label>
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
                  <label className="block text-sm font-medium mb-2">{t('customerSheet.state', 'State')}</label>
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
                    {t('customerSheet.gstin', 'GSTIN')} <span className="text-xs text-muted-foreground">({t('common.optional', 'Optional')})</span>
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
                    placeholder={t('customerSheet.gstinPlaceholder', '15-character GSTIN')}
                    maxLength={15}
                    disabled={isReadOnly}
                    className="uppercase"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {formData.gstin && formData.gstin.length !== 15
                      ? t('customerSheet.gstinLengthError', 'GSTIN must be 15 characters')
                      : t('customerSheet.gstinHint', 'Optional GSTIN field for GST invoice support')}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">{t('customerSheet.country', 'Country')}</label>
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

    </div>
  );
};

export default CustomerSheet;
