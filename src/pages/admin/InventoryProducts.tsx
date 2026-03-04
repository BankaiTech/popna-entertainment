import { useEffect, useState, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useInventoryStore } from '@/store/useInventoryStore';
import { useStore } from '@/store/useStore';
import { Card, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/Dialog';
import { Plus, Edit, Trash2, Upload, Search, Package, Printer, Tag, AlertTriangle, TrendingUp, ShoppingCart } from 'lucide-react';
import AddInventoryProductModal from '@/components/AddInventoryProductModal';
import ImportModal from '@/components/ImportModal';
import type { InventoryProduct, LabelConfig } from '@/models/types';
import { MOCK_ORGANIZATION_ID } from '@/models/types';
import { cn, formatCurrencyINR } from '@/lib/utils';
import JsBarcode from 'jsbarcode';

type ProductTab = 'list' | 'labels' | 'import';

const InventoryProducts = () => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<ProductTab>('list');
    const [search, setSearch] = useState('');
    const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock' | 'needs_reorder'>('all');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [sortBy, setSortBy] = useState<'name' | 'stock_asc' | 'stock_desc'>('name');
    const [stockUpdateProduct, setStockUpdateProduct] = useState<InventoryProduct | null>(null);
    const [newStockValue, setNewStockValue] = useState<string>('');
    const [labelQuantity, setLabelQuantity] = useState<number>(1);
    const [packingDate, setPackingDate] = useState<string>('');

    const {
        products, categories, subCategories, units, branches, taxRates, warranties,
        initialize, addProduct, updateProduct, deleteProduct, importProducts,
        addCategory, addUnit, addBranch, addTaxRate, addSubCategory,
    } = useInventoryStore();

    const { companyProfile } = useStore();

    const [showProductModal, setShowProductModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState<InventoryProduct | null>(null);
    const [showImportModal, setShowImportModal] = useState(false);

    // Print Labels state
    const [selectedProductId, setSelectedProductId] = useState<number>(0);
    const [selectedVariantIdx, setSelectedVariantIdx] = useState<number>(-1);
    const [labelConfig, setLabelConfig] = useState<LabelConfig>({
        showProductName: true,
        showProductVariation: true,
        showProductPrice: true,
        showBusinessName: true,
        showCurrency: true,
        showPackingDate: false,
    });
    const barcodeRef = useRef<SVGSVGElement>(null);
    const printAreaRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        initialize();
    }, [initialize]);

    // Generate barcode when product or config changes
    const selectedProduct = products.find((p) => p.id === selectedProductId);
    const selectedVariant = selectedProduct?.variants?.[selectedVariantIdx];

    useEffect(() => {
        if (barcodeRef.current && selectedProduct) {
            const barcodeValue = selectedVariant?.barcode || selectedVariant?.skuId || selectedProduct.barcode || selectedProduct.sku || `PRD-${selectedProduct.id}`;
            try {
                JsBarcode(barcodeRef.current, barcodeValue, {
                    format: 'CODE128',
                    width: 2,
                    height: 60,
                    displayValue: true,
                    fontSize: 12,
                    margin: 5,
                });
            } catch {
                // Fallback for invalid barcode
                JsBarcode(barcodeRef.current, `PRD${selectedProduct.id}`, {
                    format: 'CODE128',
                    width: 2,
                    height: 60,
                    displayValue: true,
                    fontSize: 12,
                    margin: 5,
                });
            }
        }
    }, [selectedProduct, selectedVariant, labelConfig]);

    const handlePrint = () => {
        if (!printAreaRef.current) return;
        const labelHtml = printAreaRef.current.innerHTML;
        const repeated = Array(labelQuantity)
            .fill(`<div class="label-wrapper">${labelHtml}</div>`)
            .join('');
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        printWindow.document.write(`
      <html>
        <head>
          <title>Print Labels (${labelQuantity}x)</title>
          <style>
            body { margin: 0; padding: 10px; font-family: Arial, sans-serif; }
            .labels-grid { display: flex; flex-wrap: wrap; gap: 10px; }
            .label-wrapper { break-inside: avoid; }
            .label { border: 1px solid #000; padding: 12px; display: inline-block; text-align: center; min-width: 200px; }
            .label-name { font-weight: bold; font-size: 14px; margin-bottom: 4px; }
            .label-variant { font-size: 12px; color: #555; margin-bottom: 4px; }
            .label-price { font-size: 16px; font-weight: bold; margin: 6px 0; }
            .label-business { font-size: 10px; color: #777; margin-top: 4px; }
            .label-date { font-size: 10px; color: #777; }
            svg { display: block; margin: 8px auto; }
            @media print { body { margin: 0; padding: 5px; } }
          </style>
        </head>
        <body><div class="labels-grid">${repeated}</div></body>
      </html>
    `);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    };

    const handleStockUpdate = async () => {
        if (!stockUpdateProduct) return;
        const qty = parseInt(newStockValue);
        if (isNaN(qty) || qty < 0) return;
        await updateProduct(stockUpdateProduct.id, { currentStock: qty });
        setStockUpdateProduct(null);
    };

    const getCategoryName = (id?: number) => categories.find((c) => c.id === id)?.name || '-';
    const getUnitName = (id?: number) => units.find((u) => u.id === id)?.shortName || '-';
    const getBranchName = (id?: number) => branches.find((b) => b.id === id)?.name || '-';

    // Filtered + sorted products
    const filteredProducts = useMemo(() => {
        const q = search.trim().toLowerCase();
        return products
            .filter((p) => !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
            .filter((p) => {
                if (stockFilter === 'out_of_stock') return (p.currentStock ?? 0) === 0;
                if (stockFilter === 'low_stock') return (p.currentStock ?? 0) > 0 && p.stockAlert !== undefined && p.currentStock! <= p.stockAlert;
                if (stockFilter === 'needs_reorder') return p.reorderLevel !== undefined && (p.currentStock ?? 0) <= p.reorderLevel;
                if (stockFilter === 'in_stock') return p.currentStock !== undefined && p.currentStock > (p.stockAlert ?? 0);
                return true;
            })
            .filter((p) => categoryFilter === 'all' || String(p.categoryId) === categoryFilter)
            .sort((a, b) => {
                if (sortBy === 'stock_asc') return (a.currentStock ?? 0) - (b.currentStock ?? 0);
                if (sortBy === 'stock_desc') return (b.currentStock ?? 0) - (a.currentStock ?? 0);
                return a.name.localeCompare(b.name);
            });
    }, [products, search, stockFilter, categoryFilter, sortBy]);

    const categoryOptions = useMemo(() => {
        const seen = new Set<string>();
        return products
            .filter((p) => p.categoryId && !seen.has(String(p.categoryId)) && seen.add(String(p.categoryId)))
            .map((p) => ({ id: String(p.categoryId), label: getCategoryName(p.categoryId) }));
    }, [products, categories]); // eslint-disable-line react-hooks/exhaustive-deps

    // KPI computations
    const totalProducts = products.length;
    const lowStockItems = products.filter(
        (p) => p.currentStock !== undefined && p.stockAlert !== undefined && p.currentStock <= p.stockAlert && p.currentStock > 0
    ).length;
    const outOfStockItems = products.filter(
        (p) => p.currentStock !== undefined && p.currentStock === 0
    ).length;
    const totalInventoryValue = products.reduce((sum, p) => {
        const baseValue = (p.currentStock || 0) * p.price;
        const variantValue = p.variants.reduce((vs, v) => vs + (v.currentStock || 0) * v.price, 0);
        return sum + baseValue + variantValue;
    }, 0);
    const needsReorderItems = products.filter(
        (p) => p.reorderLevel !== undefined && p.currentStock !== undefined && p.currentStock <= p.reorderLevel
    ).length;

    // Import handler
    const handleImportProducts = async (rows: Record<string, string>[]) => {
        const productsToImport: Omit<InventoryProduct, 'id' | 'createdAt'>[] = rows.map((r) => ({
            organizationId: MOCK_ORGANIZATION_ID,
            name: r['Product Name'] || '',
            sku: r['SKU'] || `SKU-${Date.now()}`,
            categoryCode: r['Category Code'] || '',
            taxType: (r['Tax Type'] as 'inclusive' | 'exclusive' | 'none') || 'none',
            price: Number(r['Price']) || 0,
            stockAlert: Number(r['Stock Alert']) || 0,
            description: r['Description'] || '',
            variants: [],
            isActive: true,
        }));
        await importProducts(productsToImport);
    };

    const tabs = [
        { id: 'list' as const, label: t('inventory.tabList', 'Products'), icon: Package, count: products.length },
        { id: 'labels' as const, label: t('inventory.tabLabels', 'Print Labels'), icon: Printer, count: undefined },
        { id: 'import' as const, label: t('inventory.tabImport', 'Import'), icon: Upload, count: undefined },
    ];

    const labelPrice = selectedVariant?.price || selectedProduct?.price || 0;
    const currencySymbol = '₹';

    return (
        <div className="space-y-3">
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <div className="bg-white rounded-lg border border-gray-200/80 p-3 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                        <Package className="w-4 h-4 text-blue-500 shrink-0" />
                        <span className="text-xs text-gray-500 font-medium truncate">{t('inventory.totalProducts', 'Total Products')}</span>
                    </div>
                    <p className="text-xl font-bold text-gray-900">{totalProducts}</p>
                </div>
                <div className="bg-white rounded-lg border border-amber-200/80 p-3 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                        <span className="text-xs text-gray-500 font-medium truncate">{t('inventory.lowStock', 'Low Stock')}</span>
                    </div>
                    <p className="text-xl font-bold text-amber-600">{lowStockItems}</p>
                </div>
                <div className="bg-white rounded-lg border border-red-200/80 p-3 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                        <span className="text-xs text-gray-500 font-medium truncate">{t('inventory.outOfStock', 'Out of Stock')}</span>
                    </div>
                    <p className="text-xl font-bold text-red-600">{outOfStockItems}</p>
                </div>
                <div className="bg-white rounded-lg border border-green-200/80 p-3 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="w-4 h-4 text-green-500 shrink-0" />
                        <span className="text-xs text-gray-500 font-medium truncate">{t('inventory.inventoryValue', 'Inventory Value')}</span>
                    </div>
                    <p className="text-xl font-bold text-gray-900">{formatCurrencyINR(totalInventoryValue)}</p>
                </div>
                <div className="bg-white rounded-lg border border-orange-200/80 p-3 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                        <ShoppingCart className="w-4 h-4 text-orange-500 shrink-0" />
                        <span className="text-xs text-gray-500 font-medium truncate">{t('inventory.needsReorder', 'Needs Reorder')}</span>
                    </div>
                    <p className="text-xl font-bold text-orange-600">{needsReorderItems}</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-1 border-b border-gray-200">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => { setActiveTab(tab.id); setSearch(''); }}
                            className={cn(
                                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all',
                                activeTab === tab.id
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            )}
                        >
                            <Icon className="w-4 h-4" />
                            {tab.label}
                            {tab.count !== undefined && (
                                <span className={cn(
                                    'px-2 py-0.5 text-xs rounded-full',
                                    activeTab === tab.id ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                                )}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* List Products */}
            {activeTab === 'list' && (
                <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                        <div className="relative flex-1 w-full sm:max-w-xs">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('inventory.searchPlaceholder', 'Search products...')} />
                        </div>
                        <Button onClick={() => { setEditingProduct(null); setShowProductModal(true); }} className="w-full sm:w-auto">
                            <Plus className="w-4 h-4 mr-2" /> {t('inventory.addProduct', 'Add Product')}
                        </Button>
                    </div>
                    {/* Filters + Sort Row */}
                    <div className="flex flex-wrap gap-2">
                        <Select value={stockFilter} onChange={(e) => setStockFilter(e.target.value as typeof stockFilter)} className="text-xs h-8 py-0 min-w-[130px]">
                            <option value="all">{t('inventory.filterAll', 'All Stock')}</option>
                            <option value="in_stock">{t('inventory.filterInStock', 'In Stock')}</option>
                            <option value="low_stock">{t('inventory.filterLowStock', 'Low Stock')}</option>
                            <option value="out_of_stock">{t('inventory.filterOutOfStock', 'Out of Stock')}</option>
                            <option value="needs_reorder">{t('inventory.filterNeedsReorder', 'Needs Reorder')}</option>
                        </Select>
                        <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="text-xs h-8 py-0 min-w-[130px]">
                            <option value="all">{t('inventory.allCategories', 'All Categories')}</option>
                            {categoryOptions.map((c) => (
                                <option key={c.id} value={c.id}>{c.label}</option>
                            ))}
                        </Select>
                        <Select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className="text-xs h-8 py-0 min-w-[150px]">
                            <option value="name">{t('inventory.sortName', 'Name (A–Z)')}</option>
                            <option value="stock_asc">{t('inventory.sortStockAsc', 'Stock (Low to High)')}</option>
                            <option value="stock_desc">{t('inventory.sortStockDesc', 'Stock (High to Low)')}</option>
                        </Select>
                        {(stockFilter !== 'all' || categoryFilter !== 'all' || sortBy !== 'name') && (
                            <button onClick={() => { setStockFilter('all'); setCategoryFilter('all'); setSortBy('name'); }} className="text-xs text-blue-600 hover:underline px-1">
                                Reset
                            </button>
                        )}
                    </div>
                    {/* Desktop Table — hidden on mobile */}
                    <div className="overflow-x-auto hidden sm:block">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-gray-50">
                                    <th className="text-left px-4 py-3 font-medium text-gray-600">Product</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-600">SKU</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Category</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Unit</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Branch</th>
                                    <th className="text-right px-4 py-3 font-medium text-gray-600">Price</th>
                                    <th className="text-center px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Stock</th>
                                    <th className="text-center px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Variants</th>
                                    <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProducts.map((product) => (
                                    <tr key={product.id} className="border-b hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3">
                                            <div>
                                                <span className="font-medium text-gray-900">{product.name}</span>
                                                {!product.isActive && (
                                                    <span className="ml-2 px-1.5 py-0.5 text-xs bg-red-100 text-red-600 rounded">Inactive</span>
                                                )}
                                                {product.brand && <p className="text-xs text-gray-400">{product.brand}</p>}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600 font-mono text-xs">{product.sku}</td>
                                        <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{getCategoryName(product.categoryId)}</td>
                                        <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">{getUnitName(product.unitId)}</td>
                                        <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">{getBranchName(product.branchId)}</td>
                                        <td className="px-4 py-3 text-right font-semibold">₹{product.price.toLocaleString()}</td>
                                        <td className="px-4 py-3 text-center hidden md:table-cell">
                                            {product.currentStock !== undefined ? (
                                                <button
                                                    onClick={() => { setStockUpdateProduct(product); setNewStockValue(String(product.currentStock ?? 0)); }}
                                                    title={t('inventory.quickUpdateStock', 'Click to update stock')}
                                                    className={cn(
                                                        'px-2 py-0.5 text-xs rounded-full font-medium cursor-pointer hover:opacity-75 transition-opacity',
                                                        product.currentStock === 0 ? 'bg-red-100 text-red-700' :
                                                        (product.stockAlert !== undefined && product.currentStock <= product.stockAlert) ? 'bg-amber-100 text-amber-700' :
                                                        'bg-green-100 text-green-700'
                                                    )}
                                                >
                                                    {product.currentStock}
                                                </button>
                                            ) : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-center hidden md:table-cell">
                                            {product.variants.length > 0 ? (
                                                <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full">{product.variants.length}</span>
                                            ) : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button onClick={() => { setEditingProduct(product); setShowProductModal(true); }} className="p-1.5 hover:bg-blue-50 rounded text-blue-600" title="Edit">
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => { if (confirm('Delete this product?')) deleteProduct(product.id); }} className="p-1.5 hover:bg-red-50 rounded text-red-600" title="Delete">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => { setSelectedProductId(product.id); setSelectedVariantIdx(-1); setActiveTab('labels'); }}
                                                    className="p-1.5 hover:bg-green-50 rounded text-green-600" title="Print Label"
                                                >
                                                    <Tag className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredProducts.length === 0 && (
                                    <tr><td colSpan={9} className="text-center py-8 text-gray-500">No products found</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Card View — sm:hidden */}
                    <div className="sm:hidden space-y-2">
                        {filteredProducts.map((product) => (
                            <div key={product.id} className="bg-white border border-gray-200 rounded-lg p-3 space-y-2 shadow-sm">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 truncate">{product.name}</p>
                                        {product.brand && <p className="text-xs text-gray-400">{product.brand}</p>}
                                        <p className="text-xs text-gray-400 font-mono">{product.sku}</p>
                                    </div>
                                    {!product.isActive && (
                                        <span className="px-1.5 py-0.5 text-[10px] bg-red-100 text-red-600 rounded shrink-0">Inactive</span>
                                    )}
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                    <div>
                                        <p className="text-gray-400">Price</p>
                                        <p className="font-semibold text-gray-900">₹{product.price.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400">{t('inventory.stock', 'Stock')}</p>
                                        <button
                                            onClick={() => { setStockUpdateProduct(product); setNewStockValue(String(product.currentStock ?? 0)); }}
                                            title={t('inventory.quickUpdateStock', 'Click to update stock')}
                                            className={cn(
                                                'font-semibold cursor-pointer hover:opacity-75',
                                                product.currentStock === undefined ? 'text-gray-400' :
                                                product.currentStock === 0 ? 'text-red-600' :
                                                (product.stockAlert !== undefined && product.currentStock <= product.stockAlert) ? 'text-amber-600' :
                                                'text-green-600'
                                            )}
                                        >
                                            {product.currentStock ?? '-'}
                                        </button>
                                    </div>
                                    <div>
                                        <p className="text-gray-400">Category</p>
                                        <p className="font-medium text-gray-700 truncate">{getCategoryName(product.categoryId)}</p>
                                    </div>
                                </div>
                                {product.variants.length > 0 && (
                                    <p className="text-[10px] text-purple-600 font-medium">
                                        {product.variants.length} variant{product.variants.length > 1 ? 's' : ''}
                                    </p>
                                )}
                                <div className="flex items-center justify-end gap-1 pt-1 border-t border-gray-100">
                                    <button onClick={() => { setEditingProduct(product); setShowProductModal(true); }} className="p-1.5 hover:bg-blue-50 rounded text-blue-600">
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => { if (confirm('Delete this product?')) deleteProduct(product.id); }} className="p-1.5 hover:bg-red-50 rounded text-red-600">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => { setSelectedProductId(product.id); setSelectedVariantIdx(-1); setActiveTab('labels'); }} className="p-1.5 hover:bg-green-50 rounded text-green-600">
                                        <Tag className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {filteredProducts.length === 0 && (
                            <div className="text-center py-8 text-gray-500 text-sm">No products found</div>
                        )}
                    </div>
                </div>
            )}

            {/* Print Labels */}
            {activeTab === 'labels' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Configuration */}
                    <Card>
                        <CardContent className="p-5 space-y-5">
                            <h3 className="text-base font-semibold flex items-center gap-2">
                                <Printer className="w-5 h-5" /> Label Configuration
                            </h3>

                            {/* Product Selection */}
                            <div>
                                <label className="block text-sm font-medium mb-1">Select Product</label>
                                <Select value={selectedProductId || ''} onChange={(e) => { setSelectedProductId(Number(e.target.value)); setSelectedVariantIdx(-1); }}>
                                    <option value="">-- Select a product --</option>
                                    {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                                </Select>
                            </div>

                            {/* Variant Selection */}
                            {selectedProduct && selectedProduct.variants.length > 0 && (
                                <div>
                                    <label className="block text-sm font-medium mb-1">Select Variation</label>
                                    <Select value={selectedVariantIdx} onChange={(e) => setSelectedVariantIdx(Number(e.target.value))}>
                                        <option value={-1}>Base Product</option>
                                        {selectedProduct.variants.map((v, i) => (
                                            <option key={i} value={i}>{v.variantName} - ₹{v.price.toLocaleString()}</option>
                                        ))}
                                    </Select>
                                </div>
                            )}

                            {/* Checkboxes */}
                            <div className="space-y-3 pt-2">
                                <p className="text-sm font-medium text-gray-700">Information to show on label:</p>
                                {[
                                    { key: 'showProductName' as const, label: 'Product Name' },
                                    { key: 'showProductVariation' as const, label: 'Product Variation' },
                                    { key: 'showProductPrice' as const, label: 'Product Price' },
                                    { key: 'showBusinessName' as const, label: 'Business Name' },
                                    { key: 'showCurrency' as const, label: 'Currency Symbol' },
                                    { key: 'showPackingDate' as const, label: 'Packing Date' },
                                ].map((opt) => (
                                    <label key={opt.key} className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={labelConfig[opt.key]}
                                            onChange={(e) => setLabelConfig({ ...labelConfig, [opt.key]: e.target.checked })}
                                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-gray-700">{opt.label}</span>
                                    </label>
                                ))}
                                {labelConfig.showPackingDate && (
                                    <div className="ml-6 mt-1">
                                        <Input
                                            type="date"
                                            value={packingDate}
                                            onChange={(e) => setPackingDate(e.target.value)}
                                            className="h-8 text-xs w-40"
                                            placeholder={t('inventory.selectPackingDate', 'Select date')}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Label Quantity */}
                            <div>
                                <label className="block text-sm font-medium mb-2">{t('inventory.labelQuantity', 'Quantity')}</label>
                                <div className="flex flex-wrap gap-1.5">
                                    {[1, 5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((q) => (
                                        <button
                                            key={q}
                                            type="button"
                                            onClick={() => setLabelQuantity(q)}
                                            className={cn(
                                                'px-2.5 py-1 text-xs font-medium rounded border transition-colors',
                                                labelQuantity === q
                                                    ? 'bg-blue-600 text-white border-blue-600'
                                                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                                            )}
                                        >
                                            {q}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <Button onClick={handlePrint} disabled={!selectedProduct} className="w-full">
                                <Printer className="w-4 h-4 mr-2" /> {t('inventory.printLabel', 'Print')} {labelQuantity > 1 ? `(${labelQuantity}x)` : ''}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Preview */}
                    <Card>
                        <CardContent className="p-5">
                            <h3 className="text-base font-semibold mb-4">Label Preview</h3>
                            {selectedProduct ? (
                                <div ref={printAreaRef} className="flex justify-center">
                                    <div className="label border-2 border-gray-800 rounded-lg p-4 text-center inline-block min-w-[240px] bg-white">
                                        {labelConfig.showBusinessName && (
                                            <div className="label-business text-xs text-gray-500 mb-1 font-medium uppercase tracking-wider">
                                                {companyProfile?.companyName || 'Business Name'}
                                            </div>
                                        )}
                                        {labelConfig.showProductName && (
                                            <div className="label-name text-sm font-bold text-gray-900">
                                                {selectedProduct.name}
                                            </div>
                                        )}
                                        {labelConfig.showProductVariation && selectedVariant && (
                                            <div className="label-variant text-xs text-gray-600 mt-0.5">
                                                {selectedVariant.variantName}
                                            </div>
                                        )}

                                        {/* Barcode */}
                                        <div className="my-2">
                                            <svg ref={barcodeRef}></svg>
                                        </div>

                                        {labelConfig.showProductPrice && (
                                            <div className="label-price text-lg font-bold text-gray-900">
                                                {labelConfig.showCurrency && currencySymbol}
                                                {labelPrice.toLocaleString()}
                                            </div>
                                        )}
                                        {labelConfig.showPackingDate && (
                                            <div className="label-date text-xs text-gray-500 mt-1">
                                                Packed: {packingDate
                                                    ? new Date(packingDate + 'T00:00:00').toLocaleDateString('en-IN')
                                                    : new Date().toLocaleDateString('en-IN')}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-12 text-gray-400">
                                    <Tag className="w-10 h-10 mx-auto mb-2" />
                                    <p className="text-sm">Select a product to preview the label</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Import Products */}
            {activeTab === 'import' && (
                <Card>
                    <CardContent className="p-6 sm:p-8 text-center space-y-4">
                        <Upload className="w-12 h-12 mx-auto text-gray-400" />
                        <h3 className="text-lg font-semibold text-gray-900">Import Products</h3>
                        <p className="text-sm text-gray-500 max-w-md mx-auto">
                            Import products from a CSV file. Download the sample template to get the correct format.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <a
                                href="/templates/products_template.csv"
                                download="products_template.csv"
                                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                Download Template
                            </a>
                            <Button onClick={() => setShowImportModal(true)}>
                                <Upload className="w-4 h-4 mr-2" /> Import CSV
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Modals */}
            <AddInventoryProductModal
                isOpen={showProductModal}
                onClose={() => { setShowProductModal(false); setEditingProduct(null); }}
                onSave={addProduct}
                onUpdate={updateProduct}
                editingProduct={editingProduct}
                categories={categories}
                subCategories={subCategories}
                units={units}
                branches={branches}
                taxRates={taxRates}
                warranties={warranties}
                onAddCategory={addCategory}
                onAddUnit={addUnit}
                onAddBranch={addBranch}
                onAddTaxRate={addTaxRate}
                onAddSubCategory={addSubCategory}
            />

            <ImportModal
                isOpen={showImportModal}
                onClose={() => setShowImportModal(false)}
                title="Import Products"
                templateUrl="/templates/products_template.csv"
                templateFileName="products_template.csv"
                onImport={handleImportProducts}
                expectedHeaders={['Product Name', 'SKU', 'Category', 'Price', 'Tax Rate (%)', 'Stock Alert']}
            />

            {/* Quick Stock Update Modal */}
            {stockUpdateProduct && (
                <Dialog open={!!stockUpdateProduct} onClose={() => setStockUpdateProduct(null)}>
                    <DialogHeader title={t('inventory.updateStockTitle', 'Update Stock')} onClose={() => setStockUpdateProduct(null)} />
                    <DialogBody>
                        <div className="px-4 sm:px-6 py-4 space-y-4">
                            <div className="flex items-center justify-between text-sm">
                                <span className="font-medium text-gray-700">{stockUpdateProduct.name}</span>
                                <span className="text-gray-400 text-xs font-mono">{stockUpdateProduct.sku}</span>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg text-sm">
                                <span className="text-gray-500">{t('inventory.currentStock', 'Current Stock')}:</span>
                                <span className={cn(
                                    'font-bold text-base',
                                    (stockUpdateProduct.currentStock ?? 0) === 0 ? 'text-red-600' :
                                    (stockUpdateProduct.stockAlert !== undefined && (stockUpdateProduct.currentStock ?? 0) <= stockUpdateProduct.stockAlert) ? 'text-amber-600' :
                                    'text-green-600'
                                )}>
                                    {stockUpdateProduct.currentStock ?? 0}
                                </span>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    {t('inventory.newStockQty', 'New Stock Quantity')}
                                </label>
                                <Input
                                    type="number"
                                    min="0"
                                    value={newStockValue}
                                    onChange={(e) => setNewStockValue(e.target.value)}
                                    placeholder="0"
                                    autoFocus
                                />
                            </div>
                        </div>
                    </DialogBody>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setStockUpdateProduct(null)} className="w-full sm:w-auto">
                            {t('common.cancel', 'Cancel')}
                        </Button>
                        <Button onClick={handleStockUpdate} className="w-full sm:w-auto" disabled={newStockValue === '' || parseInt(newStockValue) < 0}>
                            {t('common.save', 'Save')}
                        </Button>
                    </DialogFooter>
                </Dialog>
            )}
        </div>
    );
};

export default InventoryProducts;
