// Point of Sale Module — PWA: offline notice and checkout disabled when offline
import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '@/store/useStore';
import { usePOSStore } from '@/store/usePOSStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/Dialog';
import { Search, ShoppingCart, Plus, Minus, Trash2, CreditCard, Receipt, X, WifiOff } from 'lucide-react';
import { cn, formatCurrencyINR } from '@/lib/utils';

const PointOfSale = () => {
    const { t } = useTranslation();
    const { customers, fetchCustomers, products, fetchProducts, initialize } = useStore();
    const {
        cart, selectedCustomerId, discount, paymentMethod,
        addToCart, removeFromCart, updateQuantity,
        setCustomer, setDiscount, setPaymentMethod, clearCart,
        getSubtotal, getTaxTotal, getDiscountAmount, getGrandTotal,
    } = usePOSStore();

    const [productSearch, setProductSearch] = useState('');
    const [showCheckout, setShowCheckout] = useState(false);
    const [showReceipt, setShowReceipt] = useState(false);
    const [showCart, setShowCart] = useState(false); // Mobile cart drawer
    const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

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
        const load = async () => {
            await initialize();
            await fetchProducts();
            await fetchCustomers();
        };
        load();
    }, [initialize, fetchProducts, fetchCustomers]);

    // Use products from store as POS items
    const posProducts = useMemo(() => {
        return products.map((p) => ({
            id: p.id,
            name: p.name,
            price: 0, // Products don't have basePrice; will be set from plans or manual pricing
            tax: 18, // default GST
            category: p.productType || 'general',
        }));
    }, [products]);

    const filteredProducts = useMemo(() => {
        if (!productSearch.trim()) return posProducts;
        const q = productSearch.toLowerCase();
        return posProducts.filter((p) => p.name.toLowerCase().includes(q));
    }, [posProducts, productSearch]);

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

    return (
        <div className="space-y-4">
            {/* Offline notice — PWA: clear message for POS */}
            {!isOnline && (
                <div className="flex items-center gap-2 rounded-lg bg-amber-100 border border-amber-300 text-amber-800 py-2 px-3 text-sm" role="status">
                    <WifiOff className="w-4 h-4 shrink-0" />
                    <span>{t('pos.offlineNotice', 'You are offline. Connect to the internet to complete checkout.')}</span>
                </div>
            )}
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                    <h1 className="text-xl font-bold text-foreground">{t('pos.title', 'Point of Sale')}</h1>
                    <p className="text-xs text-muted-foreground">{t('pos.subtitle', 'Quick billing and sales')}</p>
                </div>
                {/* Mobile cart toggle */}
                <Button onClick={() => setShowCart(true)} className="md:hidden w-full sm:w-auto relative">
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    {t('pos.mobileCart', 'Cart')}
                    {cart.length > 0 && (
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                            {cart.reduce((s, c) => s + c.quantity, 0)}
                        </span>
                    )}
                </Button>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
                {/* ════ Product Grid ════ */}
                <div className="flex-1 space-y-3">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            value={productSearch}
                            onChange={(e) => setProductSearch(e.target.value)}
                            placeholder={t('pos.searchPlaceholder', 'Search products...')}
                            className="pl-9"
                        />
                    </div>

                    {/* Product grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {filteredProducts.map((product) => {
                            const inCart = cart.find((c) => c.productId === product.id);
                            return (
                                <button
                                    key={product.id}
                                    onClick={() => addToCart({ productId: product.id, name: product.name, price: product.price, tax: product.tax })}
                                    className={cn(
                                        "relative p-3 sm:p-4 rounded-xl border-2 transition-all text-left hover:shadow-md",
                                        inCart ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-blue-300'
                                    )}
                                >
                                    <div className="text-sm font-medium text-gray-900 truncate">{product.name}</div>
                                    <div className="text-xs text-gray-500 mt-1 capitalize">{product.category}</div>
                                    <div className="text-sm font-bold text-blue-600 mt-2">{formatCurrencyINR(product.price)}</div>
                                    {inCart && (
                                        <span className="absolute top-2 right-2 bg-blue-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                                            {inCart.quantity}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                        {filteredProducts.length === 0 && (
                            <div className="col-span-full text-center py-12 text-gray-500">{t('pos.noProducts', 'No products found')}</div>
                        )}
                    </div>
                </div>

                {/* ════ Cart Sidebar (Desktop) ════ */}
                <div className="hidden md:block w-80 lg:w-96">
                    <Card className="sticky top-20">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                <ShoppingCart className="w-4 h-4" />
                                {t('pos.cart', 'Cart')} ({cart.reduce((s, c) => s + c.quantity, 0)} {t('pos.cartItems', 'items')})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {/* Customer Selection */}
                            <div>
                                <label className="text-xs font-medium text-gray-600 mb-1 block">{t('pos.customer', 'Customer')}</label>
                                <Select value={selectedCustomerId ?? ''} onChange={(e) => setCustomer(e.target.value ? Number(e.target.value) : null)} className="text-sm">
                                    <option value="">{t('pos.walkIn', 'Walk-in Customer')}</option>
                                    {customers.map((c) => (
                                        <option key={c.id} value={c.id}>{c.name} - {c.mobile}</option>
                                    ))}
                                </Select>
                            </div>

                            {/* Cart items */}
                            {cart.length === 0 ? (
                                <div className="text-center py-8 text-gray-400 text-sm">{t('pos.emptyCart', 'Cart is empty')}</div>
                            ) : (
                                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                    {cart.map((item) => (
                                        <div key={item.productId} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">{item.name}</p>
                                                <p className="text-xs text-gray-500">{formatCurrencyINR(item.price)} × {item.quantity}</p>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => updateQuantity(item.productId, item.quantity - 1)} className="p-1 rounded hover:bg-gray-200">
                                                    <Minus className="w-3.5 h-3.5" />
                                                </button>
                                                <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                                                <button onClick={() => updateQuantity(item.productId, item.quantity + 1)} className="p-1 rounded hover:bg-gray-200">
                                                    <Plus className="w-3.5 h-3.5" />
                                                </button>
                                                <button onClick={() => removeFromCart(item.productId)} className="p-1 rounded hover:bg-red-100 text-red-500 ml-1">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Discount */}
                            {cart.length > 0 && (
                                <>
                                    <div>
                                        <label className="text-xs font-medium text-gray-600 mb-1 block">{t('pos.discount', 'Discount (%)')}</label>
                                        <Input type="number" min={0} max={100} value={discount} onChange={(e) => setDiscount(Number(e.target.value))} className="text-sm" />
                                    </div>

                                    {/* Totals */}
                                    <div className="border-t pt-3 space-y-1 text-sm">
                                        <div className="flex justify-between"><span className="text-gray-600">{t('pos.subtotal', 'Subtotal')}</span><span>{formatCurrencyINR(subtotal)}</span></div>
                                        <div className="flex justify-between"><span className="text-gray-600">{t('pos.tax', 'Tax (GST)')}</span><span>{formatCurrencyINR(taxTotal)}</span></div>
                                        {discount > 0 && <div className="flex justify-between text-green-600"><span>{t('pos.discount', 'Discount')} ({discount}%)</span><span>-{formatCurrencyINR(discountAmount)}</span></div>}
                                        <div className="flex justify-between font-bold text-base border-t pt-2"><span>{t('pos.total', 'Total')}</span><span className="text-blue-600">{formatCurrencyINR(grandTotal)}</span></div>
                                    </div>

                                    <Button onClick={handleCheckout} className="w-full" disabled={cart.length === 0}>
                                        <CreditCard className="w-4 h-4 mr-2" />
                                        {t('pos.checkout', 'Checkout')}
                                    </Button>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* ════ Mobile Cart Drawer — ends above bottom nav (bottom-16), nav stays visible, Checkout always visible ════ */}
            {showCart && (
                <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label={t('pos.mobileCart', 'Cart')}>
                    <div className="fixed inset-0 bg-black/50" onClick={() => setShowCart(false)} aria-hidden="true" />
                    <div className="fixed left-0 right-0 bottom-16 bg-white rounded-t-2xl max-h-[85dvh] flex flex-col pb-4">
                        <div className="shrink-0 flex justify-between items-center p-4 border-b border-gray-100">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <ShoppingCart className="w-5 h-5" /> {t('pos.mobileCart', 'Cart')}
                            </h3>
                            <button type="button" onClick={() => setShowCart(false)} className="p-2 hover:bg-gray-100 rounded-full min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label={t('common.close', 'Close')}>
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-3 space-y-3">
                            <Select value={selectedCustomerId ?? ''} onChange={(e) => setCustomer(e.target.value ? Number(e.target.value) : null)} className="text-sm">
                                <option value="">{t('pos.walkIn', 'Walk-in Customer')}</option>
                                {customers.map((c) => <option key={c.id} value={c.id}>{c.name} - {c.mobile}</option>)}
                            </Select>

                            {cart.length === 0 ? (
                                <div className="text-center py-8 text-gray-400">{t('pos.emptyCart', 'Cart is empty')}</div>
                            ) : (
                                <>
                                    <div className="space-y-2">
                                        {cart.map((item) => (
                                            <div key={item.productId} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium truncate">{item.name}</p>
                                                    <p className="text-xs text-gray-500">{formatCurrencyINR(item.price)} × {item.quantity} = {formatCurrencyINR(item.price * item.quantity)}</p>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button type="button" onClick={() => updateQuantity(item.productId, item.quantity - 1)} className="min-w-[44px] min-h-[44px] p-2 rounded-lg bg-gray-200 touch-manipulation flex items-center justify-center" aria-label={t('common.previous', 'Decrease')}><Minus className="w-4 h-4" /></button>
                                                    <span className="text-sm font-medium w-8 text-center flex items-center justify-center min-h-[44px]">{item.quantity}</span>
                                                    <button type="button" onClick={() => updateQuantity(item.productId, item.quantity + 1)} className="min-w-[44px] min-h-[44px] p-2 rounded-lg bg-gray-200 touch-manipulation flex items-center justify-center" aria-label={t('common.next', 'Increase')}><Plus className="w-4 h-4" /></button>
                                                    <button type="button" onClick={() => removeFromCart(item.productId)} className="min-w-[44px] min-h-[44px] p-2 rounded-lg bg-red-50 text-red-500 ml-1 touch-manipulation flex items-center justify-center" aria-label={t('common.delete', 'Remove')}><Trash2 className="w-4 h-4" /></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div>
                                        <label className="text-xs font-medium text-gray-600 mb-1 block">{t('pos.discount', 'Discount (%)')}</label>
                                        <Input type="number" min={0} max={100} value={discount} onChange={(e) => setDiscount(Number(e.target.value))} />
                                    </div>

                                    <div className="border-t pt-3 space-y-1 text-sm">
                                        <div className="flex justify-between"><span className="text-gray-600">{t('pos.subtotal', 'Subtotal')}</span><span>{formatCurrencyINR(subtotal)}</span></div>
                                        <div className="flex justify-between"><span className="text-gray-600">{t('pos.tax', 'Tax (GST)')}</span><span>{formatCurrencyINR(taxTotal)}</span></div>
                                        {discount > 0 && <div className="flex justify-between text-green-600"><span>{t('pos.discount', 'Discount')} ({discount}%)</span><span>-{formatCurrencyINR(discountAmount)}</span></div>}
                                        <div className="flex justify-between font-bold text-lg border-t pt-2"><span>{t('pos.total', 'Total')}</span><span className="text-blue-600">{formatCurrencyINR(grandTotal)}</span></div>
                                    </div>
                                </>
                            )}
                        </div>

                        {cart.length > 0 && (
                            <div className="shrink-0 p-4 pt-3 border-t border-gray-200 bg-white">
                                <Button onClick={() => { setShowCart(false); handleCheckout(); }} className="w-full min-h-[56px] touch-manipulation text-base font-semibold shadow-md" size="lg">
                                    <CreditCard className="w-4 h-4 mr-2" /> {t('pos.checkout', 'Checkout')} — {formatCurrencyINR(grandTotal)}
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ════ Checkout Dialog ════ */}
            {showCheckout && (
                <Dialog open={showCheckout} onClose={() => setShowCheckout(false)} size="lg">
                    <DialogHeader title={t('pos.checkout', 'Checkout')} onClose={() => setShowCheckout(false)} />
                    <DialogBody>
                        <div className="px-4 sm:px-6 py-4 space-y-4">
                            {!isOnline && (
                                <div className="flex items-center gap-2 rounded-lg bg-amber-100 border border-amber-300 text-amber-800 py-2 px-3 text-sm">
                                    <WifiOff className="w-4 h-4 shrink-0" />
                                    <span>{t('pos.offlineCheckout', 'Connect to the internet to complete checkout.')}</span>
                                </div>
                            )}
                            {selectedCustomer && (
                                <div className="p-3 bg-blue-50 rounded-lg">
                                    <p className="text-sm font-medium text-blue-900">{selectedCustomer.name}</p>
                                    <p className="text-xs text-blue-700">{selectedCustomer.mobile}</p>
                                </div>
                            )}

                            <div className="space-y-2 text-sm">
                                {cart.map((item) => (
                                    <div key={item.productId} className="flex justify-between">
                                        <span>{item.name} × {item.quantity}</span>
                                        <span className="font-medium">{formatCurrencyINR(item.price * item.quantity)}</span>
                                    </div>
                                ))}
                                <div className="border-t pt-2 space-y-1">
                                    <div className="flex justify-between"><span>{t('pos.subtotal', 'Subtotal')}</span><span>{formatCurrencyINR(subtotal)}</span></div>
                                    <div className="flex justify-between"><span>{t('pos.tax', 'Tax (GST)')}</span><span>{formatCurrencyINR(taxTotal)}</span></div>
                                    {discount > 0 && <div className="flex justify-between text-green-600"><span>{t('pos.discount', 'Discount')} ({discount}%)</span><span>-{formatCurrencyINR(discountAmount)}</span></div>}
                                    <div className="flex justify-between font-bold text-lg border-t pt-2"><span>{t('pos.total', 'Total')}</span><span className="text-blue-600">{formatCurrencyINR(grandTotal)}</span></div>
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-medium mb-2 block">{t('pos.paymentMethod', 'Payment Method')}</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {(['cash', 'upi', 'card', 'bank_transfer'] as const).map((method) => (
                                        <button
                                            key={method}
                                            type="button"
                                            onClick={() => setPaymentMethod(method)}
                                            className={cn(
                                                'p-3 rounded-lg border-2 text-sm font-medium transition-all',
                                                paymentMethod === method ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300'
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
                        <Button onClick={handleConfirmCheckout} disabled={!isOnline} className="w-full sm:w-auto min-h-[44px] sm:min-h-0" title={!isOnline ? t('pos.offlineCheckout', 'Connect to the internet to complete checkout.') : undefined}>
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
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <Receipt className="w-8 h-8 text-green-600" />
                                </div>
                                <p className="text-2xl font-bold text-green-600">{formatCurrencyINR(grandTotal)}</p>
                                <p className="text-sm text-gray-500 mt-1">{t('pos.paymentReceived', 'Payment received via')} {getPaymentMethodLabel(paymentMethod)}</p>
                            </div>

                            {selectedCustomer && (
                                <div className="text-center text-sm text-gray-600">
                                    {t('pos.customerLabel', 'Customer')}: <strong>{selectedCustomer.name}</strong>
                                </div>
                            )}

                            <div className="border rounded-lg p-3 space-y-1 text-sm bg-gray-50">
                                {cart.map((item) => (
                                    <div key={item.productId} className="flex justify-between">
                                        <span>{item.name} × {item.quantity}</span>
                                        <span>{formatCurrencyINR(item.price * item.quantity)}</span>
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
