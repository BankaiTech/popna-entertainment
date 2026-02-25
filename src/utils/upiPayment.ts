// UPI Payment Utility Functions - Zero cost payment solution

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
  const params = new URLSearchParams({
    pa: options.upiId,
    pn: options.name,
    am: options.amount?.toString() || '',
    cu: 'INR',
    tn: options.note || '',
  });

  // App-specific URL schemes
  const appSchemes = {
    gpay: `tez://upi/pay?${params.toString()}`,
    phonepe: `phonepe://pay?${params.toString()}`,
    paytm: `paytmmp://pay?${params.toString()}`,
    bhim: `upi://pay?${params.toString()}`,
  };
  
  return appSchemes[app];
};

/**
 * Generate QR code data URL for UPI payment
 */
export const generateUpiQrCode = async (options: UpiPaymentOptions): Promise<string> => {
  const upiUrl = generateUpiUrl(options);
  
  // Using qrcode library - dynamic import for better tree-shaking
  const QRCode = (await import('qrcode')).default;
  
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
