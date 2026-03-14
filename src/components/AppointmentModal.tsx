import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/Dialog';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import type { Appointment, AppointmentStatus } from '@/models/types';
import { MOCK_ORGANIZATION_ID } from '@/models/types';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment?: Appointment | null;
  onSave: (appointment: Omit<Appointment, 'id' | 'createdAt'>) => Promise<void>;
  onUpdate: (id: number, appointment: Partial<Appointment>) => Promise<void>;
}

const SERVICE_TYPES = ['Consultation', 'Haircut', 'Follow-up', 'Service', 'Booking', 'Other'];

const labelClass = 'block text-sm font-medium text-foreground mb-2';
const textareaClass = cn(
  'flex min-h-[80px] w-full rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm',
  'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-muted-foreground',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary',
  'disabled:cursor-not-allowed disabled:opacity-50 resize-none'
);

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
  const [scheduledTime, setScheduledTime] = useState('09:00');
  const [duration, setDuration] = useState(30);
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
      setStaffAssigned(appointment.staffAssigned || '');
      const d = new Date(appointment.scheduledAt);
      setScheduledAt(d.toISOString().slice(0, 10));
      setScheduledTime(d.toTimeString().slice(0, 5));
      setDuration(appointment.duration);
      setStatus(appointment.status);
      setNotes(appointment.notes || '');
    } else {
      setCustomerId('');
      setCustomerName('');
      setCustomerMobile('');
      setServiceType(SERVICE_TYPES[0]);
      setStaffAssigned('');
      const today = new Date().toISOString().slice(0, 10);
      setScheduledAt(today);
      setScheduledTime('09:00');
      setDuration(30);
      setStatus('scheduled');
      setNotes('');
    }
  }, [appointment, isOpen]);

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
    if (!customerName.trim() || !customerMobile.trim() || !serviceType.trim() || !scheduledAt) return;
    const scheduledAtISO = new Date(`${scheduledAt}T${scheduledTime}`).toISOString();
    setLoading(true);
    try {
      if (appointment) {
        await onUpdate(appointment.id, {
          customerId: customerId || appointment.customerId,
          customerName: customerName.trim(),
          customerMobile: customerMobile.trim(),
          serviceType: serviceType.trim(),
          staffAssigned: staffAssigned.trim() || undefined,
          scheduledAt: scheduledAtISO,
          duration,
          status,
          notes: notes.trim() || undefined,
        });
      } else {
        await onSave({
          organizationId: MOCK_ORGANIZATION_ID,
          customerId: customerId || 0,
          customerName: customerName.trim(),
          customerMobile: customerMobile.trim(),
          serviceType: serviceType.trim(),
          staffAssigned: staffAssigned.trim() || undefined,
          scheduledAt: scheduledAtISO,
          duration,
          status,
          notes: notes.trim() || undefined,
        });
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
          title={appointment ? t('appointments.editAppointment', 'Edit Appointment') : t('appointments.addAppointment', 'Add Appointment')}
          onClose={onClose}
        />
        <DialogBody>
          <div className="p-4 sm:p-6 space-y-6">
            {/* Customer */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>{t('appointments.customer', 'Customer')} *</label>
                  <Select
                    value={customerId === '' ? '' : String(customerId)}
                    onChange={(e) => setCustomerId(e.target.value === '' ? '' : Number(e.target.value))}
                  >
                    <option value="">{t('appointments.selectCustomer', 'Select customer')}</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} – {c.mobile}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className={labelClass}>{t('appointments.customerName', 'Customer name')}</label>
                  <Input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder={t('appointments.customerNamePlaceholder', 'Name')}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>{t('appointments.customerMobile', 'Mobile')} *</label>
                  <Input
                    value={customerMobile}
                    onChange={(e) => setCustomerMobile(e.target.value)}
                    placeholder={t('appointments.customerMobilePlaceholder', 'Mobile number')}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>{t('appointments.staffAssigned', 'Staff assigned')}</label>
                  <Input
                    value={staffAssigned}
                    onChange={(e) => setStaffAssigned(e.target.value)}
                    placeholder={t('appointments.staffPlaceholder', 'Staff name')}
                  />
                </div>
              </div>
            </div>

            {/* Schedule */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>{t('appointments.serviceType', 'Service type')} *</label>
                  <Select value={serviceType} onChange={(e) => setServiceType(e.target.value)} required>
                    {SERVICE_TYPES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className={labelClass}>{t('appointments.date', 'Date')} *</label>
                  <Input type="date" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} required />
                </div>
                <div>
                  <label className={labelClass}>{t('appointments.time', 'Time')}</label>
                  <Input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>{t('appointments.duration', 'Duration (min)')}</label>
                  <Input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value) || 30)}
                    min={5}
                    max={480}
                  />
                </div>
                <div>
                  <label className={labelClass}>{t('common.status', 'Status')}</label>
                  <Select value={status} onChange={(e) => setStatus(e.target.value as AppointmentStatus)}>
                    <option value="scheduled">{t('appointments.statusScheduled', 'Scheduled')}</option>
                    <option value="confirmed">{t('appointments.statusConfirmed', 'Confirmed')}</option>
                    <option value="in-progress">{t('appointments.statusInProgress', 'In progress')}</option>
                    <option value="completed">{t('appointments.statusCompleted', 'Completed')}</option>
                    <option value="cancelled">{t('appointments.statusCancelled', 'Cancelled')}</option>
                    <option value="no-show">{t('appointments.statusNoShow', 'No show')}</option>
                  </Select>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('appointments.notes', 'Notes')}
              </p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={textareaClass}
                rows={2}
                placeholder={t('appointments.notesPlaceholder', 'Optional notes')}
              />
            </div>
          </div>
        </DialogBody>
        <DialogFooter className="flex flex-row justify-end gap-2 pt-4 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button type="submit" loading={loading} disabled={!customerName.trim() || !customerMobile.trim() || !serviceType.trim() || !scheduledAt}>
            {appointment ? t('common.update', 'Update') : t('common.save', 'Save')}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
};

export default AppointmentModal;
