// Point of Sale Module
import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '@/store/useStore';
import { usePOSStore } from '@/store/usePOSStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/Dialog';
import { Search, ShoppingCart, Plus, Minus, Trash2, CreditCard, Receipt, X } from 'lucide-react';
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
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                    <h1 className="text-xl font-bold text-foreground">{t('pos.title', 'Point of Sale')}</h1>
                    <p className="text-xs text-muted-foreground">{t('pos.subtitle', 'Quick billing and sales')}</p>
                </div>
                {/* Mobile cart toggle */}
                <Button onClick={() => setShowCart(true)} className="md:hidden w-full sm:w-auto relative">
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Cart
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
                            placeholder="Search products..."
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
                            <div className="col-span-full text-center py-12 text-gray-500">No products found</div>
                        )}
                    </div>
                </div>

                {/* ════ Cart Sidebar (Desktop) ════ */}
                <div className="hidden md:block w-80 lg:w-96">
                    <Card className="sticky top-20">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                <ShoppingCart className="w-4 h-4" />
                                Cart ({cart.reduce((s, c) => s + c.quantity, 0)} items)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {/* Customer Selection */}
                            <div>
                                <label className="text-xs font-medium text-gray-600 mb-1 block">Customer</label>
                                <Select value={selectedCustomerId ?? ''} onChange={(e) => setCustomer(e.target.value ? Number(e.target.value) : null)} className="text-sm">
                                    <option value="">Walk-in Customer</option>
                                    {customers.map((c) => (
                                        <option key={c.id} value={c.id}>{c.name} - {c.mobile}</option>
                                    ))}
                                </Select>
                            </div>

                            {/* Cart items */}
                            {cart.length === 0 ? (
                                <div className="text-center py-8 text-gray-400 text-sm">Cart is empty</div>
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
                                        <label className="text-xs font-medium text-gray-600 mb-1 block">Discount (%)</label>
                                        <Input type="number" min={0} max={100} value={discount} onChange={(e) => setDiscount(Number(e.target.value))} className="text-sm" />
                                    </div>

                                    {/* Totals */}
                                    <div className="border-t pt-3 space-y-1 text-sm">
                                        <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span>{formatCurrencyINR(subtotal)}</span></div>
                                        <div className="flex justify-between"><span className="text-gray-600">Tax (GST)</span><span>{formatCurrencyINR(taxTotal)}</span></div>
                                        {discount > 0 && <div className="flex justify-between text-green-600"><span>Discount ({discount}%)</span><span>-{formatCurrencyINR(discountAmount)}</span></div>}
                                        <div className="flex justify-between font-bold text-base border-t pt-2"><span>Total</span><span className="text-blue-600">{formatCurrencyINR(grandTotal)}</span></div>
                                    </div>

                                    <Button onClick={handleCheckout} className="w-full" disabled={cart.length === 0}>
                                        <CreditCard className="w-4 h-4 mr-2" />
                                        Checkout
                                    </Button>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* ════ Mobile Cart Drawer ════ */}
            {showCart && (
                <div className="fixed inset-0 z-50 md:hidden">
                    <div className="fixed inset-0 bg-black/50" onClick={() => setShowCart(false)} />
                    <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[80vh] overflow-y-auto z-50 p-4 space-y-3">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <ShoppingCart className="w-5 h-5" /> Cart
                            </h3>
                            <button onClick={() => setShowCart(false)} className="p-2 hover:bg-gray-100 rounded-full">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <Select value={selectedCustomerId ?? ''} onChange={(e) => setCustomer(e.target.value ? Number(e.target.value) : null)} className="text-sm">
                            <option value="">Walk-in Customer</option>
                            {customers.map((c) => <option key={c.id} value={c.id}>{c.name} - {c.mobile}</option>)}
                        </Select>

                        {cart.length === 0 ? (
                            <div className="text-center py-8 text-gray-400">Cart is empty</div>
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
                                                <button onClick={() => updateQuantity(item.productId, item.quantity - 1)} className="p-1.5 rounded-lg bg-gray-200"><Minus className="w-4 h-4" /></button>
                                                <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                                                <button onClick={() => updateQuantity(item.productId, item.quantity + 1)} className="p-1.5 rounded-lg bg-gray-200"><Plus className="w-4 h-4" /></button>
                                                <button onClick={() => removeFromCart(item.productId)} className="p-1.5 rounded-lg bg-red-50 text-red-500 ml-1"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div>
                                    <label className="text-xs font-medium text-gray-600 mb-1 block">Discount (%)</label>
                                    <Input type="number" min={0} max={100} value={discount} onChange={(e) => setDiscount(Number(e.target.value))} />
                                </div>

                                <div className="border-t pt-3 space-y-1 text-sm">
                                    <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span>{formatCurrencyINR(subtotal)}</span></div>
                                    <div className="flex justify-between"><span className="text-gray-600">Tax (GST)</span><span>{formatCurrencyINR(taxTotal)}</span></div>
                                    {discount > 0 && <div className="flex justify-between text-green-600"><span>Discount ({discount}%)</span><span>-{formatCurrencyINR(discountAmount)}</span></div>}
                                    <div className="flex justify-between font-bold text-lg border-t pt-2"><span>Total</span><span className="text-blue-600">{formatCurrencyINR(grandTotal)}</span></div>
                                </div>

                                <Button onClick={() => { setShowCart(false); handleCheckout(); }} className="w-full" size="lg">
                                    <CreditCard className="w-4 h-4 mr-2" /> Checkout — {formatCurrencyINR(grandTotal)}
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ════ Checkout Dialog ════ */}
            {showCheckout && (
                <Dialog open={showCheckout} onClose={() => setShowCheckout(false)}>
                    <DialogHeader title="Checkout" onClose={() => setShowCheckout(false)} />
                    <DialogBody>
                        <div className="px-4 sm:px-6 py-4 space-y-4">
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
                                    <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrencyINR(subtotal)}</span></div>
                                    <div className="flex justify-between"><span>Tax</span><span>{formatCurrencyINR(taxTotal)}</span></div>
                                    {discount > 0 && <div className="flex justify-between text-green-600"><span>Discount ({discount}%)</span><span>-{formatCurrencyINR(discountAmount)}</span></div>}
                                    <div className="flex justify-between font-bold text-lg border-t pt-2"><span>Total</span><span className="text-blue-600">{formatCurrencyINR(grandTotal)}</span></div>
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-medium mb-2 block">Payment Method</label>
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
                                            {method === 'cash' ? '💵 Cash' : method === 'upi' ? '📱 UPI' : method === 'card' ? '💳 Card' : '🏦 Bank Transfer'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </DialogBody>
                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button variant="outline" onClick={() => setShowCheckout(false)} className="w-full sm:w-auto">Cancel</Button>
                        <Button onClick={handleConfirmCheckout} className="w-full sm:w-auto">
                            <Receipt className="w-4 h-4 mr-2" /> Confirm — {formatCurrencyINR(grandTotal)}
                        </Button>
                    </DialogFooter>
                </Dialog>
            )}

            {/* ════ Receipt Dialog ════ */}
            {showReceipt && (
                <Dialog open={showReceipt} onClose={handleNewSale}>
                    <DialogHeader title="Sale Complete ✓" onClose={handleNewSale} />
                    <DialogBody>
                        <div className="px-4 sm:px-6 py-4 space-y-4">
                            <div className="text-center">
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <Receipt className="w-8 h-8 text-green-600" />
                                </div>
                                <p className="text-2xl font-bold text-green-600">{formatCurrencyINR(grandTotal)}</p>
                                <p className="text-sm text-gray-500 mt-1">Payment received via {paymentMethod.replace('_', ' ')}</p>
                            </div>

                            {selectedCustomer && (
                                <div className="text-center text-sm text-gray-600">
                                    Customer: <strong>{selectedCustomer.name}</strong>
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
                        <Button onClick={handleNewSale} className="w-full">New Sale</Button>
                    </DialogFooter>
                </Dialog>
            )}
        </div>
    );
};

export default PointOfSale;
