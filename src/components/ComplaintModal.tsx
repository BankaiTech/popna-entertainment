import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Camera } from 'lucide-react';
import { useStore } from '@/store/useStore';
import Button from './ui/Button';
import Select from './ui/Select';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from './ui/Dialog';
import type { Complaint, ComplaintStatus, Customer } from '@/models/types';
import { getConnectionTypeLabel } from '@/lib/providerUtils';

/** Convert File to base64 data URL (mock only). Replace with secure backend image upload later. */
const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const ACCEPTED_IMAGE_TYPES = 'image/jpeg,image/jpg,image/png';

interface ComplaintModalProps {
  isOpen: boolean;
  onClose: () => void;
  complaint?: Complaint | null;
  customers: Customer[];
}

const ComplaintModal = ({ isOpen, onClose, complaint, customers }: ComplaintModalProps) => {
  const { t } = useTranslation();
  const { addComplaint, updateComplaint, products, fetchActiveProducts } = useStore();
  
  useEffect(() => {
    if (isOpen) {
      fetchActiveProducts();
    }
  }, [isOpen, fetchActiveProducts]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    customerId: '',
    customerDescription: '',
    internalDescription: '',
    status: 'active' as ComplaintStatus,
  });
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  /** Closure image as base64 (mock only). Shown when status = Completed; required to save. */
  const [closureImage, setClosureImage] = useState<string | null>(null);
  /** Tap-to-preview: show full image overlay */
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);

  useEffect(() => {
    if (complaint) {
      setFormData({
        customerId: complaint.customerId.toString(),
        customerDescription: complaint.customerDescription,
        internalDescription: complaint.internalDescription || '',
        status: complaint.status,
      });
      setClosureImage(complaint.closureImage ?? null);
      const customer = customers.find((c) => c.id === complaint.customerId);
      setSelectedCustomer(customer || null);
    } else {
      setFormData({
        customerId: '',
        customerDescription: '',
        internalDescription: '',
        status: 'active',
      });
      setClosureImage(null);
      setSelectedCustomer(null);
    }
    setImagePreviewOpen(false);
  }, [complaint, customers, isOpen]);

  const handleCustomerChange = (customerId: string) => {
    const customer = customers.find((c) => c.id === parseInt(customerId));
    setSelectedCustomer(customer || null);
    setFormData({ ...formData, customerId });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowed.includes(file.type)) {
      alert(t('complaintModal.invalidImageType', 'Please upload a JPG, JPEG or PNG image.'));
      return;
    }
    try {
      const base64 = await fileToBase64(file);
      setClosureImage(base64);
    } catch (err) {
      alert(t('complaintModal.imageReadFailed', 'Failed to read image. Please try again.'));
    }
    e.target.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCustomer) {
      alert(t('complaintModal.selectCustomerAlert', 'Please select a customer'));
      return;
    }

    if (complaint) {
      if (formData.status === 'completed') {
        const imageToSave = closureImage ?? complaint.closureImage;
        if (!imageToSave) {
          alert(t('complaintModal.closurePhotoRequired', 'Please upload a closure photo. Image is required when status is Completed.'));
          return;
        }
        const closedAt = complaint.closedAt ?? new Date().toISOString();
        await updateComplaint(complaint.id, {
          internalDescription: formData.internalDescription,
          status: formData.status,
          closureImage: imageToSave,
          closedAt,
        });
      } else {
        await updateComplaint(complaint.id, {
          internalDescription: formData.internalDescription,
          status: formData.status,
        });
      }
    } else {
      await addComplaint({
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        mobile: selectedCustomer.mobile,
        connectionType: selectedCustomer.connectionType,
        customerDescription: formData.customerDescription,
        internalDescription: formData.internalDescription,
        status: formData.status,
      });
    }
    onClose();
  };

  if (!isOpen) return null;

  const statuses: ComplaintStatus[] = ['active', 'on-hold', 'completed'];

  const getStatusLabel = (status: ComplaintStatus) => {
    switch (status) {
      case 'active':
        return t('complaintModal.statusActive', 'Active');
      case 'on-hold':
        return t('complaintModal.statusOnHold', 'On Hold');
      case 'completed':
        return t('complaintModal.statusCompleted', 'Completed');
      default:
        return status;
    }
  };

  return (
    <>
      <Dialog open={isOpen} onClose={onClose} size="lg" className="h-[95vh] sm:h-auto sm:max-h-[90vh]">
        <DialogHeader
          title={complaint ? t('complaintModal.editTitle', 'Edit Complaint') : t('complaintModal.addTitle', 'Add New Complaint')}
          onClose={onClose}
        />
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <DialogBody>
            <div className="p-4 sm:p-6 space-y-4">
            {!complaint && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('common.customer', 'Customer')} <span className="text-destructive">*</span>
                </label>
                <Select
                  value={formData.customerId}
                  onChange={(e) => handleCustomerChange(e.target.value)}
                  required
                >
                  <option value="">{t('complaintModal.selectCustomer', 'Select a customer')}</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} - {customer.mobile}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            {(selectedCustomer || complaint) && (
              <div className="bg-muted p-4 rounded-md space-y-2 border border-border">
                <p className="text-sm">
                  <span className="font-medium">{t('common.customer', 'Customer')}:</span>{' '}
                  {complaint ? complaint.customerName : selectedCustomer?.name}
                </p>
                <p className="text-sm">
                  <span className="font-medium">{t('common.mobile', 'Mobile')}:</span>{' '}
                  {complaint ? complaint.mobile : selectedCustomer?.mobile}
                </p>
                <p className="text-sm">
                  <span className="font-medium">{t('common.connectionType', 'Connection Type')}:</span>{' '}
                  {getConnectionTypeLabel(
                    complaint ? complaint.connectionType : (selectedCustomer?.connectionType ?? (Array.isArray(products) && products.length > 0 ? products[0].name : '')),
                    products
                  )}
                </p>
              </div>
            )}

            {complaint ? (
              <div>
                <label className="block text-sm font-medium mb-2">{t('complaintModal.customerComplaint', 'Customer Complaint')}</label>
                <div className="w-full px-3 py-2 border border-border rounded-md bg-muted text-foreground resize-none min-h-[100px] flex items-start pt-3">
                  <p className="text-sm whitespace-pre-wrap">{complaint.customerDescription}</p>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('complaintModal.customerComplaint', 'Customer Complaint')} <span className="text-destructive">*</span>
                </label>
                <textarea
                  value={formData.customerDescription}
                  onChange={(e) => setFormData({ ...formData, customerDescription: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                  rows={4}
                  placeholder={t('complaintModal.complaintPlaceholder', 'Enter customer complaint description...')}
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">{t('complaintModal.internalNotes', 'Our Notes / Resolution')}</label>
              <textarea
                value={formData.internalDescription}
                onChange={(e) => setFormData({ ...formData, internalDescription: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                rows={4}
                placeholder={t('complaintModal.internalNotesPlaceholder', 'Enter internal notes, resolution steps, or updates...')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">{t('common.status', 'Status')}</label>
              <Select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as ComplaintStatus })}
              >
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {getStatusLabel(status)}
                  </option>
                ))}
              </Select>
            </div>

            {formData.status === 'completed' && (
              <div className="space-y-2 pt-2 border-t border-border">
                <label className="block text-sm font-medium">
                  {t('complaintModal.closurePhoto', 'Closure Photo')} <span className="text-destructive">*</span>
                </label>
                <p className="text-xs text-muted-foreground">
                  {t('complaintModal.closurePhotoHint', 'One image required (JPG, PNG or JPEG). Upload from device or take a picture.')}
                </p>
                {complaint?.closedAt && (
                  <p className="text-sm text-muted-foreground">
                    {t('complaintModal.closed', 'Closed')}: {new Date(complaint.closedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                )}
                {complaint?.closureImage || closureImage ? (
                  <div className="space-y-2">
                    <div
                      className="relative w-full max-w-sm aspect-video rounded-lg border border-border overflow-hidden bg-muted cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
                      onClick={() => setImagePreviewOpen(true)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && setImagePreviewOpen(true)}
                    >
                      <img
                        src={closureImage ?? complaint?.closureImage ?? ''}
                        alt={t('complaintModal.closureAlt', 'Closure')}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">{t('complaintModal.tapToPreview', 'Tap image to preview')}</p>
                    {!complaint?.closureImage && closureImage && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setClosureImage(null);
                          fileInputRef.current?.click();
                        }}
                      >
                        {t('complaintModal.changePhoto', 'Change photo')}
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-2 items-start">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={ACCEPTED_IMAGE_TYPES}
                      capture="environment"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-[44px] touch-manipulation w-full sm:w-auto"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      {t('complaintModal.photo', 'Photo')}
                    </Button>
                  </div>
                )}
              </div>
            )}
            </div>
          </DialogBody>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button type="submit" className="w-full sm:w-auto">{complaint ? t('complaintModal.updateComplaint', 'Update Complaint') : t('complaintModal.createComplaint', 'Create Complaint')}</Button>
          </DialogFooter>
        </form>
      </Dialog>

      {isOpen && imagePreviewOpen && (closureImage ?? complaint?.closureImage) && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setImagePreviewOpen(false)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Escape' && setImagePreviewOpen(false)}
        >
          <button
            onClick={() => setImagePreviewOpen(false)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
            aria-label={t('complaintModal.closePreview', 'Close preview')}
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={closureImage ?? complaint?.closureImage ?? ''}
            alt={t('complaintModal.closurePreviewAlt', 'Closure preview')}
            className="max-w-full max-h-[90vh] w-auto h-auto object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
};

export default ComplaintModal;
