import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { X } from 'lucide-react';
import type { Vendor } from '@/models/types';
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
      setError('Vendor name is required');
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
      setError(err instanceof Error ? err.message : 'Failed to save vendor');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
      <div className="bg-card rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-border">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-xl font-bold text-foreground">
            {editingVendor ? 'Edit Vendor' : 'Add Vendor'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Vendor Name <span className="text-destructive">*</span></label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Vendor name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Contact</label>
              <Input
                value={form.contact}
                onChange={(e) => setForm({ ...form, contact: e.target.value })}
                placeholder="Phone / mobile"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">GSTIN</label>
            <Input
              value={form.gstin}
              onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })}
              placeholder="15-character GSTIN (optional)"
              maxLength={15}
            />
          </div>

          <div className="border-t border-border pt-4 mt-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Address (optional)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Address Line 1</label>
                <Input
                  value={form.addressLine1}
                  onChange={(e) => setForm({ ...form, addressLine1: e.target.value })}
                  placeholder="Street, building"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Address Line 2</label>
                <Input
                  value={form.addressLine2}
                  onChange={(e) => setForm({ ...form, addressLine2: e.target.value })}
                  placeholder="Area, landmark"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">City</label>
                <Input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="City"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">State</label>
                <Input
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                  placeholder="State"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Country</label>
                <Input
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                  placeholder="Country"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Pincode</label>
                <Input
                  value={form.pincode}
                  onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                  placeholder="Pincode"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
              {error}
            </div>
          )}
        </form>

        <div className="flex justify-end gap-3 p-4 border-t border-border bg-muted/30">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving...' : editingVendor ? 'Update Vendor' : 'Add Vendor'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VendorFormModal;
