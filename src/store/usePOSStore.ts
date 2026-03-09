// POS State Management — uses InventoryProduct data
import { create } from 'zustand';

export interface CartItem {
    productId: number;
    variantId?: number;
    name: string;
    sku: string;
    barcode?: string;
    price: number;
    quantity: number;
    tax: number; // percentage
}

interface POSState {
    cart: CartItem[];
    selectedCustomerId: number | null;
    discount: number; // percentage
    paymentMethod: 'cash' | 'upi' | 'card' | 'bank_transfer';
    addToCart: (item: Omit<CartItem, 'quantity'>) => void;
    removeFromCart: (productId: number, variantId?: number) => void;
    updateQuantity: (productId: number, quantity: number, variantId?: number) => void;
    setCustomer: (customerId: number | null) => void;
    setDiscount: (discount: number) => void;
    setPaymentMethod: (method: 'cash' | 'upi' | 'card' | 'bank_transfer') => void;
    clearCart: () => void;
    getSubtotal: () => number;
    getTaxTotal: () => number;
    getDiscountAmount: () => number;
    getGrandTotal: () => number;
}

const matchItem = (c: CartItem, productId: number, variantId?: number) =>
    c.productId === productId && c.variantId === variantId;

export const usePOSStore = create<POSState>((set, get) => ({
    cart: [],
    selectedCustomerId: null,
    discount: 0,
    paymentMethod: 'cash',

    addToCart: (item) => {
        const { cart } = get();
        const existing = cart.find((c) => matchItem(c, item.productId, item.variantId));
        if (existing) {
            set({ cart: cart.map((c) => matchItem(c, item.productId, item.variantId) ? { ...c, quantity: c.quantity + 1 } : c) });
        } else {
            set({ cart: [...cart, { ...item, quantity: 1 }] });
        }
    },

    removeFromCart: (productId, variantId) => {
        set({ cart: get().cart.filter((c) => !matchItem(c, productId, variantId)) });
    },

    updateQuantity: (productId, quantity, variantId) => {
        if (quantity <= 0) {
            get().removeFromCart(productId, variantId);
            return;
        }
        set({ cart: get().cart.map((c) => matchItem(c, productId, variantId) ? { ...c, quantity } : c) });
    },

    setCustomer: (customerId) => set({ selectedCustomerId: customerId }),
    setDiscount: (discount) => set({ discount: Math.min(100, Math.max(0, discount)) }),
    setPaymentMethod: (method) => set({ paymentMethod: method }),
    clearCart: () => set({ cart: [], selectedCustomerId: null, discount: 0, paymentMethod: 'cash' }),

    getSubtotal: () => get().cart.reduce((sum, item) => sum + item.price * item.quantity, 0),

    getTaxTotal: () => get().cart.reduce((sum, item) => sum + (item.price * item.quantity * item.tax) / 100, 0),

    getDiscountAmount: () => {
        const subtotal = get().getSubtotal();
        return (subtotal * get().discount) / 100;
    },

    getGrandTotal: () => {
        const subtotal = get().getSubtotal();
        const tax = get().getTaxTotal();
        const discountAmt = get().getDiscountAmount();
        return subtotal + tax - discountAmt;
    },
}));
