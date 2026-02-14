import { useState, useEffect } from 'react';
import Button from './ui/Button';
import Input from './ui/Input';
import Select from './ui/Select';
import type { Plan, Provider } from '@/models/types';
import { MOCK_ORGANIZATION_ID } from '@/models/types';
import { getProviderDisplayName } from '@/lib/providerUtils';

interface PlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (plan: Omit<Plan, 'id'>) => Promise<void>;
  onUpdate?: (id: number, plan: Omit<Plan, 'id'>) => Promise<void>;
  editingPlan?: Plan | null;
  providers: Provider[];
}

const PlanModal = ({ isOpen, onClose, onSave, onUpdate, editingPlan, providers }: PlanModalProps) => {
  const [formData, setFormData] = useState<Omit<Plan, 'id'>>({
    organizationId: MOCK_ORGANIZATION_ID,
    provider: providers[0] ?? '',
    planName: '',
    imageUrl: '',
    price: 0,
    gstRate: 18,
    installationAmount: 0,
    description: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingPlan) {
      setFormData({
        organizationId: editingPlan.organizationId,
        provider: editingPlan.provider,
        planName: editingPlan.planName,
        imageUrl: editingPlan.imageUrl,
        price: editingPlan.price,
        gstRate: editingPlan.gstRate,
        installationAmount: editingPlan.installationAmount,
        description: editingPlan.description,
      });
    } else {
      setFormData({
        organizationId: MOCK_ORGANIZATION_ID,
        provider: providers[0] ?? '',
        planName: '',
        imageUrl: '',
        price: 0,
        gstRate: 18,
        installationAmount: 0,
        description: '',
      });
    }
    setError('');
  }, [editingPlan, providers, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.planName.trim()) {
      setError('Plan name is required');
      return;
    }
    if (!formData.imageUrl.trim()) {
      setError('Image URL is required');
      return;
    }
    if (formData.price <= 0) {
      setError('Price must be greater than 0');
      return;
    }
    if (!formData.description.trim()) {
      setError('Description is required');
      return;
    }

    setSaving(true);
    try {
      if (editingPlan && onUpdate) {
        await onUpdate(editingPlan.id, formData);
      } else {
        await onSave(formData);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save plan');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50">
      <div
        className="w-full sm:max-w-2xl bg-card rounded-t-modal sm:rounded-modal shadow-soft-xl flex flex-col max-h-[90vh] sm:max-h-[85vh] border border-border"
        role="dialog"
        aria-labelledby="plan-modal-title"
        aria-modal="true"
      >
        <div className="shrink-0 px-4 sm:px-6 py-4 border-b border-border">
          <h2 id="plan-modal-title" className="text-lg font-semibold">
            {editingPlan ? 'Edit Plan' : 'Add New Plan'}
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Product <span className="text-destructive">*</span>
                </label>
                <Select
                  value={formData.provider}
                  onChange={(e) => setFormData({ ...formData, provider: e.target.value as Provider })}
                  required
                  disabled={saving}
                >
                  {providers.map((provider) => (
                    <option key={provider} value={provider}>
                      {getProviderDisplayName(provider)}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Plan Name <span className="text-destructive">*</span>
                </label>
                <Input
                  value={formData.planName}
                  onChange={(e) => setFormData({ ...formData, planName: e.target.value })}
                  placeholder="e.g., Basic 50 Mbps"
                  required
                  disabled={saving}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">
                  Image URL <span className="text-destructive">*</span>
                </label>
                <Input
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                  required
                  disabled={saving}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Price (₹) <span className="text-destructive">*</span>
                </label>
                <Input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                  placeholder="499"
                  required
                  min="0"
                  step="0.01"
                  disabled={saving}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  GST Rate (%) <span className="text-destructive">*</span>
                </label>
                <Input
                  type="number"
                  value={formData.gstRate}
                  onChange={(e) => setFormData({ ...formData, gstRate: Number(e.target.value) })}
                  placeholder="18"
                  required
                  min="0"
                  max="100"
                  step="0.01"
                  disabled={saving}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Installation Charge (₹) <span className="text-destructive">*</span>
                </label>
                <Input
                  type="number"
                  value={formData.installationAmount}
                  onChange={(e) => setFormData({ ...formData, installationAmount: Number(e.target.value) })}
                  placeholder="500"
                  required
                  min="0"
                  step="0.01"
                  disabled={saving}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">
                  Description <span className="text-destructive">*</span>
                </label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the plan features..."
                  required
                  disabled={saving}
                />
              </div>
            </div>
            {error && (
              <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
                {error}
              </div>
            )}
          </div>
          <div className="shrink-0 flex flex-col sm:flex-row justify-end gap-2 px-4 sm:px-6 py-4 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto" disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" className="w-full sm:w-auto" disabled={saving}>
              {saving ? 'Saving...' : editingPlan ? 'Update Plan' : 'Create Plan'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PlanModal;
