import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/Dialog';
import { connectionRequestsApi } from '@/api/connectionRequests';
import type { Plan } from '@/models/types';

interface PlanRequestModalProps {
  plan: Plan;
  productId: number;
  productName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const PlanRequestModal = ({ plan, productId, productName, isOpen, onClose, onSuccess }: PlanRequestModalProps) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!name.trim()) {
      setError(t('planRequest.customerNameRequired'));
      return;
    }
    if (!mobile.trim()) {
      setError(t('planRequest.mobileRequired'));
      return;
    }
    if (mobile.trim().length < 10) {
      setError(t('planRequest.validMobile'));
      return;
    }

    setLoading(true);
    try {
      await connectionRequestsApi.create({
        name: name.trim(),
        mobile: mobile.trim(),
        email: email.trim() || undefined,
        packageId: plan.id,
        productId: productId,
        planName: plan.planName,
        productName: productName,
      });

      // Show success message
      setSuccess(true);

      // Reset form
      setName('');
      setMobile('');
      setEmail('');

      // Close modal after delay and call success callback
      setTimeout(() => {
        setSuccess(false);
        onSuccess?.();
        onClose();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('planRequest.submitFail'));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onClose={onClose}>
      <DialogHeader title={t('planRequest.title')} onClose={onClose} />
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
        <DialogBody>
          <div className="p-4 sm:p-6 space-y-4">
            <p className="text-sm text-muted-foreground">{plan.planName} - {productName}</p>
            {success && (
              <div className="p-3 rounded-md bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm border border-green-200 dark:border-green-800">
                {t('planRequest.success')}
              </div>
            )}
            {error && (
              <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm border border-destructive/20">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1.5">
                {t('planRequest.customerName')} <span className="text-destructive">*</span>
              </label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('planRequest.placeholderName')}
                required
                className="w-full"
              />
            </div>

            <div>
              <label htmlFor="mobile" className="block text-sm font-medium text-foreground mb-1.5">
                {t('planRequest.mobileNumber')} <span className="text-destructive">*</span>
              </label>
              <Input
                id="mobile"
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder={t('planRequest.placeholderMobile')}
                required
                className="w-full"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">
                {t('common.email')} <span className="text-muted-foreground text-xs">{t('common.optional')}</span>
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('planRequest.placeholderEmail')}
                className="w-full"
              />
            </div>

            <input type="hidden" name="packageId" value={plan.id} />
            <input type="hidden" name="productId" value={productId} />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={loading} className="min-w-[100px]">
            {loading ? t('common.submitting') : t('common.submit')}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
};

export default PlanRequestModal;
