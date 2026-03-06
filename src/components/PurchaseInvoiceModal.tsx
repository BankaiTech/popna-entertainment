import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Plus } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { purchaseInvoicesApi, vendorsApi } from '@/api/purchaseInvoices';
import { MOCK_ORGANIZATION_ID } from '@/models/types';
import type { Vendor } from '@/models/types';
import VendorFormModal from '@/components/VendorFormModal';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/Dialog';
import { formatCurrencyINR } from '@/lib/utils';

interface PurchaseInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const PurchaseInvoiceModal = ({ isOpen, onClose, onSuccess }: PurchaseInvoiceModalProps) => {
  const { t } = useTranslation();
  const { fetchCompanyProfile } = useStore();

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
      setError(t('purchaseInvoiceModal.selectVendorError', 'Please select a vendor'));
      return;
    }
    if (amount <= 0) {
      setError(t('purchaseInvoiceModal.amountError', 'Amount must be greater than 0'));
      return;
    }
    setSaving(true);
    try {
      const invoiceNumber = `PINV - ${Date.now()} `;
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
      setError(err instanceof Error ? err.message : t('purchaseInvoiceModal.createFailed', 'Failed to create purchase invoice'));
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

  return (
    <>
      <Dialog open={isOpen} onClose={onClose} size="xl" className="max-h-[95vh]">
        <DialogHeader title={t('purchaseInvoiceModal.title', 'Create Purchase Invoice')} onClose={onClose} />
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <DialogBody>
            <div className="p-4 py-0 sm:p-6 space-y-2">
              {/* 1. Vendor list with Add Vendor */}
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
                <div className="flex-1">
                  <label className="block text-sm font-semibold mb-2">
                    {t('purchaseInvoiceModal.vendor', 'Vendor')} <span className="text-destructive">*</span>
                  </label>
                  <Select
                    value={vendorId === '' ? '' : String(vendorId)}
                    onChange={(e) => setVendorId(e.target.value === '' ? '' : Number(e.target.value))}
                    required
                  >
                    <option value="">{t('purchaseInvoiceModal.selectVendor', 'Select vendor')}</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <Button type="button" variant="outline" onClick={() => setVendorFormOpen(true)} className="whitespace-nowrap shrink-0">
                  <Plus className="w-4 h-4 mr-1" />
                  {t('purchaseInvoiceModal.addVendor', 'Add vendor')}
                </Button>
              </div>

              {/* 2. Left: Vendor details | Right: Invoice number + Reference number */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg border border-border bg-muted/20 p-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    {t('purchaseInvoiceModal.vendorDetails', 'Vendor details')}
                  </p>
                  {selectedVendor ? (
                    <>
                      <p className="font-medium text-foreground">{selectedVendor.name}</p>
                      {vendorAddressLines.length > 0 && (
                        <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">
                          {vendorAddressLines.join('\n')}
                        </p>
                      )}
                      {selectedVendor.gstin && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {t('purchaseInvoiceModal.gstin', 'GSTIN')}: {selectedVendor.gstin}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t('purchaseInvoiceModal.selectVendorFirst', 'Select a vendor')}</p>
                  )}
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      {t('purchaseInvoiceModal.invoiceNumber', 'Invoice Number')}
                    </label>
                    <Input
                      value={t('purchaseInvoiceModal.autoGenerated', 'Auto-generated on save')}
                      readOnly
                      disabled
                      className="bg-muted/50 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      {t('purchaseInvoiceModal.reference', 'Reference Number')}
                    </label>
                    <Input
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      placeholder={t('purchaseInvoiceModal.referencePlaceholder', "Vendor's invoice number (optional)")}
                    />
                  </div>
                </div>
              </div>

              {/* 3. Left: Base amount | Right: GST type + GST rate (input group) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    {t('purchaseInvoiceModal.baseAmountLabel', 'Base Amount (₹)')} &amp; {t('purchaseInvoiceModal.issueDate', 'Issue Date')} <span className="text-destructive">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_170px] gap-2 items-stretch">
                    <div>
                      <label className="sr-only">{t('purchaseInvoiceModal.baseAmountLabel', 'Base Amount (₹)')}</label>
                      <Input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(Number(e.target.value))}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="sr-only">{t('purchaseInvoiceModal.issueDate', 'Issue Date')}</label>
                      <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} required />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    {t('purchaseInvoiceModal.gstTypeAndRate', 'GST Type & Rate')} <span className="text-destructive">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_140px] gap-2 items-stretch">
                    <Select
                      value={gstType}
                      onChange={(e) => setGstType(e.target.value as 'intrastate' | 'interstate')}
                      className="h-11 w-full"
                    >
                      <option value="intrastate">{t('purchaseInvoiceModal.intrastate', 'Intrastate (CGST+SGST)')}</option>
                      <option value="interstate">{t('purchaseInvoiceModal.interstate', 'Interstate (IGST)')}</option>
                    </Select>
                    <div className="min-w-0 sm:w-[140px]">
                      <label className="sr-only">{t('purchaseInvoiceModal.gstRate', 'GST Rate (%)')}</label>
                      <Select
                        value={String(gstRate)}
                        onChange={(e) => setGstRate(Number(e.target.value))}
                        className="h-11 w-full"
                      >
                        <option value="0">{t('purchaseInvoiceModal.gstExempt', '0% (Exempt)')}</option>
                        <option value="5">5%</option>
                        <option value="12">12%</option>
                        <option value="18">18%</option>
                        <option value="28">28%</option>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              <Card className="bg-gradient-to-br from-green-50 to-emerald-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{t('purchaseInvoiceModal.gstBreakdown', 'GST Breakdown')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{t('purchaseInvoiceModal.baseAmount', 'Base Amount')}:</span>
                    <span className="font-semibold">{formatCurrencyINR(amount)}</span>
                  </div>
                  {gstType === 'intrastate' ? (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{t('purchaseInvoiceModal.cgst', 'CGST')} ({gstRate / 2}%):</span>
                        <span className="font-semibold">{formatCurrencyINR(gstBreakup.cgst || 0)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{t('purchaseInvoiceModal.sgst', 'SGST')} ({gstRate / 2}%):</span>
                        <span className="font-semibold">{formatCurrencyINR(gstBreakup.sgst || 0)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">{t('purchaseInvoiceModal.igst', 'IGST')} ({gstRate}%):</span>
                      <span className="font-semibold">{formatCurrencyINR(gstBreakup.igst || 0)}</span>
                    </div>
                  )}
                  <div className="border-t-2 border-primary/20 pt-3 flex justify-between items-center">
                    <span className="text-base font-bold">{t('purchaseInvoiceModal.totalAmount', 'Total Amount')}:</span>
                    <span className="text-xl font-bold text-primary">{formatCurrencyINR(totalAmount)}</span>
                  </div>
                </CardContent>
              </Card>

              {error && (
                <div className="p-4 bg-destructive/10 border-2 border-destructive/20 rounded-lg text-sm text-destructive">
                  {error}
                </div>
              )}
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button type="submit" disabled={saving || amount <= 0 || vendorId === ''}>
              {saving ? t('purchaseInvoiceModal.creating', 'Creating...') : t('purchaseInvoiceModal.createPurchaseInvoice', 'Create Purchase Invoice')}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      <VendorFormModal
        isOpen={vendorFormOpen}
        onClose={() => setVendorFormOpen(false)}
        onSuccess={handleVendorAdded}
      />
    </>
  );
};

export default PurchaseInvoiceModal;
