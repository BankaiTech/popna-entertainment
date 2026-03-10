import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/Dialog';
import Button from './ui/Button';
import Input from './ui/Input';
import {
  generateUpiUrl,
  generateUpiIntentUrl,
  generateUpiQrCode,
  openUpiPayment,
  isMobileDevice,
  copyUpiId,
  type UpiPaymentOptions,
} from '@/utils/upiPayment';
import { Copy, Check, Smartphone, QrCode } from 'lucide-react';

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
  const { t, i18n } = useTranslation();
  const [qrCode, setQrCode] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const isMobile = isMobileDevice();

  useEffect(() => {
    if (isOpen && upiId?.trim()) {
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

  const getUpiOptions = (): UpiPaymentOptions => ({
    upiId,
    name: businessName,
    amount,
    note: description,
    transactionRef,
  });

  const handlePayWithApp = (app: 'gpay' | 'phonepe' | 'paytm' | 'bhim') => {
    const url = generateUpiIntentUrl(app, getUpiOptions());
    openUpiPayment(url);
    onPaymentInitiated?.();
  };

  const handlePayWithOther = () => {
    const url = generateUpiUrl(getUpiOptions());
    openUpiPayment(url);
    onPaymentInitiated?.();
  };

  const handleCopyUpiId = async () => {
    const success = await copyUpiId(upiId);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen) return null;

  // Guard: UPI not configured - still use Dialog for consistency
  if (!upiId?.trim()) {
    return (
      <Dialog open={isOpen} onClose={onClose} size="sm">
        <DialogHeader title={t('upiPaymentModal.title', 'Pay via UPI')} onClose={onClose} />
        <DialogBody className="p-3 sm:p-4">
          <p className="text-sm text-muted-foreground">{t('upiPaymentModal.notConfigured', 'UPI payment is not configured.')}</p>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('upiPaymentModal.close', 'Close')}
          </Button>
        </DialogFooter>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onClose={onClose} size="lg">
      <DialogHeader title={t('upiPaymentModal.title', 'Pay via UPI')} onClose={onClose} />
      <DialogBody className="p-3 sm:p-4">
        <div className="space-y-3">
          {/* Top row: Left = QR + Scan to pay + Amount (stacked). Right = UPI ID. Column on mobile. */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-start">
            {/* Left: QR, then "Scan to pay", then amount */}
            <div className="w-fit max-w-full sm:shrink-0 flex flex-col items-center sm:items-start p-3 rounded-xl border border-border bg-muted/30">
              <div className="p-1.5 bg-background border border-border rounded-lg">
                {loading ? (
                  <div className="w-28 h-28 sm:w-32 sm:h-32 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-7 w-7 sm:h-8 sm:w-8 border-2 border-primary border-t-transparent" />
                  </div>
                ) : (
                  <img src={qrCode} alt="UPI QR Code" className="w-28 h-28 sm:w-32 sm:h-32 object-contain" />
                )}
              </div>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                <QrCode className="w-3.5 h-3.5 shrink-0" />
                <span>{t('upiPaymentModal.scanToPay', 'Scan to pay')}</span>
              </p>
              <div className="mt-2 w-full text-center sm:text-left">
                <p className="text-xs text-muted-foreground">{t('upiPaymentModal.amountToPay', 'Amount to Pay')}</p>
                <p className="text-xl sm:text-2xl font-bold text-foreground mt-0.5">₹{amount}</p>
              </div>
            </div>

            {/* Right: UPI ID + Copy (full width on mobile, flex-1 on desktop) */}
            <div className="flex-1 min-w-0 space-y-1.5">
              <label className="text-sm font-medium text-foreground">{t('upiPaymentModal.upiId', 'UPI ID')}</label>
              <div className="flex items-center gap-2">
                <Input
                  value={upiId}
                  readOnly
                  className="flex-1 min-w-0 bg-muted/30 font-mono text-sm"
                />
                <Button variant="outline" size="sm" onClick={handleCopyUpiId} className="shrink-0">
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-1" />
                      {t('upiPaymentModal.copied', 'Copied')}
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-1" />
                      {t('upiPaymentModal.copy', 'Copy')}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Payment apps - mobile */}
          {isMobile && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground flex items-center gap-2">
                <Smartphone className="w-4 h-4" />
                {t('upiPaymentModal.payWith', 'Pay with')}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={() => handlePayWithApp('gpay')}
                  className="flex flex-col items-center justify-center gap-1.5 h-auto py-2.5"
                >
                  <span className="text-2xl">💳</span>
                  <span className="text-xs">{t('upiPaymentModal.googlePay', 'Google Pay')}</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handlePayWithApp('phonepe')}
                  className="flex flex-col items-center justify-center gap-1.5 h-auto py-2.5"
                >
                  <span className="text-2xl">📱</span>
                  <span className="text-xs">{t('upiPaymentModal.phonepe', 'PhonePe')}</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handlePayWithApp('paytm')}
                  className="flex flex-col items-center justify-center gap-1.5 h-auto py-2.5"
                >
                  <span className="text-2xl">💰</span>
                  <span className="text-xs">{t('upiPaymentModal.paytm', 'Paytm')}</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={handlePayWithOther}
                  className="flex flex-col items-center justify-center gap-1.5 h-auto py-2.5"
                >
                  <span className="text-2xl">📲</span>
                  <span className="text-xs">{t('upiPaymentModal.otherUpiApps', 'Other UPI apps')}</span>
                </Button>
              </div>
            </div>
          )}

          {/* Instructions - common for mobile and web, key by language for re-render */}
          <div key={i18n.language} className="rounded-lg p-3 pb-0 bg-primary/5 border border-primary/20">
            <p className="text-sm font-medium text-foreground mb-1.5">{t('upiPaymentModal.instructions', 'Payment instructions')}</p>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>{t('upiPaymentModal.instructionDesktop1', 'Open any UPI app on your phone')}</li>
              <li>{t('upiPaymentModal.instructionDesktop2', 'Scan the QR code above')}</li>
              <li>{t('upiPaymentModal.instructionDesktop3', 'Verify the amount and complete payment')}</li>
              <li>
                {t('upiPaymentModal.instructionDesktop4', 'Share the payment screenshot or UTR number')}
                {transactionRef && (
                  <span className="text-xs text-muted-foreground ml-1">
                    ({t('upiPaymentModal.reference', 'Reference')}: {transactionRef})
                  </span>
                )}
              </li>
              <li>{t('upiPaymentModal.autopayNote', 'Autopay option for recurring payments can be enabled later (not implemented yet).')}</li>
            </ol>
          </div>
        </div>
      </DialogBody>
      <DialogFooter className="py-2 sm:py-2.5">
        <p className="text-xs text-muted-foreground w-full text-center sm:text-left order-first sm:order-none">
          {t('upiPaymentModal.verificationNote', 'After payment, share the screenshot or UTR for verification')}
        </p>
        <Button variant="outline" onClick={onClose}>
          {t('upiPaymentModal.close', 'Close')}
        </Button>
      </DialogFooter>
    </Dialog>
  );
};

export default UpiPaymentModal;
