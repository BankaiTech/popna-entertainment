import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '@/store/useStore';
import Button from './ui/Button';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from './ui/Dialog';
import type { Customer } from '@/models/types';

interface CustomerComplaintModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
}

const CustomerComplaintModal = ({ isOpen, onClose, customer }: CustomerComplaintModalProps) => {
  const { t } = useTranslation();
  const { addComplaint } = useStore();
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDescription('');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!description.trim()) {
      alert(t('customerComplaint.validation.descriptionRequired', 'Please enter your complaint description'));
      return;
    }

    setIsSubmitting(true);
    try {
      await addComplaint({
        customerId: customer.id,
        customerName: customer.name,
        mobile: customer.mobile,
        connectionType: customer.connectionType,
        customerDescription: description.trim(),
        internalDescription: '',
        status: 'active',
      });
      onClose();
    } catch (error) {
      alert(t('customerComplaint.validation.submitFailed', 'Failed to submit complaint. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onClose={onClose} size="lg" className="h-[95vh] sm:h-auto sm:max-h-[90vh]">
      <DialogHeader title={t('customerComplaint.title', 'Add Complaint')} onClose={onClose} />
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
        <DialogBody>
          <div className="p-4 sm:p-6 space-y-4">
            <div className="bg-muted p-4 rounded-md space-y-2 border border-border">
              <p className="text-sm">
                <span className="font-medium">{t('customerComplaint.customer', 'Customer')}:</span> {customer.name}
              </p>
              <p className="text-sm">
                <span className="font-medium">{t('customerComplaint.mobile', 'Mobile')}:</span> {customer.mobile}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                {t('customerComplaint.complaintDescription', 'Complaint Description')} <span className="text-destructive">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                rows={6}
                placeholder={t('customerComplaint.descriptionPlaceholder', 'Please describe your complaint in detail...')}
                required
                disabled={isSubmitting}
              />
            </div>
          </div>
        </DialogBody>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting} className="w-full sm:w-auto">
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
            {isSubmitting ? t('customerComplaint.submitting', 'Submitting...') : t('customerComplaint.submitComplaint', 'Submit Complaint')}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
};

export default CustomerComplaintModal;
