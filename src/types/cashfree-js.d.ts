// The Cashfree loader ships without types. Only what LCO Desk uses.
declare module '@cashfreepayments/cashfree-js' {
  export interface CashfreeCheckoutOptions {
    paymentSessionId: string;
    redirectTarget?: '_self' | '_blank' | '_top' | '_modal' | HTMLElement;
  }
  export interface Cashfree {
    checkout(options: CashfreeCheckoutOptions): Promise<{ error?: { message?: string }; redirect?: boolean }>;
  }
  export function load(options: { mode: 'sandbox' | 'production' }): Promise<Cashfree | null>;
}
