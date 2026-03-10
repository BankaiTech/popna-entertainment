// Point of Sale — supermarket-style barcode-first table layout
import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '@/store/useStore';
import { useInventoryStore } from '@/store/useInventoryStore';
import { usePOSStore } from '@/store/usePOSStore';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/Dialog';
import CustomerSheet from '@/components/CustomerSheet';
import BarcodeScanner from '@/components/BarcodeScanner';
import {
    Search, Plus, Minus, CreditCard, Receipt, X,
    WifiOff, ScanBarcode, UserPlus,
} from 'lucide-react';
import { cn, formatCurrencyINR } from '@/lib/utils';
import {
    generatePOSReceipt, generatePOSInvoice,
    generatePOSInvoiceNumber, getPOSSettings,
    type POSReceiptData,
} from '@/lib/posReceiptUtils';
import type { InventoryProduct, Customer } from '@/models/types';

const PointOfSale = () => {
    const { t } = useTranslation();
    const { customers, fetchCustomers, addCustomer, companyProfile } = useStore();
    const inventoryStore = useInventoryStore();
    const {
        cart, selectedCustomerId, discount, paymentMethod,
        addToCart, removeFromCart, updateQuantity,
        setCustomer, setDiscount, setPaymentMethod, clearCart,
        getSubtotal, getTaxTotal, getDiscountAmount, getGrandTotal,
    } = usePOSStore();

    const [productSearch, setProductSearch] = useState('');
    const [showCheckout, setShowCheckout] = useState(false);
    const [showReceipt, setShowReceipt] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const [showAddCustomer, setShowAddCustomer] = useState(false);
    const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
    const [lastInvoiceNumber, setLastInvoiceNumber] = useState('');
    const barcodeBufferRef = useRef('');
    const barcodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

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

    // Auto-focus search input on mount
    useEffect(() => {
        searchInputRef.current?.focus();
    }, []);

    // Get tax rate for a product
    const getTaxRate = useCallback((product: InventoryProduct): number => {
        if (product.taxRateId) {
            const taxRate = inventoryStore.taxRates.find((tr) => tr.id === product.taxRateId);
            if (taxRate) return taxRate.rate;
        }
        return 0;
    }, [inventoryStore.taxRates]);

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
        // Re-focus search after adding
        setTimeout(() => searchInputRef.current?.focus(), 50);
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

    // Search input — Enter key scans barcode or adds first matching product
    const handleSearchKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key !== 'Enter' || !productSearch.trim()) return;
        const q = productSearch.trim().toLowerCase();
        // Try barcode match first
        const barcodeMatch = inventoryStore.products.find(
            (p) => p.isActive && p.barcode && p.barcode.toLowerCase() === q
        );
        if (barcodeMatch) {
            handleAddProduct(barcodeMatch);
            setProductSearch('');
            return;
        }
        // Try name/SKU match
        const nameMatch = inventoryStore.products.find(
            (p) => p.isActive && (p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
        );
        if (nameMatch) {
            handleAddProduct(nameMatch);
            setProductSearch('');
        }
    }, [productSearch, inventoryStore.products, handleAddProduct]);

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

    const selectedCustomer = useMemo(() => {
        if (!selectedCustomerId) return null;
        return customers.find((c) => c.id === selectedCustomerId) || null;
    }, [customers, selectedCustomerId]);

    const getPaymentMethodLabel = (method: string) => {
        switch (method) {
            case 'cash': return t('pos.cash', 'Cash');
            case 'upi': return t('pos.upi', 'UPI');
            case 'card': return t('pos.card', 'Card');
            case 'bank_transfer': return t('pos.bankTransfer', 'Bank Transfer');
            default: return method.replace('_', ' ');
        }
    };



    const handleConfirmCheckout = () => {
        const invoiceNumber = generatePOSInvoiceNumber();
        setLastInvoiceNumber(invoiceNumber);
        const settings = getPOSSettings();

        const receiptData: POSReceiptData = {
            items: [...cart],
            subtotal: getSubtotal(),
            taxTotal: getTaxTotal(),
            discountPercent: discount,
            discountAmount: getDiscountAmount(),
            grandTotal: getGrandTotal(),
            paymentMethod,
            customerName: selectedCustomer?.name,
            customerMobile: selectedCustomer?.mobile,
            invoiceNumber,
            date: new Date(),
        };

        if (settings.autoPrint) {
            if (settings.invoiceFormat === 'thermal') {
                generatePOSReceipt(receiptData, companyProfile);
            } else {
                generatePOSInvoice(receiptData, companyProfile);
            }
        }

        setShowCheckout(false);
        setShowReceipt(true);
    };

    const handlePrintAgain = () => {
        const settings = getPOSSettings();
        const receiptData: POSReceiptData = {
            items: [...cart],
            subtotal: getSubtotal(),
            taxTotal: getTaxTotal(),
            discountPercent: discount,
            discountAmount: getDiscountAmount(),
            grandTotal: getGrandTotal(),
            paymentMethod,
            customerName: selectedCustomer?.name,
            customerMobile: selectedCustomer?.mobile,
            invoiceNumber: lastInvoiceNumber,
            date: new Date(),
        };
        if (settings.invoiceFormat === 'thermal') {
            generatePOSReceipt(receiptData, companyProfile);
        } else {
            generatePOSInvoice(receiptData, companyProfile);
        }
    };

    const handleNewSale = () => {
        clearCart();
        setShowReceipt(false);
        setTimeout(() => searchInputRef.current?.focus(), 100);
    };

    const subtotal = getSubtotal();
    const taxTotal = getTaxTotal();
    const discountAmount = getDiscountAmount();
    const grandTotal = getGrandTotal();

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
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('pos.title', 'Point of Sale')}</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('pos.subtitle', 'Scan barcode or search to add items')}</p>
            </div>

            {/* Search + Scan + Product Lookup bar */}
            <div className="flex gap-2 sticky top-0 z-10 bg-gray-50 dark:bg-gray-950 py-2 -mx-1 px-1">
                <div className="relative flex-1 mt-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                    <Input
                        ref={searchInputRef}
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        onKeyDown={handleSearchKeyDown}
                        placeholder={t('pos.searchPlaceholder', 'Search products...')}
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
                {/* Product Search Auto-List Dropdown */}
                {productSearch.trim().length > 0 && (
                    <div className="absolute top-full left-0 right-[48px] mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto z-50">
                        {(() => {
                            const q = productSearch.trim().toLowerCase();
                            const matches = inventoryStore.products.filter(
                                (p) => p.isActive && (p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || (p.barcode && p.barcode.toLowerCase().includes(q)))
                            );
                            if (matches.length === 0) {
                                return <div className="p-3 text-sm text-gray-500 text-center">{t('pos.noProductsFound', 'No products found')}</div>;
                            }
                            return matches.map((product) => {
                                const outOfStock = (product.currentStock ?? 0) <= 0 && product.productType !== 'service';
                                return (
                                    <button
                                        key={product.id}
                                        type="button"
                                        disabled={outOfStock}
                                        onClick={() => { handleAddProduct(product); setProductSearch(''); }}
                                        className={cn(
                                            "w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-800 last:border-0 transition-colors flex justify-between items-center",
                                            outOfStock && "opacity-50 cursor-not-allowed"
                                        )}
                                    >
                                        <div>
                                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{product.name}</p>
                                            <p className="text-xs text-gray-500">{product.sku} {product.barcode && `• ${product.barcode}`}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">{formatCurrencyINR(product.price)}</p>
                                            {outOfStock && <p className="text-xs text-red-500">{t('pos.outOfStock', 'Out of stock')}</p>}
                                        </div>
                                    </button>
                                );
                            });
                        })()}
                    </div>
                )}
            </div>

            {/* ════ Cart Table ════ */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                {cart.length === 0 ? (
                    <div className="text-center py-16 text-gray-400 dark:text-gray-500">
                        <ScanBarcode className="w-12 h-12 mx-auto mb-3 opacity-40" />
                        <p className="text-sm font-medium">{t('pos.emptyCart', 'No items yet')}</p>
                        <p className="text-xs mt-1">{t('pos.scanToAdd', 'Scan a barcode or browse products to begin')}</p>
                    </div>
                ) : (
                    <>
                        {/* Desktop table */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                                        <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase w-10">#</th>
                                        <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{t('pos.item', 'Item')}</th>
                                        <th className="text-right py-2.5 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase w-24">{t('pos.price', 'Price')}</th>
                                        <th className="text-center py-2.5 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase w-32">{t('pos.qty', 'Qty')}</th>
                                        <th className="text-center py-2.5 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase w-16">{t('pos.taxPercent', 'Tax')}</th>
                                        <th className="text-right py-2.5 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase w-24">{t('pos.total', 'Total')}</th>
                                        <th className="w-10"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cart.map((item, idx) => {
                                        const itemTotal = item.price * item.quantity * (1 + item.tax / 100);
                                        return (
                                            <tr key={`${item.productId}-${item.variantId ?? ''}`} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                                <td className="py-2.5 px-3 text-gray-400 dark:text-gray-500 text-xs">{idx + 1}</td>
                                                <td className="py-2.5 px-3">
                                                    <span className="font-medium text-gray-900 dark:text-gray-100">{item.name}</span>
                                                    {item.sku && <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">{item.sku}</span>}
                                                </td>
                                                <td className="py-2.5 px-3 text-right text-gray-700 dark:text-gray-300 tabular-nums">{formatCurrencyINR(item.price)}</td>
                                                <td className="py-2.5 px-3">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => updateQuantity(item.productId, item.quantity - 1, item.variantId)}
                                                            className="w-7 h-7 rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center transition-colors"
                                                        >
                                                            <Minus className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
                                                        </button>
                                                        <span className="w-8 text-center font-semibold text-gray-900 dark:text-gray-100 tabular-nums">{item.quantity}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => updateQuantity(item.productId, item.quantity + 1, item.variantId)}
                                                            className="w-7 h-7 rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center transition-colors"
                                                        >
                                                            <Plus className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="py-2.5 px-3 text-center text-gray-500 dark:text-gray-400 text-xs">{item.tax}%</td>
                                                <td className="py-2.5 px-3 text-right font-semibold text-gray-900 dark:text-gray-100 tabular-nums">{formatCurrencyINR(itemTotal)}</td>
                                                <td className="py-2.5 px-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => removeFromCart(item.productId, item.variantId)}
                                                        className="w-7 h-7 rounded-md hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 flex items-center justify-center transition-colors"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile list */}
                        <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-800">
                            {cart.map((item) => {
                                const itemTotal = item.price * item.quantity * (1 + item.tax / 100);
                                return (
                                    <div key={`${item.productId}-${item.variantId ?? ''}`} className="p-3 space-y-2">
                                        {/* Row 1: Name + delete */}
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.name}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                    {formatCurrencyINR(item.price)} {item.tax > 0 && <span className="text-gray-400 dark:text-gray-500">• GST {item.tax}%</span>}
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeFromCart(item.productId, item.variantId)}
                                                className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 touch-manipulation shrink-0"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                        {/* Row 2: Qty controls + total */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => updateQuantity(item.productId, item.quantity - 1, item.variantId)}
                                                    className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center touch-manipulation active:scale-95 transition-transform"
                                                >
                                                    <Minus className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                                                </button>
                                                <span className="w-10 text-center text-sm font-bold text-gray-900 dark:text-gray-100 tabular-nums">{item.quantity}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => updateQuantity(item.productId, item.quantity + 1, item.variantId)}
                                                    className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center touch-manipulation active:scale-95 transition-transform"
                                                >
                                                    <Plus className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                                                </button>
                                            </div>
                                            <p className="text-sm font-bold text-gray-900 dark:text-gray-100 tabular-nums">{formatCurrencyINR(itemTotal)}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>

            {/* ════ Summary + Checkout Section ════ */}
            {cart.length > 0 && (
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Left: Customer + Discount */}
                        <div className="flex-1 space-y-3">
                            {/* Customer Selector */}
                            <div className="flex gap-2">
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

                            {/* Discount */}
                            <div>
                                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">{t('pos.discount', 'Discount (%)')}</label>
                                <Input type="number" min={0} max={100} value={discount} onChange={(e) => setDiscount(Number(e.target.value))} className="text-sm" />
                            </div>
                        </div>

                        {/* Right: Totals */}
                        <div className="md:w-72 lg:w-80 space-y-1.5 md:text-right">
                            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                                <span>{t('pos.subtotal', 'Subtotal')}</span>
                                <span className="tabular-nums text-gray-900 dark:text-gray-100">{formatCurrencyINR(subtotal)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                                <span>{t('pos.tax', 'Tax (GST)')}</span>
                                <span className="tabular-nums text-gray-900 dark:text-gray-100">{formatCurrencyINR(taxTotal)}</span>
                            </div>
                            {discount > 0 && (
                                <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                                    <span>{t('pos.discount', 'Discount')} ({discount}%)</span>
                                    <span className="tabular-nums">-{formatCurrencyINR(discountAmount)}</span>
                                </div>
                            )}
                            <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-200 dark:border-gray-700">
                                <span className="text-gray-900 dark:text-gray-100">{t('pos.grandTotal', 'Grand Total')}</span>
                                <span className="text-blue-600 dark:text-blue-400 tabular-nums">{formatCurrencyINR(grandTotal)}</span>
                            </div>
                        </div>
                    </div>
                    <Button onClick={() => setShowCheckout(true)} disabled={!isOnline || cart.length === 0} className="w-full min-h-[48px] text-base font-semibold" size="lg">
                        <CreditCard className="w-5 h-5 mr-2" />
                        {t('pos.checkout', 'Checkout')} — {formatCurrencyINR(grandTotal)}
                    </Button>
                </div>
            )}

            {/* Mobile Bottom Cart Summary Removed as checkout explicitly moved directly below cart */}

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

            {/* ════ Product Lookup Dialog logic kept implicitly, but no trigger button now. ════ */}

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
                                {cart.map((item) => {
                                    const itemTotal = item.price * item.quantity * (1 + item.tax / 100);
                                    return (
                                        <div key={`${item.productId}-${item.variantId ?? ''}`} className="flex justify-between">
                                            <span className="text-gray-700 dark:text-gray-300">{item.name} × {item.quantity}</span>
                                            <span className="font-medium text-gray-900 dark:text-gray-100 tabular-nums">{formatCurrencyINR(itemTotal)}</span>
                                        </div>
                                    );
                                })}
                                <div className="border-t dark:border-gray-700 pt-3 space-y-1">
                                    <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">{t('pos.subtotal', 'Subtotal')}</span><span className="dark:text-gray-100">{formatCurrencyINR(subtotal)}</span></div>
                                    <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">{t('pos.tax', 'Tax (GST)')}</span><span className="dark:text-gray-100">{formatCurrencyINR(taxTotal)}</span></div>
                                    {discount > 0 && <div className="flex justify-between text-green-600 dark:text-green-400"><span>{t('pos.discount', 'Discount')} ({discount}%)</span><span>-{formatCurrencyINR(discountAmount)}</span></div>}
                                    <div className="flex justify-between font-bold text-base border-t dark:border-gray-700 pt-2">
                                        <span className="text-gray-900 dark:text-gray-100">{t('pos.total', 'Total')}</span>
                                        <span className="text-blue-600 dark:text-blue-400">{formatCurrencyINR(grandTotal)}</span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-medium mb-2 block text-gray-700 dark:text-gray-300">{t('pos.paymentMethod', 'Payment Method')}</label>
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
                                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300'
                                            )}
                                        >
                                            {getPaymentMethodLabel(method)}
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
                                {lastInvoiceNumber && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('pos.invoiceLabel', 'Invoice')}: {lastInvoiceNumber}</p>}
                            </div>

                            {selectedCustomer && (
                                <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                                    {t('pos.customerLabel', 'Customer')}: <strong className="text-gray-900 dark:text-gray-200">{selectedCustomer.name}</strong>
                                </div>
                            )}

                            <div className="border dark:border-gray-700 rounded-lg p-3 space-y-1 text-sm bg-gray-50 dark:bg-gray-800">
                                {cart.map((item) => {
                                    const itemTotal = item.price * item.quantity * (1 + item.tax / 100);
                                    return (
                                        <div key={`${item.productId}-${item.variantId ?? ''}`} className="flex justify-between">
                                            <span className="text-gray-700 dark:text-gray-300">{item.name} × {item.quantity}</span>
                                            <span className="text-gray-900 dark:text-gray-200 tabular-nums">{formatCurrencyINR(itemTotal)}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </DialogBody>
                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button variant="outline" onClick={handlePrintAgain} className="w-full sm:w-auto">
                            <Receipt className="w-4 h-4 mr-2" /> {t('pos.printAgain', 'Print Again')}
                        </Button>
                        <Button onClick={handleNewSale} className="w-full sm:w-auto">{t('pos.newSale', 'New Sale')}</Button>
                    </DialogFooter>
                </Dialog>
            )}
        </div>
    );
};

export default PointOfSale;
