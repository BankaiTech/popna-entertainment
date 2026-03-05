// Professional SaaS Invoice Template
// Invoice PDF browser header/footer removed
// Replace with backend PDF generation later

import type { SalesInvoice, PurchaseInvoice, Customer, CompanyProfile, Vendor } from '@/models/types';
import { getProviderDisplayName } from '@/lib/providerUtils';
import { formatCurrencyINR, formatDateDMY } from './utils';

const numberToWords = (num: number): string => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if (num === 0) return 'Zero';

  const convertHundreds = (n: number): string => {
    if (n === 0) return '';
    if (n < 20) return ones[n];
    if (n < 100) {
      const ten = Math.floor(n / 10);
      const one = n % 10;
      return tens[ten] + (one > 0 ? ' ' + ones[one] : '');
    }
    const hundred = Math.floor(n / 100);
    const remainder = n % 100;
    return ones[hundred] + ' Hundred' + (remainder > 0 ? ' ' + convertHundreds(remainder) : '');
  };

  const convert = (n: number): string => {
    if (n === 0) return '';
    if (n < 100) return convertHundreds(n);
    if (n < 1000) {
      const hundred = Math.floor(n / 100);
      const remainder = n % 100;
      return convertHundreds(hundred) + ' Hundred' + (remainder > 0 ? ' ' + convertHundreds(remainder) : '');
    }
    if (n < 100000) {
      const thousand = Math.floor(n / 1000);
      const remainder = n % 1000;
      return convertHundreds(thousand) + ' Thousand' + (remainder > 0 ? ' ' + convert(remainder) : '');
    }
    if (n < 10000000) {
      const lakh = Math.floor(n / 100000);
      const remainder = n % 100000;
      return convertHundreds(lakh) + ' Lakh' + (remainder > 0 ? ' ' + convert(remainder) : '');
    }
    const crore = Math.floor(n / 10000000);
    const remainder = n % 10000000;
    return convertHundreds(crore) + ' Crore' + (remainder > 0 ? ' ' + convert(remainder) : '');
  };

  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);

  let result = convert(rupees) + ' Rupees';
  if (paise > 0) {
    result += ' and ' + convert(paise) + ' Paise';
  }
  return result + ' Only';
};

// Fixed invoice PDF layout and browser header removal
const baseStyles = `
  /* Remove browser header/footer completely */
  @page { size: A4 portrait; margin: 0; }
  @media print {
    html, body { margin: 0; padding: 0; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    @page { size: A4 portrait; margin: 0; }
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 210mm; height: 297mm; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, Helvetica, sans-serif; font-size: 11px; color: #1a1a1a; line-height: 1.45; background: white; }
  .invoice-container { width: 210mm; min-height: 297mm; padding: 15mm; margin: auto; box-sizing: border-box; background: white; position: relative; overflow: hidden; word-wrap: break-word; overflow-wrap: break-word; }
  .header-bar { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 16px; border-bottom: 3px solid #1a1a1a; margin-bottom: 20px; page-break-inside: avoid; }
  .company-block { flex: 1; }
  .company-name { font-size: 20px; font-weight: 700; color: #1a1a1a; margin-bottom: 8px; letter-spacing: -0.3px; }
  .company-detail { font-size: 10.5px; color: #444; margin: 2px 0; line-height: 1.5; }
  .invoice-title-block { text-align: right; min-width: 240px; }
  .invoice-type-label { font-size: 22px; font-weight: 700; color: #1a1a1a; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 12px; }
  .invoice-meta { font-size: 10.5px; color: #444; margin: 4px 0; }
  .invoice-meta strong { color: #1a1a1a; min-width: 90px; display: inline-block; }
  .status-pill { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
  .status-paid { background: #d4edda; color: #155724; }
  .status-draft { background: #e2e3e5; color: #383d41; }
  .status-sent { background: #cce5ff; color: #004085; }
  .status-overdue { background: #f8d7da; color: #721c24; }
  .section-box { border: 1px solid #ddd; border-radius: 6px; padding: 14px 16px; margin: 16px 0; background: #fafafa; page-break-inside: avoid; }
  .section-label { font-size: 9px; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
  .section-name { font-size: 13px; font-weight: 600; color: #1a1a1a; margin-bottom: 4px; }
  .section-line { font-size: 10.5px; color: #444; margin: 2px 0; }
  .items-table { width: 100%; table-layout: fixed; border-collapse: collapse; margin: 20px 0 16px 0; font-size: 10.5px; page-break-inside: avoid; }
  .items-table tr { page-break-inside: avoid; }
  .items-table thead { display: table-header-group; }
  .items-table th { background: #1a1a1a; color: #fff; padding: 10px 12px; text-align: left; font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; word-wrap: break-word; }
  .items-table th:first-child { border-radius: 4px 0 0 0; }
  .items-table th:last-child { border-radius: 0 4px 0 0; }
  .items-table th.num { text-align: right; }
  .items-table th.cen { text-align: center; }
  .items-table td { padding: 10px 12px; border-bottom: 1px solid #eee; word-wrap: break-word; overflow-wrap: break-word; }
  .items-table td.num { text-align: right; font-variant-numeric: tabular-nums; }
  .items-table td.cen { text-align: center; }
  .items-table tbody tr:last-child td { border-bottom: 2px solid #1a1a1a; }
  .summary-row { display: flex; justify-content: flex-end; margin-top: 8px; page-break-inside: avoid; }
  .summary-box { width: 300px; }
  .summary-line { display: flex; justify-content: space-between; padding: 5px 0; font-size: 10.5px; color: #444; }
  .summary-line.total { font-size: 14px; font-weight: 700; color: #1a1a1a; border-top: 2px solid #1a1a1a; margin-top: 6px; padding-top: 10px; }
  .amount-words-box { background: #f5f5f5; border: 1px solid #e0e0e0; border-radius: 4px; padding: 10px 14px; margin: 20px 0; font-size: 10.5px; color: #333; page-break-inside: avoid; }
  .amount-words-box strong { color: #1a1a1a; }
  .footer-area { margin-top: 30px; padding-top: 16px; border-top: 1px solid #ddd; display: flex; justify-content: space-between; align-items: flex-end; position: relative; page-break-inside: avoid; }
  .signature-area { text-align: right; }
  .signature-line { width: 180px; border-top: 1px solid #999; margin-left: auto; margin-bottom: 4px; }
  .signature-text { font-size: 9px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
  .computer-note { font-size: 9px; color: #999; text-align: center; margin-top: 20px; position: relative; }
`;

const getStatusClass = (status: string) => {
  switch (status) {
    case 'paid': return 'status-paid';
    case 'sent': return 'status-sent';
    case 'overdue': return 'status-overdue';
    default: return 'status-draft';
  }
};

export const generateSalesInvoicePdf = async (
  invoice: SalesInvoice,
  customer: Customer | null,
  companyProfile: CompanyProfile | null
): Promise<void> => {
  const companyName = companyProfile?.companyName || 'Company Name';
  const companyLines: string[] = [];
  const addr = [companyProfile?.addressLine1, companyProfile?.addressLine2].filter(Boolean).join(', ');
  if (addr) companyLines.push(addr);
  const cityLine = [companyProfile?.city, companyProfile?.state, companyProfile?.pincode].filter(Boolean).join(', ');
  if (cityLine) companyLines.push(cityLine);

  const gstin = companyProfile?.gstin || '—';
  const contact = companyProfile?.contactNumber || '';
  const email = companyProfile?.email || '';
  const issueDate = formatDateDMY(invoice.issueDate);
  const dueDate = formatDateDMY(invoice.dueDate);
  const description = `${invoice.planName} — ${getProviderDisplayName(invoice.serviceProvider)}`;
  const cgstPct = invoice.gstRate / 2;
  const sgstPct = invoice.gstRate / 2;
  const cgstAmt = invoice.gstAmount / 2;
  const sgstAmt = invoice.gstAmount / 2;
  const amountWords = numberToWords(invoice.totalAmount);

  const customerAddr = customer
    ? [customer.address.line1, customer.address.line2, [customer.address.city, customer.address.state, customer.address.country].filter(Boolean).join(', ')].filter(Boolean).join(', ')
    : '—';

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice ${invoice.invoiceNumber}</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div class="invoice-container">
    <div class="header-bar">
      <div class="company-block">
        <div class="company-name">${companyName}</div>
        ${companyLines.map(l => `<div class="company-detail">${l}</div>`).join('')}
        <div class="company-detail"><strong>GSTIN:</strong> ${gstin}</div>
        ${contact ? `<div class="company-detail"><strong>Phone:</strong> ${contact}</div>` : ''}
        ${email ? `<div class="company-detail"><strong>Email:</strong> ${email}</div>` : ''}
      </div>
      <div class="invoice-title-block">
        <div class="invoice-type-label">Tax Invoice</div>
        <div class="invoice-meta"><strong>Invoice No:</strong> ${invoice.invoiceNumber}</div>
        <div class="invoice-meta"><strong>Date:</strong> ${issueDate}</div>
        <div class="invoice-meta"><strong>Due Date:</strong> ${dueDate}</div>
        <div class="invoice-meta"><strong>Status:</strong> <span class="status-pill ${getStatusClass(invoice.status)}">${invoice.status}</span></div>
      </div>
    </div>

    <div class="section-box">
      <div class="section-label">Bill To</div>
      <div class="section-name">${invoice.customerName}</div>
      <div class="section-line">${customerAddr}</div>
      ${customer?.mobile ? `<div class="section-line">Mobile: ${customer.mobile}</div>` : ''}
      ${customer?.email ? `<div class="section-line">Email: ${customer.email}</div>` : ''}
      ${customer?.gstin ? `<div class="section-line">GSTIN: ${customer.gstin}</div>` : ''}
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th style="width:40px">Sl No</th>
          <th>Description</th>
          <th class="cen" style="width:50px">Qty</th>
          <th class="num" style="width:100px">Rate</th>
          <th class="cen" style="width:80px">Tax %</th>
          <th class="num" style="width:120px">Total</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="cen">1</td>
          <td>${description}</td>
          <td class="cen">1</td>
          <td class="num">${formatCurrencyINR(invoice.amount)}</td>
          <td class="cen">${invoice.gstRate}%</td>
          <td class="num" style="font-weight:700">${formatCurrencyINR(invoice.totalAmount)}</td>
        </tr>
      </tbody>
    </table>

    <div class="summary-row">
      <div class="summary-box">
        <div class="summary-line"><span>Subtotal</span><span>${formatCurrencyINR(invoice.amount)}</span></div>
        <div class="summary-line"><span>CGST (${cgstPct}%)</span><span>${formatCurrencyINR(cgstAmt)}</span></div>
        <div class="summary-line"><span>SGST (${sgstPct}%)</span><span>${formatCurrencyINR(sgstAmt)}</span></div>
        <div class="summary-line total"><span>Grand Total</span><span>${formatCurrencyINR(invoice.totalAmount)}</span></div>
      </div>
    </div>

    <div class="amount-words-box">
      <strong>Amount in words:</strong> ${amountWords}
    </div>

    <div class="footer-area">
      <div style="font-size:10px;color:#666;">
        <div>Terms & Conditions apply.</div>
        <div>E. & O.E.</div>
      </div>
      <div class="signature-area">
        <div class="signature-line"></div>
        <div class="signature-text">Authorized Signatory</div>
      </div>
    </div>

    <div class="computer-note">This is a computer generated invoice and does not require a physical signature.</div>
  </div>
</body>
</html>`;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    // Suppress browser header/footer in print dialog
    printWindow.document.title = ' ';
    printWindow.onload = () => { printWindow.print(); };
  }
};

function formatVendorAddress(vendor: Vendor | null | undefined): string[] {
  if (!vendor) return [];
  const lines: string[] = [];
  const addr1 = [vendor.addressLine1, vendor.addressLine2].filter(Boolean).join(', ');
  if (addr1) lines.push(addr1);
  const cityState = [vendor.city, vendor.state, vendor.pincode].filter(Boolean).join(', ');
  if (cityState) lines.push(cityState);
  if (vendor.country) lines.push(vendor.country);
  return lines;
}

export const generatePurchaseInvoicePdf = async (
  invoice: PurchaseInvoice,
  companyProfile: CompanyProfile | null,
  vendor?: Vendor | null
): Promise<void> => {
  const cgst = invoice.gstBreakup.cgst || 0;
  const sgst = invoice.gstBreakup.sgst || 0;
  const igst = invoice.gstBreakup.igst || 0;
  const totalGst = cgst + sgst + igst;

  const companyName = companyProfile?.companyName || 'Company Name';
  const companyLines: string[] = [];
  const addr = [companyProfile?.addressLine1, companyProfile?.addressLine2].filter(Boolean).join(', ');
  if (addr) companyLines.push(addr);
  const cityLine = [companyProfile?.city, companyProfile?.state, companyProfile?.pincode].filter(Boolean).join(', ');
  if (cityLine) companyLines.push(cityLine);

  const gstin = companyProfile?.gstin || '—';
  const issueDate = formatDateDMY(invoice.issueDate);
  const amountWords = numberToWords(invoice.totalAmount);

  const vendorName = invoice.vendorName;
  const vendorAddressLines = formatVendorAddress(vendor);
  const vendorGstin = vendor?.gstin?.trim();

  const hasCgstSgst = cgst > 0 || sgst > 0;
  const hasIgst = igst > 0;

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Purchase Invoice ${invoice.invoiceNumber}</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div class="invoice-container">
    <div class="header-bar">
      <div class="company-block">
        <div class="company-name">${companyName}</div>
        ${companyLines.map(l => `<div class="company-detail">${l}</div>`).join('')}
        <div class="company-detail"><strong>GSTIN:</strong> ${gstin}</div>
      </div>
      <div class="invoice-title-block">
        <div class="invoice-type-label">Purchase Invoice</div>
        <div class="invoice-meta"><strong>Invoice No:</strong> ${invoice.invoiceNumber}</div>
        <div class="invoice-meta"><strong>Date:</strong> ${issueDate}</div>
        ${invoice.reference ? `<div class="invoice-meta"><strong>Reference:</strong> ${invoice.reference}</div>` : ''}
      </div>
    </div>

    <div class="section-box">
      <div class="section-label">Vendor Details</div>
      <div class="section-name">${vendorName}</div>
      ${vendorAddressLines.map(l => `<div class="section-line">${l}</div>`).join('')}
      ${vendorGstin ? `<div class="section-line">GSTIN: ${vendorGstin}</div>` : ''}
      ${vendor?.contact ? `<div class="section-line">Contact: ${vendor.contact}</div>` : ''}
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th style="width:40px">Sl No</th>
          <th>Description</th>
          <th class="cen" style="width:50px">Qty</th>
          <th class="num" style="width:110px">Rate</th>
          <th class="cen" style="width:80px">Tax %</th>
          <th class="num" style="width:120px">Total</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="cen">1</td>
          <td>Purchase — ${invoice.reference || invoice.invoiceNumber}</td>
          <td class="cen">1</td>
          <td class="num">${formatCurrencyINR(invoice.amount)}</td>
          <td class="cen">${totalGst > 0 && invoice.amount > 0 ? Math.round((totalGst / invoice.amount) * 100) : 0}%</td>
          <td class="num" style="font-weight:700">${formatCurrencyINR(invoice.totalAmount)}</td>
        </tr>
      </tbody>
    </table>

    <div class="summary-row">
      <div class="summary-box">
        <div class="summary-line"><span>Subtotal</span><span>${formatCurrencyINR(invoice.amount)}</span></div>
        ${hasCgstSgst ? `
        <div class="summary-line"><span>CGST</span><span>${formatCurrencyINR(cgst)}</span></div>
        <div class="summary-line"><span>SGST</span><span>${formatCurrencyINR(sgst)}</span></div>` : ''}
        ${hasIgst ? `<div class="summary-line"><span>IGST</span><span>${formatCurrencyINR(igst)}</span></div>` : ''}
        ${!hasCgstSgst && !hasIgst ? `<div class="summary-line"><span>Input GST</span><span>${formatCurrencyINR(totalGst)}</span></div>` : ''}
        <div class="summary-line total"><span>Grand Total</span><span>${formatCurrencyINR(invoice.totalAmount)}</span></div>
      </div>
    </div>

    <div class="amount-words-box">
      <strong>Amount in words:</strong> ${amountWords}
    </div>

    <div class="footer-area">
      <div></div>
      <div class="signature-area">
        <div class="signature-line"></div>
        <div class="signature-text">Authorized Signatory</div>
      </div>
    </div>

    <div class="computer-note">This is a computer generated purchase invoice and does not require a physical signature.</div>
  </div>
</body>
</html>`;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    // Suppress browser header/footer in print dialog
    printWindow.document.title = ' ';
    printWindow.onload = () => { printWindow.print(); };
  }
};
