import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { X } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { purchaseInvoicesApi } from '@/api/purchaseInvoices';
import { MOCK_ORGANIZATION_ID } from '@/models/types';

interface PurchaseInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const PurchaseInvoiceModal = ({ isOpen, onClose, onSuccess }: PurchaseInvoiceModalProps) => {
  const { companyProfile, fetchCompanyProfile } = useStore();
  
  useEffect(() => {
    if (isOpen) {
      fetchCompanyProfile();
    }
  }, [isOpen, fetchCompanyProfile]);
  
  const [vendorName, setVendorName] = useState('');
  const [reference, setReference] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [gstType, setGstType] = useState<'intrastate' | 'interstate'>('intrastate');
  const [gstRate, setGstRate] = useState<number>(18);
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchCompanyProfile();
    }
  }, [isOpen, fetchCompanyProfile]);

  // Calculate GST breakdown based on type
  const calculateGST = () => {
    const gstAmount = (amount * gstRate) / 100;
    
    if (gstType === 'intrastate') {
      // CGST + SGST (split equally)
      return {
        cgst: gstAmount / 2,
        sgst: gstAmount / 2,
        igst: undefined,
      };
    } else {
      // IGST (interstate)
      return {
        cgst: undefined,
        sgst: undefined,
        igst: gstAmount,
      };
    }
  };

  const gstBreakup = calculateGST();
  const totalGST = (gstBreakup.cgst || 0) + (gstBreakup.sgst || 0) + (gstBreakup.igst || 0);
  const totalAmount = amount + totalGST;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!vendorName.trim()) {
      setError('Vendor name is required');
      return;
    }

    if (amount <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    setSaving(true);
    try {
      const invoiceNumber = `PINV-${Date.now()}`;
      
      await purchaseInvoicesApi.create({
        organizationId: MOCK_ORGANIZATION_ID,
        invoiceNumber,
        vendorId: 1, // Mock vendor ID
        vendorName: vendorName.trim(),
        reference: reference.trim() || undefined,
        amount,
        gstBreakup,
        totalAmount,
        issueDate,
      });

      onSuccess();
      onClose();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create purchase invoice');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setVendorName('');
    setReference('');
    setAmount(0);
    setGstType('intrastate');
    setGstRate(18);
    setIssueDate(new Date().toISOString().split('T')[0]);
    setError('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-2xl font-bold gradient-text">Create Purchase Invoice</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Vendor Details */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Vendor Name <span className="text-destructive">*</span>
            </label>
            <Input
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              placeholder="Enter vendor name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">
              Reference / Invoice Number
            </label>
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Vendor's invoice number (optional)"
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Base Amount (₹) <span className="text-destructive">*</span>
            </label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              placeholder="0.00"
              min="0"
              step="0.01"
              required
            />
          </div>

          {/* GST Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2">
                GST Type <span className="text-destructive">*</span>
              </label>
              <Select value={gstType} onChange={(e) => setGstType(e.target.value as any)}>
                <option value="intrastate">Intrastate (CGST + SGST)</option>
                <option value="interstate">Interstate (IGST)</option>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {gstType === 'intrastate' 
                  ? 'Within same state - CGST & SGST apply' 
                  : 'Across states - IGST applies'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">
                GST Rate (%) <span className="text-destructive">*</span>
              </label>
              <Select value={gstRate} onChange={(e) => setGstRate(Number(e.target.value))}>
                <option value="0">0% (Exempt)</option>
                <option value="5">5%</option>
                <option value="12">12%</option>
                <option value="18">18%</option>
                <option value="28">28%</option>
              </Select>
            </div>
          </div>

          {/* GST Breakdown - Government of India Compliant */}
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">GST Breakdown (As per GoI Guidelines)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Base Amount:</span>
                <span className="font-semibold">₹{amount.toFixed(2)}</span>
              </div>
              
              {gstType === 'intrastate' ? (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">CGST ({gstRate / 2}%):</span>
                    <span className="font-semibold">₹{(gstBreakup.cgst || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">SGST ({gstRate / 2}%):</span>
                    <span className="font-semibold">₹{(gstBreakup.sgst || 0).toFixed(2)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">IGST ({gstRate}%):</span>
                  <span className="font-semibold">₹{(gstBreakup.igst || 0).toFixed(2)}</span>
                </div>
              )}
              
              <div className="border-t-2 border-primary/20 pt-3 flex justify-between items-center">
                <span className="text-base font-bold">Total Amount:</span>
                <span className="text-xl font-bold text-primary">₹{totalAmount.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Issue Date */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Issue Date <span className="text-destructive">*</span>
            </label>
            <Input
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="p-4 bg-destructive/10 border-2 border-destructive/20 rounded-lg text-sm text-destructive">
              {error}
            </div>
          )}
        </form>

        <div className="flex justify-end gap-3 p-6 border-t border-border bg-muted/30">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving || amount <= 0}>
            {saving ? 'Creating...' : 'Create Purchase Invoice'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PurchaseInvoiceModal;
