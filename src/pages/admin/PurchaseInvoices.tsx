import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Plus, ShoppingCart } from 'lucide-react';
import type { PurchaseInvoice } from '@/models/types';
import { purchaseInvoicesApi } from '@/api/purchaseInvoices';

const PurchaseInvoices = () => {
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const invList = await purchaseInvoicesApi.getAll();
      setInvoices(invList);
      setLoading(false);
    };
    load();
  }, []);

  const handleCreateMock = () => {
    alert('Create purchase invoice: Select vendor, amount, GST breakup, reference. (Mock — integrate with Vendors.)');
  };

  const gstBreakupStr = (g: PurchaseInvoice['gstBreakup']) => {
    const parts: string[] = [];
    if (g.cgst != null) parts.push(`CGST: ₹${g.cgst}`);
    if (g.sgst != null) parts.push(`SGST: ₹${g.sgst}`);
    if (g.igst != null) parts.push(`IGST: ₹${g.igst}`);
    return parts.length ? parts.join(', ') : '—';
  };

  return (
    <div className="space-y-4 sm:space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Purchase Invoices</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Vendor selection, purchase entries, GST breakup, invoice reference.
          </p>
        </div>
        <Button onClick={handleCreateMock} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          New Purchase Invoice
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Purchase Invoice List ({invoices.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">Loading...</div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No purchase invoices yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3 font-medium text-muted-foreground">Number</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Vendor</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Reference</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Amount</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">GST Breakup</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Total</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-border hover:bg-muted/50">
                      <td className="p-3 font-medium">{inv.invoiceNumber}</td>
                      <td className="p-3">{inv.vendorName}</td>
                      <td className="p-3 text-muted-foreground">{inv.reference ?? '—'}</td>
                      <td className="p-3 text-right">₹{inv.amount.toFixed(2)}</td>
                      <td className="p-3 text-muted-foreground text-xs">{gstBreakupStr(inv.gstBreakup)}</td>
                      <td className="p-3 text-right font-medium">₹{inv.totalAmount.toFixed(2)}</td>
                      <td className="p-3 text-muted-foreground">{inv.issueDate}</td>
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

export default PurchaseInvoices;
