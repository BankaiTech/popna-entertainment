import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Pagination } from '@/components/ui/Pagination';
import { Plus, Search, Trash2, Pencil, Wrench, AlertTriangle } from 'lucide-react';
import type { ServiceRequest, ServiceRequestStatus, PriorityLevel } from '@/models/types';
import { useServiceRequestsStore } from '@/store/useServiceRequestsStore';
import { useTerminology } from '@/hooks/useTerminology';
import ServiceRequestModal from '@/components/ServiceRequestModal';
import { cn } from '@/lib/utils';

const ServiceRequests = () => {
  const { t } = useTranslation();
  const { term } = useTerminology();
  const pageLabel = term('serviceRequest', t('nav.serviceRequests', 'Service Requests'));
  const { serviceRequests, loading, fetchServiceRequests, addServiceRequest, updateServiceRequest, deleteServiceRequest } = useServiceRequestsStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ServiceRequestStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<PriorityLevel | 'all'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<ServiceRequest | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchServiceRequests();
  }, [fetchServiceRequests]);

  const filtered = useMemo(() => {
    return serviceRequests.filter((r) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        r.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.customerMobile.includes(searchQuery) ||
        r.requestType.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || r.priority === priorityFilter;
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [serviceRequests, searchQuery, statusFilter, priorityFilter]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage]);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, statusFilter, priorityFilter]);

  const handleAdd = () => { setEditingRequest(null); setIsModalOpen(true); };
  const handleEdit = (r: ServiceRequest) => { setEditingRequest(r); setIsModalOpen(true); };
  const handleClose = () => { setIsModalOpen(false); setEditingRequest(null); };

  const handleDelete = async (id: number) => {
    if (window.confirm(t('serviceRequests.deleteConfirm', 'Are you sure you want to delete this service request?'))) {
      await deleteServiceRequest(id);
    }
  };

  const priorityBadge = (priority: PriorityLevel) => {
    const colors: Record<PriorityLevel, string> = {
      low: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
      medium: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };
    return (
      <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', colors[priority])}>
        {t(`serviceRequests.priority${priority.charAt(0).toUpperCase() + priority.slice(1)}`, priority)}
      </span>
    );
  };

  const formatDate = (iso: string) => new Date(iso).toLocaleString();

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="py-2.5 px-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-56 shrink-0">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder={t('serviceRequests.searchPlaceholder', 'Search by customer or description...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ServiceRequestStatus | 'all')} className="h-8 text-xs w-full sm:w-36">
              <option value="all">{t('common.allStatuses', 'All Statuses')}</option>
              <option value="new">{t('serviceRequests.statusNew', 'New')}</option>
              <option value="assigned">{t('serviceRequests.statusAssigned', 'Assigned')}</option>
              <option value="in-progress">{t('serviceRequests.statusInProgress', 'In progress')}</option>
              <option value="resolved">{t('serviceRequests.statusResolved', 'Resolved')}</option>
              <option value="closed">{t('serviceRequests.statusClosed', 'Closed')}</option>
            </Select>
            <Select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as PriorityLevel | 'all')} className="h-8 text-xs w-full sm:w-32">
              <option value="all">{t('serviceRequests.allPriorities', 'All Priorities')}</option>
              {(['low', 'medium', 'high', 'critical'] as const).map((p) => (<option key={p} value={p}>{t(`serviceRequests.priority${p.charAt(0).toUpperCase() + p.slice(1)}`, p)}</option>))}
            </Select>
            <Button onClick={handleAdd} size="xs" className="shrink-0 w-full sm:w-auto ml-auto">
              <Plus className="w-3.5 h-3.5" />
              {t('serviceRequests.addRequest', 'Add {{label}}', { label: pageLabel })}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-8 text-gray-500">{t('common.loading', 'Loading...')}</div>
          ) : paginated.length === 0 ? (
            <div className="text-center py-8 text-gray-500 flex flex-col items-center gap-2">
              <Wrench className="w-10 h-10 text-gray-400" />
              {t('serviceRequests.noRequests', 'No service requests found')}
            </div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-3 font-medium text-gray-500 dark:text-gray-400">{t('serviceRequests.customer', 'Customer')}</th>
                      <th className="text-left py-3 px-3 font-medium text-gray-500 dark:text-gray-400">{t('serviceRequests.requestType', 'Type')}</th>
                      <th className="text-left py-3 px-3 font-medium text-gray-500 dark:text-gray-400">{t('serviceRequests.description', 'Description')}</th>
                      <th className="text-left py-3 px-3 font-medium text-gray-500 dark:text-gray-400">{t('serviceRequests.priority', 'Priority')}</th>
                      <th className="text-left py-3 px-3 font-medium text-gray-500 dark:text-gray-400">SLA</th>
                      <th className="text-right py-3 px-3 font-medium text-gray-500 dark:text-gray-400">{t('common.actions', 'Actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((r) => (
                      <tr key={r.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="py-3 px-3">
                          <p className="font-medium text-gray-900 dark:text-gray-100">{r.customerName}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{r.customerMobile}</p>
                        </td>
                        <td className="py-3 px-3 text-gray-700 dark:text-gray-300">{r.requestType}</td>
                        <td className="py-3 px-3 text-gray-700 dark:text-gray-300 max-w-[200px] truncate">{r.description}</td>
                        <td className="py-3 px-3">{priorityBadge(r.priority)}</td>
                        <td className="py-3 px-3 text-gray-500 dark:text-gray-400">
                          {r.slaDeadline ? formatDate(r.slaDeadline) : '–'}
                          {r.slaBreached && <AlertTriangle className="inline w-4 h-4 ml-1 text-red-500" />}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => handleEdit(r)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-blue-600"><Pencil className="w-4 h-4" /></button>
                            <button onClick={() => handleDelete(r.id)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="md:hidden space-y-3">
                {paginated.map((r) => (
                  <div key={r.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{r.customerName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{r.requestType} • {r.priority}</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{r.description}</p>
                    {r.slaDeadline && <p className="text-xs text-gray-500">{t('serviceRequests.slaDeadline', 'SLA')}: {formatDate(r.slaDeadline)}{r.slaBreached && ' • Breached'}</p>}
                    <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                      <button onClick={() => handleEdit(r)} className="px-2 py-1 rounded-md text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">{t('common.edit', 'Edit')}</button>
                      <button onClick={() => handleDelete(r.id)} className="px-2 py-1 rounded-md text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40">{t('common.delete', 'Delete')}</button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          {totalPages > 1 && <div className="mt-4"><Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} /></div>}
        </CardContent>
      </Card>
      <ServiceRequestModal isOpen={isModalOpen} onClose={handleClose} request={editingRequest} onSave={addServiceRequest} onUpdate={updateServiceRequest} />
    </div>
  );
};

export default ServiceRequests;
