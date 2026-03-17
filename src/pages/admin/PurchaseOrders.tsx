import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTerminology } from '@/hooks/useTerminology';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Pagination } from '@/components/ui/Pagination';
import { Search } from 'lucide-react';
import Select from '@/components/ui/Select';
import type { PurchaseOrder, PurchaseOrderStatus } from '@/models/types';
import { usePurchaseOrdersStore } from '@/store/usePurchaseOrdersStore';
import PurchaseOrderModal from '@/components/PurchaseOrderModal';
import { cn, formatCurrencyINR } from '@/lib/utils';
import { purchaseInvoicesApi } from '@/api/purchaseInvoices';
import { useAuthStore } from '@/store/useAuthStore';
import { showSuccess, showInfo } from '@/utils/toast';

const PurchaseOrders = () => {
  const { t } = useTranslation();
  const { term } = useTerminology();
  const vendorLabel = term('vendor', t('purchaseOrders.colVendor', 'Vendor'));
  const {
    purchaseOrders,
    loading,
    fetchPurchaseOrders,
    addPurchaseOrder,
    updatePurchaseOrder,
    deletePurchaseOrder,
  } = usePurchaseOrdersStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PurchaseOrderStatus | 'all'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<PurchaseOrder | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchPurchaseOrders();
  }, [fetchPurchaseOrders]);

  const filtered = useMemo(() => {
    return purchaseOrders.filter((po) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        po.vendorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        po.poNumber.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || po.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [purchaseOrders, searchQuery, statusFilter]);

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

  const openEdit = (po: PurchaseOrder) => {
    setEditing(po);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditing(null);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm(t('purchaseOrders.deleteConfirm', 'Delete this purchase order?'))) {
      await deletePurchaseOrder(id);
    }
  };

  const handleCreatePurchaseInvoice = async (po: PurchaseOrder) => {
    if (po.status === 'draft' || po.status === 'cancelled') {
      showInfo(t('purchaseOrders.cannotConvert', 'Cannot create invoice from a {{status}} order.', { status: po.status }));
      return;
    }
    try {
      const orgId = useAuthStore.getState().organizationId ?? po.organizationId;
      const gstAmt = po.taxTotal;
      const halfGst = Math.round(gstAmt / 2 * 100) / 100;
      const newPI = await purchaseInvoicesApi.create({
        organizationId: orgId,
        invoiceNumber: `PINV-${po.poNumber.replace('PO-', '')}`,
        vendorId: po.vendorId,
        vendorName: po.vendorName,
        reference: po.poNumber,
        amount: po.subtotal,
        gstBreakup: { cgst: halfGst, sgst: halfGst },
        totalAmount: po.grandTotal,
        issueDate: new Date().toISOString().slice(0, 10),
      });
      showSuccess(
        t('purchaseOrders.piCreated', 'Purchase Invoice {{number}} created.', { number: newPI.invoiceNumber })
      );
    } catch {
      showInfo(t('purchaseOrders.piError', 'Failed to create purchase invoice.'));
    }
  };

  const statusBadge = (status: PurchaseOrderStatus) => {
    const colors: Record<PurchaseOrderStatus, string> = {
      draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800/60 dark:text-gray-100',
      sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
      partial: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
      received: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    };
    const labelKeys: Record<PurchaseOrderStatus, string> = {
      draft: 'purchaseOrders.statusDraft',
      sent: 'purchaseOrders.statusSent',
      partial: 'purchaseOrders.statusPartial',
      received: 'purchaseOrders.statusReceived',
      cancelled: 'purchaseOrders.statusCancelled',
    };
    return (
      <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', colors[status])}>
        {t(labelKeys[status], status)}
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
                placeholder={t('purchaseOrders.searchPlaceholder', 'Search by {{vendorLabel}} or PO number...', { vendorLabel: vendorLabel.toLowerCase() })}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs w-full"
              />
            </div>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as PurchaseOrderStatus | 'all')}
              className="h-8 ml-auto text-xs w-full sm:w-32"
            >
              <option value="all">{t('purchaseOrders.allStatuses', 'All Statuses')}</option>
              <option value="draft">{t('purchaseOrders.statusDraft', 'Draft')}</option>
              <option value="sent">{t('purchaseOrders.statusSent', 'Sent')}</option>
              <option value="partial">{t('purchaseOrders.statusPartial', 'Partial Received')}</option>
              <option value="received">{t('purchaseOrders.statusReceived', 'Received')}</option>
              <option value="cancelled">{t('purchaseOrders.statusCancelled', 'Cancelled')}</option>
            </Select>
            <Button onClick={openCreate} size="xs" className="shrink-0 w-full sm:w-auto">
              <span className="mr-1 text-lg leading-none">+</span>
              {t('purchaseOrders.newPurchaseOrder', 'New Purchase Order')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-12">{t('common.loading', 'Loading...')}</div>
          ) : paginated.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {t('purchaseOrders.noResults', 'No purchase orders yet.')}
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-border bg-muted/30">
                      <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-28">
                        {t('purchaseOrders.colNumber', 'Number')}
                      </th>
                      <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-40">
                        {vendorLabel}
                      </th>
                      <th className="text-right px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-28">
                        {t('purchaseOrders.colTotal', 'Total')}
                      </th>
                      <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-32">
                        {t('common.status', 'Status')}
                      </th>
                      <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-32">
                        {t('purchaseOrders.colExpectedDate', 'Expected')}
                      </th>
                      <th className="text-right px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-32">
                        {t('common.actions', 'Actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((po, idx) => (
                      <tr
                        key={po.id}
                        className={cn(
                          'border-b border-border hover:bg-muted/50 transition-colors',
                          idx % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-muted/20'
                        )}
                      >
                        <td className="px-3 py-2 text-sm font-medium text-foreground">{po.poNumber}</td>
                        <td className="px-3 py-2 text-sm font-normal text-gray-600 dark:text-foreground">
                          {po.vendorName}
                        </td>
                        <td className="px-3 py-2 text-right text-sm font-medium text-foreground">
                          {formatCurrencyINR(po.grandTotal)}
                        </td>
                        <td className="px-3 py-2 text-sm">{statusBadge(po.status)}</td>
                        <td className="px-3 py-2 text-sm font-normal text-gray-600 dark:text-foreground">
                          {po.expectedDate || '-'}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className="inline-flex items-center gap-1">
                            {(po.status === 'received' || po.status === 'partial' || po.status === 'sent') && (
                              <Button
                                size="xs"
                                variant="outline"
                                onClick={() => handleCreatePurchaseInvoice(po)}
                              >
                                {t('purchaseOrders.createPI', 'Create PI')}
                              </Button>
                            )}
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => openEdit(po)}
                            >
                              {t('common.edit', 'Edit')}
                            </Button>
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => handleDelete(po.id)}
                            >
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
                {paginated.map((po) => (
                  <div
                    key={po.id}
                    className="bg-card border border-border rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-foreground">{po.poNumber}</p>
                        <p className="text-xs text-muted-foreground">{po.vendorName}</p>
                      </div>
                      {statusBadge(po.status)}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {t('purchaseOrders.colTotal', 'Total')}
                        </p>
                        <p className="font-medium">{formatCurrencyINR(po.grandTotal)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {t('purchaseOrders.colExpectedDate', 'Expected')}
                        </p>
                        <p className="font-medium">{po.expectedDate || '-'}</p>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2 border-t border-border">
                      {(po.status === 'received' || po.status === 'partial' || po.status === 'sent') && (
                        <Button size="xs" variant="outline" onClick={() => handleCreatePurchaseInvoice(po)}>
                          {t('purchaseOrders.createPI', 'Create PI')}
                        </Button>
                      )}
                      <Button size="xs" variant="outline" onClick={() => openEdit(po)}>
                        {t('common.edit', 'Edit')}
                      </Button>
                      <Button size="xs" variant="outline" onClick={() => handleDelete(po.id)}>
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

      <PurchaseOrderModal
        isOpen={isModalOpen}
        onClose={closeModal}
        purchaseOrder={editing}
        onSave={addPurchaseOrder}
        onUpdate={updatePurchaseOrder}
      />
    </div>
  );
};

export default PurchaseOrders;

