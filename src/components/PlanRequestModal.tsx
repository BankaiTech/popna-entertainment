import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <Card className="w-full max-w-md rounded-modal shadow-soft-xl border border-border bg-card">
        {/* Compact Header */}
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-border">
          <div>
            <CardTitle className="text-lg font-semibold text-foreground">{t('planRequest.title')}</CardTitle>
            <CardDescription className="text-sm text-muted-foreground mt-1">
              {plan.planName} - {productName}
            </CardDescription>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-accent rounded-md transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </CardHeader>

        {/* Scrollable Body */}
        <CardContent className="p-6 max-h-[60vh] overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-4">
            {success && (
              <div className="p-3 rounded-md bg-green-50 text-green-700 text-sm border border-green-200">
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

            {/* Hidden fields for API */}
            <input type="hidden" name="packageId" value={plan.id} />
            <input type="hidden" name="productId" value={productId} />

            {/* Fixed Footer */}
            <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="min-w-[100px]"
              >
                {loading ? t('common.submitting') : t('common.submit')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlanRequestModal;
