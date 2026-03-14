import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/Dialog';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import type { ServiceRequest, ServiceRequestStatus, PriorityLevel } from '@/models/types';
import { MOCK_ORGANIZATION_ID } from '@/models/types';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';

interface ServiceRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  request?: ServiceRequest | null;
  onSave: (request: Omit<ServiceRequest, 'id' | 'createdAt'>) => Promise<void>;
  onUpdate: (id: number, request: Partial<ServiceRequest>) => Promise<void>;
}

const REQUEST_TYPES = ['Installation', 'Repair', 'Complaint', 'Upgrade', 'Other'];
const PRIORITIES: PriorityLevel[] = ['low', 'medium', 'high', 'critical'];

const labelClass = 'block text-sm font-medium text-foreground mb-2';
const textareaClass = cn(
  'flex min-h-[80px] w-full rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm',
  'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-muted-foreground',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary',
  'disabled:cursor-not-allowed disabled:opacity-50 resize-none'
);

const ServiceRequestModal = ({ isOpen, onClose, request, onSave, onUpdate }: ServiceRequestModalProps) => {
  const { t } = useTranslation();
  const { customers, fetchCustomers } = useStore();
  const [loading, setLoading] = useState(false);
  const [customerId, setCustomerId] = useState<number | ''>('');
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [requestType, setRequestType] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<PriorityLevel>('medium');
  const [assignedTo, setAssignedTo] = useState('');
  const [status, setStatus] = useState<ServiceRequestStatus>('new');
  const [resolution, setResolution] = useState('');
  const [slaHours, setSlaHours] = useState<number | ''>(24);

  useEffect(() => {
    if (isOpen && customers.length === 0) {
      fetchCustomers().catch(() => undefined);
    }
  }, [isOpen, customers.length, fetchCustomers]);

  useEffect(() => {
    if (request) {
      setCustomerId(request.customerId);
      setCustomerName(request.customerName);
      setCustomerMobile(request.customerMobile);
      setRequestType(request.requestType);
      setDescription(request.description);
      setPriority(request.priority);
      setAssignedTo(request.assignedTo || '');
      setStatus(request.status);
      setResolution(request.resolution || '');
      setSlaHours(request.slaHours ?? '');
    } else {
      setCustomerId('');
      setCustomerName('');
      setCustomerMobile('');
      setRequestType(REQUEST_TYPES[0]);
      setDescription('');
      setPriority('medium');
      setAssignedTo('');
      setStatus('new');
      setResolution('');
      setSlaHours(24);
    }
  }, [request, isOpen]);

  useEffect(() => {
    if (customerId && customers.length) {
      const c = customers.find((x) => x.id === customerId);
      if (c) {
        setCustomerName(c.name);
        setCustomerMobile(c.mobile);
      }
    }
  }, [customerId, customers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerMobile.trim() || !requestType.trim() || !description.trim()) return;
    setLoading(true);
    try {
      const payload = {
        organizationId: MOCK_ORGANIZATION_ID,
        customerId: customerId || 0,
        customerName: customerName.trim(),
        customerMobile: customerMobile.trim(),
        requestType: requestType.trim(),
        description: description.trim(),
        priority,
        assignedTo: assignedTo.trim() || undefined,
        status,
        resolution: resolution.trim() || undefined,
        slaHours: typeof slaHours === 'number' ? slaHours : (slaHours ? Number(slaHours) : undefined),
      };
      if (request) {
        await onUpdate(request.id, payload);
      } else {
        await onSave(payload);
      }
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} size="lg">
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
        <DialogHeader
          title={request ? t('serviceRequests.editRequest', 'Edit Service Request') : t('serviceRequests.addRequest', 'Add Service Request')}
          onClose={onClose}
        />
        <DialogBody>
          <div className="p-4 sm:p-6 space-y-6">
            {/* Customer */}
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('serviceRequests.customer', 'Customer')}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>{t('serviceRequests.customer', 'Customer')} *</label>
                  <Select
                    value={customerId === '' ? '' : String(customerId)}
                    onChange={(e) => setCustomerId(e.target.value === '' ? '' : Number(e.target.value))}
                  >
                    <option value="">{t('serviceRequests.selectCustomer', 'Select customer')}</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} – {c.mobile}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className={labelClass}>{t('serviceRequests.customerName', 'Customer name')}</label>
                  <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder={t('common.name', 'Name')} required />
                </div>
                <div>
                  <label className={labelClass}>{t('serviceRequests.customerMobile', 'Mobile')} *</label>
                  <Input value={customerMobile} onChange={(e) => setCustomerMobile(e.target.value)} placeholder={t('common.mobile', 'Mobile')} required />
                </div>
                <div>
                  <label className={labelClass}>{t('serviceRequests.assignedTo', 'Assigned to')}</label>
                  <Input value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} placeholder={t('serviceRequests.assignedPlaceholder', 'Technician or staff')} />
                </div>
              </div>
            </div>

            {/* Request details */}
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('serviceRequests.requestDetails', 'Request details')}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>{t('serviceRequests.requestType', 'Request type')} *</label>
                  <Select value={requestType} onChange={(e) => setRequestType(e.target.value)} required>
                    {REQUEST_TYPES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className={labelClass}>{t('serviceRequests.priority', 'Priority')}</label>
                  <Select value={priority} onChange={(e) => setPriority(e.target.value as PriorityLevel)}>
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>{t(`serviceRequests.priority${p.charAt(0).toUpperCase() + p.slice(1)}`, p)}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className={labelClass}>{t('serviceRequests.slaHours', 'SLA (hours)')}</label>
                  <Input
                    type="number"
                    value={slaHours}
                    onChange={(e) => setSlaHours(e.target.value === '' ? '' : Number(e.target.value))}
                    min={1}
                    max={720}
                  />
                </div>
                <div>
                  <label className={labelClass}>{t('common.status', 'Status')}</label>
                  <Select value={status} onChange={(e) => setStatus(e.target.value as ServiceRequestStatus)}>
                    <option value="new">{t('serviceRequests.statusNew', 'New')}</option>
                    <option value="assigned">{t('serviceRequests.statusAssigned', 'Assigned')}</option>
                    <option value="in-progress">{t('serviceRequests.statusInProgress', 'In progress')}</option>
                    <option value="resolved">{t('serviceRequests.statusResolved', 'Resolved')}</option>
                    <option value="closed">{t('serviceRequests.statusClosed', 'Closed')}</option>
                  </Select>
                </div>
              </div>
              <div>
                <label className={labelClass}>{t('serviceRequests.description', 'Description')} *</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={textareaClass}
                  rows={3}
                  placeholder={t('serviceRequests.descriptionPlaceholder', 'Describe the request')}
                  required
                />
              </div>
            </div>

            {/* Resolution */}
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('serviceRequests.resolution', 'Resolution')}
              </p>
              <textarea
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                className={textareaClass}
                rows={2}
                placeholder={t('serviceRequests.resolutionPlaceholder', 'Resolution notes')}
              />
            </div>
          </div>
        </DialogBody>
        <DialogFooter className="flex flex-row justify-end gap-2 pt-4 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button type="submit" loading={loading} disabled={!customerName.trim() || !customerMobile.trim() || !requestType.trim() || !description.trim()}>
            {request ? t('common.update', 'Update') : t('common.save', 'Save')}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
};

export default ServiceRequestModal;
