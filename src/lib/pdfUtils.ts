// PDF Generation Utilities
// Replace with backend PDF generation later
// Professional PDF template revamp applied — GST-compliant Indian invoice layout, clean typography, A4 print-ready.

import type { SalesInvoice, PurchaseInvoice, Customer, CompanyProfile, Vendor } from '@/models/types';
import { getProviderDisplayName } from '@/lib/providerUtils';
import { formatCurrencyINR, formatDateDMY } from './utils';

/**
 * Convert number to words (Indian format)
 */
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

/** Shared print-ready styles: A4, clear hierarchy, minimal color, no oversized fonts */
const baseStyles = `
  @page { size: A4 portrait; margin: 18mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #1a1a1a; line-height: 1.4; margin: 0; padding: 0; }
  .clear { clear: both; }
  .text-right { text-align: right; }
  .text-center { text-align: center; }
  .m-0 { margin: 0; }
  .mt-1 { margin-top: 6px; }
  .mt-2 { margin-top: 12px; }
  .mt-3 { margin-top: 18px; }
  .mt-4 { margin-top: 24px; }
  .mb-0 { margin-bottom: 0; }
  .mb-1 { margin-bottom: 6px; }
  .bold { font-weight: bold; }
`;

/**
 * Generate Sales Invoice PDF — professional GST-compliant layout
 */
export const generateSalesInvoicePdf = async (
  invoice: SalesInvoice,
  customer: Customer | null,
  companyProfile: CompanyProfile | null
): Promise<void> => {
  const companyName = companyProfile?.companyName || 'Company Name';
  const companyAddr = [
    companyProfile?.addressLine1,
    companyProfile?.addressLine2,
    [companyProfile?.city, companyProfile?.state, companyProfile?.pincode].filter(Boolean).join(', '),
  ].filter(Boolean).join(', ') || '—';
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

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Invoice ${invoice.invoiceNumber}</title>
      <style>
        ${baseStyles}
        .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; margin-bottom: 28px; padding-bottom: 20px; border-bottom: 1px solid #e0e0e0; }
        .company { flex: 1; }
        .company-name { font-size: 18px; font-weight: bold; color: #1a1a1a; margin: 0 0 10px 0; }
        .company-detail { font-size: 11px; color: #333; margin: 3px 0; }
        .invoice-box { width: 280px; flex-shrink: 0; border: 1px solid #d0d0d0; border-radius: 4px; padding: 16px; background: #fafafa; }
        .invoice-box-title { font-size: 14px; font-weight: bold; letter-spacing: 0.5px; margin: 0 0 12px 0; color: #1a1a1a; }
        .invoice-box-row { display: flex; justify-content: space-between; gap: 12px; margin: 6px 0; font-size: 11px; }
        .invoice-box-row .label { color: #555; }
        .invoice-box-row .value { font-weight: 500; color: #1a1a1a; }
        .status-badge { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 10px; font-weight: 600; text-transform: uppercase; background: #e8e8e8; color: #333; }
        .bill-to-box { border: 1px solid #d0d0d0; border-radius: 4px; padding: 16px; margin: 24px 0; background: #fafafa; max-width: 420px; }
        .bill-to-title { font-size: 12px; font-weight: bold; color: #555; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 0.5px; }
        .bill-to-name { font-weight: bold; font-size: 12px; margin: 0 0 6px 0; color: #1a1a1a; }
        .bill-to-line { margin: 3px 0; font-size: 11px; color: #333; }
        .items-table { width: 100%; border-collapse: collapse; margin: 24px 0; font-size: 11px; page-break-inside: auto; }
        .items-table tr { page-break-inside: avoid; page-break-after: auto; }
        .items-table thead { display: table-header-group; }
        .items-table th { border: 1px solid #c0c0c0; padding: 10px 12px; text-align: left; background: #f0f0f0; font-weight: 600; color: #333; font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px; }
        .items-table th.num { text-align: right; }
        .items-table th.cen { text-align: center; }
        .items-table td { border: 1px solid #e0e0e0; padding: 10px 12px; }
        .items-table td.num { text-align: right; font-variant-numeric: tabular-nums; }
        .items-table td.cen { text-align: center; }
        .items-table tbody tr:nth-child(even) { background: #fafafa; }
        .totals-box { width: 320px; margin-left: auto; margin-top: 20px; border: 1px solid #d0d0d0; border-radius: 4px; padding: 16px; background: #fafafa; }
        .totals-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 11px; }
        .totals-row.grand { font-size: 14px; font-weight: bold; margin-top: 10px; padding-top: 12px; border-top: 2px solid #1a1a1a; }
        .totals-row.grand .value { font-size: 15px; }
        .footer-section { margin-top: 36px; padding-top: 20px; border-top: 1px solid #e0e0e0; }
        .amount-words { font-size: 11px; color: #333; margin-bottom: 20px; padding: 12px; background: #f8f8f8; border-radius: 4px; }
        .amount-words strong { color: #1a1a1a; }
        .signature-block { margin: 24px 0 16px 0; }
        .signature-label { font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 32px; }
        .footer-note { font-size: 10px; color: #888; text-align: center; margin-top: 24px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company">
          <h1 class="company-name">${companyName}</h1>
          <p class="company-detail">${companyAddr}</p>
          <p class="company-detail">GSTIN: ${gstin}</p>
          ${contact ? `<p class="company-detail">Contact: ${contact}</p>` : ''}
          ${email ? `<p class="company-detail">Email: ${email}</p>` : ''}
        </div>
        <div class="invoice-box">
          <p class="invoice-box-title">Tax Invoice</p>
          <div class="invoice-box-row"><span class="label">Invoice No.</span><span class="value">${invoice.invoiceNumber}</span></div>
          <div class="invoice-box-row"><span class="label">Invoice Date</span><span class="value">${issueDate}</span></div>
          <div class="invoice-box-row"><span class="label">Due Date</span><span class="value">${dueDate}</span></div>
          <div class="invoice-box-row"><span class="label">Status</span><span class="value"><span class="status-badge">${invoice.status}</span></span></div>
        </div>
      </div>

      <div class="bill-to-box">
        <p class="bill-to-title">Bill To</p>
        <p class="bill-to-name">${invoice.customerName}</p>
        <p class="bill-to-line">${customerAddr}</p>
        ${customer?.mobile ? `<p class="bill-to-line">Mobile: ${customer.mobile}</p>` : ''}
        ${customer?.email ? `<p class="bill-to-line">Email: ${customer.email}</p>` : ''}
        ${customer?.gstin ? `<p class="bill-to-line">GSTIN: ${customer.gstin}</p>` : ''}
      </div>

      <table class="items-table">
        <thead>
          <tr>
            <th style="width: 40px;">Sl No</th>
            <th>Description</th>
            <th class="cen" style="width: 50px;">Qty</th>
            <th class="num" style="width: 90px;">Rate</th>
            <th class="cen" style="width: 55px;">GST %</th>
            <th class="num" style="width: 90px;">GST Amount</th>
            <th class="num" style="width: 100px;">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="cen">1</td>
            <td>${description}</td>
            <td class="cen">1</td>
            <td class="num">${formatCurrencyINR(invoice.amount)}</td>
            <td class="cen">${invoice.gstRate}%</td>
            <td class="num">${formatCurrencyINR(invoice.gstAmount)}</td>
            <td class="num bold">${formatCurrencyINR(invoice.totalAmount)}</td>
          </tr>
        </tbody>
      </table>

      <div class="totals-box">
        <div class="totals-row"><span>Subtotal</span><span class="value">${formatCurrencyINR(invoice.amount)}</span></div>
        <div class="totals-row"><span>CGST (${cgstPct}%)</span><span class="value">${formatCurrencyINR(cgstAmt)}</span></div>
        <div class="totals-row"><span>SGST (${sgstPct}%)</span><span class="value">${formatCurrencyINR(sgstAmt)}</span></div>
        <div class="totals-row grand"><span>Grand Total</span><span class="value">${formatCurrencyINR(invoice.totalAmount)}</span></div>
      </div>

      <div class="footer-section">
        <div class="amount-words"><strong>Amount in words:</strong> ${amountWords}</div>
        <div class="signature-block">
          <div class="signature-label">Authorized Signatory</div>
        </div>
        <p class="footer-note">This is a computer generated invoice.</p>
        <p class="footer-note">${companyName}</p>
      </div>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  }
};

/**
 * Build vendor address lines for PDF (no empty fields).
 */
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

/**
 * Generate Purchase Invoice PDF — professional layout consistent with Sales Invoice.
 * Optional vendor: when provided, Vendor Details show name, address (multi-line), GSTIN.
 */
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
  const companyAddr = [
    companyProfile?.addressLine1,
    companyProfile?.addressLine2,
    [companyProfile?.city, companyProfile?.state, companyProfile?.pincode].filter(Boolean).join(', '),
  ].filter(Boolean).join(', ') || '—';
  const gstin = companyProfile?.gstin || '—';
  const issueDate = formatDateDMY(invoice.issueDate);

  const vendorName = invoice.vendorName;
  const vendorAddressLines = formatVendorAddress(vendor);
  const vendorGstin = vendor?.gstin?.trim();
  const hasVendorAddress = vendorAddressLines.length > 0;
  const vendorDetailsHtml = `
      <div class="vendor-box">
        <p class="vendor-title">Vendor Details</p>
        <p class="vendor-name">${vendorName}</p>
        ${hasVendorAddress ? vendorAddressLines.map((line) => `<p class="vendor-line">${line}</p>`).join('') : ''}
        ${vendorGstin ? `<p class="vendor-line">GSTIN: ${vendorGstin}</p>` : ''}
      </div>`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Purchase Invoice ${invoice.invoiceNumber}</title>
      <style>
        ${baseStyles}
        .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; margin-bottom: 28px; padding-bottom: 20px; border-bottom: 1px solid #e0e0e0; }
        .company { flex: 1; }
        .company-name { font-size: 18px; font-weight: bold; color: #1a1a1a; margin: 0 0 10px 0; }
        .company-detail { font-size: 11px; color: #333; margin: 3px 0; }
        .invoice-box { width: 280px; flex-shrink: 0; border: 1px solid #d0d0d0; border-radius: 4px; padding: 16px; background: #fafafa; }
        .invoice-box-title { font-size: 14px; font-weight: bold; letter-spacing: 0.5px; margin: 0 0 12px 0; color: #1a1a1a; }
        .invoice-box-row { display: flex; justify-content: space-between; gap: 12px; margin: 6px 0; font-size: 11px; }
        .invoice-box-row .label { color: #555; }
        .invoice-box-row .value { font-weight: 500; color: #1a1a1a; }
        .vendor-box { border: 1px solid #d0d0d0; border-radius: 4px; padding: 16px; margin: 24px 0; background: #fafafa; max-width: 420px; }
        .vendor-title { font-size: 12px; font-weight: bold; color: #555; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 0.5px; }
        .vendor-name { font-weight: bold; font-size: 12px; margin: 0 0 6px 0; color: #1a1a1a; }
        .vendor-line { margin: 3px 0; font-size: 11px; color: #333; }
        .items-table { width: 100%; border-collapse: collapse; margin: 24px 0; font-size: 11px; page-break-inside: auto; }
        .items-table tr { page-break-inside: avoid; page-break-after: auto; }
        .items-table thead { display: table-header-group; }
        .items-table th { border: 1px solid #c0c0c0; padding: 10px 12px; text-align: left; background: #f0f0f0; font-weight: 600; color: #333; font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px; }
        .items-table th.num { text-align: right; }
        .items-table th.cen { text-align: center; }
        .items-table td { border: 1px solid #e0e0e0; padding: 10px 12px; }
        .items-table td.num { text-align: right; font-variant-numeric: tabular-nums; }
        .items-table td.cen { text-align: center; }
        .items-table tbody tr:nth-child(even) { background: #fafafa; }
        .totals-box { width: 320px; margin-left: auto; margin-top: 20px; border: 1px solid #d0d0d0; border-radius: 4px; padding: 16px; background: #fafafa; }
        .totals-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 11px; }
        .totals-row.grand { font-size: 14px; font-weight: bold; margin-top: 10px; padding-top: 12px; border-top: 2px solid #1a1a1a; }
        .totals-row.grand .value { font-size: 15px; }
        .footer-section { margin-top: 36px; padding-top: 20px; border-top: 1px solid #e0e0e0; }
        .footer-note { font-size: 10px; color: #888; text-align: center; margin-top: 24px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company">
          <h1 class="company-name">${companyName}</h1>
          <p class="company-detail">${companyAddr}</p>
          <p class="company-detail">GSTIN: ${gstin}</p>
        </div>
        <div class="invoice-box">
          <p class="invoice-box-title">Purchase Invoice</p>
          <div class="invoice-box-row"><span class="label">Invoice No.</span><span class="value">${invoice.invoiceNumber}</span></div>
          <div class="invoice-box-row"><span class="label">Date</span><span class="value">${issueDate}</span></div>
          ${invoice.reference ? `<div class="invoice-box-row"><span class="label">Reference</span><span class="value">${invoice.reference}</span></div>` : ''}
        </div>
      </div>

      ${vendorDetailsHtml}

      <table class="items-table">
        <thead>
          <tr>
            <th style="width: 40px;">Sl No</th>
            <th>Description</th>
            <th class="cen" style="width: 50px;">Qty</th>
            <th class="num" style="width: 100px;">Rate</th>
            <th class="num" style="width: 100px;">GST</th>
            <th class="num" style="width: 110px;">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="cen">1</td>
            <td>Purchase — ${invoice.reference || invoice.invoiceNumber}</td>
            <td class="cen">1</td>
            <td class="num">${formatCurrencyINR(invoice.amount)}</td>
            <td class="num">${formatCurrencyINR(totalGst)}</td>
            <td class="num bold">${formatCurrencyINR(invoice.totalAmount)}</td>
          </tr>
        </tbody>
      </table>

      <div class="totals-box">
        <div class="totals-row"><span>Subtotal</span><span class="value">${formatCurrencyINR(invoice.amount)}</span></div>
        <div class="totals-row"><span>Input GST</span><span class="value">${formatCurrencyINR(totalGst)}</span></div>
        <div class="totals-row grand"><span>Grand Total</span><span class="value">${formatCurrencyINR(invoice.totalAmount)}</span></div>
      </div>

      <div class="footer-section">
        <p class="footer-note">This is a computer generated purchase invoice.</p>
        <p class="footer-note">${companyName}</p>
      </div>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  }
};
