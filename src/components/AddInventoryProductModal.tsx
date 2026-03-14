import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/Dialog';
import Button from './ui/Button';
import Input from './ui/Input';
import Select from './ui/Select';
import InlineAddModal from './InlineAddModal';
import { Plus, Trash2 } from 'lucide-react';
import type { InventoryProduct, ProductVariant, Category, SubCategory, Unit, Branch, TaxRate, Warranty } from '@/models/types';
import { cn } from '@/lib/utils';

interface AddInventoryProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (product: Omit<InventoryProduct, 'id' | 'createdAt'>) => Promise<void>;
    onUpdate?: (id: number, product: Partial<InventoryProduct>) => Promise<void>;
    editingProduct?: InventoryProduct | null;
    categories: Category[];
    subCategories: SubCategory[];
    units: Unit[];
    branches: Branch[];
    taxRates: TaxRate[];
    warranties: Warranty[];
    onAddCategory: (cat: Omit<Category, 'id' | 'createdAt'>) => Promise<void>;
    onAddUnit: (unit: Omit<Unit, 'id' | 'createdAt'>) => Promise<void>;
    onAddBranch: (branch: Omit<Branch, 'id' | 'createdAt'>) => Promise<void>;
    onAddTaxRate: (tax: Omit<TaxRate, 'id' | 'createdAt'>) => Promise<void>;
    onAddSubCategory: (sub: Omit<SubCategory, 'id' | 'createdAt'>) => Promise<void>;
    onAddWarranty?: (w: Omit<Warranty, 'id' | 'createdAt'>) => Promise<void>;
    /** When true (from industry template), show batch number and expiry date fields */
    showBatchExpiry?: boolean;
}

type FormTab = 'general' | 'pricing' | 'inventory' | 'variants';

const emptyVariant: Omit<ProductVariant, 'id'> = {
    variantName: '', price: 0, taxType: 'none', skuId: '', warrantyId: undefined,
    mrp: undefined, purchasePrice: undefined, barcode: undefined, currentStock: undefined,
};

const defaultFormData = {
    name: '', sku: '', isActive: true, description: '', image: undefined as string | undefined,
    categoryId: 0, categoryCode: '', subCategoryId: 0, unitId: 0, branchId: 0,
    productType: 'physical' as 'physical' | 'service' | 'digital' | 'bundle',
    brand: '',
    price: 0, mrp: 0, purchasePrice: 0,
    taxType: 'none' as 'inclusive' | 'exclusive' | 'none',
    taxRateId: 0, warrantyId: 0,
    hsnSacCode: '',
    currentStock: 0, stockAlert: 0, reorderLevel: 0,
    trackingType: 'none' as 'none' | 'serial' | 'batch',
    barcode: '',
    expiryTracking: false,
    batchNumber: '',
    expiryDate: '',
    weight: 0, weightUnit: 'kg' as 'g' | 'kg' | 'lb',
};

const AddInventoryProductModal = ({
    isOpen, onClose, onSave, onUpdate, editingProduct,
    categories, subCategories, units, branches, taxRates, warranties,
    onAddCategory, onAddUnit, onAddBranch, onAddTaxRate, onAddSubCategory, onAddWarranty,
    showBatchExpiry = false,
}: AddInventoryProductModalProps) => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<FormTab>('general');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [showInline, setShowInline] = useState<'unit' | 'category' | 'branch' | 'taxRate' | 'subCategory' | 'warranty' | null>(null);
    const [formData, setFormData] = useState(defaultFormData);
    const [variants, setVariants] = useState<Omit<ProductVariant, 'id'>[]>([]);

    useEffect(() => {
        if (editingProduct) {
            setFormData({
                name: editingProduct.name,
                sku: editingProduct.sku,
                isActive: editingProduct.isActive,
                description: editingProduct.description || '',
                image: editingProduct.image,
                categoryId: editingProduct.categoryId || 0,
                categoryCode: editingProduct.categoryCode || '',
                subCategoryId: editingProduct.subCategoryId || 0,
                unitId: editingProduct.unitId || 0,
                branchId: editingProduct.branchId || 0,
                productType: editingProduct.productType || 'physical',
                brand: editingProduct.brand || '',
                price: editingProduct.price,
                mrp: editingProduct.mrp || 0,
                purchasePrice: editingProduct.purchasePrice || 0,
                taxType: editingProduct.taxType,
                taxRateId: editingProduct.taxRateId || 0,
                warrantyId: editingProduct.warrantyId || 0,
                hsnSacCode: editingProduct.hsnSacCode || '',
                currentStock: editingProduct.currentStock || 0,
                stockAlert: editingProduct.stockAlert || 0,
                reorderLevel: editingProduct.reorderLevel || 0,
                trackingType: editingProduct.trackingType || 'none',
                barcode: editingProduct.barcode || '',
                expiryTracking: editingProduct.expiryTracking || false,
                batchNumber: editingProduct.batchNumber || '',
                expiryDate: editingProduct.expiryDate || '',
                weight: editingProduct.weight || 0,
                weightUnit: editingProduct.weightUnit || 'kg',
            });
            setVariants(editingProduct.variants.map(({ id: _id, ...rest }) => rest));
        } else {
            setFormData(defaultFormData);
            setVariants([]);
        }
        setActiveTab('general');
        setError('');
    }, [editingProduct, isOpen]);

    useEffect(() => {
        if (formData.categoryId) {
            const cat = categories.find((c) => c.id === formData.categoryId);
            if (cat) setFormData((prev) => ({ ...prev, categoryCode: cat.code }));
        }
    }, [formData.categoryId, categories]);

    const filteredSubCategories = subCategories.filter((s) => s.categoryId === formData.categoryId);
    const set = (patch: Partial<typeof formData>) => setFormData((prev) => ({ ...prev, ...patch }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) { setError(t('productModal.nameRequired', 'Product name is required')); return; }
        if (!formData.sku.trim()) { setError(t('productModal.skuRequired', 'SKU is required')); return; }
        if (!formData.price || formData.price <= 0) { setError(t('productModal.priceRequired', 'Selling price is required')); setActiveTab('pricing'); return; }
        if (formData.taxType === 'none') { setError(t('productModal.taxTypeRequired', 'Tax type is required')); setActiveTab('pricing'); return; }
        if (!formData.taxRateId) { setError(t('productModal.taxRateRequired', 'Tax rate is required when tax type is set')); setActiveTab('pricing'); return; }

        setSaving(true);
        try {
            const productData: Omit<InventoryProduct, 'id' | 'createdAt'> = {
                ...formData,
                organizationId: editingProduct?.organizationId || '',
                categoryId: formData.categoryId || undefined,
                subCategoryId: formData.subCategoryId || undefined,
                branchId: formData.branchId || undefined,
                unitId: formData.unitId || undefined,
                taxRateId: formData.taxRateId || undefined,
                warrantyId: formData.warrantyId || undefined,
                stockAlert: formData.stockAlert || undefined,
                mrp: formData.mrp || undefined,
                purchasePrice: formData.purchasePrice || undefined,
                currentStock: formData.currentStock || undefined,
                reorderLevel: formData.reorderLevel || undefined,
                weight: formData.weight || undefined,
                brand: formData.brand || undefined,
                hsnSacCode: formData.hsnSacCode || undefined,
                barcode: formData.barcode || undefined,
                batchNumber: showBatchExpiry ? (formData.batchNumber || undefined) : undefined,
                expiryDate: showBatchExpiry ? (formData.expiryDate || undefined) : undefined,
                variants: variants.map((v, i) => ({ ...v, id: i + 1 })),
            };
            if (editingProduct && onUpdate) {
                await onUpdate(editingProduct.id, productData);
            } else {
                await onSave(productData);
            }
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : t('common.saving'));
        } finally {
            setSaving(false);
        }
    };

    const addVariant = () => setVariants([...variants, { ...emptyVariant }]);
    const removeVariant = (index: number) => setVariants(variants.filter((_, i) => i !== index));
    const updateVariant = (index: number, field: string, value: string | number | boolean | undefined) => {
        setVariants(variants.map((v, i) => i === index ? { ...v, [field]: value } : v));
    };

    const tabs: { key: FormTab; label: string }[] = [
        { key: 'general', label: t('productModal.tabGeneral', 'General') },
        { key: 'pricing', label: t('productModal.tabPricing', 'Pricing & Tax') },
        { key: 'inventory', label: t('productModal.tabInventory', 'Inventory') },
        { key: 'variants', label: `${t('productModal.tabVariants', 'Variants')} (${variants.length})` },
    ];

    if (!isOpen) return null;

    return (
        <>
            <Dialog open={isOpen} onClose={onClose} size="xl" closeOnOverlayClick={!saving}>
                <DialogHeader
                    title={editingProduct ? t('productModal.editTitle', 'Edit Product') : t('productModal.addTitle', 'Add New Product')}
                    onClose={onClose}
                />
                <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                    <div className="flex border-b border-gray-200 px-4 overflow-x-auto scrollbar-thin shrink-0">
                        {tabs.map((tab) => (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => setActiveTab(tab.key)}
                                className={cn(
                                    'px-4 py-2.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap shrink-0',
                                    activeTab === tab.key
                                        ? 'border-blue-600 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                )}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <DialogBody className="p-4 sm:p-5">

                        {/* ── GENERAL TAB ── */}
                        {activeTab === 'general' && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">{t('productModal.name', 'Product Name')} <span className="text-destructive">*</span></label>
                                        <Input value={formData.name} onChange={(e) => set({ name: e.target.value })} placeholder={t('productModal.name', 'Product name')} required disabled={saving} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">{t('productModal.sku', 'SKU ID')} <span className="text-destructive">*</span></label>
                                        <Input value={formData.sku} onChange={(e) => set({ sku: e.target.value })} placeholder="e.g. PRD-001" required disabled={saving} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">{t('productModal.productType', 'Product Type')}</label>
                                        <Select value={formData.productType} onChange={(e) => set({ productType: e.target.value as typeof formData.productType })} disabled={saving}>
                                            <option value="physical">{t('productModal.typePhysical', 'Physical Product')}</option>
                                            <option value="service">{t('productModal.typeService', 'Service')}</option>
                                            <option value="digital">{t('productModal.typeDigital', 'Digital / Download')}</option>
                                            <option value="bundle">{t('productModal.typeBundle', 'Bundle / Kit')}</option>
                                        </Select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">{t('productModal.brand', 'Brand / Manufacturer')}</label>
                                        <Input value={formData.brand} onChange={(e) => set({ brand: e.target.value })} placeholder={t('productModal.brandPlaceholder', 'e.g. Samsung, Amul, TP-Link')} disabled={saving} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="text-sm font-medium">{t('productModal.unit', 'Unit')}</label>
                                            <button type="button" onClick={() => setShowInline('unit')} className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-0.5">
                                                <Plus className="w-3 h-3" /> {t('common.create', 'Add')}
                                            </button>
                                        </div>
                                        <Select value={formData.unitId || ''} onChange={(e) => set({ unitId: Number(e.target.value) })} disabled={saving}>
                                            <option value="">{t('productModal.selectUnit', 'Select unit')}</option>
                                            {units.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.shortName})</option>)}
                                        </Select>
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="text-sm font-medium">{t('productModal.category', 'Category')}</label>
                                            <button type="button" onClick={() => setShowInline('category')} className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-0.5">
                                                <Plus className="w-3 h-3" /> {t('common.create', 'Add')}
                                            </button>
                                        </div>
                                        <Select value={formData.categoryId || ''} onChange={(e) => set({ categoryId: Number(e.target.value), subCategoryId: 0 })} disabled={saving}>
                                            <option value="">{t('productModal.selectCategory', 'Select category')}</option>
                                            {categories.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
                                        </Select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="text-sm font-medium">{t('productModal.branch', 'Branch')}</label>
                                            <button type="button" onClick={() => setShowInline('branch')} className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-0.5">
                                                <Plus className="w-3 h-3" /> {t('common.create', 'Add')}
                                            </button>
                                        </div>
                                        <Select value={formData.branchId || ''} onChange={(e) => set({ branchId: Number(e.target.value) })} disabled={saving}>
                                            <option value="">{t('productModal.selectBranch', 'Select branch')}</option>
                                            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}{b.location ? ` (${b.location})` : ''}</option>)}
                                        </Select>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="w-1/3">
                                            <label className="block text-sm font-medium mb-1">{t('productModal.categoryCode', 'Category Code')}</label>
                                            <Input value={formData.categoryCode} onChange={(e) => set({ categoryCode: e.target.value })} placeholder="Auto" disabled={saving} />
                                        </div>
                                        <div className="w-2/3">
                                            <div className="flex items-center justify-between mb-1">
                                                <label className="text-sm font-medium">{t('productModal.subCategory', 'Sub Category')}</label>
                                                {formData.categoryId > 0 && (
                                                    <button type="button" onClick={() => setShowInline('subCategory')} className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-0.5">
                                                        <Plus className="w-3 h-3" /> {t('common.create', 'Add')}
                                                    </button>
                                                )}
                                            </div>
                                            <Select value={formData.subCategoryId || ''} onChange={(e) => set({ subCategoryId: Number(e.target.value) })} disabled={saving || !formData.categoryId}>
                                                <option value="">{t('productModal.selectSubCategory', 'Select sub-category')}</option>
                                                {filteredSubCategories.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                            </Select>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">{t('productModal.description', 'Description')}</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => set({ description: e.target.value })}
                                        placeholder={t('productModal.descriptionPlaceholder', 'Product description...')}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[60px] resize-vertical"
                                        disabled={saving}
                                    />
                                </div>

                                <div className="flex items-center gap-2">
                                    <input type="checkbox" id="productActive" checked={formData.isActive} onChange={(e) => set({ isActive: e.target.checked })} className="w-4 h-4 rounded border-border" disabled={saving} />
                                    <label htmlFor="productActive" className="text-sm font-medium">{t('productModal.active', 'Active (visible in listings)')}</label>
                                </div>
                            </div>
                        )}

                        {/* ── PRICING & TAX TAB ── */}
                        {activeTab === 'pricing' && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">{t('productModal.sellingPrice', 'Selling Price (₹)')} <span className="text-destructive">*</span></label>
                                        <Input type="number" min="0" step="0.01" value={formData.price || ''} onChange={(e) => set({ price: Number(e.target.value) })} placeholder="0.00" required disabled={saving} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">
                                            {t('productModal.mrp', 'MRP (₹)')}
                                            <span className="ml-1 text-xs text-gray-400 font-normal">{t('productModal.mrpHint', 'Max Retail Price')}</span>
                                        </label>
                                        <Input type="number" min="0" step="0.01" value={formData.mrp || ''} onChange={(e) => set({ mrp: Number(e.target.value) })} placeholder="0.00" disabled={saving} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">{t('productModal.purchasePrice', 'Purchase / Cost Price (₹)')}</label>
                                        <Input type="number" min="0" step="0.01" value={formData.purchasePrice || ''} onChange={(e) => set({ purchasePrice: Number(e.target.value) })} placeholder="0.00" disabled={saving} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">
                                            {t('productModal.hsnSac', 'HSN / SAC Code')}
                                            <span className="ml-1 text-xs text-amber-600 font-normal">{t('productModal.hsnSacHint', 'GST required')}</span>
                                        </label>
                                        <Input value={formData.hsnSacCode} onChange={(e) => set({ hsnSacCode: e.target.value })} placeholder={t('productModal.hsnSacPlaceholder', 'e.g. 998314 (SAC) or 85171200 (HSN)')} disabled={saving} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">{t('productModal.taxType', 'Tax Type')} <span className="text-destructive">*</span></label>
                                        <Select value={formData.taxType} onChange={(e) => set({ taxType: e.target.value as typeof formData.taxType })} required disabled={saving}>
                                            <option value="none" disabled>{t('productModal.selectTaxType', 'Select tax type')}</option>
                                            <option value="inclusive">{t('productModal.taxInclusive', 'Inclusive (price includes GST)')}</option>
                                            <option value="exclusive">{t('productModal.taxExclusive', 'Exclusive (GST added on top)')}</option>
                                        </Select>
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="text-sm font-medium">{t('productModal.taxRate', 'Tax Rate')} <span className="text-destructive">*</span></label>
                                            <button type="button" onClick={() => setShowInline('taxRate')} className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-0.5">
                                                <Plus className="w-3 h-3" /> {t('common.create', 'Add')}
                                            </button>
                                        </div>
                                        <Select value={formData.taxRateId || ''} onChange={(e) => set({ taxRateId: Number(e.target.value) })} required disabled={saving}>
                                            <option value="">{t('productModal.selectTaxRate', 'Select tax rate')}</option>
                                            {taxRates.map((t2) => {
                                                const nameHasRate = t2.name.includes(String(t2.rate));
                                                return <option key={t2.id} value={t2.id}>{nameHasRate ? t2.name : `${t2.name} (${t2.rate}%)`}</option>;
                                            })}
                                        </Select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="text-sm font-medium">{t('productModal.warranty', 'Warranty')}</label>
                                            {onAddWarranty && (
                                                <button type="button" onClick={() => setShowInline('warranty')} className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-0.5">
                                                    <Plus className="w-3 h-3" /> {t('common.create', 'Add')}
                                                </button>
                                            )}
                                        </div>
                                        <Select value={formData.warrantyId || ''} onChange={(e) => set({ warrantyId: Number(e.target.value) })} disabled={saving}>
                                            <option value="">{t('productModal.noWarranty', 'No warranty')}</option>
                                            {warranties.map((w) => <option key={w.id} value={w.id}>{w.name} ({w.duration} {w.durationUnit})</option>)}
                                        </Select>
                                    </div>
                                </div>

                                {formData.price > 0 && formData.purchasePrice > 0 && (
                                    <div className={cn(
                                        'p-3 rounded-lg text-sm font-medium',
                                        formData.price > formData.purchasePrice
                                            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
                                            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                                    )}>
                                        {t('productModal.margin', 'Margin')}: ₹{(formData.price - formData.purchasePrice).toFixed(2)} ({((formData.price - formData.purchasePrice) / formData.purchasePrice * 100).toFixed(1)}%)
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── INVENTORY & TRACKING TAB ── */}
                        {activeTab === 'inventory' && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">{t('productModal.currentStock', 'Current Stock (Opening Qty)')}</label>
                                        <Input type="number" min="0" value={formData.currentStock || ''} onChange={(e) => set({ currentStock: Number(e.target.value) })} placeholder="0" disabled={saving} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">
                                            {t('productModal.stockAlert', 'Stock Alert Quantity')}
                                            <span className="ml-1 text-xs text-gray-400 font-normal">{t('productModal.stockAlertHint', 'notify below this')}</span>
                                        </label>
                                        <Input type="number" min="0" value={formData.stockAlert || ''} onChange={(e) => set({ stockAlert: Number(e.target.value) })} placeholder="e.g. 10" disabled={saving} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">
                                            {t('productModal.reorderLevel', 'Reorder Level')}
                                            <span className="ml-1 text-xs text-gray-400 font-normal">{t('productModal.reorderHint', 'trigger PO below this')}</span>
                                        </label>
                                        <Input type="number" min="0" value={formData.reorderLevel || ''} onChange={(e) => set({ reorderLevel: Number(e.target.value) })} placeholder="e.g. 20" disabled={saving} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">{t('productModal.barcode', 'Barcode (EAN / UPC / Custom)')}</label>
                                        <Input value={formData.barcode} onChange={(e) => set({ barcode: e.target.value })} placeholder="e.g. 8901234567890" disabled={saving} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">{t('productModal.trackingType', 'Tracking Type')}</label>
                                        <Select value={formData.trackingType} onChange={(e) => set({ trackingType: e.target.value as typeof formData.trackingType })} disabled={saving}>
                                            <option value="none">{t('productModal.trackingNone', 'None (Generic / FMCG)')}</option>
                                            <option value="serial">{t('productModal.trackingSerial', 'Serial Number - Electronics, ISP Equipment')}</option>
                                            <option value="batch">{t('productModal.trackingBatch', 'Batch / Lot Number - Pharma, Food')}</option>
                                        </Select>
                                    </div>
                                    <div className="flex flex-col justify-end pb-1">
                                        <label className="flex items-center gap-2 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={formData.expiryTracking}
                                                onChange={(e) => set({ expiryTracking: e.target.checked })}
                                                className="w-4 h-4 rounded border-gray-300 text-blue-600"
                                                disabled={saving}
                                            />
                                            <span className="text-sm font-medium">{t('productModal.expiryTracking', 'Track Expiry Dates')}</span>
                                        </label>
                                        <p className="text-xs text-gray-400 mt-0.5 ml-6">{t('productModal.expiryHint', 'For pharma, dairy, packaged food')}</p>
                                    </div>
                                </div>

                                {showBatchExpiry && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">{t('productModal.batchNumber', 'Batch / Lot Number')}</label>
                                            <Input value={formData.batchNumber} onChange={(e) => set({ batchNumber: e.target.value })} placeholder="e.g. BATCH-001" disabled={saving} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">{t('productModal.expiryDate', 'Expiry Date')}</label>
                                            <Input type="date" value={formData.expiryDate} onChange={(e) => set({ expiryDate: e.target.value })} disabled={saving} />
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">{t('productModal.weight', 'Weight')}</label>
                                        <Input type="number" min="0" step="0.001" value={formData.weight || ''} onChange={(e) => set({ weight: Number(e.target.value) })} placeholder="e.g. 0.5" disabled={saving} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">{t('productModal.weightUnit', 'Weight Unit')}</label>
                                        <Select value={formData.weightUnit} onChange={(e) => set({ weightUnit: e.target.value as typeof formData.weightUnit })} disabled={saving}>
                                            <option value="g">{t('productModal.weightG', 'Grams (g)')}</option>
                                            <option value="kg">{t('productModal.weightKg', 'Kilograms (kg)')}</option>
                                            <option value="lb">{t('productModal.weightLb', 'Pounds (lb)')}</option>
                                        </Select>
                                    </div>
                                </div>

                                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg">
                                    <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">{t('productModal.fieldGuideTitle', 'Field Guide by Business Type')}</p>
                                    <ul className="text-xs text-blue-600 dark:text-blue-400 space-y-0.5 list-disc list-inside">
                                        <li>{t('productModal.guideGrocery', 'Supermarket / Grocery - Stock Alert, Barcode, Expiry Tracking')}</li>
                                        <li>{t('productModal.guideIsp', 'ISP / Electronics - Serial Number tracking, Reorder Level')}</li>
                                        <li>{t('productModal.guidePharma', 'Pharmacy - Batch tracking, Expiry Dates, Reorder Level')}</li>
                                        <li>{t('productModal.guideTextile', 'Textile / Apparel - Variants for size/color, Weight for fabric')}</li>
                                    </ul>
                                </div>
                            </div>
                        )}

                        {/* ── VARIANTS TAB ── */}
                        {activeTab === 'variants' && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-gray-500">{t('productModal.variantDesc', 'Add product variations (e.g. size, color, storage, speed plan)')}</p>
                                    <Button type="button" size="sm" onClick={addVariant}>
                                        <Plus className="w-4 h-4 mr-1" /> {t('productModal.addVariant', 'Add Variant')}
                                    </Button>
                                </div>

                                {variants.length === 0 ? (
                                    <div className="text-center py-8 text-gray-400 border-2 border-dashed rounded-lg">
                                        <p className="text-sm">{t('productModal.noVariants', 'No variants yet. Click "Add Variant" to create one.')}</p>
                                        <p className="text-xs mt-1 text-gray-300">{t('productModal.variantExamples', 'Examples: S/M/L/XL for textile, 50Mbps/100Mbps for ISP, 256GB/512GB for electronics')}</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {variants.map((variant, index) => (
                                            <div key={index} className="border rounded-lg p-4 bg-gray-50 space-y-3 relative">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-semibold text-gray-700">{t('productModal.tabVariants', 'Variant')} #{index + 1}</span>
                                                    <button type="button" onClick={() => removeVariant(index)} className="p-1 hover:bg-red-50 rounded text-red-500">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-xs font-medium mb-1">{t('productModal.variantName', 'Variant Name')} <span className="text-destructive">*</span></label>
                                                        <Input value={variant.variantName} onChange={(e) => updateVariant(index, 'variantName', e.target.value)} placeholder={t('productModal.variantNamePlaceholder', 'e.g. 256GB Black / XL Red / 100Mbps')} disabled={saving} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium mb-1">{t('productModal.sku', 'SKU ID')}</label>
                                                        <Input value={variant.skuId} onChange={(e) => updateVariant(index, 'skuId', e.target.value)} placeholder="e.g. PRD-001-V1" disabled={saving} />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                    <div>
                                                        <label className="block text-xs font-medium mb-1">{t('productModal.variantPrice', 'Selling Price (₹)')}</label>
                                                        <Input type="number" min="0" step="0.01" value={variant.price || ''} onChange={(e) => updateVariant(index, 'price', Number(e.target.value))} placeholder="0.00" disabled={saving} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium mb-1">{t('productModal.variantMrp', 'MRP (₹)')}</label>
                                                        <Input type="number" min="0" step="0.01" value={variant.mrp || ''} onChange={(e) => updateVariant(index, 'mrp', Number(e.target.value) || undefined)} placeholder="0.00" disabled={saving} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium mb-1">{t('productModal.variantPurchasePrice', 'Purchase Price (₹)')}</label>
                                                        <Input type="number" min="0" step="0.01" value={variant.purchasePrice || ''} onChange={(e) => updateVariant(index, 'purchasePrice', Number(e.target.value) || undefined)} placeholder="0.00" disabled={saving} />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                    <div>
                                                        <label className="block text-xs font-medium mb-1">{t('productModal.taxType', 'Tax Type')}</label>
                                                        <Select value={variant.taxType} onChange={(e) => updateVariant(index, 'taxType', e.target.value)} disabled={saving}>
                                                            <option value="none">{t('productModal.taxNone', 'No Tax')}</option>
                                                            <option value="inclusive">{t('productModal.taxInclusive', 'Inclusive')}</option>
                                                            <option value="exclusive">{t('productModal.taxExclusive', 'Exclusive')}</option>
                                                        </Select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium mb-1">{t('productModal.warranty', 'Warranty')}</label>
                                                        <Select value={variant.warrantyId || ''} onChange={(e) => updateVariant(index, 'warrantyId', e.target.value ? Number(e.target.value) : undefined)} disabled={saving}>
                                                            <option value="">{t('productModal.noWarranty', 'No warranty')}</option>
                                                            {warranties.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                                                        </Select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium mb-1">{t('productModal.variantBarcode', 'Barcode')}</label>
                                                        <Input value={variant.barcode || ''} onChange={(e) => updateVariant(index, 'barcode', e.target.value || undefined)} placeholder="EAN/UPC" disabled={saving} />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-xs font-medium mb-1">{t('productModal.variantStock', 'Current Stock')}</label>
                                                        <Input type="number" min="0" value={variant.currentStock ?? ''} onChange={(e) => updateVariant(index, 'currentStock', Number(e.target.value))} placeholder="0" disabled={saving} />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {error && (
                            <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">{error}</div>
                        )}
                    </DialogBody>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={saving}>{t('common.cancel', 'Cancel')}</Button>
                        <Button type="submit" disabled={saving}>
                            {saving ? t('common.saving', 'Saving...') : editingProduct ? t('productModal.editTitle', 'Update Product') : t('productModal.addTitle', 'Add Product')}
                        </Button>
                    </DialogFooter>
                </form>
            </Dialog>

            <InlineAddModal
                isOpen={showInline === 'unit'}
                onClose={() => setShowInline(null)}
                title={t('productModal.unit', 'Add Unit')}
                fields={[
                    { name: 'name', label: t('common.name', 'Unit Name'), required: true, placeholder: 'e.g. Kilogram' },
                    { name: 'shortName', label: 'Short Name', required: true, placeholder: 'e.g. Kg' },
                ]}
                onSave={async (data) => {
                    await onAddUnit({ organizationId: '', name: data.name, shortName: data.shortName });
                }}
            />
            <InlineAddModal
                isOpen={showInline === 'category'}
                onClose={() => setShowInline(null)}
                title={t('productModal.category', 'Add Category')}
                fields={[
                    { name: 'name', label: t('productModal.category', 'Category Name'), required: true, placeholder: 'e.g. Electronics' },
                    { name: 'code', label: t('productModal.categoryCode', 'Category Code'), required: true, placeholder: 'e.g. ELEC' },
                    { name: 'description', label: t('productModal.description', 'Description'), placeholder: 'Optional description' },
                ]}
                onSave={async (data) => {
                    await onAddCategory({ organizationId: '', name: data.name, code: data.code, description: data.description });
                }}
            />
            <InlineAddModal
                isOpen={showInline === 'branch'}
                onClose={() => setShowInline(null)}
                title={t('productModal.branch', 'Add Branch')}
                fields={[
                    { name: 'name', label: t('productModal.branch', 'Branch Name'), required: true, placeholder: 'e.g. Main Branch' },
                    { name: 'location', label: 'Location', placeholder: 'e.g. Chennai' },
                ]}
                onSave={async (data) => {
                    await onAddBranch({ organizationId: '', name: data.name, location: data.location, isActive: true });
                }}
            />
            <InlineAddModal
                isOpen={showInline === 'taxRate'}
                onClose={() => setShowInline(null)}
                title={t('productModal.taxRate', 'Add Tax Rate')}
                fields={[
                    { name: 'name', label: t('productModal.taxType', 'Tax Name'), required: true, placeholder: 'e.g. GST 18%' },
                    { name: 'rate', label: t('productModal.taxRate', 'Rate (%)'), required: true, type: 'number', placeholder: 'e.g. 18' },
                ]}
                onSave={async (data) => {
                    await onAddTaxRate({ organizationId: '', name: data.name, rate: Number(data.rate), type: 'exclusive' });
                }}
            />
            <InlineAddModal
                isOpen={showInline === 'subCategory'}
                onClose={() => setShowInline(null)}
                title={t('productModal.subCategory', 'Add Sub Category')}
                fields={[
                    { name: 'name', label: t('productModal.subCategory', 'Sub Category Name'), required: true, placeholder: 'e.g. Mobile Phones' },
                ]}
                onSave={async (data) => {
                    await onAddSubCategory({ organizationId: '', categoryId: formData.categoryId, name: data.name });
                }}
            />
            {onAddWarranty && (
                <InlineAddModal
                    isOpen={showInline === 'warranty'}
                    onClose={() => setShowInline(null)}
                    title={t('productModal.warranty', 'Add Warranty')}
                    fields={[
                        { name: 'name', label: t('productModal.warrantyName', 'Warranty Name'), required: true, placeholder: 'e.g. 1 Year Standard' },
                        { name: 'duration', label: t('productModal.warrantyDuration', 'Duration'), required: true, type: 'number', placeholder: 'e.g. 12' },
                        {
                            name: 'durationUnit', label: t('productModal.warrantyUnit', 'Unit'), required: true, type: 'select', placeholder: 'months', options: [
                                { value: 'days', label: t('productModal.days', 'Days') },
                                { value: 'months', label: t('productModal.months', 'Months') },
                                { value: 'years', label: t('productModal.years', 'Years') },
                            ]
                        },
                    ]}
                    onSave={async (data) => {
                        await onAddWarranty({ organizationId: '', name: data.name, duration: Number(data.duration), durationUnit: (data.durationUnit || 'months') as 'days' | 'months' | 'years' });
                    }}
                />
            )}
        </>
    );
};

export default AddInventoryProductModal;
