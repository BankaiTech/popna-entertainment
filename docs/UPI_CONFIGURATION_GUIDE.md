# UPI Configuration Guide

Your system supports zero-cost UPI payments without any payment gateway. There are **two UPI contexts**:

| Context | Who pays whom | Where configured | Used in |
|--------|----------------|------------------|--------|
| **Platform (our) UPI** | Organization pays the platform | Environment variables | Subscription renewal, Additional products |
| **Organization admin UPI** | Customer pays the organization | Settings → Billing | Customer "Pay Now" (plan payment) |

---

## 1. Platform (Our) UPI — Renewal & Additional Products

Used when **organizations pay the platform**: subscription renewal and additional product purchases.

**Configure via environment variables** (e.g. in `.env` or deployment config):

```env
VITE_PLATFORM_UPI_ID=yourname@paytm
VITE_PLATFORM_UPI_NAME=Platform Name
```

- **Subscription renewal:** Settings → Billing → "Pay via UPI (monthly renewal)" → shows **platform** UPI/QR.
- **Additional products:** Product Management → Pay for extra products → shows **platform** UPI/QR.

If these are not set, renewal and additional-product payment will show a "not configured" message.

---

## 2. Organization Admin UPI — Customer Plan Payments

Used when **customers pay the organization** for their plan (Pay Now on customer dashboard).

**Configure through Settings UI:**

1. **Login to Admin Panel**
2. **Go to Settings → Billing Tab**
3. **Configure UPI Settings:**
   - ✅ Enable UPI payments (checkbox)
   - Enter your UPI ID (e.g., `yourname@paytm`, `yourname@oksbi`, `yourname@ybl`)
   - Enter your business display name (shown to customers)
   - Select supported UPI apps (GPay, PhonePe, Paytm, BHIM)
4. **Click Save**

When a customer clicks **Pay Now** on the customer dashboard, they see **your organization’s UPI/QR** (and amount). If UPI is not configured, they see a message to contact the provider.

---

## Where UPI Payments Are Used

### Platform UPI (our) — organization pays us
- **Subscription renewal:** Settings → Billing → Pay via UPI (monthly renewal). Amount: ₹500 (configurable).
- **Additional products:** Product Management → Pay for products beyond the free limit. Amount: ₹200 per product.

### Organization admin UPI — customer pays org
- **Customer plan payment:** Customer dashboard → Pay Now. Amount: customer’s balance/pending amount. Shows org admin’s UPI and QR.

---

## How It Works

### For Desktop Users:
1. Customer clicks "Pay via UPI"
2. QR code is displayed
3. Customer scans with any UPI app
4. Payment is completed in their app
5. Customer shares UTR number or screenshot

### For Mobile Users:
1. Customer clicks "Pay via UPI"
2. Buttons for GPay, PhonePe, Paytm, BHIM are shown
3. Customer clicks their preferred app
4. App opens with pre-filled payment details
5. Customer completes payment
6. Customer shares UTR number or screenshot

---

## How do we get confirmation when payment is complete?

With **direct UPI** (no payment gateway), there is **no automatic** confirmation. You have two options:

### Option 1: Manual confirmation (current)

1. Customer pays via UPI and gets a **UTR (Unique Transaction Reference)** or takes a **screenshot**.
2. Customer shares the UTR or screenshot with you (email, WhatsApp, or a simple “Submit UTR” form in your app).
3. You verify the payment in your bank/UPI app and then **manually** extend the subscription or mark the order as paid in your admin panel.

This is how the app is designed today: after paying, the user is asked to share the screenshot or UTR for verification.

### Option 2: Automatic confirmation (future)

To get **automatic** confirmation when payment is complete, you need a **payment gateway** (e.g. Razorpay, Paytm Business, PhonePe Gateway) that:

- Creates a payment link or UPI intent tied to an order/subscription.
- Sends a **webhook** to your backend when payment succeeds.
- Your backend then updates the subscription or order status and (optionally) notifies the user.

The current UPI flow is API-ready so you can later replace the “Pay via UPI” step with a gateway-hosted page or API and keep the rest of the app (subscription dates, renewal UI, etc.) as is.

---

## Payment Verification Process (manual flow)

1. **Customer initiates payment** → Gets QR code or app buttons
2. **Customer completes payment** → In their UPI app
3. **Customer shares proof:** UTR number or payment screenshot
4. **Admin verifies payment** → Manually checks bank account
5. **Admin activates service** → Updates subscription or enables feature

---

## Supported UPI Apps

- ✅ Google Pay (GPay)
- ✅ PhonePe
- ✅ Paytm
- ✅ BHIM
- ✅ Any other UPI app (via QR code)

---

## Benefits of This Approach

✅ **Zero transaction fees** - No payment gateway charges
✅ **No KYC required** - Use your existing UPI ID
✅ **No integration complexity** - Just configure your UPI ID
✅ **Works with all UPI apps** - Universal compatibility
✅ **Instant setup** - Configure in 2 minutes

---

## Example UPI IDs

- `yourname@paytm` (Paytm)
- `yourname@ybl` (PhonePe)
- `yourname@oksbi` (SBI)
- `yourname@icici` (ICICI)
- `yourname@axisbank` (Axis Bank)
- `9876543210@paytm` (Mobile number based)

---

## Testing

1. Configure your UPI ID in Settings
2. Try the "Pay to Renew" button
3. On mobile: Check if app buttons work
4. On desktop: Check if QR code displays
5. Complete a test payment
6. Verify you receive the payment in your account

---

## Next Steps

1. ✅ Configure your UPI ID in Settings → Billing
2. ✅ Test the payment flow
3. ✅ Set up a process to verify customer payments
4. ✅ Create a simple form/page for customers to submit UTR numbers
5. ✅ Train your team on payment verification

---

## Need Help?

- Check `UPI_PAYMENT_WITHOUT_GATEWAY.md` for technical details
- Check `src/components/UpiPaymentModal.tsx` for modal implementation
- Check `src/utils/upiPayment.ts` for utility functions
