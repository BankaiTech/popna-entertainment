import { useState, useEffect } from 'react';
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
}

type FormTab = 'general' | 'variants';

const emptyVariant: Omit<ProductVariant, 'id'> = {
    variantName: '', price: 0, taxType: 'none', skuId: '', warrantyId: undefined,
};

const AddInventoryProductModal = ({
    isOpen, onClose, onSave, onUpdate, editingProduct,
    categories, subCategories, units, branches, taxRates, warranties,
    onAddCategory, onAddUnit, onAddBranch, onAddTaxRate, onAddSubCategory,
}: AddInventoryProductModalProps) => {
    const [activeTab, setActiveTab] = useState<FormTab>('general');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // Inline add modals
    const [showInline, setShowInline] = useState<'unit' | 'category' | 'branch' | 'taxRate' | 'subCategory' | null>(null);

    // Form data
    const [formData, setFormData] = useState({
        name: '', sku: '', categoryId: 0, categoryCode: '', subCategoryId: 0,
        branchId: 0, unitId: 0, stockAlert: 0, taxType: 'none' as 'inclusive' | 'exclusive' | 'none',
        taxRateId: 0, warrantyId: 0, description: '', price: 0, isActive: true, image: undefined as string | undefined,
    });

    const [variants, setVariants] = useState<Omit<ProductVariant, 'id'>[]>([]);

    useEffect(() => {
        if (editingProduct) {
            setFormData({
                name: editingProduct.name, sku: editingProduct.sku,
                categoryId: editingProduct.categoryId || 0, categoryCode: editingProduct.categoryCode || '',
                subCategoryId: editingProduct.subCategoryId || 0, branchId: editingProduct.branchId || 0,
                unitId: editingProduct.unitId || 0, stockAlert: editingProduct.stockAlert || 0,
                taxType: editingProduct.taxType, taxRateId: editingProduct.taxRateId || 0,
                warrantyId: editingProduct.warrantyId || 0, description: editingProduct.description || '',
                price: editingProduct.price, isActive: editingProduct.isActive, image: editingProduct.image,
            });
            setVariants(editingProduct.variants.map(({ id: _id, ...rest }) => rest));
        } else {
            setFormData({
                name: '', sku: '', categoryId: 0, categoryCode: '', subCategoryId: 0,
                branchId: 0, unitId: 0, stockAlert: 0, taxType: 'none',
                taxRateId: 0, warrantyId: 0, description: '', price: 0, isActive: true, image: undefined,
            });
            setVariants([]);
        }
        setActiveTab('general');
        setError('');
    }, [editingProduct, isOpen]);

    // Auto-fill category code
    useEffect(() => {
        if (formData.categoryId) {
            const cat = categories.find((c) => c.id === formData.categoryId);
            if (cat) setFormData((prev) => ({ ...prev, categoryCode: cat.code }));
        }
    }, [formData.categoryId, categories]);

    const filteredSubCategories = subCategories.filter((s) => s.categoryId === formData.categoryId);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) { setError('Product name is required'); return; }
        if (!formData.sku.trim()) { setError('SKU is required'); return; }

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
                variants: variants.map((v, i) => ({ ...v, id: i + 1 })),
            };
            if (editingProduct && onUpdate) {
                await onUpdate(editingProduct.id, productData);
            } else {
                await onSave(productData);
            }
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const addVariant = () => setVariants([...variants, { ...emptyVariant }]);
    const removeVariant = (index: number) => setVariants(variants.filter((_, i) => i !== index));
    const updateVariant = (index: number, field: string, value: string | number | undefined) => {
        setVariants(variants.map((v, i) => i === index ? { ...v, [field]: value } : v));
    };

    if (!isOpen) return null;

    return (
        <>
            <Dialog open={isOpen} onClose={onClose} size="xl" closeOnOverlayClick={!saving}>
                <DialogHeader
                    title={editingProduct ? 'Edit Product' : 'Add New Product'}
                    onClose={onClose}
                />
                <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                    {/* Tabs */}
                    <div className="flex border-b border-gray-200 px-4">
                        {(['general', 'variants'] as FormTab[]).map((tab) => (
                            <button
                                key={tab}
                                type="button"
                                onClick={() => setActiveTab(tab)}
                                className={cn(
                                    'px-4 py-2.5 text-sm font-medium border-b-2 transition-all capitalize',
                                    activeTab === tab
                                        ? 'border-blue-600 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                )}
                            >
                                {tab === 'general' ? 'General Details' : `Variants (${variants.length})`}
                            </button>
                        ))}
                    </div>

                    <DialogBody className="p-4 sm:p-5">
                        {activeTab === 'general' && (
                            <div className="space-y-4">
                                {/* Row 1: Name + SKU */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Product Name <span className="text-destructive">*</span></label>
                                        <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Product name" required disabled={saving} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">SKU ID <span className="text-destructive">*</span></label>
                                        <Input value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} placeholder="e.g. PRD-001" required disabled={saving} />
                                    </div>
                                </div>

                                {/* Row 2: Unit + Category */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="text-sm font-medium">Unit</label>
                                            <button type="button" onClick={() => setShowInline('unit')} className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-0.5">
                                                <Plus className="w-3 h-3" /> Add
                                            </button>
                                        </div>
                                        <Select value={formData.unitId || ''} onChange={(e) => setFormData({ ...formData, unitId: Number(e.target.value) })} disabled={saving}>
                                            <option value="">Select unit</option>
                                            {units.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.shortName})</option>)}
                                        </Select>
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="text-sm font-medium">Category</label>
                                            <button type="button" onClick={() => setShowInline('category')} className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-0.5">
                                                <Plus className="w-3 h-3" /> Add
                                            </button>
                                        </div>
                                        <Select value={formData.categoryId || ''} onChange={(e) => setFormData({ ...formData, categoryId: Number(e.target.value), subCategoryId: 0 })} disabled={saving}>
                                            <option value="">Select category</option>
                                            {categories.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
                                        </Select>
                                    </div>
                                </div>

                                {/* Row 3: Category Code + Sub Category */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Category Code</label>
                                        <Input value={formData.categoryCode} onChange={(e) => setFormData({ ...formData, categoryCode: e.target.value })} placeholder="Auto-filled" disabled={saving} />
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="text-sm font-medium">Sub Category</label>
                                            {formData.categoryId > 0 && (
                                                <button type="button" onClick={() => setShowInline('subCategory')} className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-0.5">
                                                    <Plus className="w-3 h-3" /> Add
                                                </button>
                                            )}
                                        </div>
                                        <Select value={formData.subCategoryId || ''} onChange={(e) => setFormData({ ...formData, subCategoryId: Number(e.target.value) })} disabled={saving || !formData.categoryId}>
                                            <option value="">Select sub-category</option>
                                            {filteredSubCategories.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </Select>
                                    </div>
                                </div>

                                {/* Row 4: Branch + Stock Alert */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="text-sm font-medium">Branch</label>
                                            <button type="button" onClick={() => setShowInline('branch')} className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-0.5">
                                                <Plus className="w-3 h-3" /> Add
                                            </button>
                                        </div>
                                        <Select value={formData.branchId || ''} onChange={(e) => setFormData({ ...formData, branchId: Number(e.target.value) })} disabled={saving}>
                                            <option value="">Select branch</option>
                                            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}{b.location ? ` (${b.location})` : ''}</option>)}
                                        </Select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Stock Alert Quantity</label>
                                        <Input type="number" min="0" value={formData.stockAlert || ''} onChange={(e) => setFormData({ ...formData, stockAlert: Number(e.target.value) })} placeholder="e.g. 10" disabled={saving} />
                                    </div>
                                </div>

                                {/* Row 5: Tax Type + Tax Rate */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Tax Type</label>
                                        <Select value={formData.taxType} onChange={(e) => setFormData({ ...formData, taxType: e.target.value as 'inclusive' | 'exclusive' | 'none' })} disabled={saving}>
                                            <option value="none">No Tax</option>
                                            <option value="inclusive">Inclusive</option>
                                            <option value="exclusive">Exclusive</option>
                                        </Select>
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="text-sm font-medium">Tax Rate</label>
                                            <button type="button" onClick={() => setShowInline('taxRate')} className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-0.5">
                                                <Plus className="w-3 h-3" /> Add
                                            </button>
                                        </div>
                                        <Select value={formData.taxRateId || ''} onChange={(e) => setFormData({ ...formData, taxRateId: Number(e.target.value) })} disabled={saving || formData.taxType === 'none'}>
                                            <option value="">Select tax rate</option>
                                            {taxRates.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.rate}%)</option>)}
                                        </Select>
                                    </div>
                                </div>

                                {/* Row 6: Warranty + Price */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Warranty</label>
                                        <Select value={formData.warrantyId || ''} onChange={(e) => setFormData({ ...formData, warrantyId: Number(e.target.value) })} disabled={saving}>
                                            <option value="">No warranty</option>
                                            {warranties.map((w) => <option key={w.id} value={w.id}>{w.name} ({w.duration} {w.durationUnit})</option>)}
                                        </Select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Price <span className="text-destructive">*</span></label>
                                        <Input type="number" min="0" step="0.01" value={formData.price || ''} onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })} placeholder="0.00" disabled={saving} />
                                    </div>
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-sm font-medium mb-1">Description</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Product description..."
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[60px] resize-vertical"
                                        disabled={saving}
                                    />
                                </div>

                                {/* Active */}
                                <div className="flex items-center gap-2">
                                    <input type="checkbox" id="productActive" checked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} className="w-4 h-4 rounded border-border" disabled={saving} />
                                    <label htmlFor="productActive" className="text-sm font-medium">Active (visible in listings)</label>
                                </div>
                            </div>
                        )}

                        {activeTab === 'variants' && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-gray-500">Add product variations (e.g. size, color, storage)</p>
                                    <Button type="button" size="sm" onClick={addVariant}>
                                        <Plus className="w-4 h-4 mr-1" /> Add Variant
                                    </Button>
                                </div>

                                {variants.length === 0 ? (
                                    <div className="text-center py-8 text-gray-400 border-2 border-dashed rounded-lg">
                                        <p className="text-sm">No variants yet. Click "Add Variant" to create one.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {variants.map((variant, index) => (
                                            <div key={index} className="border rounded-lg p-4 bg-gray-50 space-y-3 relative">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-semibold text-gray-700">Variant #{index + 1}</span>
                                                    <button type="button" onClick={() => removeVariant(index)} className="p-1 hover:bg-red-50 rounded text-red-500">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-xs font-medium mb-1">Variant Name <span className="text-destructive">*</span></label>
                                                        <Input value={variant.variantName} onChange={(e) => updateVariant(index, 'variantName', e.target.value)} placeholder="e.g. 256GB Black" disabled={saving} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium mb-1">SKU ID</label>
                                                        <Input value={variant.skuId} onChange={(e) => updateVariant(index, 'skuId', e.target.value)} placeholder="e.g. PRD-001-V1" disabled={saving} />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                    <div>
                                                        <label className="block text-xs font-medium mb-1">Price</label>
                                                        <Input type="number" min="0" step="0.01" value={variant.price || ''} onChange={(e) => updateVariant(index, 'price', Number(e.target.value))} placeholder="0.00" disabled={saving} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium mb-1">Tax Type</label>
                                                        <Select value={variant.taxType} onChange={(e) => updateVariant(index, 'taxType', e.target.value)} disabled={saving}>
                                                            <option value="none">No Tax</option>
                                                            <option value="inclusive">Inclusive</option>
                                                            <option value="exclusive">Exclusive</option>
                                                        </Select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium mb-1">Warranty</label>
                                                        <Select value={variant.warrantyId || ''} onChange={(e) => updateVariant(index, 'warrantyId', e.target.value ? Number(e.target.value) : undefined)} disabled={saving}>
                                                            <option value="">No warranty</option>
                                                            {warranties.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                                                        </Select>
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
                        <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
                        <Button type="submit" disabled={saving}>
                            {saving ? 'Saving...' : editingProduct ? 'Update Product' : 'Add Product'}
                        </Button>
                    </DialogFooter>
                </form>
            </Dialog>

            {/* Inline Add Modals */}
            <InlineAddModal
                isOpen={showInline === 'unit'}
                onClose={() => setShowInline(null)}
                title="Add Unit"
                fields={[
                    { name: 'name', label: 'Unit Name', required: true, placeholder: 'e.g. Kilogram' },
                    { name: 'shortName', label: 'Short Name', required: true, placeholder: 'e.g. Kg' },
                ]}
                onSave={async (data) => {
                    await onAddUnit({ organizationId: '', name: data.name, shortName: data.shortName });
                }}
            />
            <InlineAddModal
                isOpen={showInline === 'category'}
                onClose={() => setShowInline(null)}
                title="Add Category"
                fields={[
                    { name: 'name', label: 'Category Name', required: true, placeholder: 'e.g. Electronics' },
                    { name: 'code', label: 'Category Code', required: true, placeholder: 'e.g. ELEC' },
                    { name: 'description', label: 'Description', placeholder: 'Optional description' },
                ]}
                onSave={async (data) => {
                    await onAddCategory({ organizationId: '', name: data.name, code: data.code, description: data.description });
                }}
            />
            <InlineAddModal
                isOpen={showInline === 'branch'}
                onClose={() => setShowInline(null)}
                title="Add Branch"
                fields={[
                    { name: 'name', label: 'Branch Name', required: true, placeholder: 'e.g. Main Branch' },
                    { name: 'location', label: 'Location', placeholder: 'e.g. Chennai' },
                ]}
                onSave={async (data) => {
                    await onAddBranch({ organizationId: '', name: data.name, location: data.location });
                }}
            />
            <InlineAddModal
                isOpen={showInline === 'taxRate'}
                onClose={() => setShowInline(null)}
                title="Add Tax Rate"
                fields={[
                    { name: 'name', label: 'Tax Name', required: true, placeholder: 'e.g. GST 18%' },
                    { name: 'rate', label: 'Rate (%)', required: true, type: 'number', placeholder: 'e.g. 18' },
                ]}
                onSave={async (data) => {
                    await onAddTaxRate({ organizationId: '', name: data.name, rate: Number(data.rate), type: 'exclusive' });
                }}
            />
            <InlineAddModal
                isOpen={showInline === 'subCategory'}
                onClose={() => setShowInline(null)}
                title="Add Sub Category"
                fields={[
                    { name: 'name', label: 'Sub Category Name', required: true, placeholder: 'e.g. Mobile Phones' },
                ]}
                onSave={async (data) => {
                    await onAddSubCategory({ organizationId: '', categoryId: formData.categoryId, name: data.name });
                }}
            />
        </>
    );
};

export default AddInventoryProductModal;
