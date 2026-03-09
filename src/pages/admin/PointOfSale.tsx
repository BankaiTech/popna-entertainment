// Point of Sale Module — uses InventoryProducts, barcode scanner, mobile-optimized
import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '@/store/useStore';
import { useInventoryStore } from '@/store/useInventoryStore';
import { usePOSStore } from '@/store/usePOSStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/Dialog';
import CustomerSheet from '@/components/CustomerSheet';
import BarcodeScanner from '@/components/BarcodeScanner';
import {
    Search, ShoppingCart, Plus, Minus, Trash2, CreditCard, Receipt, X,
    WifiOff, ScanBarcode, UserPlus, Package,
} from 'lucide-react';
import { cn, formatCurrencyINR } from '@/lib/utils';
import type { InventoryProduct, Customer } from '@/models/types';

const PointOfSale = () => {
    const { t } = useTranslation();
    const { customers, fetchCustomers, addCustomer } = useStore();
    const inventoryStore = useInventoryStore();
    const {
        cart, selectedCustomerId, discount, paymentMethod,
        addToCart, removeFromCart, updateQuantity,
        setCustomer, setDiscount, setPaymentMethod, clearCart,
        getSubtotal, getTaxTotal, getDiscountAmount, getGrandTotal,
    } = usePOSStore();

    const [productSearch, setProductSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
    const [showCheckout, setShowCheckout] = useState(false);
    const [showReceipt, setShowReceipt] = useState(false);
    const [showCart, setShowCart] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const [showAddCustomer, setShowAddCustomer] = useState(false);
    const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
    const barcodeBufferRef = useRef('');
    const barcodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const onOnline = () => setIsOnline(true);
        const onOffline = () => setIsOnline(false);
        window.addEventListener('online', onOnline);
        window.addEventListener('offline', onOffline);
        return () => {
            window.removeEventListener('online', onOnline);
            window.removeEventListener('offline', onOffline);
        };
    }, []);

    useEffect(() => {
        inventoryStore.initialize();
        fetchCustomers();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Get tax rate for a product
    const getTaxRate = useCallback((product: InventoryProduct): number => {
        if (product.taxRateId) {
            const taxRate = inventoryStore.taxRates.find((tr) => tr.id === product.taxRateId);
            if (taxRate) return taxRate.rate;
        }
        return 0;
    }, [inventoryStore.taxRates]);

    // Get category name
    const getCategoryName = useCallback((categoryId?: number): string => {
        if (!categoryId) return t('pos.uncategorized', 'General');
        const cat = inventoryStore.categories.find((c) => c.id === categoryId);
        return cat?.name || t('pos.uncategorized', 'General');
    }, [inventoryStore.categories, t]);

    // Filter products
    const filteredProducts = useMemo(() => {
        let items = inventoryStore.products.filter((p) => p.isActive);
        if (selectedCategory !== null) {
            items = items.filter((p) => p.categoryId === selectedCategory);
        }
        if (productSearch.trim()) {
            const q = productSearch.toLowerCase();
            items = items.filter((p) =>
                p.name.toLowerCase().includes(q) ||
                p.sku.toLowerCase().includes(q) ||
                (p.barcode && p.barcode.toLowerCase().includes(q))
            );
        }
        return items;
    }, [inventoryStore.products, productSearch, selectedCategory]);

    const selectedCustomer = useMemo(() => {
        if (!selectedCustomerId) return null;
        return customers.find((c) => c.id === selectedCustomerId) || null;
    }, [customers, selectedCustomerId]);

    // Add inventory product to cart
    const handleAddProduct = useCallback((product: InventoryProduct) => {
        const tax = getTaxRate(product);
        addToCart({
            productId: product.id,
            name: product.name,
            sku: product.sku,
            barcode: product.barcode,
            price: product.price,
            tax,
        });
    }, [addToCart, getTaxRate]);

    // Barcode scan result handler
    const handleBarcodeScan = useCallback((barcode: string) => {
        const product = inventoryStore.products.find((p) =>
            (p.barcode && p.barcode === barcode) ||
            p.variants.some((v) => v.barcode === barcode)
        );
        if (product) {
            handleAddProduct(product);
            setShowScanner(false);
        }
    }, [inventoryStore.products, handleAddProduct]);

    // Hardware barcode scanner: listen for rapid keypress + Enter
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement)?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

            if (e.key === 'Enter' && barcodeBufferRef.current.length >= 4) {
                handleBarcodeScan(barcodeBufferRef.current);
                barcodeBufferRef.current = '';
                return;
            }

            if (e.key.length === 1) {
                barcodeBufferRef.current += e.key;
                if (barcodeTimerRef.current) clearTimeout(barcodeTimerRef.current);
                barcodeTimerRef.current = setTimeout(() => {
                    barcodeBufferRef.current = '';
                }, 100);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleBarcodeScan]);

    // Add customer and auto-select
    const handleAddCustomerSave = useCallback(async (customerData: Omit<Customer, 'id' | 'createdAt'> | Partial<Customer>) => {
        await addCustomer(customerData as Parameters<typeof addCustomer>[0]);
        await fetchCustomers();
        const updated = useStore.getState().customers;
        if (updated.length > 0) {
            const newest = updated[updated.length - 1];
            setCustomer(newest.id);
        }
        setShowAddCustomer(false);
    }, [addCustomer, fetchCustomers, setCustomer]);

    const getPaymentMethodLabel = (method: string) => {
        switch (method) {
            case 'cash': return t('pos.cash', 'Cash');
            case 'upi': return t('pos.upi', 'UPI');
            case 'card': return t('pos.card', 'Card');
            case 'bank_transfer': return t('pos.bankTransfer', 'Bank Transfer');
            default: return method.replace('_', ' ');
        }
    };

    const handleCheckout = () => {
        if (cart.length === 0) return;
        setShowCheckout(true);
    };

    const handleConfirmCheckout = () => {
        setShowCheckout(false);
        setShowReceipt(true);
    };

    const handleNewSale = () => {
        clearCart();
        setShowReceipt(false);
    };

    const subtotal = getSubtotal();
    const taxTotal = getTaxTotal();
    const discountAmount = getDiscountAmount();
    const grandTotal = getGrandTotal();
    const cartItemCount = cart.reduce((s, c) => s + c.quantity, 0);

    // ── Customer selector with add button ──
    const CustomerSelector = ({ className }: { className?: string }) => (
        <div className={cn('flex gap-2', className)}>
            <div className="flex-1">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">{t('pos.customer', 'Customer')}</label>
                <Select value={selectedCustomerId ?? ''} onChange={(e) => setCustomer(e.target.value ? Number(e.target.value) : null)} className="text-sm">
                    <option value="">{t('pos.walkIn', 'Walk-in Customer')}</option>
                    {customers.map((c) => (
                        <option key={c.id} value={c.id}>{c.name} - {c.mobile}</option>
                    ))}
                </Select>
            </div>
            <div className="flex items-end">
                <button
                    type="button"
                    onClick={() => setShowAddCustomer(true)}
                    className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-primary transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
                    title={t('pos.addCustomer', 'Add Customer')}
                >
                    <UserPlus className="w-4 h-4" />
                </button>
            </div>
        </div>
    );

    // ── Cart items list ──
    const CartItems = ({ mobile }: { mobile?: boolean }) => (
        <>
            {cart.length === 0 ? (
                <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
                    <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    {t('pos.emptyCart', 'Cart is empty')}
                </div>
            ) : (
                <div className="space-y-2">
                    {cart.map((item) => (
                        <div key={`${item.productId}-${item.variantId ?? ''}`} className="flex items-center gap-2 p-2.5 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate dark:text-gray-100">{item.name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{formatCurrencyINR(item.price)} × {item.quantity}</p>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => updateQuantity(item.productId, item.quantity - 1, item.variantId)}
                                    className={cn("rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-center touch-manipulation",
                                        mobile ? "min-w-[44px] min-h-[44px] p-2" : "p-1"
                                    )}
                                >
                                    <Minus className={mobile ? "w-4 h-4" : "w-3.5 h-3.5"} />
                                </button>
                                <span className={cn("text-sm font-medium text-center dark:text-gray-100", mobile ? "w-8 min-h-[44px] flex items-center justify-center" : "w-6")}>{item.quantity}</span>
                                <button
                                    type="button"
                                    onClick={() => updateQuantity(item.productId, item.quantity + 1, item.variantId)}
                                    className={cn("rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-center touch-manipulation",
                                        mobile ? "min-w-[44px] min-h-[44px] p-2" : "p-1"
                                    )}
                                >
                                    <Plus className={mobile ? "w-4 h-4" : "w-3.5 h-3.5"} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => removeFromCart(item.productId, item.variantId)}
                                    className={cn("rounded-lg bg-red-50 dark:bg-red-900/30 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 flex items-center justify-center touch-manipulation ml-1",
                                        mobile ? "min-w-[44px] min-h-[44px] p-2" : "p-1"
                                    )}
                                >
                                    <Trash2 className={mobile ? "w-4 h-4" : "w-3.5 h-3.5"} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </>
    );

    // ── Totals section ──
    const Totals = ({ large }: { large?: boolean }) => (
        <div className={cn("border-t dark:border-gray-700 pt-3 space-y-1", large ? "text-base" : "text-sm")}>
            <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">{t('pos.subtotal', 'Subtotal')}</span><span className="dark:text-gray-100">{formatCurrencyINR(subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">{t('pos.tax', 'Tax (GST)')}</span><span className="dark:text-gray-100">{formatCurrencyINR(taxTotal)}</span></div>
            {discount > 0 && <div className="flex justify-between text-green-600 dark:text-green-400"><span>{t('pos.discount', 'Discount')} ({discount}%)</span><span>-{formatCurrencyINR(discountAmount)}</span></div>}
            <div className={cn("flex justify-between font-bold border-t dark:border-gray-700 pt-2", large ? "text-lg" : "text-base")}>
                <span className="dark:text-gray-100">{t('pos.total', 'Total')}</span>
                <span className="text-blue-600 dark:text-blue-400">{formatCurrencyINR(grandTotal)}</span>
            </div>
        </div>
    );

    return (
        <div className="space-y-3 pb-20 md:pb-4">
            {/* Offline notice */}
            {!isOnline && (
                <div className="flex items-center gap-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 py-2 px-3 text-sm" role="status">
                    <WifiOff className="w-4 h-4 shrink-0" />
                    <span>{t('pos.offlineNotice', 'You are offline. Connect to the internet to complete checkout.')}</span>
                </div>
            )}

            {/* Header */}
            <div>
                <h1 className="text-xl font-bold text-foreground">{t('pos.title', 'Point of Sale')}</h1>
                <p className="text-xs text-muted-foreground">{t('pos.subtitle', 'Quick billing and sales')}</p>
            </div>

            {/* Search + Scan bar */}
            <div className="flex gap-2 sticky top-0 z-10 bg-background py-2 -mx-1 px-1">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        placeholder={t('pos.searchPlaceholder', 'Search by name, SKU, barcode...')}
                        className="pl-9"
                    />
                </div>
                <button
                    type="button"
                    onClick={() => setShowScanner(true)}
                    className="flex items-center justify-center px-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-primary transition-colors min-w-[44px] min-h-[44px] touch-manipulation"
                    title={t('pos.scanBarcode', 'Scan Barcode')}
                >
                    <ScanBarcode className="w-5 h-5" />
                </button>
            </div>

            {/* Category filter pills */}
            {inventoryStore.categories.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
                    <button
                        type="button"
                        onClick={() => setSelectedCategory(null)}
                        className={cn(
                            'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border',
                            selectedCategory === null
                                ? 'bg-primary text-white border-primary'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700'
                        )}
                    >
                        {t('pos.allProducts', 'All')}
                    </button>
                    {inventoryStore.categories.map((cat) => (
                        <button
                            key={cat.id}
                            type="button"
                            onClick={() => setSelectedCategory(cat.id)}
                            className={cn(
                                'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border',
                                selectedCategory === cat.id
                                    ? 'bg-primary text-white border-primary'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700'
                            )}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>
            )}

            <div className="flex flex-col md:flex-row gap-4">
                {/* ════ Product Grid ════ */}
                <div className="flex-1">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3">
                        {filteredProducts.map((product) => {
                            const inCart = cart.find((c) => c.productId === product.id);
                            const outOfStock = (product.currentStock ?? 0) <= 0 && product.productType !== 'service';
                            return (
                                <button
                                    key={product.id}
                                    onClick={() => !outOfStock && handleAddProduct(product)}
                                    disabled={outOfStock}
                                    className={cn(
                                        "relative p-3 sm:p-4 rounded-xl border-2 transition-all text-left min-h-[100px]",
                                        outOfStock
                                            ? 'border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 opacity-60 cursor-not-allowed'
                                            : inCart
                                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 hover:shadow-md'
                                                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md'
                                    )}
                                >
                                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{product.name}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{getCategoryName(product.categoryId)}</div>
                                    <div className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-1.5">{formatCurrencyINR(product.price)}</div>

                                    {product.productType !== 'service' && (
                                        <div className={cn(
                                            "text-[10px] mt-1 flex items-center gap-0.5",
                                            outOfStock ? 'text-red-500' : (product.currentStock ?? 0) <= (product.stockAlert ?? 5) ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400 dark:text-gray-500'
                                        )}>
                                            <Package className="w-3 h-3" />
                                            {outOfStock ? t('pos.outOfStock', 'Out of stock') : `${product.currentStock ?? 0} ${t('pos.inStock', 'in stock')}`}
                                        </div>
                                    )}

                                    {inCart && (
                                        <span className="absolute top-1.5 right-1.5 bg-blue-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                                            {inCart.quantity}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                        {filteredProducts.length === 0 && (
                            <div className="col-span-full text-center py-12 text-gray-500 dark:text-gray-400">
                                <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
                                {t('pos.noProducts', 'No products found')}
                            </div>
                        )}
                    </div>
                </div>

                {/* ════ Cart Sidebar (Desktop) ════ */}
                <div className="hidden md:block w-80 lg:w-96">
                    <Card className="sticky top-20">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                <ShoppingCart className="w-4 h-4" />
                                {t('pos.cart', 'Cart')} ({cartItemCount} {t('pos.cartItems', 'items')})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <CustomerSelector />
                            <div className="max-h-[300px] overflow-y-auto">
                                <CartItems />
                            </div>

                            {cart.length > 0 && (
                                <>
                                    <div>
                                        <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">{t('pos.discount', 'Discount (%)')}</label>
                                        <Input type="number" min={0} max={100} value={discount} onChange={(e) => setDiscount(Number(e.target.value))} className="text-sm" />
                                    </div>
                                    <Totals />
                                    <Button onClick={handleCheckout} className="w-full" disabled={cart.length === 0 || !isOnline}>
                                        <CreditCard className="w-4 h-4 mr-2" />
                                        {t('pos.checkout', 'Checkout')}
                                    </Button>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* ════ Mobile Bottom Cart Bar ════ */}
            {cart.length > 0 && !showCart && (
                <div className="fixed left-0 right-0 bottom-16 z-40 md:hidden px-3 pb-2">
                    <button
                        type="button"
                        onClick={() => setShowCart(true)}
                        className="w-full flex items-center justify-between bg-primary text-white rounded-xl px-4 py-3 shadow-lg touch-manipulation"
                    >
                        <div className="flex items-center gap-2">
                            <ShoppingCart className="w-5 h-5" />
                            <span className="font-semibold">{cartItemCount} {t('pos.cartItems', 'items')}</span>
                        </div>
                        <span className="font-bold text-lg">{formatCurrencyINR(grandTotal)}</span>
                    </button>
                </div>
            )}

            {/* ════ Mobile Cart Drawer ════ */}
            {showCart && (
                <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
                    <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={() => setShowCart(false)} />
                    <div className="fixed left-0 right-0 bottom-0 bg-white dark:bg-gray-900 rounded-t-2xl max-h-[90dvh] flex flex-col animate-slide-up">
                        <div className="flex justify-center pt-2 pb-1">
                            <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                        </div>
                        <div className="shrink-0 flex justify-between items-center px-4 pb-3 border-b border-gray-100 dark:border-gray-800">
                            <h3 className="font-bold text-lg flex items-center gap-2 dark:text-gray-100">
                                <ShoppingCart className="w-5 h-5" /> {t('pos.cart', 'Cart')} ({cartItemCount})
                            </h3>
                            <button type="button" onClick={() => setShowCart(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full min-w-[44px] min-h-[44px] flex items-center justify-center">
                                <X className="w-5 h-5 dark:text-gray-300" />
                            </button>
                        </div>

                        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-3 space-y-3">
                            <CustomerSelector />
                            <CartItems mobile />

                            {cart.length > 0 && (
                                <>
                                    <div>
                                        <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">{t('pos.discount', 'Discount (%)')}</label>
                                        <Input type="number" min={0} max={100} value={discount} onChange={(e) => setDiscount(Number(e.target.value))} />
                                    </div>
                                    <Totals large />
                                </>
                            )}
                        </div>

                        {cart.length > 0 && (
                            <div className="shrink-0 p-4 pt-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                                <Button
                                    onClick={() => { setShowCart(false); handleCheckout(); }}
                                    className="w-full min-h-[56px] touch-manipulation text-base font-semibold shadow-md"
                                    size="lg"
                                    disabled={!isOnline}
                                >
                                    <CreditCard className="w-5 h-5 mr-2" /> {t('pos.checkout', 'Checkout')} — {formatCurrencyINR(grandTotal)}
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ════ Barcode Scanner ════ */}
            {showScanner && (
                <BarcodeScanner
                    onScan={handleBarcodeScan}
                    onClose={() => setShowScanner(false)}
                />
            )}

            {/* ════ Add Customer Modal ════ */}
            <CustomerSheet
                isOpen={showAddCustomer}
                onClose={() => setShowAddCustomer(false)}
                onSave={handleAddCustomerSave}
            />

            {/* ════ Checkout Dialog ════ */}
            {showCheckout && (
                <Dialog open={showCheckout} onClose={() => setShowCheckout(false)} size="lg">
                    <DialogHeader title={t('pos.checkout', 'Checkout')} onClose={() => setShowCheckout(false)} />
                    <DialogBody>
                        <div className="px-4 sm:px-6 py-4 space-y-4">
                            {!isOnline && (
                                <div className="flex items-center gap-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 py-2 px-3 text-sm">
                                    <WifiOff className="w-4 h-4 shrink-0" />
                                    <span>{t('pos.offlineCheckout', 'Connect to the internet to complete checkout.')}</span>
                                </div>
                            )}
                            {selectedCustomer && (
                                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                    <p className="text-sm font-medium text-blue-900 dark:text-blue-200">{selectedCustomer.name}</p>
                                    <p className="text-xs text-blue-700 dark:text-blue-300">{selectedCustomer.mobile}</p>
                                </div>
                            )}

                            <div className="space-y-2 text-sm">
                                {cart.map((item) => (
                                    <div key={`${item.productId}-${item.variantId ?? ''}`} className="flex justify-between">
                                        <span className="dark:text-gray-200">{item.name} × {item.quantity}</span>
                                        <span className="font-medium dark:text-gray-100">{formatCurrencyINR(item.price * item.quantity)}</span>
                                    </div>
                                ))}
                                <Totals large />
                            </div>

                            <div>
                                <label className="text-sm font-medium mb-2 block dark:text-gray-200">{t('pos.paymentMethod', 'Payment Method')}</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {(['cash', 'upi', 'card', 'bank_transfer'] as const).map((method) => (
                                        <button
                                            key={method}
                                            type="button"
                                            onClick={() => setPaymentMethod(method)}
                                            className={cn(
                                                'p-3 rounded-lg border-2 text-sm font-medium transition-all min-h-[48px] touch-manipulation',
                                                paymentMethod === method
                                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 dark:text-gray-300'
                                            )}
                                        >
                                            {method === 'cash' ? `💵 ${t('pos.cash', 'Cash')}` : method === 'upi' ? `📱 ${t('pos.upi', 'UPI')}` : method === 'card' ? `💳 ${t('pos.card', 'Card')}` : `🏦 ${t('pos.bankTransfer', 'Bank Transfer')}`}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </DialogBody>
                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button variant="outline" onClick={() => setShowCheckout(false)} className="w-full sm:w-auto">{t('pos.cancel', 'Cancel')}</Button>
                        <Button onClick={handleConfirmCheckout} disabled={!isOnline} className="w-full sm:w-auto min-h-[44px] sm:min-h-0">
                            <Receipt className="w-4 h-4 mr-2" /> {t('pos.confirmCheckout', 'Confirm')} — {formatCurrencyINR(grandTotal)}
                        </Button>
                    </DialogFooter>
                </Dialog>
            )}

            {/* ════ Receipt Dialog ════ */}
            {showReceipt && (
                <Dialog open={showReceipt} onClose={handleNewSale}>
                    <DialogHeader title={`${t('pos.saleComplete', 'Sale Complete')} ✓`} onClose={handleNewSale} />
                    <DialogBody>
                        <div className="px-4 sm:px-6 py-4 space-y-4">
                            <div className="text-center">
                                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <Receipt className="w-8 h-8 text-green-600 dark:text-green-400" />
                                </div>
                                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrencyINR(grandTotal)}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('pos.paymentReceived', 'Payment received via')} {getPaymentMethodLabel(paymentMethod)}</p>
                            </div>

                            {selectedCustomer && (
                                <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                                    {t('pos.customerLabel', 'Customer')}: <strong className="dark:text-gray-200">{selectedCustomer.name}</strong>
                                </div>
                            )}

                            <div className="border dark:border-gray-700 rounded-lg p-3 space-y-1 text-sm bg-gray-50 dark:bg-gray-800">
                                {cart.map((item) => (
                                    <div key={`${item.productId}-${item.variantId ?? ''}`} className="flex justify-between">
                                        <span className="dark:text-gray-300">{item.name} × {item.quantity}</span>
                                        <span className="dark:text-gray-200">{formatCurrencyINR(item.price * item.quantity)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </DialogBody>
                    <DialogFooter>
                        <Button onClick={handleNewSale} className="w-full">{t('pos.newSale', 'New Sale')}</Button>
                    </DialogFooter>
                </Dialog>
            )}
        </div>
    );
};

export default PointOfSale;
