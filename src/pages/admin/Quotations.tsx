import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Pagination } from '@/components/ui/Pagination';
import { Search } from 'lucide-react';
import type { Quotation, QuotationStatus } from '@/models/types';
import { useQuotationsStore } from '@/store/useQuotationsStore';
import { useTerminology } from '@/hooks/useTerminology';
import QuotationModal from '@/components/QuotationModal';
import { cn, formatCurrencyINR } from '@/lib/utils';
import { showInfo } from '@/utils/toast';

const Quotations = () => {
  const { t } = useTranslation();
  const { term } = useTerminology();
  const quotationLabel = term('quotation', t('quotations.title', 'Quotation'));
  const customerLabel = term('customer', t('contacts.customer', 'Customer'));
  const {
    quotations,
    loading,
    fetchQuotations,
    addQuotation,
    updateQuotation,
    deleteQuotation,
  } = useQuotationsStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<QuotationStatus | 'all'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

  const filtered = useMemo(() => {
    return quotations.filter((q) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        q.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.quotationNumber.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || q.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [quotations, searchQuery, statusFilter]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const handleAdd = () => {
    setEditingQuotation(null);
    setIsModalOpen(true);
  };

  const handleEdit = (q: Quotation) => {
    setEditingQuotation(q);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingQuotation(null);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm(t('quotations.deleteConfirm', 'Delete this quotation?'))) {
      await deleteQuotation(id);
    }
  };

  const handleConvertToInvoice = (q: Quotation) => {
    // Placeholder: actual conversion will create invoice in future phase
    showInfo(
      t(
        'quotations.convertInfo',
        'Quotation {{number}} would be converted to an invoice in the full backend implementation.',
        { number: q.quotationNumber }
      )
    );
  };

  const statusBadge = (status: QuotationStatus) => {
    const colors: Record<QuotationStatus, string> = {
      draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800/60 dark:text-gray-100',
      sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
      accepted: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
      expired: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
    };
    const labelKeys: Record<QuotationStatus, string> = {
      draft: 'quotations.statusDraft',
      sent: 'quotations.statusSent',
      accepted: 'quotations.statusAccepted',
      rejected: 'quotations.statusRejected',
      expired: 'quotations.statusExpired',
    };
    return (
      <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', colors[status])}>
        {t(labelKeys[status], status)}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="py-2.5 px-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-56 shrink-0">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder={t('quotations.searchPlaceholder', 'Search by customer or quotation no...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as QuotationStatus | 'all')}
              className="h-8 ml-auto text-xs w-full sm:w-32"
            >
              <option value="all">{t('quotations.allStatuses', 'All Statuses')}</option>
              <option value="draft">{t('quotations.statusDraft', 'Draft')}</option>
              <option value="sent">{t('quotations.statusSent', 'Sent')}</option>
              <option value="accepted">{t('quotations.statusAccepted', 'Accepted')}</option>
              <option value="rejected">{t('quotations.statusRejected', 'Rejected')}</option>
              <option value="expired">{t('quotations.statusExpired', 'Expired')}</option>
            </Select>
            <Button onClick={handleAdd} size="xs" className="shrink-0 w-full sm:w-auto">
              <span className="mr-1 text-lg leading-none">+</span>
              {t('quotations.addQuotation', 'New {{label}}', { label: quotationLabel })}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">

          {loading ? (
            <div className="text-center py-8 text-gray-500">{t('common.loading', 'Loading...')}</div>
          ) : paginated.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {t('quotations.noResults', 'No quotations found')}
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-2.5 px-3 font-medium text-gray-500 dark:text-gray-400 w-32">
                        {t('quotations.colNumber', 'Number')}
                      </th>
                      <th className="text-left py-2.5 px-3 font-medium text-gray-500 dark:text-gray-400 w-40">
                        {customerLabel}
                      </th>
                      <th className="text-right py-2.5 px-3 font-medium text-gray-500 dark:text-gray-400 w-28">
                        {t('quotations.colTotal', 'Total')}
                      </th>
                      <th className="text-left py-2.5 px-3 font-medium text-gray-500 dark:text-gray-400 w-28">
                        {t('common.status', 'Status')}
                      </th>
                      <th className="text-left py-2.5 px-3 font-medium text-gray-500 dark:text-gray-400 w-32">
                        {t('quotations.colValidUntil', 'Valid Until')}
                      </th>
                      <th className="text-right py-2.5 px-3 font-medium text-gray-500 dark:text-gray-400 w-32">
                        {t('common.actions', 'Actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((q) => (
                      <tr
                        key={q.id}
                        className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40"
                      >
                        <td className="py-2.5 px-3 text-gray-900 dark:text-gray-100 font-medium">
                          {q.quotationNumber}
                        </td>
                        <td className="py-2.5 px-3 text-gray-700 dark:text-gray-300">
                          {q.customerName}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-gray-900 dark:text-gray-100">
                          {formatCurrencyINR(q.grandTotal)}
                        </td>
                        <td className="py-2.5 px-3">{statusBadge(q.status)}</td>
                        <td className="py-2.5 px-3 text-gray-600 dark:text-gray-300">
                          {q.validUntil}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => handleConvertToInvoice(q)}
                            >
                              {t('quotations.convert', 'Convert')}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(q)}
                              aria-label={t('common.edit', 'Edit')}
                            >
                              ✏️
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(q.id)}
                              aria-label={t('common.delete', 'Delete')}
                            >
                              🗑
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {paginated.map((q) => (
                  <div
                    key={q.id}
                    className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {q.quotationNumber}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {q.customerName}
                        </p>
                      </div>
                      {statusBadge(q.status)}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {t('quotations.colValidUntil', 'Valid Until')}
                        </p>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {q.validUntil}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {t('quotations.colTotal', 'Total')}
                        </p>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">
                          {formatCurrencyINR(q.grandTotal)}
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => handleConvertToInvoice(q)}
                      >
                        {t('quotations.convert', 'Convert')}
                      </Button>
                      <Button size="xs" variant="outline" onClick={() => handleEdit(q)}>
                        {t('common.edit', 'Edit')}
                      </Button>
                      <Button size="xs" variant="outline" onClick={() => handleDelete(q.id)}>
                        {t('common.delete', 'Delete')}
                      </Button>
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

      <QuotationModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        quotation={editingQuotation}
        onSave={addQuotation}
        onUpdate={updateQuotation}
      />
    </div>
  );
};

export default Quotations;

