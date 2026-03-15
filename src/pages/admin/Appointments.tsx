import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Pagination } from '@/components/ui/Pagination';
import { Plus, Search, Trash2, Pencil, Calendar } from 'lucide-react';
import type { Appointment, AppointmentStatus } from '@/models/types';
import { useAppointmentsStore } from '@/store/useAppointmentsStore';
import { useTerminology } from '@/hooks/useTerminology';
import AppointmentModal from '@/components/AppointmentModal';
import { cn } from '@/lib/utils';

const Appointments = () => {
  const { t } = useTranslation();
  const { term } = useTerminology();
  const pageLabel = term('appointment', t('nav.appointments', 'Appointments'));
  const { appointments, loading, fetchAppointments, addAppointment, updateAppointment, deleteAppointment } = useAppointmentsStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | 'all'>('all');
  const [dateFilter, setDateFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const filteredAppointments = useMemo(() => {
    return appointments.filter((apt) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        apt.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        apt.customerMobile.includes(searchQuery) ||
        apt.serviceType.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || apt.status === statusFilter;
      const matchesDate =
        !dateFilter ||
        apt.scheduledAt.startsWith(dateFilter);
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [appointments, searchQuery, statusFilter, dateFilter]);

  const totalPages = Math.ceil(filteredAppointments.length / itemsPerPage);
  const paginatedAppointments = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAppointments.slice(start, start + itemsPerPage);
  }, [filteredAppointments, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, dateFilter]);

  const handleAdd = () => {
    setEditingAppointment(null);
    setIsModalOpen(true);
  };
  const handleEdit = (apt: Appointment) => {
    setEditingAppointment(apt);
    setIsModalOpen(true);
  };
  const handleClose = () => {
    setIsModalOpen(false);
    setEditingAppointment(null);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm(t('appointments.deleteConfirm', 'Are you sure you want to delete this appointment?'))) {
      await deleteAppointment(id);
    }
  };

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
  };

  const statusLabel: Record<AppointmentStatus, string> = {
    scheduled: t('appointments.statusScheduled', 'Scheduled'),
    confirmed: t('appointments.statusConfirmed', 'Confirmed'),
    'in-progress': t('appointments.statusInProgress', 'In progress'),
    completed: t('appointments.statusCompleted', 'Completed'),
    cancelled: t('appointments.statusCancelled', 'Cancelled'),
    'no-show': t('appointments.statusNoShow', 'No show'),
  };
  const statusBadge = (status: AppointmentStatus) => {
    const colors: Record<AppointmentStatus, string> = {
      scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      confirmed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      'in-progress': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
      completed: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      'no-show': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    };
    return (
      <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', colors[status])}>
        {statusLabel[status]}
      </span>
    );
  };

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="py-2.5 px-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-56 shrink-0">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder={t('appointments.searchPlaceholder', 'Search by customer or service...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as AppointmentStatus | 'all')}
              className="h-8 text-xs w-full sm:w-36"
            >
              <option value="all">{t('common.allStatuses', 'All Statuses')}</option>
              <option value="scheduled">{t('appointments.statusScheduled', 'Scheduled')}</option>
              <option value="confirmed">{t('appointments.statusConfirmed', 'Confirmed')}</option>
              <option value="in-progress">{t('appointments.statusInProgress', 'In progress')}</option>
              <option value="completed">{t('appointments.statusCompleted', 'Completed')}</option>
              <option value="cancelled">{t('appointments.statusCancelled', 'Cancelled')}</option>
              <option value="no-show">{t('appointments.statusNoShow', 'No show')}</option>
            </Select>
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="h-8 text-xs w-full sm:w-36"
            />
            <Button onClick={handleAdd} size="xs" className="shrink-0 w-full sm:w-auto ml-auto">
              <Plus className="w-3.5 h-3.5" />
              {t('appointments.addAppointment', 'Add {{label}}', { label: pageLabel })}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-8 text-gray-500">{t('common.loading', 'Loading...')}</div>
          ) : paginatedAppointments.length === 0 ? (
            <div className="text-center py-8 text-gray-500 flex flex-col items-center gap-2">
              <Calendar className="w-10 h-10 text-gray-400" />
              {t('appointments.noAppointments', 'No appointments found')}
            </div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-3 font-medium text-gray-500 dark:text-gray-400">{t('appointments.customer', 'Customer')}</th>
                      <th className="text-left py-3 px-3 font-medium text-gray-500 dark:text-gray-400">{t('appointments.serviceType', 'Service')}</th>
                      <th className="text-left py-3 px-3 font-medium text-gray-500 dark:text-gray-400">{t('appointments.scheduledAt', 'Scheduled')}</th>
                      <th className="text-left py-3 px-3 font-medium text-gray-500 dark:text-gray-400">{t('appointments.duration', 'Duration')}</th>
                      <th className="text-left py-3 px-3 font-medium text-gray-500 dark:text-gray-400">{t('common.status', 'Status')}</th>
                      <th className="text-right py-3 px-3 font-medium text-gray-500 dark:text-gray-400">{t('common.actions', 'Actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedAppointments.map((apt) => (
                      <tr key={apt.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="py-3 px-3">
                          <p className="font-medium text-gray-900 dark:text-gray-100">{apt.customerName}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{apt.customerMobile}</p>
                        </td>
                        <td className="py-3 px-3 text-gray-700 dark:text-gray-300">{apt.serviceType}</td>
                        <td className="py-3 px-3 text-gray-700 dark:text-gray-300">{formatDateTime(apt.scheduledAt)}</td>
                        <td className="py-3 px-3 text-gray-500 dark:text-gray-400">{apt.duration} min</td>
                        <td className="py-3 px-3">{statusBadge(apt.status)}</td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => handleEdit(apt)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-blue-600">
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(apt.id)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-red-600">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden space-y-3">
                {paginatedAppointments.map((apt) => (
                  <div key={apt.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{apt.customerName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{apt.customerMobile} • {apt.serviceType}</p>
                      </div>
                      {statusBadge(apt.status)}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {formatDateTime(apt.scheduledAt)} • {apt.duration} min
                    </p>
                    <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                      <button onClick={() => handleEdit(apt)} className="px-2 py-1 rounded-md text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                        {t('common.edit', 'Edit')}
                      </button>
                      <button onClick={() => handleDelete(apt.id)} className="px-2 py-1 rounded-md text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40">
                        {t('common.delete', 'Delete')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {totalPages > 1 && (
            <div className="mt-4">
              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </div>
          )}
        </CardContent>
      </Card>

      <AppointmentModal
        isOpen={isModalOpen}
        onClose={handleClose}
        appointment={editingAppointment}
        onSave={addAppointment}
        onUpdate={updateAppointment}
      />
    </div>
  );
};

export default Appointments;
