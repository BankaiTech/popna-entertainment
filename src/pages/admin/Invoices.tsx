import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import { Pagination } from '@/components/ui/Pagination';
import { Plus, FileText, Download, Search } from 'lucide-react';
import Input from '@/components/ui/Input';
import type { SalesInvoice, InvoiceStatus, Provider } from '@/models/types';
import { salesInvoicesApi } from '@/api/invoices';
import { useStore } from '@/store/useStore';
import { getProviderDisplayName } from '@/lib/providerUtils';
import InvoiceModal from '@/components/InvoiceModal';
import { cn, formatCurrencyINR, formatDateDMY } from '@/lib/utils';

const Invoices = () => {
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
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {status}
      </span>
    );
  };

  const handleDownloadPdf = (inv: SalesInvoice) => {
    alert(`PDF download for ${inv.invoiceNumber} (mock — structure ready for PDF generation).`);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">Sales Invoices</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            GST-compliant sales invoices for customer billing
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          New Invoice
        </Button>
      </div>

      <Card>
        <CardHeader className="py-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search by customer or invoice..."
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
              <option value="All">All Status</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </Select>
            <Select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value as Provider | 'All')}
              className="h-9 text-sm"
            >
              <option value="All">All Services</option>
              {Array.isArray(products) && products.length > 0 ? (
                products.map((product) => (
                  <option key={product.id} value={product.name}>
                    {getProviderDisplayName(product.name as Provider, products)}
                  </option>
                ))
              ) : (
                <>
                  <option value="GTPL">GTPL Cable</option>
                  <option value="BSNL">BSNL</option>
                  <option value="Railwire">Railwire</option>
                  <option value="Krishiinet">Krishiinet</option>
                </>
              )}
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-12">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No invoices match filters.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-border bg-muted/30">
                    <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground">Number</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground">Customer</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground">Service</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground">Plan</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground">Total</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground">Status</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground">Due</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground">PDF</th>
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
                      <td className="px-3 py-2 text-right text-sm font-medium text-foreground">₹{inv.totalAmount.toFixed(2)}</td>
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
    </div>
  );
};

export default Invoices;
