// The Cashfree loader ships without types. Only what LCO Desk uses.
declare module '@cashfreepayments/cashfree-js' {
  export interface CashfreeCheckoutOptions {
    paymentSessionId: string;
    redirectTarget?: '_self' | '_blank' | '_top' | '_modal' | HTMLElement;
  }
  export interface Cashfree {
    /** _self: page leaves for Cashfree. _modal: popup over our page; resolves when it closes. */
    checkout(options: CashfreeCheckoutOptions): Promise<{
      error?: { message?: string };
      redirect?: boolean;
      paymentDetails?: { paymentMessage?: string };
    }>;
  }
  export function load(options: { mode: 'sandbox' | 'production' }): Promise<Cashfree | null>;
}
