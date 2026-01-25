import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useStore } from '@/store/useStore';
import Button from './ui/Button';
import type { Customer } from '@/models/types';

interface CustomerComplaintModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
}

const CustomerComplaintModal = ({ isOpen, onClose, customer }: CustomerComplaintModalProps) => {
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
      alert('Please enter your complaint description');
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
        internalDescription: '', // Customers cannot add internal notes
        status: 'active',
      });
      onClose();
    } catch (error) {
      alert('Failed to submit complaint. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-2xl h-[95vh] sm:h-auto sm:max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Compact Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-lg font-semibold">Add Complaint</h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-accent rounded-md transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 pb-20 sm:pb-6 space-y-4">
            {/* Customer Info (Read-only) */}
            <div className="bg-muted p-4 rounded-md space-y-2 border border-border">
              <p className="text-sm">
                <span className="font-medium">Customer:</span> {customer.name}
              </p>
              <p className="text-sm">
                <span className="font-medium">Mobile:</span> {customer.mobile}
              </p>
            </div>

            {/* Complaint Description */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Complaint Description <span className="text-destructive">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                rows={6}
                placeholder="Please describe your complaint in detail..."
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Fixed Footer — buttons aligned right: Cancel (secondary) left, Submit (primary) right */}
          <div className="shrink-0 flex flex-col sm:flex-row justify-end gap-2 px-4 sm:px-6 py-4 border-t border-border bg-card sticky bottom-0">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
              {isSubmitting ? 'Submitting...' : 'Submit Complaint'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomerComplaintModal;
