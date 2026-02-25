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
  const { t } = useTranslation();
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

  // Guard: UPI not configured — still use Dialog for consistency
  if (!upiId?.trim()) {
    return (
      <Dialog open={isOpen} onClose={onClose} size="sm">
        <DialogHeader title={t('upiPaymentModal.title', 'Pay via UPI')} onClose={onClose} />
        <DialogBody className="p-4 sm:p-5">
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
      <DialogBody className="p-4 sm:p-5">
        <div className="space-y-4">
          {/* Amount + QR side by side (desktop) */}
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-5">
            {/* Amount */}
            <div className="text-center p-3 rounded-lg bg-muted/30 border border-border w-full sm:w-auto sm:min-w-[140px] shrink-0">
              <p className="text-xs text-muted-foreground">{t('upiPaymentModal.amountToPay', 'Amount to Pay')}</p>
              <p className="text-xl font-bold text-foreground mt-0.5">₹{amount}</p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px] mx-auto sm:max-w-none">{description}</p>
            </div>

            {/* QR Code — desktop only */}
            {!isMobile && (
              <div className="flex flex-col items-center space-y-1.5 shrink-0">
                <div className="p-2 bg-background border border-border rounded-lg">
                  {loading ? (
                    <div className="w-36 h-36 sm:w-40 sm:h-40 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
                    </div>
                  ) : (
                    <img src={qrCode} alt="UPI QR Code" className="w-36 h-36 sm:w-40 sm:h-40 object-contain" />
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <QrCode className="w-3.5 h-3.5" />
                  <span>{t('upiPaymentModal.scanQr', 'Scan with any UPI app to pay')}</span>
                </div>
              </div>
            )}
          </div>

          {/* UPI ID + Copy */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">{t('upiPaymentModal.upiId', 'UPI ID')}</label>
            <div className="flex items-center gap-2">
              <Input
                value={upiId}
                readOnly
                className="flex-1 bg-muted/30 font-mono text-sm"
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

          {/* Payment apps — mobile */}
          {isMobile && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground flex items-center gap-2">
                <Smartphone className="w-4 h-4" />
                {t('upiPaymentModal.payWith', 'Pay with')}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={() => handlePayWithApp('gpay')}
                  className="flex flex-col items-center justify-center gap-2 h-auto py-3"
                >
                  <span className="text-2xl">💳</span>
                  <span className="text-xs">{t('upiPaymentModal.googlePay', 'Google Pay')}</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handlePayWithApp('phonepe')}
                  className="flex flex-col items-center justify-center gap-2 h-auto py-3"
                >
                  <span className="text-2xl">📱</span>
                  <span className="text-xs">{t('upiPaymentModal.phonepe', 'PhonePe')}</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handlePayWithApp('paytm')}
                  className="flex flex-col items-center justify-center gap-2 h-auto py-3"
                >
                  <span className="text-2xl">💰</span>
                  <span className="text-xs">{t('upiPaymentModal.paytm', 'Paytm')}</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={handlePayWithOther}
                  className="flex flex-col items-center justify-center gap-2 h-auto py-3"
                >
                  <span className="text-2xl">📲</span>
                  <span className="text-xs">{t('upiPaymentModal.otherUpiApps', 'Other UPI apps')}</span>
                </Button>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="rounded-lg p-4 bg-primary/5 border border-primary/20">
            <p className="text-sm font-medium text-foreground mb-2">{t('upiPaymentModal.instructions', 'Payment instructions')}</p>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              {isMobile ? (
                <>
                  <li>{t('upiPaymentModal.instructionMobile1', 'Tap your preferred UPI app above')}</li>
                  <li>{t('upiPaymentModal.instructionMobile2', 'Verify the amount and complete payment')}</li>
                  <li>{t('upiPaymentModal.instructionMobile3', 'Share the payment screenshot or UTR number')}</li>
                </>
              ) : (
                <>
                  <li>{t('upiPaymentModal.instructionDesktop1', 'Open any UPI app on your phone')}</li>
                  <li>{t('upiPaymentModal.instructionDesktop2', 'Scan the QR code above')}</li>
                  <li>{t('upiPaymentModal.instructionDesktop3', 'Verify the amount and complete payment')}</li>
                  <li>{t('upiPaymentModal.instructionDesktop4', 'Share the payment screenshot or UTR number')}</li>
                </>
              )}
            </ol>
          </div>

          {transactionRef && (
            <p className="text-xs text-muted-foreground text-center">{t('upiPaymentModal.reference', 'Reference')}: {transactionRef}</p>
          )}
        </div>
      </DialogBody>
      <DialogFooter>
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
