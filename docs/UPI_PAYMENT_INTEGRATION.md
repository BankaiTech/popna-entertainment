# UPI Payment Integration Guide

This app supports **recording** payment method (UPI, Cash, Card, Other) when staff collect payment. For **actual UPI collection** (customer pays online and money hits your account), you need a **payment gateway** and a **backend**.

---

## What You Have Now (No Gateway)

- **Payment Method** dropdown in **Collect Payment** modal: staff can select **UPI**, Cash, Card, or Other when recording a payment.
- Stored on the customer as `paymentMethod` for reports and reconciliation.
- No money movement — this is **recording only**.

---

## What You Need for Real UPI Collection

To accept UPI payments (and other methods) online you need:

1. **Backend API** (Node/Express, or your existing stack) that:
   - Creates a **payment order** with the gateway.
   - Returns **order id** (and optionally amount, currency) to the frontend.
   - Exposes a **webhook** URL for the gateway to send payment success/failure.
   - On success: updates customer `paymentStatus`, `collectedAmount`, `balanceAmount`, and optionally `paymentMethod: 'upi'`.

2. **Payment gateway** with UPI support. Common choices in India:

   | Gateway   | UPI | Docs / Signup |
   |----------|-----|----------------|
   | Razorpay | Yes | https://razorpay.com/docs/ |
   | Paytm    | Yes | https://developer.paytm.com/ |
   | PhonePe  | Yes | https://developer.phonepe.com/ |
   | CCAvenue | Yes | https://developer.ccavenue.com/ |
   | PayU     | Yes | https://dev.payu.in/ |

3. **Frontend** flow:
   - User clicks **“Pay via UPI”** (e.g. on invoice or in payment modal).
   - Frontend calls your backend: “create order for this customer/amount”.
   - Backend creates order with gateway, returns `orderId` (and key if needed).
   - Frontend loads gateway’s JS SDK and opens checkout (Razorpay’s `razorpay.open()` or similar).
   - Customer pays via UPI (or other method) in the gateway’s UI.
   - Gateway redirects or sends a callback; gateway also calls your **webhook**.
   - Backend verifies webhook signature, then updates payment status in your DB.
   - Frontend shows success/failure (redirect or callback URL).

---

## Recommended: Razorpay (Quick Start)

1. **Sign up**: https://dashboard.razorpay.com/signup  
2. **Get keys**: Dashboard → Settings → API Keys → Generate. Use **Test** keys for development.  
3. **Backend (Node example)**:
   - Install: `npm install razorpay`
   - Create order: `razorpay.orders.create({ amount: amountInPaise, currency: 'INR', ... })`
   - Webhook: verify `X-Razorpay-Signature`, then update your DB (mark payment success, update customer).  
4. **Frontend**:
   - Add script: `https://checkout.razorpay.com/v1/checkout.js`
   - Create order via your API, then:
   ```js
   const options = { key: 'YOUR_KEY', amount: amountInPaise, order_id: orderId, ... };
   const rzp = new window.Razorpay(options);
   rzp.on('payment.success', () => { /* call your API to confirm or refresh */ });
   rzp.open();
   ```
5. **UPI**: Razorpay checkout shows UPI (and other methods) automatically; no extra UPI-specific integration.

---

## Security Notes

- Never put **secret key** in frontend. Only **publishable/key id** in frontend; create orders and verify webhooks on backend with secret.
- Always **verify webhook signature** on the server before updating payment status.
- Use **HTTPS** in production; gateways require it for webhooks.

---

## Optional: “Pay via UPI” Button in This App

When you have a backend that creates orders:

1. Add an API helper (e.g. `src/api/payments.ts`) that calls your backend: `createPaymentOrder(customerId, amount, description)`.
2. In **PaymentCollectionModal** or on the invoice view, add a **“Pay via UPI”** button that:
   - Calls `createPaymentOrder(...)`.
   - Opens gateway checkout with the returned `orderId`.
   - On success, refreshes customer data or updates local state so `paymentStatus` / `collectedAmount` reflect the payment.

Until the backend and gateway are in place, the **Payment Method** dropdown (UPI, Cash, Card, Other) is the right way to record that a payment was received via UPI.
