import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import type { Vendor } from '@/models/types';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/Dialog';
import { MOCK_ORGANIZATION_ID } from '@/models/types';
import { vendorsApi } from '@/api/purchaseInvoices';

interface VendorFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (vendor: Vendor) => void;
  editingVendor?: Vendor | null;
}

const emptyForm = {
  name: '',
  contact: '',
  gstin: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  country: 'India',
  pincode: '',
};

const VendorFormModal = ({ isOpen, onClose, onSuccess, editingVendor }: VendorFormModalProps) => {
  const { t } = useTranslation();
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (editingVendor) {
      setForm({
        name: editingVendor.name ?? '',
        contact: editingVendor.contact ?? '',
        gstin: editingVendor.gstin ?? '',
        addressLine1: editingVendor.addressLine1 ?? '',
        addressLine2: editingVendor.addressLine2 ?? '',
        city: editingVendor.city ?? '',
        state: editingVendor.state ?? '',
        country: editingVendor.country ?? 'India',
        pincode: editingVendor.pincode ?? '',
      });
    } else {
      setForm(emptyForm);
    }
    setError('');
  }, [isOpen, editingVendor]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) {
      setError(t('vendorFormModal.nameRequired', 'Vendor name is required'));
      return;
    }
    setSaving(true);
    try {
      if (editingVendor) {
        const updated = await vendorsApi.update(editingVendor.id, {
          name: form.name.trim(),
          contact: form.contact.trim() || undefined,
          gstin: form.gstin.trim() || undefined,
          addressLine1: form.addressLine1.trim() || undefined,
          addressLine2: form.addressLine2.trim() || undefined,
          city: form.city.trim() || undefined,
          state: form.state.trim() || undefined,
          country: form.country.trim() || undefined,
          pincode: form.pincode.trim() || undefined,
        });
        if (updated) {
          onSuccess(updated);
          onClose();
        }
      } else {
        const created = await vendorsApi.create({
          organizationId: MOCK_ORGANIZATION_ID,
          name: form.name.trim(),
          contact: form.contact.trim() || undefined,
          gstin: form.gstin.trim() || undefined,
          addressLine1: form.addressLine1.trim() || undefined,
          addressLine2: form.addressLine2.trim() || undefined,
          city: form.city.trim() || undefined,
          state: form.state.trim() || undefined,
          country: form.country.trim() || undefined,
          pincode: form.pincode.trim() || undefined,
        });
        onSuccess(created);
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('vendorFormModal.saveFailed', 'Failed to save vendor'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} size="lg">
      <DialogHeader
        title={editingVendor ? t('vendorFormModal.editTitle', 'Edit Vendor') : t('vendorFormModal.addTitle', 'Add Vendor')}
        onClose={onClose}
      />
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
        <DialogBody>
          <div className="p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">{t('vendorFormModal.vendorName', 'Vendor Name')} <span className="text-destructive">*</span></label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={t('vendorFormModal.vendorNamePlaceholder', 'Vendor name')}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('vendorFormModal.contact', 'Contact')}</label>
              <Input
                value={form.contact}
                onChange={(e) => setForm({ ...form, contact: e.target.value })}
                placeholder={t('vendorFormModal.contactPlaceholder', 'Phone / mobile')}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t('vendorFormModal.gstin', 'GSTIN')}</label>
            <Input
              value={form.gstin}
              onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })}
              placeholder={t('vendorFormModal.gstinPlaceholder', '15-character GSTIN (optional)')}
              maxLength={15}
            />
          </div>

          <div className="border-t border-border pt-4 mt-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">{t('vendorFormModal.addressSection', 'Address (optional)')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">{t('vendorFormModal.addressLine1', 'Address Line 1')}</label>
                <Input
                  value={form.addressLine1}
                  onChange={(e) => setForm({ ...form, addressLine1: e.target.value })}
                  placeholder={t('vendorFormModal.addressLine1Placeholder', 'Street, building')}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">{t('vendorFormModal.addressLine2', 'Address Line 2')}</label>
                <Input
                  value={form.addressLine2}
                  onChange={(e) => setForm({ ...form, addressLine2: e.target.value })}
                  placeholder={t('vendorFormModal.addressLine2Placeholder', 'Area, landmark')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('vendorFormModal.city', 'City')}</label>
                <Input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder={t('vendorFormModal.city', 'City')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('vendorFormModal.state', 'State')}</label>
                <Input
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                  placeholder={t('vendorFormModal.state', 'State')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('vendorFormModal.country', 'Country')}</label>
                <Input
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                  placeholder={t('vendorFormModal.country', 'Country')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('vendorFormModal.pincode', 'Pincode')}</label>
                <Input
                  value={form.pincode}
                  onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                  placeholder={t('vendorFormModal.pincode', 'Pincode')}
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
              {error}
            </div>
          )}
          </div>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? t('vendorFormModal.saving', 'Saving...') : editingVendor ? t('vendorFormModal.updateVendor', 'Update Vendor') : t('vendorFormModal.addVendor', 'Add Vendor')}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
};

export default VendorFormModal;
