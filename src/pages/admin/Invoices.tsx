import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import { Plus, FileText, Download } from 'lucide-react';
import type { SalesInvoice, InvoiceStatus, Provider } from '@/models/types';
import { salesInvoicesApi } from '@/api/invoices';
import { useStore } from '@/store/useStore';
import { getProviderDisplayName } from '@/lib/providerUtils';
import { CABLE_PROVIDER, INTERNET_PROVIDERS } from '@/models/types';

const Invoices = () => {
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'All'>('All');
  const [serviceFilter, setServiceFilter] = useState<Provider | 'All'>('All');
  const { initialize, fetchCustomers, fetchPlans } = useStore();

  useEffect(() => {
    const load = async () => {
      await initialize();
      await fetchCustomers();
      await fetchPlans();
      const list = await salesInvoicesApi.getAll();
      setInvoices(list);
      setLoading(false);
    };
    load();
  }, [initialize, fetchCustomers, fetchPlans]);

  const filtered = invoices.filter((inv) => {
    const byStatus = statusFilter === 'All' || inv.status === statusFilter;
    const byService = serviceFilter === 'All' || inv.serviceProvider === serviceFilter;
    return byStatus && byService;
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

  const handleCreateMock = () => {
    alert('Create invoice: Select customer, service/plan, then generate. (Mock — integrate with Catalog & Customers.)');
  };

  const handleDownloadPdf = (inv: SalesInvoice) => {
    alert(`PDF download for ${inv.invoiceNumber} (mock — structure ready for PDF generation).`);
  };

  return (
    <div className="space-y-4 sm:space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Invoices</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Sales invoices, GST calculation, customer &amp; service/plan selection. PDF-ready structure (mock).
          </p>
        </div>
        <Button onClick={handleCreateMock} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          New Invoice
        </Button>
      </div>

      <Card>
        <CardContent className="pt-4 sm:pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as InvoiceStatus | 'All')}
              >
                <option value="All">All</option>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Service</label>
              <Select
                value={serviceFilter}
                onChange={(e) => setServiceFilter(e.target.value as Provider | 'All')}
              >
                <option value="All">All</option>
                <option value={CABLE_PROVIDER}>{getProviderDisplayName(CABLE_PROVIDER)}</option>
                {INTERNET_PROVIDERS.map((p) => (
                  <option key={p} value={p}>{getProviderDisplayName(p)}</option>
                ))}
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Invoice List ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No invoices match filters.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3 font-medium text-muted-foreground">Number</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Customer</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Service</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Plan</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Total</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Due</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">PDF</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((inv) => (
                    <tr key={inv.id} className="border-b border-border hover:bg-muted/50">
                      <td className="p-3 font-medium">{inv.invoiceNumber}</td>
                      <td className="p-3">{inv.customerName}</td>
                      <td className="p-3">{getProviderDisplayName(inv.serviceProvider)}</td>
                      <td className="p-3">{inv.planName}</td>
                      <td className="p-3 text-right font-medium">₹{inv.totalAmount.toFixed(2)}</td>
                      <td className="p-3">{statusBadge(inv.status)}</td>
                      <td className="p-3 text-muted-foreground">{inv.dueDate}</td>
                      <td className="p-3">
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
    </div>
  );
};

export default Invoices;
