import { useState, useEffect, useRef } from 'react';
import { X, Camera } from 'lucide-react';
import { useStore } from '@/store/useStore';
import Button from './ui/Button';
import Select from './ui/Select';
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
      alert('Please upload a JPG, JPEG or PNG image.');
      return;
    }
    try {
      const base64 = await fileToBase64(file);
      setClosureImage(base64);
    } catch (err) {
      alert('Failed to read image. Please try again.');
    }
    e.target.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCustomer) {
      alert('Please select a customer');
      return;
    }

    if (complaint) {
      // When setting status to Completed, image is mandatory and closedAt is auto-filled
      if (formData.status === 'completed') {
        const imageToSave = closureImage ?? complaint.closureImage;
        if (!imageToSave) {
          alert('Please upload a closure photo. Image is required when status is Completed.');
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
        return 'Active';
      case 'on-hold':
        return 'On Hold';
      case 'completed':
        return 'Completed';
      default:
        return status;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-t-modal sm:rounded-modal shadow-soft-xl w-full sm:max-w-2xl h-[95vh] sm:h-auto sm:max-h-[90vh] overflow-hidden flex flex-col border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Compact Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-lg font-semibold">
            {complaint ? 'Edit Complaint' : 'Add New Complaint'}
          </h2>
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
          <div className="p-4 sm:p-6 pb-20 sm:pb-6">
          <div className="space-y-4">
            {/* Customer Selection (Add mode only) */}
            {!complaint && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Customer <span className="text-destructive">*</span>
                </label>
                <Select
                  value={formData.customerId}
                  onChange={(e) => handleCustomerChange(e.target.value)}
                  required
                >
                  <option value="">Select a customer</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} - {customer.mobile}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            {/* Customer Information Card (Single block for both Add and Edit) */}
            {(selectedCustomer || complaint) && (
              <div className="bg-muted p-4 rounded-md space-y-2 border border-border">
                <p className="text-sm">
                  <span className="font-medium">Customer:</span>{' '}
                  {complaint ? complaint.customerName : selectedCustomer?.name}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Mobile:</span>{' '}
                  {complaint ? complaint.mobile : selectedCustomer?.mobile}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Connection Type:</span>{' '}
                  {getConnectionTypeLabel(
                    complaint ? complaint.connectionType : (selectedCustomer?.connectionType || (Array.isArray(products) && products.length > 0 ? products[0].name : 'GTPL') as any),
                    products
                  )}
                </p>
              </div>
            )}

            {/* Customer Complaint Description - Read-only in Edit mode, Editable in Add mode */}
            {complaint ? (
              <div>
                <label className="block text-sm font-medium mb-2">Customer Complaint</label>
                <div className="w-full px-3 py-2 border border-border rounded-md bg-muted text-foreground resize-none min-h-[100px] flex items-start pt-3">
                  <p className="text-sm whitespace-pre-wrap">{complaint.customerDescription}</p>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Customer Complaint <span className="text-destructive">*</span>
                </label>
                <textarea
                  value={formData.customerDescription}
                  onChange={(e) => setFormData({ ...formData, customerDescription: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                  rows={4}
                  placeholder="Enter customer complaint description..."
                  required
                />
              </div>
            )}

            {/* Internal Notes / Resolution - Always editable */}
            <div>
              <label className="block text-sm font-medium mb-2">Our Notes / Resolution</label>
              <textarea
                value={formData.internalDescription}
                onChange={(e) => setFormData({ ...formData, internalDescription: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                rows={4}
                placeholder="Enter internal notes, resolution steps, or updates..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
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

            {/* Photo Upload — Admin/Employee only; shown ONLY when Status = Completed */}
            {formData.status === 'completed' && (
              <div className="space-y-2 pt-2 border-t border-border">
                <label className="block text-sm font-medium">
                  Closure Photo <span className="text-destructive">*</span>
                </label>
                <p className="text-xs text-muted-foreground">
                  One image required (JPG, PNG or JPEG). Upload from device or take a picture.
                </p>
                {complaint?.closedAt && (
                  <p className="text-sm text-muted-foreground">
                    Closed: {new Date(complaint.closedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
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
                        alt="Closure"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Tap image to preview</p>
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
                        Change photo
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
                      Photo
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
          </div>

          {/* Fixed Footer — buttons aligned right: Cancel (secondary) left, Save (primary) right */}
          <div className="shrink-0 flex flex-col sm:flex-row justify-end gap-2 px-4 sm:px-6 py-4 border-t border-border bg-card sticky bottom-0">
            <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" className="w-full sm:w-auto">{complaint ? 'Update' : 'Create'} Complaint</Button>
          </div>
        </form>

        {/* Image preview overlay — tap to close */}
        {imagePreviewOpen && (closureImage ?? complaint?.closureImage) && (
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
              aria-label="Close preview"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={closureImage ?? complaint?.closureImage ?? ''}
              alt="Closure preview"
              className="max-w-full max-h-[90vh] w-auto h-auto object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ComplaintModal;
