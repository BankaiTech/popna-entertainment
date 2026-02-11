import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import { Plus, FileText, Download, Search } from 'lucide-react';
import Input from '@/components/ui/Input';
import type { SalesInvoice, InvoiceStatus, Provider } from '@/models/types';
import { salesInvoicesApi } from '@/api/invoices';
import { useStore } from '@/store/useStore';
import { getProviderDisplayName } from '@/lib/providerUtils';
import { CABLE_PROVIDER, INTERNET_PROVIDERS } from '@/models/types';
import InvoiceModal from '@/components/InvoiceModal';
import { cn } from '@/lib/utils';

const Invoices = () => {
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'All'>('All');
  const [serviceFilter, setServiceFilter] = useState<Provider | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { initialize, fetchCustomers, fetchPlans, customers, plans } = useStore();

  const loadInvoices = async () => {
    setLoading(true);
    const list = await salesInvoicesApi.getAll();
    setInvoices(list);
    setLoading(false);
  };

  useEffect(() => {
    const load = async () => {
      await initialize();
      await fetchCustomers();
      await fetchPlans();
      await loadInvoices();
    };
    load();
  }, [initialize, fetchCustomers, fetchPlans]);

  const filtered = invoices.filter((inv) => {
    const byStatus = statusFilter === 'All' || inv.status === statusFilter;
    const byService = serviceFilter === 'All' || inv.serviceProvider === serviceFilter;
    const bySearch = searchQuery.trim() === '' || 
      inv.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase());
    return byStatus && byService && bySearch;
  });

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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-2">
            <CardTitle className="text-base">Invoice List ({filtered.length})</CardTitle>
          </div>
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
              <option value={CABLE_PROVIDER}>{getProviderDisplayName(CABLE_PROVIDER)}</option>
              {INTERNET_PROVIDERS.map((p) => (
                <option key={p} value={p}>{getProviderDisplayName(p)}</option>
              ))}
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
                    <th className="text-left px-3 py-2 text-sm font-medium text-foreground">Number</th>
                    <th className="text-left px-3 py-2 text-sm font-medium text-foreground">Customer</th>
                    <th className="text-left px-3 py-2 text-sm font-medium text-foreground">Service</th>
                    <th className="text-left px-3 py-2 text-sm font-medium text-foreground">Plan</th>
                    <th className="text-right px-3 py-2 text-sm font-medium text-foreground">Total</th>
                    <th className="text-left px-3 py-2 text-sm font-medium text-foreground">Status</th>
                    <th className="text-left px-3 py-2 text-sm font-medium text-foreground">Due</th>
                    <th className="text-left px-3 py-2 text-sm font-medium text-foreground">PDF</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((inv, idx) => (
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
