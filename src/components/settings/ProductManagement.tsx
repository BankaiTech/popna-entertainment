/**
 * ProductManagement — multi-industry settings panel.
 *
 * ISP / General mode  (industry = 'isp-cable' | 'general' | undefined)
 *   • Manages ISP service connection types (Cable TV, Fiber Internet)
 *   • Each product has a billing cutoff (day of month for cable, days after due for internet)
 *   • Plans (pricing) are a separate concept — configured in Settings → Billing tab
 *
 * Generic mode  (all other industries)
 *   • Manages service / product categories used in invoices and inventory
 *   • Industry-specific type labels (e.g., "Food Item" for restaurant, "Spare Part" for auto)
 *   • No ISP billing fields shown
 */
import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '@/store/useStore';
import { Card, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import {
  Plus, Edit2, Trash2, CheckCircle2, XCircle,
  Lock, Lightbulb, Info, Wifi, Tag, ToggleLeft, ToggleRight,
} from 'lucide-react';
import type { Product, ProductType } from '@/models/types';
import { MOCK_ORGANIZATION_ID } from '@/models/types';
import { cn } from '@/lib/utils';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/Dialog';
import UpiPaymentModal from '@/components/UpiPaymentModal';
import { PLATFORM_UPI, hasPlatformUpi } from '@/config/platformUpi';
import { showError, showInfo } from '@/utils/toast';
import { useOrganizationStore } from '@/store/useOrganizationStore';
import { getTemplateById } from '@/config/industryTemplates';
import type { IndustryType } from '@/models/types';

// ── Helpers ──────────────────────────────────────────────────────────────────
function getCutoffSuffix(t: any, day: number): string {
  const j = day % 10;
  const k = day % 100;
  let suffix = 'th';
  if (j === 1 && k !== 11) suffix = 'st';
  else if (j === 2 && k !== 12) suffix = 'nd';
  else if (j === 3 && k !== 13) suffix = 'rd';
  
  return t(`productManagement.cutoffDaySuffix_${suffix}`, suffix);
}

// ── Constants ────────────────────────────────────────────────────────────────
const FREE_PRODUCT_LIMIT = 4;
const ADDITIONAL_PRODUCT_COST = 200;

// ── Industry config helpers ──────────────────────────────────────────────────

/** Returns true when the industry needs ISP-specific product fields */
function isIspIndustry(industryType?: IndustryType | null): boolean {
  return !industryType || industryType === 'isp-cable' || industryType === 'general';
}

/** Industry-specific type options for non-ISP industries */
function getTypeOptions(
  t: (key: string, fallback: string) => string,
  industryType?: IndustryType | null
): { value: ProductType; label: string }[] {
  switch (industryType) {
    case 'restaurant-cafe':
      return [
        { value: 'food', label: t('productType.foodItem', 'Food Item') },
        { value: 'service', label: t('productType.beverage', 'Beverage') },
        { value: 'general', label: t('productType.other', 'Other') },
      ];
    case 'salon-spa':
      return [
        { value: 'service', label: t('productType.serviceTreatment', 'Service / Treatment') },
        { value: 'physical', label: t('productType.retailProduct', 'Retail Product') },
      ];
    case 'gym-fitness':
      return [
        { value: 'service', label: t('productType.membershipSession', 'Membership / Session') },
        { value: 'physical', label: t('productType.supplementMerchandise', 'Supplement / Merchandise') },
      ];
    case 'healthcare-pharmacy':
      return [
        { value: 'physical', label: t('productType.medicineDrug', 'Medicine / Drug') },
        { value: 'service', label: t('productType.medicalService', 'Medical Service') },
        { value: 'general', label: t('productType.supplementDevice', 'Supplement / Device') },
      ];
    case 'automotive':
      return [
        { value: 'physical', label: t('productType.sparePart', 'Spare Part') },
        { value: 'service', label: t('productType.serviceLabour', 'Service / Labour') },
        { value: 'general', label: t('productType.consumableAccessory', 'Consumable / Accessory') },
      ];
    case 'electronics':
      return [
        { value: 'physical', label: t('productType.product', 'Product') },
        { value: 'service', label: t('productType.repairService', 'Repair / Service') },
        { value: 'general', label: t('productType.accessory', 'Accessory') },
      ];
    case 'education':
      return [
        { value: 'service', label: t('productType.courseSubject', 'Course / Subject') },
        { value: 'physical', label: t('productType.bookMaterial', 'Book / Material') },
      ];
    case 'real-estate':
      return [
        { value: 'service', label: t('productType.propertyType', 'Property Type') },
        { value: 'general', label: t('productType.otherService', 'Other Service') },
      ];
    case 'wholesale':
    case 'retail':
    case 'grocery':
    case 'clothing-fashion':
    default:
      return [
        { value: 'physical', label: t('productType.physicalProduct', 'Physical Product') },
        { value: 'service', label: t('productType.service', 'Service') },
        { value: 'general', label: t('productType.other', 'Other') },
      ];
  }
}

/** Industry-specific page title */
function getPageTitle(t: (key: string, fallback: string) => string, industryType?: IndustryType | null): string {
  if (isIspIndustry(industryType)) return t('productManagement.ispTitle', 'Service Connection Types');
  switch (industryType) {
    case 'restaurant-cafe': return t('productManagement.menuCategories', 'Menu Categories');
    case 'salon-spa': return t('productManagement.serviceCategories', 'Service & Product Categories');
    case 'gym-fitness': return t('productManagement.gymCategories', 'Membership & Product Categories');
    case 'healthcare-pharmacy': return t('productManagement.healthcareCategories', 'Medicine & Service Categories');
    case 'automotive': return t('productManagement.automotiveCategories', 'Parts & Service Categories');
    case 'education': return t('productManagement.educationCategories', 'Course & Material Categories');
    default: return t('productManagement.categoryTitle', 'Product / Service Categories');
  }
}

/** Industry-specific page description */
function getPageDescription(t: (key: string, fallback: string) => string, industryType?: IndustryType | null): string {
  if (isIspIndustry(industryType)) {
    return t('productManagement.ispDesc', 'Define your service connection types (Cable TV, Fiber Internet). Each type has its own billing cutoff schedule. Pricing plans are set separately in the Billing tab.');
  }
  return t('productManagement.genericDesc', 'Define the categories used to organise your products and services in invoices, POS, and inventory.');
}

/** Badge color per product type */
function getTypeBadgeClass(productType: ProductType): string {
  switch (productType) {
    case 'cable': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
    case 'internet': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
    case 'food': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
    case 'service': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
    case 'physical': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
    case 'digital': return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300';
    default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
  }
}

// ── Add/Edit Modal ───────────────────────────────────────────────────────────
interface ProductFormData {
  name: string;
  productType: ProductType;
  isActive: boolean;
  description: string;
  cutoffDate?: number;
  cutoffDays?: number;
}

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ProductFormData) => Promise<void>;
  editing: Product | null;
  industryType?: IndustryType | null;
}

const ProductFormModal = ({ isOpen, onClose, onSubmit, editing, industryType }: ProductFormModalProps) => {
  const { t } = useTranslation();
  const isIsp = isIspIndustry(industryType);
  const typeOptions = getTypeOptions(t, industryType);

  const defaultType: ProductType = isIsp ? 'internet' : (typeOptions[0]?.value ?? 'general');

  const [form, setForm] = useState<ProductFormData>({
    name: '',
    productType: defaultType,
    isActive: true,
    description: '',
    cutoffDate: undefined,
    cutoffDays: undefined,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (editing) {
      setForm({
        name: editing.name,
        productType: editing.productType,
        isActive: editing.isActive,
        description: editing.description ?? '',
        cutoffDate: editing.cutoffDate,
        cutoffDays: editing.cutoffDays,
      });
    } else {
      setForm({ name: '', productType: defaultType, isActive: true, description: '', cutoffDate: undefined, cutoffDays: undefined });
    }
    setError('');
  }, [isOpen, editing]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError(t('productManagement.nameRequired', 'Name is required')); return; }
    setSaving(true);
    try {
      await onSubmit(form);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('productManagement.saveFailed', 'Failed to save'));
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onClose={onClose} size="lg" closeOnOverlayClick={!saving}>
      <DialogHeader
        title={editing
          ? t('productManagement.editItem', 'Edit {{name}}', { name: editing.name })
          : t('productManagement.addNew', 'Add New Category')}
        onClose={onClose}
      />
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
        <DialogBody className="p-4 sm:p-5 space-y-4">

          {/* ISP info banner */}
          {isIsp && (
            <div className="flex gap-2.5 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <Wifi className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                <p className="font-semibold">{t('productManagement.ispProductNote', 'Service Connection Type')}</p>
                <p>{t('productManagement.ispProductNoteDesc', 'This defines one connection category (e.g., Cable TV or Fiber Internet). Pricing plans for this type are configured separately in Settings → Billing tab.')}</p>
              </div>
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-1.5 text-foreground">
              {isIsp
                ? t('productManagement.connectionTypeName', 'Connection Type Name')
                : t('productManagement.categoryName', 'Category Name')}
              <span className="text-destructive ml-1">*</span>
            </label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={isIsp
                ? t('productManagement.ispNamePlaceholder', 'e.g., Cable TV, Fiber Internet, VDSL')
                : t('productManagement.genericNamePlaceholder', 'e.g., Hair Colour, Spare Part, Main Course')}
              required
              disabled={saving}
              autoFocus
            />
          </div>

          {/* Type */}
          {isIsp ? (
            <div>
              <label className="block text-sm font-medium mb-1.5 text-foreground">
                {t('productManagement.connectionCategory', 'Connection Category')}
                <span className="text-destructive ml-1">*</span>
              </label>
              <Select
                value={form.productType}
                onChange={(e) => setForm({ ...form, productType: e.target.value as ProductType, cutoffDate: undefined, cutoffDays: undefined })}
                disabled={saving}
              >
                <option value="cable">{t('productManagement.cable', 'Cable (Fixed monthly cutoff day)')}</option>
                <option value="internet">{t('productManagement.internet', 'Internet (Cutoff days after due date)')}</option>
              </Select>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium mb-1.5 text-foreground">
                {t('productManagement.categoryType', 'Category Type')}
              </label>
              <Select
                value={form.productType}
                onChange={(e) => setForm({ ...form, productType: e.target.value as ProductType })}
                disabled={saving}
              >
                {typeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {t('productManagement.categoryTypeHint', 'Used to filter and group items in reports and inventory')}
              </p>
            </div>
          )}

          {/* ISP: Cable cutoff date */}
          {isIsp && form.productType === 'cable' && (
            <div>
              <label className="block text-sm font-medium mb-1.5 text-foreground">
                {t('productManagement.cutoffDate', 'Monthly Cutoff Day')}
              </label>
              <Select
                value={form.cutoffDate?.toString() ?? ''}
                onChange={(e) => setForm({ ...form, cutoffDate: e.target.value ? Number(e.target.value) : undefined })}
                disabled={saving}
              >
                <option value="">{t('productManagement.selectCutoffDate', '— Select cutoff day —')}</option>
                {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                  <option key={day} value={day}>
                    {t('productManagement.cutoffDayOfMonth', '{{day}}{{suffix}} of every month', {
                      day,
                      suffix: getCutoffSuffix(t, day),
                    })}
                  </option>
                ))}
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {t('productManagement.cutoffDateHint', 'Subscriber\'s cable service renews on this day each month')}
              </p>
            </div>
          )}

          {/* ISP: Internet cutoff days */}
          {isIsp && form.productType === 'internet' && (
            <div>
              <label className="block text-sm font-medium mb-1.5 text-foreground">
                {t('productManagement.cutoffDays', 'Grace Period After Due Date (days)')}
              </label>
              <Input
                type="number"
                min="1"
                max="30"
                value={form.cutoffDays ?? ''}
                onChange={(e) => setForm({ ...form, cutoffDays: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="e.g., 5"
                disabled={saving}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t('productManagement.cutoffDaysHint', 'Internet service is suspended N days after the due date if unpaid')}
              </p>
            </div>
          )}

          {/* Description (non-ISP only) */}
          {!isIsp && (
            <div>
              <label className="block text-sm font-medium mb-1.5 text-foreground">
                {t('productManagement.description', 'Description')}
                <span className="text-muted-foreground text-xs ml-1">({t('common.optional', 'optional')})</span>
              </label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder={t('productManagement.descriptionPlaceholder', 'Short description of this category')}
                disabled={saving}
              />
            </div>
          )}

          {/* Active toggle */}
          <div className="flex items-center gap-3 py-1">
            <button
              type="button"
              onClick={() => setForm({ ...form, isActive: !form.isActive })}
              className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none shrink-0',
                form.isActive ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
              )}
              disabled={saving}
              aria-checked={form.isActive}
              role="switch"
            >
              <span className={cn('inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform', form.isActive ? 'translate-x-6' : 'translate-x-1')} />
            </button>
            <label className="text-sm font-medium text-foreground cursor-pointer" onClick={() => setForm({ ...form, isActive: !form.isActive })}>
              {form.isActive ? t('productManagement.active', 'Active') : t('productManagement.inactive', 'Inactive')}
              <span className="text-muted-foreground font-normal ml-1.5 text-xs">
                {form.isActive
                  ? t('productManagement.activeHint', '(visible in dropdowns and invoices)')
                  : t('productManagement.inactiveHint', '(hidden — existing records kept)')}
              </span>
            </label>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
              {error}
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button type="submit" disabled={saving}>
            {saving
              ? t('common.saving', 'Saving...')
              : editing
                ? t('common.saveChanges', 'Save Changes')
                : t('productManagement.addCategory', 'Add Category')}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
};

// ── Main Component ───────────────────────────────────────────────────────────
const ProductManagement = () => {
  const { t } = useTranslation();
  const { products, loading, fetchProducts, addProduct, updateProduct, deleteProduct } = useStore();
  const { currentOrganization } = useOrganizationStore();
  const industryType = currentOrganization?.industryType ?? null;
  const isIsp = isIspIndustry(industryType);

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showUpiModal, setShowUpiModal] = useState(false);

  const template = useMemo(
    () => industryType ? getTemplateById(industryType) : undefined,
    [industryType]
  );

  const suggestedCategories = useMemo(() => {
    if (!template) return [];
    const existingNames = new Set(products.map((p) => p.name.toLowerCase()));
    return template.defaultCategories.filter((cat) => !existingNames.has(cat.toLowerCase()));
  }, [template, products]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const typeOptions = getTypeOptions(t, industryType);

  // ── Label helpers ──────────────────────────────────────────────────────────
  const getTypeLabel = (productType: ProductType): string => {
    if (isIsp) return productType === 'cable' ? t('productManagement.cable', 'Cable') : t('productManagement.internet', 'Internet');
    const opt = typeOptions.find((o) => o.value === productType);
    return opt?.label ?? productType;
  };

  const getCutoffLabel = (product: Product): string | null => {
    if (!isIsp) return null;
    if (product.productType === 'cable' && product.cutoffDate) {
      const d = product.cutoffDate;
      const suffix = getCutoffSuffix(t, d);
      return t('productManagement.cutoffDayLabel', 'Cutoff: {{day}}{{suffix}} each month', { day: d, suffix });
    }
    if (product.productType === 'internet' && product.cutoffDays) {
      return t('productManagement.cutoffGraceLabel', 'Grace: {{days}} days after due', { days: product.cutoffDays });
    }
    return null;
  };

  // ── CRUD handlers ──────────────────────────────────────────────────────────
  const openAdd = () => {
    if (products.length >= FREE_PRODUCT_LIMIT) { setShowPaymentModal(true); return; }
    setEditingProduct(null);
    setShowModal(true);
  };

  const openEdit = (p: Product) => { setEditingProduct(p); setShowModal(true); };

  const handleSubmit = async (data: ProductFormData) => {
    if (editingProduct) {
      await updateProduct(editingProduct.id, data);
    } else {
      await addProduct({ ...data, organizationId: MOCK_ORGANIZATION_ID });
    }
    await fetchProducts();
  };

  const handleDelete = async (p: Product) => {
    const label = isIsp
      ? t('productManagement.confirmDeleteIsp', 'Delete "{{name}}"? This affects all subscribers using this connection type and their plans.', { name: p.name })
      : t('productManagement.confirmDeleteGeneric', 'Delete "{{name}}"? This category will be removed from dropdowns.', { name: p.name });
    if (confirm(label)) {
      await deleteProduct(p.id);
      await fetchProducts();
    }
  };

  const toggleActive = async (p: Product) => {
    await updateProduct(p.id, { isActive: !p.isActive });
    await fetchProducts();
  };

  const handleQuickAdd = async (name: string) => {
    if (products.length >= FREE_PRODUCT_LIMIT) { setShowPaymentModal(true); return; }
    const defaultType: ProductType = isIsp ? 'cable' : (typeOptions[0]?.value ?? 'general');
    await addProduct({ name, productType: defaultType, isActive: true, organizationId: MOCK_ORGANIZATION_ID });
    await fetchProducts();
  };

  const handlePayForAdditionalProducts = () => {
    setShowPaymentModal(false);
    if (hasPlatformUpi()) {
      setShowUpiModal(true);
    } else {
      showError(t('productManagement.platformUpiNotConfigured', 'Payment not configured. Contact support.'));
    }
  };

  const handlePaymentInitiated = () => {
    setShowUpiModal(false);
    showInfo(t('productManagement.paymentInitiated', 'Payment initiated! Share the UTR/screenshot with admin. Once verified, more categories will be unlocked.'));
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
            {isIsp ? <Wifi className="w-5 h-5 text-primary shrink-0" /> : <Tag className="w-5 h-5 text-primary shrink-0" />}
            {getPageTitle(t, industryType)}
          </h2>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            {getPageDescription(t, industryType)}
          </p>
          <p className="text-xs text-muted-foreground mt-1.5">
            {products.length}/{FREE_PRODUCT_LIMIT} {t('productManagement.freeUsed', 'free used')}
            {products.length < FREE_PRODUCT_LIMIT
              ? ` · ${FREE_PRODUCT_LIMIT - products.length} ${t('productManagement.remaining', 'remaining free')}`
              : ` · ${t('productManagement.additionalCost', '₹{{cost}} per additional', { cost: ADDITIONAL_PRODUCT_COST })}`}
          </p>
        </div>
        <Button onClick={openAdd} className="shrink-0 w-full sm:w-auto min-h-[44px] sm:min-h-0">
          <Plus className="w-4 h-4 mr-2" />
          {isIsp ? t('productManagement.addConnectionType', 'Add Connection Type') : t('productManagement.addCategory', 'Add Category')}
        </Button>
      </div>

      {/* ── Suggested categories ── */}
      {suggestedCategories.length > 0 && (
        <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 dark:bg-primary/10 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-4 h-4 text-primary shrink-0" />
            <p className="text-sm font-medium text-foreground">
              {t('productManagement.suggestedCategories', 'Suggested for your industry — tap to add')}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestedCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => handleQuickAdd(cat)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all min-h-[36px] bg-white dark:bg-gray-800 text-foreground border-border hover:border-primary hover:bg-primary/10 dark:hover:bg-primary/20"
              >
                <Plus className="w-3 h-3 shrink-0" />
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Product cards / empty state ── */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm animate-pulse">
          {t('productManagement.loading', 'Loading...')}
        </div>
      ) : products.length === 0 ? (
        <div className="py-14 text-center border-2 border-dashed border-border rounded-xl bg-muted/10">
          {isIsp ? <Wifi className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" /> : <Tag className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />}
          <p className="text-sm font-medium text-muted-foreground">{t('productManagement.emptyState', 'No categories yet')}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {isIsp
              ? t('productManagement.ispEmptyHint', 'Add your first service type (e.g., Cable TV, Fiber Internet)')
              : t('productManagement.genericEmptyHint', 'Use the suggestions above or add a custom category')}
          </p>
          <Button onClick={openAdd} className="mt-4" size="sm">
            <Plus className="w-4 h-4 mr-1.5" />
            {isIsp ? t('productManagement.addConnectionType', 'Add Connection Type') : t('productManagement.addCategory', 'Add Category')}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {products.map((product) => {
            const cutoffLabel = getCutoffLabel(product);
            return (
              <Card
                key={product.id}
                className={cn(
                  'group hover:shadow-md transition-all duration-200 border',
                  !product.isActive && 'opacity-60'
                )}
              >
                <CardContent className="p-0">
                  {/* Card top accent line by type */}
                  <div className={cn('h-1 rounded-t-lg', {
                    'bg-orange-400': product.productType === 'cable',
                    'bg-blue-500': product.productType === 'internet',
                    'bg-purple-500': product.productType === 'service',
                    'bg-amber-500': product.productType === 'physical',
                    'bg-green-500': product.productType === 'food',
                    'bg-cyan-500': product.productType === 'digital',
                    'bg-gray-400': product.productType === 'general',
                  })} />

                  <div className="p-3 sm:p-4 space-y-3">
                    {/* Name + active toggle */}
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{product.name}</p>
                        {product.description && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{product.description}</p>
                        )}
                      </div>
                      <button
                        onClick={() => toggleActive(product)}
                        title={product.isActive ? t('productManagement.clickToDeactivate', 'Click to deactivate') : t('productManagement.clickToActivate', 'Click to activate')}
                        className="shrink-0 p-1 rounded-md transition-colors hover:bg-muted"
                        aria-label={product.isActive ? t('productManagement.deactivate', 'Deactivate') : t('productManagement.activate', 'Activate')}
                      >
                        {product.isActive
                          ? <ToggleRight className="w-5 h-5 text-primary" />
                          : <ToggleLeft className="w-5 h-5 text-muted-foreground" />}
                      </button>
                    </div>

                    {/* Badges */}
                    <div className="flex flex-wrap gap-1.5">
                      <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide', getTypeBadgeClass(product.productType))}>
                        {getTypeLabel(product.productType)}
                      </span>
                      <span className={cn(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold',
                        product.isActive
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                      )}>
                        {product.isActive
                          ? <><CheckCircle2 className="w-2.5 h-2.5" />{t('productManagement.active', 'Active')}</>
                          : <><XCircle className="w-2.5 h-2.5" />{t('productManagement.inactive', 'Inactive')}</>}
                      </span>
                    </div>

                    {/* ISP cutoff info */}
                    {cutoffLabel && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Info className="w-3 h-3 shrink-0" />
                        {cutoffLabel}
                      </p>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => openEdit(product)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-border hover:bg-muted transition-colors text-foreground min-h-[36px]"
                      >
                        <Edit2 className="w-3.5 h-3.5 shrink-0" />
                        {t('common.edit', 'Edit')}
                      </button>
                      <button
                        onClick={() => handleDelete(product)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors min-h-[36px]"
                      >
                        <Trash2 className="w-3.5 h-3.5 shrink-0" />
                        {t('common.delete', 'Delete')}
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Add/Edit modal ── */}
      <ProductFormModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingProduct(null); }}
        onSubmit={handleSubmit}
        editing={editingProduct}
        industryType={industryType}
      />

      {/* ── Paywall: additional product limit ── */}
      <Dialog open={showPaymentModal} onClose={() => setShowPaymentModal(false)} size="sm">
        <DialogHeader title={t('productManagement.limitReachedTitle', 'Free Limit Reached')} onClose={() => setShowPaymentModal(false)} />
        <DialogBody className="p-4 sm:p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-primary/10 shrink-0">
              <Lock className="w-5 h-5 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">
              {t('productManagement.limitReachedDesc', 'You\'ve used all {{limit}} free categories. Each additional category costs ₹{{cost}} (one-time).', {
                limit: FREE_PRODUCT_LIMIT,
                cost: ADDITIONAL_PRODUCT_COST,
              })}
            </p>
          </div>
          <div className="rounded-lg bg-muted/50 border border-border p-4 flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-foreground">{t('productManagement.additionalCategory', 'Additional Category')}</p>
              <p className="text-xs text-muted-foreground">{t('productManagement.oneTimePayment', 'One-time payment')}</p>
            </div>
            <p className="text-lg font-bold text-foreground">₹{ADDITIONAL_PRODUCT_COST}</p>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowPaymentModal(false)}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button onClick={handlePayForAdditionalProducts}>
            {t('productManagement.payNow', 'Pay ₹{{amount}}', { amount: ADDITIONAL_PRODUCT_COST })}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* ── UPI payment modal ── */}
      {hasPlatformUpi() && (
        <UpiPaymentModal
          isOpen={showUpiModal}
          onClose={() => setShowUpiModal(false)}
          upiId={PLATFORM_UPI.upiId}
          businessName={PLATFORM_UPI.businessName}
          amount={ADDITIONAL_PRODUCT_COST}
          description={t('productManagement.paymentDesc', 'Additional Category Unlock')}
          transactionRef={`CAT${Date.now()}`}
          onPaymentInitiated={handlePaymentInitiated}
        />
      )}
    </div>
  );
};

export default ProductManagement;
