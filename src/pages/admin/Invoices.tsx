import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import { Pagination } from '@/components/ui/Pagination';
import { Plus, Download, Search } from 'lucide-react';
import Input from '@/components/ui/Input';
import type { SalesInvoice, InvoiceStatus, Provider } from '@/models/types';
import { salesInvoicesApi } from '@/api/invoices';
import { useStore } from '@/store/useStore';
import { getProviderDisplayName } from '@/lib/providerUtils';
import InvoiceModal from '@/components/InvoiceModal';
import { cn, formatCurrencyINR } from '@/lib/utils';
import { generateSalesInvoicePdf } from '@/lib/pdfUtils';

const Invoices = () => {
  const { t } = useTranslation();
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'All'>('All');
  const [serviceFilter, setServiceFilter] = useState<Provider | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const { initialize, fetchCustomers, fetchPlans, fetchProducts, customers, plans, products } = useStore();

  const loadInvoices = async () => {
    setLoading(true);
    const list = await salesInvoicesApi.getAll();
    setInvoices(list);
    setLoading(false);
  };

  useEffect(() => {
    const load = async () => {
      await initialize();
      await fetchProducts();
      await fetchCustomers();
      await fetchPlans();
      await loadInvoices();
    };
    load();
  }, [initialize, fetchProducts, fetchCustomers, fetchPlans]);

  const filtered = useMemo(() => {
    return invoices.filter((inv) => {
      const byStatus = statusFilter === 'All' || inv.status === statusFilter;
      const byService = serviceFilter === 'All' || inv.serviceProvider === serviceFilter;
      const bySearch = searchQuery.trim() === '' ||
        inv.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase());
      return byStatus && byService && bySearch;
    });
  }, [invoices, statusFilter, serviceFilter, searchQuery]);

  // Pagination logic
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedInvoices = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filtered.slice(startIndex, startIndex + itemsPerPage);
  }, [filtered, currentPage, itemsPerPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, serviceFilter]);

  const statusBadge = (status: InvoiceStatus) => {
    const styles: Record<InvoiceStatus, string> = {
      draft: 'bg-muted text-muted-foreground',
      sent: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800',
      overdue: 'bg-red-100 text-red-800',
    };
    const statusLabels: Record<InvoiceStatus, string> = {
      draft: t('invoices.draft', 'Draft'),
      sent: t('invoices.sent', 'Sent'),
      paid: t('invoices.paid', 'Paid'),
      overdue: t('invoices.overdue', 'Overdue'),
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {statusLabels[status]}
      </span>
    );
  };

  const handleDownloadPdf = async (inv: SalesInvoice) => {
    try {
      const customer = customers.find((c) => c.id === inv.customerId);
      const companyProfile = useStore.getState().companyProfile;
      await generateSalesInvoicePdf(inv, customer || null, companyProfile);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert(t('common.pdfError', 'Failed to generate PDF. Please try again.'));
    }
  };

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="py-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder={t('invoices.searchPlaceholder', 'Search by customer or invoice...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm w-50"
              />
            </div>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as InvoiceStatus | 'All')}
              className="h-9 text-sm"
            >
              <option value="All">{t('invoices.allStatus', 'All Status')}</option>
              <option value="draft">{t('invoices.statusDraft', 'Draft')}</option>
              <option value="sent">{t('invoices.statusSent', 'Sent')}</option>
              <option value="paid">{t('invoices.statusPaid', 'Paid')}</option>
              <option value="overdue">{t('invoices.statusOverdue', 'Overdue')}</option>
            </Select>
            <Select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value as Provider | 'All')}
              className="h-9 text-sm"
            >
              <option value="All">{t('invoices.allServices', 'All Services')}</option>
              {Array.isArray(products) && products.length > 0 ? (
                products.map((product) => (
                  <option key={product.id} value={product.name}>
                    {getProviderDisplayName(product.name, products)}
                  </option>
                ))
              ) : null}
            </Select>
            <Button onClick={() => setIsModalOpen(true)} size="xs" className="hidden sm:flex shrink-0">
              <Plus className="w-3.5 h-3.5" />
              {t('invoices.newInvoice', 'New Invoice')}
            </Button>
            <Button onClick={() => setIsModalOpen(true)} size="xs" className="sm:hidden w-auto shrink-0">
              <Plus className="w-3.5 h-3.5" />
              {t('invoices.newInvoice', 'New Invoice')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-12">{t('common.loading', 'Loading...')}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">{t('invoices.noResults', 'No invoices match filters.')}</div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-border bg-muted/30">
                      <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-24">{t('invoices.colNumber', 'Number')}</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-32">{t('invoices.colCustomer', 'Customer')}</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-28">{t('invoices.colService', 'Service')}</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-28">{t('invoices.colPlan', 'Plan')}</th>
                      <th className="text-right px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-28">{t('invoices.colTotal', 'Total')}</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-24">{t('invoices.colStatus', 'Status')}</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-28">{t('invoices.colDue', 'Due')}</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-16">{t('invoices.colPdf', 'PDF')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedInvoices.map((inv, idx) => (
                      <tr key={inv.id} className={cn(
                        "border-b border-border hover:bg-muted/50 transition-colors",
                        idx % 2 === 0 ? 'bg-white' : 'bg-muted/20'
                      )}>
                        <td className="px-3 py-2 text-sm font-medium text-foreground">{inv.invoiceNumber}</td>
                        <td className="px-3 py-2 text-sm font-normal text-gray-600 dark:text-foreground">{inv.customerName}</td>
                        <td className="px-3 py-2 text-sm font-normal text-gray-600 dark:text-foreground">{getProviderDisplayName(inv.serviceProvider)}</td>
                        <td className="px-3 py-2 text-sm font-normal text-gray-600 dark:text-foreground">{inv.planName}</td>
                        <td className="px-3 py-2 text-right text-sm font-medium text-foreground">{formatCurrencyINR(inv.totalAmount)}</td>
                        <td className="px-3 py-2 text-sm">{statusBadge(inv.status)}</td>
                        <td className="px-3 py-2 text-sm font-normal text-gray-600 dark:text-foreground">{inv.dueDate}</td>
                        <td className="px-3 py-2">
                          <Button variant="outline" size="sm" onClick={() => handleDownloadPdf(inv)}>
                            <Download className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-3 p-3">
                {paginatedInvoices.map((inv) => (
                  <div key={inv.id} className="bg-card border border-border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-bold text-foreground">{inv.invoiceNumber}</p>
                        <p className="text-sm text-muted-foreground">{inv.customerName}</p>
                      </div>
                      {statusBadge(inv.status)}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">{t('invoices.colService', 'Service')}</p>
                        <p className="font-medium">{getProviderDisplayName(inv.serviceProvider)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{t('invoices.colPlan', 'Plan')}</p>
                        <p className="font-medium">{inv.planName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{t('invoices.colTotal', 'Total')}</p>
                        <p className="font-bold text-foreground">{formatCurrencyINR(inv.totalAmount)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{t('invoices.colDue', 'Due')}</p>
                        <p className="font-medium">{inv.dueDate}</p>
                      </div>
                    </div>
                    <div className="flex justify-end pt-2 border-t border-border">
                      <Button variant="outline" size="sm" onClick={() => handleDownloadPdf(inv)} className="flex items-center gap-2">
                        <Download className="w-4 h-4" />
                        {t('invoices.colPdf', 'PDF')}
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

      <InvoiceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        customers={customers}
        plans={plans}
        onSuccess={loadInvoices}
      />
    </div >
  );
};

export default Invoices;
