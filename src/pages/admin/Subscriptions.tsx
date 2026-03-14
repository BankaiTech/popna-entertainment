import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Pagination } from '@/components/ui/Pagination';
import { Plus, Search, Trash2, Pencil, Repeat } from 'lucide-react';
import type { Subscription, SubscriptionStatus } from '@/models/types';
import { useSubscriptionsStore } from '@/store/useSubscriptionsStore';
import SubscriptionModal from '@/components/SubscriptionModal';
import { cn, formatCurrencyINR } from '@/lib/utils';

const Subscriptions = () => {
  const { t } = useTranslation();
  const { subscriptions, loading, fetchSubscriptions, addSubscription, updateSubscription, deleteSubscription } = useSubscriptionsStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<SubscriptionStatus | 'all'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<Subscription | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  const filtered = useMemo(() => {
    return subscriptions.filter((s) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        s.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.planName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [subscriptions, searchQuery, statusFilter]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage]);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, statusFilter]);

  const handleAdd = () => { setEditingSub(null); setIsModalOpen(true); };
  const handleEdit = (s: Subscription) => { setEditingSub(s); setIsModalOpen(true); };
  const handleClose = () => { setIsModalOpen(false); setEditingSub(null); };

  const handleDelete = async (id: number) => {
    if (window.confirm(t('subscriptions.deleteConfirm', 'Are you sure you want to delete this subscription?'))) {
      await deleteSubscription(id);
    }
  };

  const statusBadge = (status: SubscriptionStatus) => {
    const colors: Record<SubscriptionStatus, string> = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      paused: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      expired: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };
    return (
      <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', colors[status])}>
        {t(`subscriptions.status${status.charAt(0).toUpperCase() + status.slice(1)}`, status)}
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
                placeholder={t('subscriptions.searchPlaceholder', 'Search by customer or plan...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as SubscriptionStatus | 'all')} className="h-8 text-xs w-full sm:w-36">
              <option value="all">{t('common.allStatuses', 'All Statuses')}</option>
              <option value="active">{t('subscriptions.statusActive', 'Active')}</option>
              <option value="paused">{t('subscriptions.statusPaused', 'Paused')}</option>
              <option value="cancelled">{t('subscriptions.statusCancelled', 'Cancelled')}</option>
              <option value="expired">{t('subscriptions.statusExpired', 'Expired')}</option>
            </Select>
            <Button onClick={handleAdd} size="xs" className="shrink-0 w-full sm:w-auto ml-auto">
              <Plus className="w-3.5 h-3.5" />
              {t('subscriptions.addSubscription', 'Add Subscription')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-8 text-gray-500">{t('common.loading', 'Loading...')}</div>
          ) : paginated.length === 0 ? (
            <div className="text-center py-8 text-gray-500 flex flex-col items-center gap-2">
              <Repeat className="w-10 h-10 text-gray-400" />
              {t('subscriptions.noSubscriptions', 'No subscriptions found')}
            </div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-3 font-medium text-gray-500 dark:text-gray-400">{t('subscriptions.customer', 'Customer')}</th>
                      <th className="text-left py-3 px-3 font-medium text-gray-500 dark:text-gray-400">{t('subscriptions.planName', 'Plan')}</th>
                      <th className="text-right py-3 px-3 font-medium text-gray-500 dark:text-gray-400">{t('subscriptions.amount', 'Amount')}</th>
                      <th className="text-left py-3 px-3 font-medium text-gray-500 dark:text-gray-400">{t('subscriptions.billingCycle', 'Cycle')}</th>
                      <th className="text-left py-3 px-3 font-medium text-gray-500 dark:text-gray-400">{t('subscriptions.nextBillingDate', 'Next billing')}</th>
                      <th className="text-left py-3 px-3 font-medium text-gray-500 dark:text-gray-400">{t('common.status', 'Status')}</th>
                      <th className="text-right py-3 px-3 font-medium text-gray-500 dark:text-gray-400">{t('common.actions', 'Actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((s) => (
                      <tr key={s.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="py-3 px-3 font-medium text-gray-900 dark:text-gray-100">{s.customerName}</td>
                        <td className="py-3 px-3 text-gray-700 dark:text-gray-300">{s.planName}</td>
                        <td className="py-3 px-3 text-right font-medium text-gray-900 dark:text-gray-100">{formatCurrencyINR(s.amount)}</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">{t(`subscriptions.${s.billingCycle}`, s.billingCycle)}</td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">{s.nextBillingDate}</td>
                        <td className="py-3 px-3">{statusBadge(s.status)}</td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => handleEdit(s)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-blue-600"><Pencil className="w-4 h-4" /></button>
                            <button onClick={() => handleDelete(s.id)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="md:hidden space-y-3">
                {paginated.map((s) => (
                  <div key={s.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{s.customerName}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{s.planName} • {t(`subscriptions.${s.billingCycle}`, s.billingCycle)}</p>
                    <p className="text-sm font-medium text-primary mt-1">{formatCurrencyINR(s.amount)}</p>
                    <div className="flex items-center justify-between mt-2">
                      {statusBadge(s.status)}
                      <span className="text-xs text-gray-500">{t('subscriptions.nextBillingDate', 'Next')}: {s.nextBillingDate}</span>
                    </div>
                    <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                      <button onClick={() => handleEdit(s)} className="px-2 py-1 rounded-md text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">{t('common.edit', 'Edit')}</button>
                      <button onClick={() => handleDelete(s.id)} className="px-2 py-1 rounded-md text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40">{t('common.delete', 'Delete')}</button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          {totalPages > 1 && <div className="mt-4"><Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} /></div>}
        </CardContent>
      </Card>
      <SubscriptionModal isOpen={isModalOpen} onClose={handleClose} subscription={editingSub} onSave={addSubscription} onUpdate={updateSubscription} />
    </div>
  );
};

export default Subscriptions;
