import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Pagination } from '@/components/ui/Pagination';
import { Plus, Search, Download } from 'lucide-react';
import type { PurchaseInvoice } from '@/models/types';
import { purchaseInvoicesApi, vendorsApi } from '@/api/purchaseInvoices';
import PurchaseInvoiceModal from '@/components/PurchaseInvoiceModal';
import { cn } from '@/lib/utils';
import { generatePurchaseInvoicePdf } from '@/lib/pdfUtils';
import { useStore } from '@/store/useStore';

const PurchaseInvoices = () => {
  const { t } = useTranslation();
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const { companyProfile } = useStore();

  const loadInvoices = async () => {
    setLoading(true);
    const invList = await purchaseInvoicesApi.getAll();
    setInvoices(invList);
    setLoading(false);
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  const filtered = useMemo(() => {
    return invoices.filter((inv) => {
      const bySearch = searchQuery.trim() === '' ||
        inv.vendorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (inv.reference && inv.reference.toLowerCase().includes(searchQuery.toLowerCase()));
      return bySearch;
    });
  }, [invoices, searchQuery]);

  // Pagination logic
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedInvoices = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filtered.slice(startIndex, startIndex + itemsPerPage);
  }, [filtered, currentPage, itemsPerPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const gstBreakupStr = (g: PurchaseInvoice['gstBreakup']) => {
    const parts: string[] = [];
    if (g.cgst != null) parts.push(`${t('invoices.cgst', 'CGST')}: ₹${g.cgst.toFixed(2)}`);
    if (g.sgst != null) parts.push(`${t('invoices.sgst', 'SGST')}: ₹${g.sgst.toFixed(2)}`);
    if (g.igst != null) parts.push(`${t('invoices.igst', 'IGST')}: ₹${g.igst.toFixed(2)}`);
    return parts.length ? parts.join(', ') : '—';
  };

  const handleDownloadPdf = async (inv: PurchaseInvoice) => {
    try {
      const vendor = await vendorsApi.getById(inv.vendorId);
      await generatePurchaseInvoicePdf(inv, companyProfile, vendor ?? undefined);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert(t('common.pdfError', 'Failed to generate PDF. Please try again.'));
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-foreground mb-1">{t('purchaseInvoices.title', 'Purchase Invoices')}</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {t('purchaseInvoices.subtitle', 'GST-compliant purchase invoices with CGST/SGST/IGST breakdown')}
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          {t('purchaseInvoices.newInvoice', 'New Purchase Invoice')}
        </Button>
      </div>

      <Card>
        <CardHeader className="py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder={t('purchaseInvoices.searchPlaceholder', 'Search by vendor or invoice...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm w-50"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-12">{t('common.loading', 'Loading...')}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">{t('purchaseInvoices.noResults', 'No purchase invoices yet.')}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-border bg-muted/30">
                    <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-24">{t('purchaseInvoices.colNumber', 'Number')}</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-32">{t('purchaseInvoices.colVendor', 'Vendor')}</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-16">{t('purchaseInvoices.colReference', 'Reference')}</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-28">{t('purchaseInvoices.colAmount', 'Amount')}</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-44">{t('purchaseInvoices.colGstBreakup', 'GST Breakup')}</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-28">{t('purchaseInvoices.colTotal', 'Total')}</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-28">{t('purchaseInvoices.colDate', 'Date')}</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-16">{t('purchaseInvoices.colPdf', 'PDF')}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedInvoices.map((inv, idx) => (
                    <tr key={inv.id} className={cn(
                      "border-b border-border hover:bg-muted/50 transition-colors",
                      idx % 2 === 0 ? 'bg-white' : 'bg-muted/20'
                    )}>
                      <td className="px-3 py-2 text-sm font-medium text-foreground">{inv.invoiceNumber}</td>
                      <td className="px-3 py-2 text-sm font-normal text-gray-600 dark:text-foreground">{inv.vendorName}</td>
                      <td className="px-3 py-2 text-sm font-normal text-gray-600 dark:text-foreground">{inv.reference ?? '—'}</td>
                      <td className="px-3 py-2 text-right text-sm font-normal text-gray-600 dark:text-foreground">₹{inv.amount.toFixed(2)}</td>
                      <td className="px-3 py-2 text-sm font-normal text-gray-600 dark:text-foreground">{gstBreakupStr(inv.gstBreakup)}</td>
                      <td className="px-3 py-2 text-right text-sm font-medium text-foreground">₹{inv.totalAmount.toFixed(2)}</td>
                      <td className="px-3 py-2 text-sm font-normal text-gray-600 dark:text-foreground">{inv.issueDate}</td>
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

      <PurchaseInvoiceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadInvoices}
      />
    </div>
  );
};

export default PurchaseInvoices;
