// POS State Management - uses InventoryProduct data
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

/** Snapshot of a bill that was held for later */
export interface HeldBill {
    id: string;
    cart: CartItem[];
    selectedCustomerId: number | null;
    discount: number;
    paymentMethod: 'cash' | 'upi' | 'card' | 'bank_transfer';
    createdAt: string; // ISO
}

interface POSState {
    cart: CartItem[];
    selectedCustomerId: number | null;
    discount: number; // percentage
    paymentMethod: 'cash' | 'upi' | 'card' | 'bank_transfer';
    heldBills: HeldBill[];
    addToCart: (item: Omit<CartItem, 'quantity'>) => void;
    removeFromCart: (productId: number, variantId?: number) => void;
    updateQuantity: (productId: number, quantity: number, variantId?: number) => void;
    setCustomer: (customerId: number | null) => void;
    setDiscount: (discount: number) => void;
    setPaymentMethod: (method: 'cash' | 'upi' | 'card' | 'bank_transfer') => void;
    clearCart: () => void;
    /** Save current cart as a held bill and clear cart */
    holdCurrentBill: () => string | null;
    /** Load a held bill into cart and remove it from held list. Returns true if found. */
    retrieveBill: (id: string) => boolean;
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
    heldBills: [],

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

    holdCurrentBill: () => {
        const { cart, selectedCustomerId, discount, paymentMethod, heldBills } = get();
        if (cart.length === 0) return null;
        const id = `hold-${Date.now()}`;
        const held: HeldBill = {
            id,
            cart: [...cart],
            selectedCustomerId,
            discount,
            paymentMethod,
            createdAt: new Date().toISOString(),
        };
        set({ heldBills: [...heldBills, held], cart: [], selectedCustomerId: null, discount: 0, paymentMethod: 'cash' });
        return id;
    },

    retrieveBill: (id: string) => {
        const { heldBills } = get();
        const idx = heldBills.findIndex((b) => b.id === id);
        if (idx === -1) return false;
        const [held] = heldBills.splice(idx, 1);
        set({ cart: held.cart, selectedCustomerId: held.selectedCustomerId, discount: held.discount, paymentMethod: held.paymentMethod, heldBills: [...heldBills] });
        return true;
    },

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
