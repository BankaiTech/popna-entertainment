import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Button from './ui/Button';
import Input from './ui/Input';
import Select from './ui/Select';
import type { Product } from '@/models/types';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: Omit<Product, 'id' | 'createdAt' | 'organizationId'>) => Promise<void>;
  onUpdate?: (id: number, product: Omit<Product, 'id' | 'createdAt' | 'organizationId'>) => Promise<void>;
  editingProduct?: Product | null;
}

const ProductModal = ({ isOpen, onClose, onSave, onUpdate, editingProduct }: ProductModalProps) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<Omit<Product, 'id' | 'createdAt' | 'organizationId'>>({
    name: '',
    productType: 'internet',
    isActive: true,
    cutoffDate: undefined,
    cutoffDays: undefined,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingProduct) {
      setFormData({
        name: editingProduct.name,
        productType: editingProduct.productType,
        isActive: editingProduct.isActive,
        cutoffDate: editingProduct.cutoffDate,
        cutoffDays: editingProduct.cutoffDays,
      });
    } else {
      setFormData({
        name: '',
        productType: 'internet',
        isActive: true,
        cutoffDate: undefined,
        cutoffDays: undefined,
      });
    }
    setError('');
  }, [editingProduct, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError(t('productManagement.nameRequired', 'Product name is required'));
      return;
    }

    setSaving(true);
    try {
      if (editingProduct && onUpdate) {
        await onUpdate(editingProduct.id, formData);
      } else {
        await onSave(formData);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('productManagement.saveFailed', 'Failed to save product'));
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50">
      <div
        className="w-full sm:max-w-lg bg-card rounded-t-modal sm:rounded-modal shadow-soft-xl flex flex-col max-h-[90vh] sm:max-h-[85vh] border border-border"
        role="dialog"
        aria-labelledby="product-modal-title"
        aria-modal="true"
      >
        <div className="shrink-0 px-4 sm:px-6 py-4 border-b border-border">
          <h2 id="product-modal-title" className="text-lg font-semibold">
            {editingProduct ? t('productManagement.editProduct', 'Edit Product') : t('productManagement.addNewProduct', 'Add New Product')}
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">
                {t('productManagement.productName', 'Product Name')} <span className="text-destructive">*</span>
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('productManagement.productNamePlaceholder', 'e.g., Cable, Internet 1')}
                required
                disabled={saving}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">
                {t('productManagement.productType', 'Product Type')} <span className="text-destructive">*</span>
              </label>
              <Select
                value={formData.productType}
                onChange={(e) => setFormData({ ...formData, productType: e.target.value as 'cable' | 'internet' })}
                required
                disabled={saving}
              >
                <option value="cable">{t('productManagement.cable', 'Cable')}</option>
                <option value="internet">{t('productManagement.internet', 'Internet')}</option>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {t('productManagement.productTypeHint', 'Categorize your product type. Payment applies to all products.')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 rounded border-border"
                disabled={saving}
              />
              <label htmlFor="isActive" className="text-sm font-medium text-foreground">
                {t('productManagement.activeLabel', 'Active (visible in front site)')}
              </label>
            </div>
            {formData.productType === 'cable' && (
              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">
                  {t('productManagement.cutoffDate', 'Cut-off Date (Day of Month)')}
                </label>
                <Select
                  value={formData.cutoffDate?.toString() || ''}
                  onChange={(e) => setFormData({ ...formData, cutoffDate: e.target.value ? Number(e.target.value) : undefined })}
                  disabled={saving}
                >
                  <option value="">{t('productManagement.selectCutoffDate', 'Select cut-off date')}</option>
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                    <option key={day} value={day}>{day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'} of every month</option>
                  ))}
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('productManagement.cutoffDateHint', 'Payment cut-off date for cable customers')}
                </p>
              </div>
            )}
            {formData.productType === 'internet' && (
              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">
                  {t('productManagement.cutoffDays', 'Cut-off Days (After Due Date)')}
                </label>
                <Input
                  type="number"
                  min="1"
                  max="30"
                  value={formData.cutoffDays || ''}
                  onChange={(e) => setFormData({ ...formData, cutoffDays: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder={t('productManagement.cutoffDaysPlaceholder', 'e.g., 5')}
                  disabled={saving}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t('productManagement.cutoffDaysHint', 'Number of days after due date for internet service cut-off')}
                </p>
              </div>
            )}
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
                {error}
              </div>
            )}
          </div>
          <div className="shrink-0 flex flex-col sm:flex-row justify-end gap-2 px-4 sm:px-6 py-4 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto" disabled={saving}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button type="submit" className="w-full sm:w-auto" disabled={saving}>
              {saving ? t('common.saving', 'Saving...') : editingProduct ? t('productManagement.updateProduct', 'Update Product') : t('productManagement.createProduct', 'Create Product')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductModal;
