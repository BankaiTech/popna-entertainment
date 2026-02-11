import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Plus, ShoppingCart, Search } from 'lucide-react';
import type { PurchaseInvoice } from '@/models/types';
import { purchaseInvoicesApi } from '@/api/purchaseInvoices';
import PurchaseInvoiceModal from '@/components/PurchaseInvoiceModal';
import { cn } from '@/lib/utils';

const PurchaseInvoices = () => {
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadInvoices = async () => {
    setLoading(true);
    const invList = await purchaseInvoicesApi.getAll();
    setInvoices(invList);
    setLoading(false);
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  const filtered = invoices.filter((inv) => {
    const bySearch = searchQuery.trim() === '' ||
      inv.vendorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inv.reference && inv.reference.toLowerCase().includes(searchQuery.toLowerCase()));
    return bySearch;
  });

  const gstBreakupStr = (g: PurchaseInvoice['gstBreakup']) => {
    const parts: string[] = [];
    if (g.cgst != null) parts.push(`CGST: ₹${g.cgst.toFixed(2)}`);
    if (g.sgst != null) parts.push(`SGST: ₹${g.sgst.toFixed(2)}`);
    if (g.igst != null) parts.push(`IGST: ₹${g.igst.toFixed(2)}`);
    return parts.length ? parts.join(', ') : '—';
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">Purchase Invoices</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            GST-compliant purchase invoices with CGST/SGST/IGST breakdown
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          New Purchase Invoice
        </Button>
      </div>

      <Card>
        <CardHeader className="py-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-2">
            <CardTitle className="text-base">Purchase Invoice List ({filtered.length})</CardTitle>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search by vendor or invoice..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm w-50"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-12">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No purchase invoices yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-border bg-muted/30">
                    <th className="text-left px-3 py-2 text-sm font-medium text-foreground">Number</th>
                    <th className="text-left px-3 py-2 text-sm font-medium text-foreground">Vendor</th>
                    <th className="text-left px-3 py-2 text-sm font-medium text-foreground">Reference</th>
                    <th className="text-right px-3 py-2 text-sm font-medium text-foreground">Amount</th>
                    <th className="text-left px-3 py-2 text-sm font-medium text-foreground">GST Breakup</th>
                    <th className="text-right px-3 py-2 text-sm font-medium text-foreground">Total</th>
                    <th className="text-left px-3 py-2 text-sm font-medium text-foreground">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((inv, idx) => (
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
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
