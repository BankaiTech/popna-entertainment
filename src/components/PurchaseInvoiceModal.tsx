import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { X, Plus } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { purchaseInvoicesApi, vendorsApi } from '@/api/purchaseInvoices';
import { MOCK_ORGANIZATION_ID } from '@/models/types';
import type { Vendor } from '@/models/types';
import VendorFormModal from '@/components/VendorFormModal';

interface PurchaseInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const PurchaseInvoiceModal = ({ isOpen, onClose, onSuccess }: PurchaseInvoiceModalProps) => {
  const { companyProfile, fetchCompanyProfile } = useStore();

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorId, setVendorId] = useState<number | ''>('');
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [reference, setReference] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [gstType, setGstType] = useState<'intrastate' | 'interstate'>('intrastate');
  const [gstRate, setGstRate] = useState<number>(18);
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [vendorFormOpen, setVendorFormOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchCompanyProfile();
      vendorsApi.getAll().then(setVendors);
    }
  }, [isOpen, fetchCompanyProfile]);

  useEffect(() => {
    if (!isOpen || vendorId === '') {
      setSelectedVendor(null);
      return;
    }
    vendorsApi.getById(vendorId as number).then(setSelectedVendor);
  }, [isOpen, vendorId]);

  const hasVendorAddress = selectedVendor && (
    selectedVendor.addressLine1 ||
    selectedVendor.addressLine2 ||
    selectedVendor.city ||
    selectedVendor.state ||
    selectedVendor.country ||
    selectedVendor.pincode
  );

  const vendorAddressLines = selectedVendor
    ? [
        [selectedVendor.addressLine1, selectedVendor.addressLine2].filter(Boolean).join(', '),
        [selectedVendor.city, selectedVendor.state, selectedVendor.pincode].filter(Boolean).join(', '),
        selectedVendor.country,
      ].filter(Boolean)
    : [];

  const calculateGST = () => {
    const gstAmount = (amount * gstRate) / 100;
    if (gstType === 'intrastate') {
      return { cgst: gstAmount / 2, sgst: gstAmount / 2, igst: undefined };
    }
    return { cgst: undefined, sgst: undefined, igst: gstAmount };
  };

  const gstBreakup = calculateGST();
  const totalGST = (gstBreakup.cgst || 0) + (gstBreakup.sgst || 0) + (gstBreakup.igst || 0);
  const totalAmount = amount + totalGST;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (vendorId === '' || !selectedVendor) {
      setError('Please select a vendor');
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
        vendorId: selectedVendor.id,
        vendorName: selectedVendor.name,
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
    setVendorId('');
    setSelectedVendor(null);
    setReference('');
    setAmount(0);
    setGstType('intrastate');
    setGstRate(18);
    setIssueDate(new Date().toISOString().split('T')[0]);
    setError('');
  };

  const handleVendorAdded = (vendor: Vendor) => {
    setVendors((prev) => (prev.some((v) => v.id === vendor.id) ? prev.map((v) => (v.id === vendor.id ? vendor : v)) : [...prev, vendor]));
    setVendorId(vendor.id);
    setSelectedVendor(vendor);
    setVendorFormOpen(false);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <div className="bg-card rounded-modal shadow-soft-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col border border-border">
          <div className="flex items-center justify-between p-6 border-b border-border">
            <h2 className="text-2xl font-bold gradient-text">Create Purchase Invoice</h2>
            <button type="button" onClick={onClose} className="p-2 hover:bg-accent rounded-lg transition-colors" aria-label="Close">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Vendor selection */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
              <div className="flex-1">
                <label className="block text-sm font-semibold mb-2">Vendor <span className="text-destructive">*</span></label>
                <Select
                  value={vendorId === '' ? '' : String(vendorId)}
                  onChange={(e) => setVendorId(e.target.value === '' ? '' : Number(e.target.value))}
                  required
                >
                  <option value="">Select vendor</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </Select>
              </div>
              <Button type="button" variant="outline" onClick={() => setVendorFormOpen(true)} className="whitespace-nowrap">
                <Plus className="w-4 h-4 mr-1" />
                Add vendor
              </Button>
            </div>

            {/* Vendor address preview (read-only, only if vendor has address) */}
            {hasVendorAddress && selectedVendor && (
              <div className="rounded-lg border border-border bg-muted/20 p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Vendor details (for invoice)</p>
                <p className="font-medium text-foreground">{selectedVendor.name}</p>
                {vendorAddressLines.length > 0 && (
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">
                    {vendorAddressLines.join('\n')}
                  </p>
                )}
                {selectedVendor.gstin && (
                  <p className="text-sm text-muted-foreground mt-1">GSTIN: {selectedVendor.gstin}</p>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold mb-2">Reference / Invoice Number</label>
              <Input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Vendor's invoice number (optional)"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Base Amount (₹) <span className="text-destructive">*</span></label>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">GST Type <span className="text-destructive">*</span></label>
                <Select value={gstType} onChange={(e) => setGstType(e.target.value as 'intrastate' | 'interstate')}>
                  <option value="intrastate">Intrastate (CGST + SGST)</option>
                  <option value="interstate">Interstate (IGST)</option>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {gstType === 'intrastate' ? 'Within same state - CGST & SGST apply' : 'Across states - IGST applies'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">GST Rate (%) <span className="text-destructive">*</span></label>
                <Select value={gstRate} onChange={(e) => setGstRate(Number(e.target.value))}>
                  <option value="0">0% (Exempt)</option>
                  <option value="5">5%</option>
                  <option value="12">12%</option>
                  <option value="18">18%</option>
                  <option value="28">28%</option>
                </Select>
              </div>
            </div>

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

            <div>
              <label className="block text-sm font-semibold mb-2">Issue Date <span className="text-destructive">*</span></label>
              <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} required />
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
            <Button onClick={handleSubmit} disabled={saving || amount <= 0 || vendorId === ''}>
              {saving ? 'Creating...' : 'Create Purchase Invoice'}
            </Button>
          </div>
        </div>
      </div>

      <VendorFormModal
        isOpen={vendorFormOpen}
        onClose={() => setVendorFormOpen(false)}
        onSuccess={handleVendorAdded}
      />
    </>
  );
};

export default PurchaseInvoiceModal;
