import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/Dialog';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import type { Appointment, AppointmentStatus, Customer } from '@/models/types';
import { MOCK_ORGANIZATION_ID } from '@/models/types';
import { useStore } from '@/store/useStore';

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment?: Appointment | null;
  onSave: (appointment: Omit<Appointment, 'id' | 'createdAt'>) => Promise<void>;
  onUpdate: (id: number, data: Partial<Appointment>) => Promise<void>;
}

const AppointmentModal = ({ isOpen, onClose, appointment, onSave, onUpdate }: AppointmentModalProps) => {
  const { t } = useTranslation();
  const { customers, fetchCustomers } = useStore();

  const [loading, setLoading] = useState(false);
  const [customerId, setCustomerId] = useState<number | ''>('');
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [staffAssigned, setStaffAssigned] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [duration, setDuration] = useState(60);
  const [status, setStatus] = useState<AppointmentStatus>('scheduled');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen && customers.length === 0) {
      fetchCustomers().catch(() => undefined);
    }
  }, [isOpen, customers.length, fetchCustomers]);

  useEffect(() => {
    if (appointment) {
      setCustomerId(appointment.customerId);
      setCustomerName(appointment.customerName);
      setCustomerMobile(appointment.customerMobile);
      setServiceType(appointment.serviceType);
      setStaffAssigned(appointment.staffAssigned ?? '');
      setScheduledAt(appointment.scheduledAt.slice(0, 16)); // datetime-local
      setDuration(appointment.duration);
      setStatus(appointment.status);
      setNotes(appointment.notes ?? '');
    } else {
      setCustomerId('');
      setCustomerName('');
      setCustomerMobile('');
      setServiceType('');
      setStaffAssigned('');
      const now = new Date();
      setScheduledAt(new Date(now.getTime() + 60 * 60 * 1000).toISOString().slice(0, 16));
      setDuration(60);
      setStatus('scheduled');
      setNotes('');
    }
  }, [appointment, isOpen]);

  const selectedCustomer: Customer | undefined =
    customerId ? customers.find((c) => c.id === customerId) : undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceType || !scheduledAt || (!customerId && !customerName)) return;

    setLoading(true);
    try {
      const payload: Omit<Appointment, 'id' | 'createdAt'> = {
        organizationId: MOCK_ORGANIZATION_ID,
        customerId: (customerId || 0) as number,
        customerName: selectedCustomer?.name || customerName,
        customerMobile: selectedCustomer?.mobile || customerMobile,
        serviceType,
        staffAssigned: staffAssigned || undefined,
        scheduledAt: new Date(scheduledAt).toISOString(),
        duration,
        status,
        notes: notes.trim() || undefined,
      };

      if (appointment) {
        await onUpdate(appointment.id, payload);
      } else {
        await onSave(payload);
      }
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

  return (
    <Dialog open={isOpen} onClose={onClose} size="lg">
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
        <DialogHeader
          title={
            appointment
              ? t('appointments.editTitle', 'Edit Appointment')
              : t('appointments.addTitle', 'New Appointment')
          }
          onClose={onClose}
        />
        <DialogBody>
          <div className="p-4 sm:p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>{t('appointments.customer', 'Customer')}</label>
                <select
                  value={customerId === '' ? '' : String(customerId)}
                  onChange={(e) => {
                    const value = e.target.value;
                    const id = value ? Number(value) : '';
                    setCustomerId(id);
                    if (id) {
                      const c = customers.find((cu) => cu.id === id);
                      setCustomerName(c?.name ?? '');
                      setCustomerMobile(c?.mobile ?? '');
                    } else {
                      setCustomerName('');
                      setCustomerMobile('');
                    }
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                >
                  <option value="">{t('appointments.selectCustomer', 'Select customer (optional)')}</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} • {c.mobile}
                    </option>
                  ))}
                </select>
              </div>
              {!customerId && (
                <div>
                  <label className={labelClass}>{t('appointments.walkInName', 'Walk-in name')}</label>
                  <Input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder={t('appointments.walkInNamePlaceholder', 'Customer / guest name')}
                  />
                </div>
              )}
              {!customerId && (
                <div>
                  <label className={labelClass}>{t('appointments.mobile', 'Mobile')}</label>
                  <Input
                    value={customerMobile}
                    onChange={(e) => setCustomerMobile(e.target.value)}
                    placeholder={t('appointments.mobilePlaceholder', 'Contact number')}
                  />
                </div>
              )}
              <div>
                <label className={labelClass}>{t('appointments.serviceType', 'Service / Purpose')} *</label>
                <Input
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>{t('appointments.staffAssigned', 'Staff Assigned')}</label>
                <Input
                  value={staffAssigned}
                  onChange={(e) => setStaffAssigned(e.target.value)}
                  placeholder={t('appointments.staffPlaceholder', 'Staff name (optional)')}
                />
              </div>
              <div>
                <label className={labelClass}>{t('appointments.scheduledAt', 'Scheduled At')} *</label>
                <Input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>{t('appointments.duration', 'Duration (minutes)')}</label>
                <Input
                  type="number"
                  min={15}
                  step={15}
                  value={duration || ''}
                  onChange={(e) => setDuration(Number(e.target.value) || 0)}
                />
              </div>
              <div>
                <label className={labelClass}>{t('appointments.status', 'Status')}</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as AppointmentStatus)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                >
                  <option value="scheduled">{t('appointments.statusScheduled', 'Scheduled')}</option>
                  <option value="confirmed">{t('appointments.statusConfirmed', 'Confirmed')}</option>
                  <option value="in-progress">{t('appointments.statusInProgress', 'In Progress')}</option>
                  <option value="completed">{t('appointments.statusCompleted', 'Completed')}</option>
                  <option value="cancelled">{t('appointments.statusCancelled', 'Cancelled')}</option>
                  <option value="no-show">{t('appointments.statusNoShow', 'No Show')}</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>{t('appointments.notes', 'Notes')}</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                  rows={2}
                />
              </div>
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button type="submit" loading={loading}>
            {appointment ? t('common.update', 'Update') : t('common.save', 'Save')}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
};

export default AppointmentModal;

