# UPI Payment Without Payment Gateway

This guide explains how to accept UPI payments directly without using a payment gateway, by generating UPI deep links and QR codes that redirect users to their preferred UPI apps (GPay, PhonePe, Paytm, BHIM, etc.).

---

## 🎯 Benefits

✅ **Zero Transaction Fees** - No payment gateway charges  
✅ **Instant Setup** - No KYC or approval needed  
✅ **Direct to Bank** - Money goes directly to your account  
✅ **All UPI Apps Supported** - GPay, PhonePe, Paytm, BHIM, etc.  
✅ **QR Code Support** - Users can scan and pay  
✅ **Deep Links** - Direct app opening  

⚠️ **Limitations:**
- Manual payment verification required
- No automatic payment confirmation
- Customer needs to send payment screenshot/UTR
- You need to manually mark payments as received

---

## 📱 How UPI Deep Links Work

UPI apps support a standard URL format that opens the payment screen:

```
upi://pay?pa=<UPI_ID>&pn=<NAME>&am=<AMOUNT>&cu=<CURRENCY>&tn=<NOTE>
```

### Parameters:
- `pa` - Payee Address (Your UPI ID)
- `pn` - Payee Name (Your business name)
- `am` - Amount (Optional, can be left empty for user to enter)
- `cu` - Currency (INR)
- `tn` - Transaction Note/Description
- `tr` - Transaction Reference ID (Optional)

---

## 🔧 Implementation

### Step 1: Store UPI Configuration

Add UPI settings to your database/store:

```typescript
// src/models/types.ts
export interface UpiConfig {
  id: number;
  organizationId: string;
  upiId: string; // e.g., yourname@paytm
  upiName: string; // Business name
  qrCodeUrl?: string; // Optional: Pre-generated QR code image
  enabled: boolean;
  updatedAt: string;
}
```

### Step 2: Create UPI Utility Functions

```typescript
// src/utils/upiPayment.ts

export interface UpiPaymentOptions {
  upiId: string;
  name: string;
  amount?: number;
  note?: string;
  transactionRef?: string;
}

/**
 * Generate UPI payment URL
 */
export const generateUpiUrl = (options: UpiPaymentOptions): string => {
  const params = new URLSearchParams();
  
  params.append('pa', options.upiId); // Payee Address
  params.append('pn', options.name); // Payee Name
  params.append('cu', 'INR'); // Currency
  
  if (options.amount) {
    params.append('am', options.amount.toString());
  }
  
  if (options.note) {
    params.append('tn', options.note); // Transaction Note
  }
  
  if (options.transactionRef) {
    params.append('tr', options.transactionRef); // Transaction Reference
  }
  
  return `upi://pay?${params.toString()}`;
};

/**
 * Generate UPI intent URL for specific apps
 */
export const generateUpiIntentUrl = (
  app: 'gpay' | 'phonepe' | 'paytm' | 'bhim',
  options: UpiPaymentOptions
): string => {
  const baseUrl = generateUpiUrl(options);
  
  // App-specific URL schemes
  const appSchemes = {
    gpay: `tez://upi/pay?${new URLSearchParams({
      pa: options.upiId,
      pn: options.name,
      am: options.amount?.toString() || '',
      cu: 'INR',
      tn: options.note || '',
    }).toString()}`,
    phonepe: `phonepe://pay?${new URLSearchParams({
      pa: options.upiId,
      pn: options.name,
      am: options.amount?.toString() || '',
      cu: 'INR',
      tn: options.note || '',
    }).toString()}`,
    paytm: `paytmmp://pay?${new URLSearchParams({
      pa: options.upiId,
      pn: options.name,
      am: options.amount?.toString() || '',
      cu: 'INR',
      tn: options.note || '',
    }).toString()}`,
    bhim: baseUrl, // BHIM uses standard UPI URL
  };
  
  return appSchemes[app];
};

/**
 * Generate QR code data URL for UPI payment
 */
export const generateUpiQrCode = async (options: UpiPaymentOptions): Promise<string> => {
  const upiUrl = generateUpiUrl(options);
  
  // Using qrcode library (install: npm install qrcode)
  const QRCode = await import('qrcode');
  
  try {
    const qrDataUrl = await QRCode.toDataURL(upiUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
    return qrDataUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw error;
  }
};

/**
 * Open UPI payment in user's preferred app
 */
export const openUpiPayment = (url: string) => {
  // For mobile devices
  if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    window.location.href = url;
  } else {
    // For desktop, show QR code
    alert('Please scan the QR code with your mobile device to pay');
  }
};

/**
 * Detect if device is mobile
 */
export const isMobileDevice = (): boolean => {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
};

/**
 * Copy UPI ID to clipboard
 */
export const copyUpiId = async (upiId: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(upiId);
    return true;
  } catch (error) {
    console.error('Failed to copy:', error);
    return false;
  }
};
```

### Step 3: Install QR Code Library

```bash
npm install qrcode
npm install --save-dev @types/qrcode
```

### Step 4: Create UPI Payment Component

```typescript
// src/components/UpiPaymentModal.tsx
import { useState, useEffect } from 'react';
import Button from './ui/Button';
import { 
  generateUpiUrl, 
  generateUpiIntentUrl, 
  generateUpiQrCode, 
  openUpiPayment,
  isMobileDevice,
  copyUpiId,
  type UpiPaymentOptions 
} from '@/utils/upiPayment';
import { Copy, Check, Smartphone, QrCode, X } from 'lucide-react';

interface UpiPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  upiId: string;
  businessName: string;
  amount: number;
  description: string;
  transactionRef?: string;
  onPaymentInitiated?: () => void;
}

const UpiPaymentModal = ({
  isOpen,
  onClose,
  upiId,
  businessName,
  amount,
  description,
  transactionRef,
  onPaymentInitiated,
}: UpiPaymentModalProps) => {
  const [qrCode, setQrCode] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const isMobile = isMobileDevice();

  useEffect(() => {
    if (isOpen) {
      generateQrCode();
    }
  }, [isOpen, upiId, amount]);

  const generateQrCode = async () => {
    setLoading(true);
    try {
      const options: UpiPaymentOptions = {
        upiId,
        name: businessName,
        amount,
        note: description,
        transactionRef,
      };
      const qr = await generateUpiQrCode(options);
      setQrCode(qr);
    } catch (error) {
      console.error('Failed to generate QR code:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePayWithApp = (app: 'gpay' | 'phonepe' | 'paytm' | 'bhim') => {
    const options: UpiPaymentOptions = {
      upiId,
      name: businessName,
      amount,
      note: description,
      transactionRef,
    };
    
    const url = generateUpiIntentUrl(app, options);
    openUpiPayment(url);
    
    if (onPaymentInitiated) {
      onPaymentInitiated();
    }
  };

  const handleCopyUpiId = async () => {
    const success = await copyUpiId(upiId);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Pay via UPI</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Amount */}
          <div className="text-center">
            <p className="text-sm text-gray-600">Amount to Pay</p>
            <p className="text-3xl font-bold text-gray-900">₹{amount}</p>
            <p className="text-sm text-gray-500 mt-1">{description}</p>
          </div>

          {/* QR Code */}
          {!isMobile && (
            <div className="flex flex-col items-center space-y-3">
              <div className="p-4 bg-white border-2 border-gray-200 rounded-lg">
                {loading ? (
                  <div className="w-64 h-64 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <img src={qrCode} alt="UPI QR Code" className="w-64 h-64" />
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <QrCode className="w-4 h-4" />
                <span>Scan with any UPI app to pay</span>
              </div>
            </div>
          )}

          {/* UPI ID */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">UPI ID</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={upiId}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyUpiId}
                className="shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-1" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-1" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Payment Apps */}
          {isMobile && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Smartphone className="w-4 h-4" />
                <span>Pay with</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={() => handlePayWithApp('gpay')}
                  className="flex items-center justify-center gap-2"
                >
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/f/f2/Google_Pay_Logo.svg"
                    alt="Google Pay"
                    className="h-5"
                  />
                  Google Pay
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handlePayWithApp('phonepe')}
                  className="flex items-center justify-center gap-2"
                >
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/0/04/PhonePe_Logo.png"
                    alt="PhonePe"
                    className="h-5"
                  />
                  PhonePe
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handlePayWithApp('paytm')}
                  className="flex items-center justify-center gap-2"
                >
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/2/24/Paytm_Logo.png"
                    alt="Paytm"
                    className="h-5"
                  />
                  Paytm
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handlePayWithApp('bhim')}
                  className="flex items-center justify-center gap-2"
                >
                  BHIM UPI
                </Button>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium text-blue-900">Payment Instructions:</p>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              {isMobile ? (
                <>
                  <li>Click on your preferred UPI app above</li>
                  <li>Verify the amount and complete payment</li>
                  <li>Take a screenshot of the payment confirmation</li>
                  <li>Share the screenshot or UTR number with us</li>
                </>
              ) : (
                <>
                  <li>Open any UPI app on your mobile</li>
                  <li>Scan the QR code above</li>
                  <li>Verify the amount and complete payment</li>
                  <li>Share the payment screenshot or UTR number</li>
                </>
              )}
            </ol>
          </div>

          {/* Transaction Reference */}
          {transactionRef && (
            <div className="text-xs text-gray-500 text-center">
              Reference: {transactionRef}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 rounded-b-lg">
          <p className="text-xs text-gray-600 text-center">
            After payment, please share the payment screenshot or UTR number for verification
          </p>
        </div>
      </div>
    </div>
  );
};

export default UpiPaymentModal;
```

### Step 5: Update BillingSettings Component

```typescript
// src/components/settings/BillingSettings.tsx
import { useState } from 'react';
import UpiPaymentModal from '@/components/UpiPaymentModal';

const BillingSettings = () => {
  const [showUpiModal, setShowUpiModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentDescription, setPaymentDescription] = useState('');

  // Your UPI configuration (from settings or database)
  const upiConfig = {
    upiId: 'yourname@paytm', // Replace with your UPI ID
    businessName: 'Your Business Name',
  };

  const handleRenewSubscription = () => {
    setPaymentAmount(500); // Monthly subscription amount
    setPaymentDescription('Monthly Subscription Renewal');
    setShowUpiModal(true);
  };

  const handlePaymentInitiated = () => {
    // User has initiated payment
    alert('Please complete the payment and share the screenshot or UTR number');
    setShowUpiModal(false);
    
    // You can show a form to collect UTR number or payment screenshot
    // Or redirect to a payment confirmation page
  };

  return (
    <div>
      {/* Your existing billing settings UI */}
      
      <Button onClick={handleRenewSubscription}>
        Pay via UPI
      </Button>

      <UpiPaymentModal
        isOpen={showUpiModal}
        onClose={() => setShowUpiModal(false)}
        upiId={upiConfig.upiId}
        businessName={upiConfig.businessName}
        amount={paymentAmount}
        description={paymentDescription}
        transactionRef={`TXN${Date.now()}`}
        onPaymentInitiated={handlePaymentInitiated}
      />
    </div>
  );
};
```

### Step 6: Update ProductManagement Component

```typescript
// src/components/settings/ProductManagement.tsx
import UpiPaymentModal from '@/components/UpiPaymentModal';

const ProductManagement = () => {
  const [showUpiModal, setShowUpiModal] = useState(false);

  const handlePayForAdditionalProducts = () => {
    setShowUpiModal(true);
  };

  return (
    <div>
      {/* Your existing product management UI */}

      <UpiPaymentModal
        isOpen={showUpiModal}
        onClose={() => setShowUpiModal(false)}
        upiId="yourname@paytm"
        businessName="Your Business Name"
        amount={200}
        description="Additional Product Purchase"
        transactionRef={`PROD${Date.now()}`}
        onPaymentInitiated={() => {
          setShowUpiModal(false);
          alert('Please share payment confirmation to activate additional products');
        }}
      />
    </div>
  );
};
```

---

## 📋 Payment Verification Process

Since payments are not automatically verified, you need a manual process:

### Option 1: UTR Number Collection

```typescript
// src/components/PaymentConfirmationForm.tsx
const PaymentConfirmationForm = () => {
  const [utrNumber, setUtrNumber] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);

  const handleSubmit = async () => {
    // Send UTR number and screenshot to admin
    const formData = new FormData();
    formData.append('utrNumber', utrNumber);
    formData.append('transactionRef', transactionRef);
    if (screenshot) {
      formData.append('screenshot', screenshot);
    }

    await fetch('/api/payment/verify-upi', {
      method: 'POST',
      body: formData,
    });

    alert('Payment details submitted. We will verify and activate your service shortly.');
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Enter UTR Number"
        value={utrNumber}
        onChange={(e) => setUtrNumber(e.target.value)}
      />
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setScreenshot(e.target.files?.[0] || null)}
      />
      <button type="submit">Submit Payment Proof</button>
    </form>
  );
};
```

### Option 2: Admin Verification Dashboard

Create an admin page to verify pending payments:

```typescript
// src/pages/admin/PaymentVerification.tsx
const PaymentVerification = () => {
  const [pendingPayments, setPendingPayments] = useState([]);

  return (
    <div>
      <h2>Pending Payment Verifications</h2>
      {pendingPayments.map((payment) => (
        <div key={payment.id}>
          <p>Amount: ₹{payment.amount}</p>
          <p>UTR: {payment.utrNumber}</p>
          <img src={payment.screenshotUrl} alt="Payment proof" />
          <button onClick={() => approvePayment(payment.id)}>
            Approve
          </button>
          <button onClick={() => rejectPayment(payment.id)}>
            Reject
          </button>
        </div>
      ))}
    </div>
  );
};
```

---

## 🎨 UPI Settings in Admin Panel

Add UPI configuration in Settings:

```typescript
// src/components/settings/UpiSettings.tsx
const UpiSettings = () => {
  const [upiId, setUpiId] = useState('');
  const [businessName, setBusinessName] = useState('');

  const handleSave = async () => {
    await updateUpiConfig({
      upiId,
      businessName,
      enabled: true,
    });
    alert('UPI settings saved!');
  };

  return (
    <div>
      <h3>UPI Payment Settings</h3>
      <input
        type="text"
        placeholder="Your UPI ID (e.g., yourname@paytm)"
        value={upiId}
        onChange={(e) => setUpiId(e.target.value)}
      />
      <input
        type="text"
        placeholder="Business Name"
        value={businessName}
        onChange={(e) => setBusinessName(e.target.value)}
      />
      <button onClick={handleSave}>Save UPI Settings</button>
    </div>
  );
};
```

---

## ✅ Advantages vs Payment Gateway

| Feature | UPI Direct | Payment Gateway |
|---------|-----------|-----------------|
| Transaction Fee | ₹0 | 2% (₹2 on ₹100) |
| Setup Time | Instant | 2-3 days |
| KYC Required | No | Yes |
| Auto Verification | No | Yes |
| Settlement Time | Instant | T+2 days |
| Refunds | Manual | Automatic |

---

## 🚀 Quick Implementation Checklist

- [ ] Install qrcode library: `npm install qrcode @types/qrcode`
- [ ] Create `src/utils/upiPayment.ts`
- [ ] Create `src/components/UpiPaymentModal.tsx`
- [ ] Update `src/components/settings/BillingSettings.tsx`
- [ ] Update `src/components/settings/ProductManagement.tsx`
- [ ] Add UPI settings in admin panel
- [ ] Create payment verification page for admin
- [ ] Test on mobile device
- [ ] Test QR code scanning
- [ ] Set up payment confirmation workflow

---

## 📱 Testing

1. **On Mobile:**
   - Click "Pay via UPI"
   - Select your UPI app
   - Verify amount
   - Complete payment
   - Share UTR number

2. **On Desktop:**
   - Click "Pay via UPI"
   - Scan QR code with mobile
   - Complete payment
   - Share screenshot

---

## 💡 Best Practices

1. **Always show amount clearly** before payment
2. **Generate unique transaction reference** for each payment
3. **Collect UTR number** from customers
4. **Verify payments manually** in your bank statement
5. **Keep payment records** for reconciliation
6. **Send confirmation** after verification
7. **Provide support** for payment issues

---

**This is a zero-cost solution perfect for small businesses! No payment gateway fees, instant setup, and works with all UPI apps.**
