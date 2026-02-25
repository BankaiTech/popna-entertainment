# Payment Gateway Integration Guide

This guide explains how to integrate payment gateways into your ISP management system for collecting subscription payments, invoice payments, and additional product purchases.

---

## 📋 Table of Contents
1. [Popular Payment Gateways in India](#popular-payment-gateways-in-india)
2. [Integration Steps](#integration-steps)
3. [Razorpay Integration (Recommended)](#razorpay-integration-recommended)
4. [PhonePe Integration](#phonepe-integration)
5. [Paytm Integration](#paytm-integration)
6. [Security Best Practices](#security-best-practices)
7. [Testing](#testing)
8. [Current Implementation](#current-implementation)

---

## 🇮🇳 Popular Payment Gateways in India

### 1. **Razorpay** (Recommended)
- **Best for:** Startups, SMEs, Large enterprises
- **Features:** UPI, Cards, Net Banking, Wallets, EMI
- **Pricing:** 2% per transaction
- **Setup time:** 1-2 days
- **Website:** https://razorpay.com
- **Why recommended:** Easy integration, excellent documentation, good support

### 2. **PhonePe Payment Gateway**
- **Best for:** UPI-focused businesses
- **Features:** UPI, Cards, Wallets
- **Pricing:** Competitive rates
- **Setup time:** 2-3 days
- **Website:** https://business.phonepe.com

### 3. **Paytm Payment Gateway**
- **Best for:** Businesses with existing Paytm user base
- **Features:** UPI, Cards, Paytm Wallet, Net Banking
- **Pricing:** 2-3% per transaction
- **Setup time:** 3-5 days
- **Website:** https://business.paytm.com

### 4. **Cashfree**
- **Best for:** Subscription businesses
- **Features:** Recurring payments, UPI, Cards
- **Pricing:** 2% per transaction
- **Website:** https://www.cashfree.com

### 5. **Instamojo**
- **Best for:** Small businesses, freelancers
- **Features:** Payment links, UPI, Cards
- **Pricing:** 2% + ₹3 per transaction
- **Website:** https://www.instamojo.com

---

## 🔧 Integration Steps (General)

### Step 1: Choose a Payment Gateway
- Compare features, pricing, and settlement times
- Check if they support your required payment methods (UPI, Cards, etc.)
- Review their documentation quality

### Step 2: Sign Up and Get Credentials
1. Visit the payment gateway website
2. Sign up for a business account
3. Complete KYC (Know Your Customer) verification:
   - Business PAN card
   - GST certificate
   - Bank account details
   - Business address proof
   - Director/Owner ID proof
4. Get API credentials:
   - **API Key** (Public key for frontend)
   - **API Secret** (Private key for backend - NEVER expose to frontend)
   - **Webhook Secret** (For payment notifications)

### Step 3: Set Up Backend API
Create a backend server (Node.js, Python, PHP, etc.) to:
- Generate payment orders
- Verify payment signatures
- Handle webhooks
- Update database

### Step 4: Integrate Frontend
- Add payment gateway SDK/library
- Create payment UI
- Handle payment success/failure

### Step 5: Test in Sandbox Mode
- Use test credentials
- Test all payment scenarios
- Verify webhook handling

### Step 6: Go Live
- Switch to production credentials
- Enable live mode
- Monitor transactions

---

## 💳 Razorpay Integration (Recommended)

### Why Razorpay?
- ✅ Easy to integrate
- ✅ Excellent documentation
- ✅ Supports all payment methods
- ✅ Good dashboard for tracking
- ✅ Automatic settlement
- ✅ Webhook support

### Prerequisites
1. Razorpay account: https://dashboard.razorpay.com/signup
2. Complete KYC verification
3. Get API keys from dashboard

### Backend Setup (Node.js Example)

#### 1. Install Razorpay SDK
```bash
npm install razorpay
```

#### 2. Create Payment Order API
```javascript
// backend/routes/payment.js
const Razorpay = require('razorpay');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create order endpoint
app.post('/api/payment/create-order', async (req, res) => {
  try {
    const { amount, currency, receipt, notes } = req.body;
    
    const options = {
      amount: amount * 100, // Amount in paise (₹1 = 100 paise)
      currency: currency || 'INR',
      receipt: receipt || `receipt_${Date.now()}`,
      notes: notes || {},
    };

    const order = await razorpay.orders.create(options);
    
    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Verify payment endpoint
app.post('/api/payment/verify', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
    hmac.update(razorpay_order_id + '|' + razorpay_payment_id);
    const generated_signature = hmac.digest('hex');

    if (generated_signature === razorpay_signature) {
      // Payment is verified
      // Update your database here
      // Mark invoice as paid, activate subscription, etc.
      
      res.json({
        success: true,
        message: 'Payment verified successfully',
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid signature',
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Webhook endpoint (for automatic payment notifications)
app.post('/api/payment/webhook', async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = req.headers['x-razorpay-signature'];
  
  const crypto = require('crypto');
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(req.body));
  const generated_signature = hmac.digest('hex');

  if (generated_signature === signature) {
    // Webhook is verified
    const event = req.body.event;
    const payment = req.body.payload.payment.entity;

    if (event === 'payment.captured') {
      // Payment successful
      // Update database
      console.log('Payment captured:', payment.id);
    }

    res.json({ status: 'ok' });
  } else {
    res.status(400).json({ status: 'invalid signature' });
  }
});
```

### Frontend Setup (React/TypeScript)

#### 1. Add Razorpay Script
```typescript
// src/utils/razorpay.ts
export const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};
```

#### 2. Create Payment Function
```typescript
// src/api/payment.ts
import { loadRazorpayScript } from '@/utils/razorpay';

export interface PaymentOptions {
  amount: number;
  description: string;
  customerName: string;
  customerEmail: string;
  customerMobile: string;
  orderId?: string;
}

export const initiatePayment = async (options: PaymentOptions) => {
  // Load Razorpay script
  const scriptLoaded = await loadRazorpayScript();
  if (!scriptLoaded) {
    throw new Error('Failed to load Razorpay SDK');
  }

  // Create order on backend
  const response = await fetch('/api/payment/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: options.amount,
      currency: 'INR',
      receipt: options.orderId || `order_${Date.now()}`,
      notes: {
        description: options.description,
      },
    }),
  });

  const orderData = await response.json();
  if (!orderData.success) {
    throw new Error('Failed to create order');
  }

  // Open Razorpay checkout
  return new Promise((resolve, reject) => {
    const razorpayOptions = {
      key: import.meta.env.VITE_RAZORPAY_KEY_ID, // Your Razorpay Key ID
      amount: orderData.amount,
      currency: orderData.currency,
      name: 'Your Company Name',
      description: options.description,
      order_id: orderData.orderId,
      prefill: {
        name: options.customerName,
        email: options.customerEmail,
        contact: options.customerMobile,
      },
      theme: {
        color: '#3B82F6', // Your brand color
      },
      handler: async (response: any) => {
        // Payment successful
        try {
          // Verify payment on backend
          const verifyResponse = await fetch('/api/payment/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });

          const verifyData = await verifyResponse.json();
          if (verifyData.success) {
            resolve(response);
          } else {
            reject(new Error('Payment verification failed'));
          }
        } catch (error) {
          reject(error);
        }
      },
      modal: {
        ondismiss: () => {
          reject(new Error('Payment cancelled by user'));
        },
      },
    };

    const razorpay = new (window as any).Razorpay(razorpayOptions);
    razorpay.open();
  });
};
```

#### 3. Use in Component
```typescript
// src/components/settings/BillingSettings.tsx
import { initiatePayment } from '@/api/payment';

const handlePayment = async () => {
  try {
    setLoading(true);
    
    const result = await initiatePayment({
      amount: 200, // ₹200
      description: 'Additional Product Purchase',
      customerName: organization.name,
      customerEmail: organization.email,
      customerMobile: organization.contactNumber,
    });

    // Payment successful
    alert('Payment successful!');
    // Update your database
    // Refresh data
    
  } catch (error) {
    console.error('Payment failed:', error);
    alert('Payment failed. Please try again.');
  } finally {
    setLoading(false);
  }
};
```

### Environment Variables
```env
# .env (Backend)
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxxxxxxxxxxxxxxxxxx

# .env (Frontend)
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
```

---

## 📱 PhonePe Integration

### Steps:
1. Sign up at https://business.phonepe.com
2. Complete KYC
3. Get API credentials
4. Use PhonePe SDK or API
5. Similar flow to Razorpay

### Key Differences:
- Strong focus on UPI
- Different API structure
- Webhook format differs

---

## 💰 Paytm Integration

### Steps:
1. Sign up at https://business.paytm.com
2. Complete merchant onboarding
3. Get MID (Merchant ID) and Merchant Key
4. Use Paytm SDK
5. Implement checksum verification

### Key Differences:
- Requires checksum generation
- Different callback structure
- Paytm wallet integration

---

## 🔒 Security Best Practices

### 1. Never Expose Secrets
```typescript
// ❌ WRONG - Never do this
const apiSecret = 'your_secret_key';

// ✅ CORRECT - Use environment variables
const apiSecret = process.env.RAZORPAY_KEY_SECRET;
```

### 2. Always Verify on Backend
```typescript
// ❌ WRONG - Don't trust frontend data
if (paymentSuccess) {
  markAsPaid(); // Can be manipulated
}

// ✅ CORRECT - Verify signature on backend
const verified = verifyPaymentSignature(orderId, paymentId, signature);
if (verified) {
  markAsPaid();
}
```

### 3. Use HTTPS
- Always use HTTPS in production
- Payment gateways require HTTPS for webhooks

### 4. Implement Webhooks
- Don't rely only on frontend callbacks
- Use webhooks for reliable payment notifications
- Verify webhook signatures

### 5. Store Minimal Data
- Never store card details
- Store only payment IDs and order IDs
- Let payment gateway handle sensitive data

---

## 🧪 Testing

### Test Mode
All payment gateways provide test/sandbox mode:

#### Razorpay Test Cards
```
Card Number: 4111 1111 1111 1111
CVV: Any 3 digits
Expiry: Any future date
```

#### Test UPI IDs
```
success@razorpay
failure@razorpay
```

### Test Scenarios
1. ✅ Successful payment
2. ❌ Failed payment
3. ⏰ Pending payment
4. 🔄 Refund
5. 🚫 Payment cancelled by user

---

## 📍 Current Implementation

### Files to Update

#### 1. Create Backend API
```
backend/
├── routes/
│   └── payment.js          # Payment routes
├── controllers/
│   └── paymentController.js # Payment logic
└── .env                     # API credentials
```

#### 2. Update Frontend Files

**src/api/payment.ts** (Create new file)
```typescript
// Payment API functions
export const createPaymentOrder = async (amount: number) => { ... }
export const verifyPayment = async (paymentData: any) => { ... }
export const initiatePayment = async (options: PaymentOptions) => { ... }
```

**src/components/settings/BillingSettings.tsx**
- Replace mock payment with real payment gateway
- Update `handlePayToRenew` function

**src/components/settings/ProductManagement.tsx**
- Replace mock payment with real payment gateway
- Update `handlePayForAdditionalProducts` function

#### 3. Environment Setup
```env
# Frontend (.env)
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
VITE_API_URL=http://localhost:3000

# Backend (.env)
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxxxxxxxxxxxxxxxxxx
PORT=3000
```

---

## 🚀 Quick Start Checklist

- [ ] Choose payment gateway (Razorpay recommended)
- [ ] Sign up and complete KYC
- [ ] Get API credentials (Key ID, Secret, Webhook Secret)
- [ ] Set up backend server (Node.js/Express recommended)
- [ ] Install payment gateway SDK
- [ ] Create payment order API endpoint
- [ ] Create payment verification API endpoint
- [ ] Set up webhook endpoint
- [ ] Add payment gateway script to frontend
- [ ] Create payment initiation function
- [ ] Update BillingSettings component
- [ ] Update ProductManagement component
- [ ] Test in sandbox mode
- [ ] Switch to production credentials
- [ ] Go live!

---

## 📞 Support

### Razorpay Support
- Email: support@razorpay.com
- Phone: +91-80-6890-6890
- Docs: https://razorpay.com/docs

### PhonePe Support
- Email: business.support@phonepe.com
- Docs: https://developer.phonepe.com

### Paytm Support
- Email: business@paytm.com
- Docs: https://developer.paytm.com

---

## 💡 Tips

1. **Start with Razorpay** - Easiest to integrate
2. **Test thoroughly** - Use all test scenarios
3. **Monitor transactions** - Check dashboard daily
4. **Handle failures gracefully** - Show clear error messages
5. **Keep records** - Log all payment attempts
6. **Automate reconciliation** - Match payments with orders
7. **Set up alerts** - Get notified of failed payments
8. **Provide support** - Help customers with payment issues

---

## 📊 Cost Comparison

| Gateway | Transaction Fee | Settlement Time | Setup Fee |
|---------|----------------|-----------------|-----------|
| Razorpay | 2% | T+2 days | ₹0 |
| PhonePe | 1.5-2% | T+1 days | ₹0 |
| Paytm | 2-3% | T+2 days | ₹0 |
| Cashfree | 2% | T+1 days | ₹0 |
| Instamojo | 2% + ₹3 | T+7 days | ₹0 |

*T = Transaction date*

---

## 🎯 Recommended Approach

For your ISP management system, I recommend:

1. **Primary Gateway:** Razorpay
   - Easy integration
   - Good for recurring payments
   - Excellent documentation

2. **Backup Gateway:** PhonePe
   - UPI-focused
   - Lower fees
   - Good for Indian market

3. **Implementation Order:**
   1. Set up Razorpay first
   2. Test thoroughly
   3. Go live
   4. Add PhonePe as alternative (optional)

---

**Need help with implementation? Let me know which payment gateway you'd like to integrate, and I can provide specific code for your project!**
