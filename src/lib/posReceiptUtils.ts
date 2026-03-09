// POS Receipt & Invoice generation — thermal (80mm) and A4 tax invoice
import type { CompanyProfile } from '@/models/types';
import type { CartItem } from '@/store/usePOSStore';
import { formatCurrencyINR } from './utils';

export interface POSReceiptData {
  items: CartItem[];
  subtotal: number;
  taxTotal: number;
  discountPercent: number;
  discountAmount: number;
  grandTotal: number;
  paymentMethod: string;
  customerName?: string;
  customerMobile?: string;
  invoiceNumber: string;
  date: Date;
}

export interface POSSettingsData {
  invoiceFormat: 'thermal' | 'a4';
  autoPrint: boolean;
  showLogo: boolean;
}

const DEFAULT_POS_SETTINGS: POSSettingsData = {
  invoiceFormat: 'thermal',
  autoPrint: true,
  showLogo: false,
};

export function getPOSSettings(): POSSettingsData {
  try {
    const raw = localStorage.getItem('pos_settings');
    if (raw) return { ...DEFAULT_POS_SETTINGS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return DEFAULT_POS_SETTINGS;
}

export function savePOSSettings(settings: POSSettingsData): void {
  localStorage.setItem('pos_settings', JSON.stringify(settings));
}

// Generate POS invoice number: POS-YYYYMMDD-NNN
export function generatePOSInvoiceNumber(): string {
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const counterKey = `pos_invoice_counter_${dateStr}`;
  let counter = 1;
  try {
    const stored = localStorage.getItem(counterKey);
    if (stored) counter = parseInt(stored, 10) + 1;
  } catch { /* ignore */ }
  localStorage.setItem(counterKey, String(counter));
  return `POS-${dateStr}-${String(counter).padStart(3, '0')}`;
}

const numberToWords = (num: number): string => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  if (num === 0) return 'Zero';
  const convertHundreds = (n: number): string => {
    if (n === 0) return '';
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 > 0 ? ' ' + ones[n % 10] : '');
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 > 0 ? ' ' + convertHundreds(n % 100) : '');
  };
  const convert = (n: number): string => {
    if (n < 100) return convertHundreds(n);
    if (n < 1000) return convertHundreds(Math.floor(n / 100)) + ' Hundred' + (n % 100 > 0 ? ' ' + convertHundreds(n % 100) : '');
    if (n < 100000) return convertHundreds(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 > 0 ? ' ' + convert(n % 1000) : '');
    if (n < 10000000) return convertHundreds(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 > 0 ? ' ' + convert(n % 100000) : '');
    return convertHundreds(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 > 0 ? ' ' + convert(n % 10000000) : '');
  };
  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);
  let result = convert(rupees) + ' Rupees';
  if (paise > 0) result += ' and ' + convert(paise) + ' Paise';
  return result + ' Only';
};

const getPaymentLabel = (method: string) => {
  switch (method) {
    case 'cash': return 'Cash';
    case 'upi': return 'UPI';
    case 'card': return 'Card';
    case 'bank_transfer': return 'Bank Transfer';
    default: return method;
  }
};

const formatDateTime = (d: Date) => {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
};

// ── Thermal Receipt (80mm) ──
export function generatePOSReceipt(data: POSReceiptData, companyProfile: CompanyProfile | null): void {
  const companyName = companyProfile?.companyName || 'Store';
  const addr = [companyProfile?.addressLine1, companyProfile?.city, companyProfile?.state].filter(Boolean).join(', ');
  const gstin = companyProfile?.gstin;
  const phone = companyProfile?.contactNumber;

  const itemRows = data.items.map((item, i) => {
    const total = item.price * item.quantity * (1 + item.tax / 100);
    return `
      <tr>
        <td style="text-align:left;padding:2px 0;">${i + 1}. ${item.name}</td>
        <td style="text-align:center;padding:2px 0;">${item.quantity}</td>
        <td style="text-align:right;padding:2px 0;">${formatCurrencyINR(total)}</td>
      </tr>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Receipt</title>
<style>
  @page { size: 80mm auto; margin: 0; }
  @media print { html, body { margin: 0; padding: 0; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Courier New', Courier, monospace; font-size: 12px; width: 80mm; margin: 0 auto; padding: 4mm; color: #000; background: #fff; }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .divider { border-top: 1px dashed #000; margin: 6px 0; }
  .row { display: flex; justify-content: space-between; padding: 1px 0; }
  .row-bold { display: flex; justify-content: space-between; padding: 2px 0; font-weight: bold; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; border-bottom: 1px solid #000; padding: 3px 0; font-size: 11px; }
  th:nth-child(2) { text-align: center; }
  th:last-child { text-align: right; }
</style></head>
<body>
  <div class="center bold" style="font-size:16px;margin-bottom:4px;">${companyName}</div>
  ${addr ? `<div class="center" style="font-size:10px;margin-bottom:2px;">${addr}</div>` : ''}
  ${phone ? `<div class="center" style="font-size:10px;">Ph: ${phone}</div>` : ''}
  ${gstin ? `<div class="center" style="font-size:10px;">GSTIN: ${gstin}</div>` : ''}

  <div class="divider"></div>
  <div class="row"><span>Bill No: ${data.invoiceNumber}</span><span>${formatDateTime(data.date)}</span></div>
  ${data.customerName ? `<div class="row"><span>Customer: ${data.customerName}</span></div>` : ''}
  <div class="divider"></div>

  <table>
    <thead><tr><th>Item</th><th>Qty</th><th>Amt</th></tr></thead>
    <tbody>${itemRows}</tbody>
  </table>

  <div class="divider"></div>
  <div class="row"><span>Subtotal</span><span>${formatCurrencyINR(data.subtotal)}</span></div>
  <div class="row"><span>Tax (GST)</span><span>${formatCurrencyINR(data.taxTotal)}</span></div>
  ${data.discountAmount > 0 ? `<div class="row"><span>Discount (${data.discountPercent}%)</span><span>-${formatCurrencyINR(data.discountAmount)}</span></div>` : ''}
  <div class="divider"></div>
  <div class="row-bold" style="font-size:14px;"><span>TOTAL</span><span>${formatCurrencyINR(data.grandTotal)}</span></div>
  <div class="divider"></div>
  <div class="row"><span>Payment</span><span>${getPaymentLabel(data.paymentMethod)}</span></div>

  <div style="margin-top:12px;text-align:center;font-size:11px;">Thank you! Visit again.</div>
  <div style="text-align:center;font-size:9px;margin-top:4px;color:#666;">Computer generated bill</div>
</body></html>`;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.document.title = ' ';
    printWindow.onload = () => { printWindow.print(); };
  }
}

// ── A4 Tax Invoice ──
export function generatePOSInvoice(data: POSReceiptData, companyProfile: CompanyProfile | null): void {
  const companyName = companyProfile?.companyName || 'Company Name';
  const companyLines: string[] = [];
  const addr = [companyProfile?.addressLine1, companyProfile?.addressLine2].filter(Boolean).join(', ');
  if (addr) companyLines.push(addr);
  const cityLine = [companyProfile?.city, companyProfile?.state, companyProfile?.pincode].filter(Boolean).join(', ');
  if (cityLine) companyLines.push(cityLine);
  const gstin = companyProfile?.gstin || '—';
  const contact = companyProfile?.contactNumber || '';
  const email = companyProfile?.email || '';
  const dateStr = formatDateTime(data.date);
  const amountWords = numberToWords(data.grandTotal);

  const itemRows = data.items.map((item, i) => {
    const taxAmt = (item.price * item.quantity * item.tax) / 100;
    const cgst = taxAmt / 2;
    const sgst = taxAmt / 2;
    const total = item.price * item.quantity + taxAmt;
    return `<tr>
      <td class="cen">${i + 1}</td>
      <td>${item.name}</td>
      <td class="cen">${item.quantity}</td>
      <td class="num">${formatCurrencyINR(item.price)}</td>
      <td class="cen">${item.tax}%</td>
      <td class="num">${formatCurrencyINR(cgst)}</td>
      <td class="num">${formatCurrencyINR(sgst)}</td>
      <td class="num" style="font-weight:700">${formatCurrencyINR(total)}</td>
    </tr>`;
  }).join('');

  const halfTax = data.taxTotal / 2;

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>Invoice ${data.invoiceNumber}</title>
<style>
  @page { size: A4 portrait; margin: 0; }
  @media print { html, body { margin: 0; padding: 0; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } @page { size: A4 portrait; margin: 0; } }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 210mm; height: 297mm; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, Helvetica, sans-serif; font-size: 11px; color: #1a1a1a; line-height: 1.45; background: white; }
  .container { width: 210mm; min-height: 297mm; padding: 15mm; margin: auto; background: white; position: relative; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 16px; border-bottom: 3px solid #1a1a1a; margin-bottom: 20px; }
  .company-block { flex: 1; }
  .company-name { font-size: 20px; font-weight: 700; margin-bottom: 8px; }
  .company-detail { font-size: 10.5px; color: #444; margin: 2px 0; }
  .invoice-block { text-align: right; min-width: 220px; }
  .invoice-label { font-size: 22px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 12px; }
  .invoice-meta { font-size: 10.5px; color: #444; margin: 4px 0; }
  .invoice-meta strong { min-width: 90px; display: inline-block; color: #1a1a1a; }
  .bill-to { border: 1px solid #ddd; border-radius: 6px; padding: 14px 16px; margin: 16px 0; background: #fafafa; }
  .section-label { font-size: 9px; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
  .section-name { font-size: 13px; font-weight: 600; margin-bottom: 4px; }
  .section-line { font-size: 10.5px; color: #444; margin: 2px 0; }
  table.items { width: 100%; table-layout: fixed; border-collapse: collapse; margin: 20px 0 16px; font-size: 10.5px; }
  table.items th { background: #1a1a1a; color: #fff; padding: 10px 8px; text-align: left; font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
  table.items th:first-child { border-radius: 4px 0 0 0; }
  table.items th:last-child { border-radius: 0 4px 0 0; }
  table.items th.num { text-align: right; }
  table.items th.cen { text-align: center; }
  table.items td { padding: 10px 8px; border-bottom: 1px solid #eee; }
  table.items td.num { text-align: right; font-variant-numeric: tabular-nums; }
  table.items td.cen { text-align: center; }
  table.items tbody tr:last-child td { border-bottom: 2px solid #1a1a1a; }
  .summary-row { display: flex; justify-content: flex-end; margin-top: 8px; }
  .summary-box { width: 300px; }
  .summary-line { display: flex; justify-content: space-between; padding: 5px 0; font-size: 10.5px; color: #444; }
  .summary-line.total { font-size: 14px; font-weight: 700; color: #1a1a1a; border-top: 2px solid #1a1a1a; margin-top: 6px; padding-top: 10px; }
  .words-box { background: #f5f5f5; border: 1px solid #e0e0e0; border-radius: 4px; padding: 10px 14px; margin: 20px 0; font-size: 10.5px; color: #333; }
  .words-box strong { color: #1a1a1a; }
  .footer { margin-top: 30px; padding-top: 16px; border-top: 1px solid #ddd; display: flex; justify-content: space-between; align-items: flex-end; }
  .sig-line { width: 180px; border-top: 1px solid #999; margin-left: auto; margin-bottom: 4px; }
  .sig-text { font-size: 9px; color: #666; text-transform: uppercase; text-align: right; letter-spacing: 0.5px; }
  .note { font-size: 9px; color: #999; text-align: center; margin-top: 20px; }
</style></head>
<body>
<div class="container">
  <div class="header">
    <div class="company-block">
      <div class="company-name">${companyName}</div>
      ${companyLines.map(l => `<div class="company-detail">${l}</div>`).join('')}
      <div class="company-detail"><strong>GSTIN:</strong> ${gstin}</div>
      ${contact ? `<div class="company-detail"><strong>Phone:</strong> ${contact}</div>` : ''}
      ${email ? `<div class="company-detail"><strong>Email:</strong> ${email}</div>` : ''}
    </div>
    <div class="invoice-block">
      <div class="invoice-label">Tax Invoice</div>
      <div class="invoice-meta"><strong>Invoice No:</strong> ${data.invoiceNumber}</div>
      <div class="invoice-meta"><strong>Date:</strong> ${dateStr}</div>
      <div class="invoice-meta"><strong>Payment:</strong> ${getPaymentLabel(data.paymentMethod)}</div>
    </div>
  </div>

  ${data.customerName ? `
  <div class="bill-to">
    <div class="section-label">Bill To</div>
    <div class="section-name">${data.customerName}</div>
    ${data.customerMobile ? `<div class="section-line">Mobile: ${data.customerMobile}</div>` : ''}
  </div>` : ''}

  <table class="items">
    <thead><tr>
      <th style="width:35px" class="cen">Sl</th>
      <th>Description</th>
      <th class="cen" style="width:45px">Qty</th>
      <th class="num" style="width:85px">Rate</th>
      <th class="cen" style="width:55px">Tax%</th>
      <th class="num" style="width:80px">CGST</th>
      <th class="num" style="width:80px">SGST</th>
      <th class="num" style="width:95px">Total</th>
    </tr></thead>
    <tbody>${itemRows}</tbody>
  </table>

  <div class="summary-row">
    <div class="summary-box">
      <div class="summary-line"><span>Subtotal</span><span>${formatCurrencyINR(data.subtotal)}</span></div>
      <div class="summary-line"><span>CGST</span><span>${formatCurrencyINR(halfTax)}</span></div>
      <div class="summary-line"><span>SGST</span><span>${formatCurrencyINR(halfTax)}</span></div>
      ${data.discountAmount > 0 ? `<div class="summary-line"><span>Discount (${data.discountPercent}%)</span><span>-${formatCurrencyINR(data.discountAmount)}</span></div>` : ''}
      <div class="summary-line total"><span>Grand Total</span><span>${formatCurrencyINR(data.grandTotal)}</span></div>
    </div>
  </div>

  <div class="words-box"><strong>Amount in words:</strong> ${amountWords}</div>

  <div class="footer">
    <div style="font-size:10px;color:#666;"><div>Terms & Conditions apply.</div><div>E. & O.E.</div></div>
    <div>
      <div class="sig-line"></div>
      <div class="sig-text">Authorized Signatory</div>
    </div>
  </div>

  <div class="note">This is a computer generated invoice and does not require a physical signature.</div>
</div>
</body></html>`;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.document.title = ' ';
    printWindow.onload = () => { printWindow.print(); };
  }
}
