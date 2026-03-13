import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Pagination } from '@/components/ui/Pagination';
import { CalendarClock, Plus, Search } from 'lucide-react';
import type { Appointment, AppointmentStatus } from '@/models/types';
import { useAppointmentsStore } from '@/store/useAppointmentsStore';
import AppointmentModal from '@/components/AppointmentModal';
import { cn } from '@/lib/utils';

const Appointments = () => {
  const { t } = useTranslation();
  const {
    appointments,
    loading,
    fetchAppointments,
    addAppointment,
    updateAppointment,
    deleteAppointment,
  } = useAppointmentsStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | 'all'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const filtered = useMemo(() => {
    return appointments.filter((a) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        a.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.customerMobile.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.serviceType.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [appointments, searchQuery, statusFilter]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const openCreate = () => {
    setEditing(null);
    setIsModalOpen(true);
  };

  const openEdit = (a: Appointment) => {
    setEditing(a);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditing(null);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm(t('appointments.deleteConfirm', 'Delete this appointment?'))) {
      await deleteAppointment(id);
    }
  };

  const statusBadge = (status: AppointmentStatus) => {
    const colors: Record<AppointmentStatus, string> = {
      scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
      confirmed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
      'in-progress': 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
      completed: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
      'no-show': 'bg-gray-100 text-gray-800 dark:bg-gray-800/60 dark:text-gray-100',
    };
    const key: Record<AppointmentStatus, string> = {
      scheduled: 'appointments.statusScheduled',
      confirmed: 'appointments.statusConfirmed',
      'in-progress': 'appointments.statusInProgress',
      completed: 'appointments.statusCompleted',
      cancelled: 'appointments.statusCancelled',
      'no-show': 'appointments.statusNoShow',
    };
    return (
      <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', colors[status])}>
        {t(key[status])}
      </span>
    );
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString();
  };

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="py-3">
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-indigo-500" />
              <div>
                <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {t('appointments.title', 'Appointments & Bookings')}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('appointments.subtitle', 'Manage consultations, visits, and reservations in one place.')}
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <div className="relative flex-1 sm:w-56">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder={t('appointments.searchPlaceholder', 'Search by name, mobile, or service...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-sm w-full"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as AppointmentStatus | 'all')}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-xs sm:text-sm sm:w-40"
              >
                <option value="all">{t('appointments.allStatuses', 'All Statuses')}</option>
                <option value="scheduled">{t('appointments.statusScheduled', 'Scheduled')}</option>
                <option value="confirmed">{t('appointments.statusConfirmed', 'Confirmed')}</option>
                <option value="in-progress">{t('appointments.statusInProgress', 'In Progress')}</option>
                <option value="completed">{t('appointments.statusCompleted', 'Completed')}</option>
                <option value="cancelled">{t('appointments.statusCancelled', 'Cancelled')}</option>
                <option value="no-show">{t('appointments.statusNoShow', 'No Show')}</option>
              </select>
              <Button onClick={openCreate} size="xs" className="shrink-0">
                <Plus className="w-3.5 h-3.5" />
                {t('appointments.newAppointment', 'New Appointment')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-12">{t('common.loading', 'Loading...')}</div>
          ) : paginated.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {t('appointments.noResults', 'No appointments yet.')}
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-border bg-muted/30">
                      <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-40">
                        {t('appointments.colCustomer', 'Customer')}
                      </th>
                      <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-40">
                        {t('appointments.colService', 'Service')}
                      </th>
                      <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-40">
                        {t('appointments.colScheduledAt', 'Scheduled At')}
                      </th>
                      <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-24">
                        {t('appointments.colStatus', 'Status')}
                      </th>
                      <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-28">
                        {t('appointments.colStaff', 'Staff')}
                      </th>
                      <th className="text-right px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-24">
                        {t('common.actions', 'Actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((a, idx) => (
                      <tr
                        key={a.id}
                        className={cn(
                          'border-b border-border hover:bg-muted/50 transition-colors',
                          idx % 2 === 0 ? 'bg-white' : 'bg-muted/20'
                        )}
                      >
                        <td className="px-3 py-2 text-sm font-medium text-foreground">
                          {a.customerName}
                          <div className="text-xs text-muted-foreground">{a.customerMobile}</div>
                        </td>
                        <td className="px-3 py-2 text-sm font-normal text-gray-600 dark:text-foreground">
                          {a.serviceType}
                        </td>
                        <td className="px-3 py-2 text-sm font-normal text-gray-600 dark:text-foreground">
                          {formatTime(a.scheduledAt)}
                        </td>
                        <td className="px-3 py-2 text-sm">{statusBadge(a.status)}</td>
                        <td className="px-3 py-2 text-sm font-normal text-gray-600 dark:text-foreground">
                          {a.staffAssigned || '-'}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className="inline-flex items-center gap-1">
                            <Button size="xs" variant="outline" onClick={() => openEdit(a)}>
                              {t('common.edit', 'Edit')}
                            </Button>
                            <Button size="xs" variant="outline" onClick={() => handleDelete(a.id)}>
                              {t('common.delete', 'Delete')}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-3 p-3">
                {paginated.map((a) => (
                  <div key={a.id} className="bg-card border border-border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-foreground">{a.customerName}</p>
                        <p className="text-xs text-muted-foreground">{a.customerMobile}</p>
                        <p className="text-xs text-muted-foreground mt-1">{a.serviceType}</p>
                      </div>
                      {statusBadge(a.status)}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="col-span-2">
                        <p className="text-xs text-muted-foreground">
                          {t('appointments.colScheduledAt', 'Scheduled At')}
                        </p>
                        <p className="font-medium">{formatTime(a.scheduledAt)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {t('appointments.colStaff', 'Staff')}
                        </p>
                        <p className="font-medium">{a.staffAssigned || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {t('appointments.duration', 'Duration (minutes)')}
                        </p>
                        <p className="font-medium">{a.duration}</p>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2 border-t border-border">
                      <Button size="xs" variant="outline" onClick={() => openEdit(a)}>
                        {t('common.edit', 'Edit')}
                      </Button>
                      <Button size="xs" variant="outline" onClick={() => handleDelete(a.id)}>
                        {t('common.delete', 'Delete')}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
        {filtered.length > itemsPerPage && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            totalItems={filtered.length}
          />
        )}
      </Card>

      <AppointmentModal
        isOpen={isModalOpen}
        onClose={closeModal}
        appointment={editing}
        onSave={addAppointment}
        onUpdate={updateAppointment}
      />
    </div>
  );
};

export default Appointments;

