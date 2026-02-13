// PDF Generation Utilities
// Replace with backend PDF generation later
import type { SalesInvoice, PurchaseInvoice, Customer, CompanyProfile } from '@/models/types';
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
      return convertHundreds(thousand) + ' Thousand' + (remainder > 0 ? ' ' + convertHundreds(remainder) : '');
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

/**
 * Generate Sales Invoice PDF
 * Replace with backend PDF generation later
 */
export const generateSalesInvoicePdf = async (
  invoice: SalesInvoice,
  customer: Customer | null,
  companyProfile: CompanyProfile | null
): Promise<void> => {
  // Create HTML content for PDF
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Invoice ${invoice.invoiceNumber}</title>
      <style>
        @page { size: A4; margin: 20mm; }
        body { font-family: Arial, sans-serif; font-size: 12px; color: #000; }
        .header { margin-bottom: 20px; }
        .company-info { margin-bottom: 15px; }
        .invoice-info { float: right; text-align: right; }
        .bill-to { margin: 20px 0; }
        .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .table th { background-color: #f5f5f5; font-weight: bold; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .totals { margin-top: 20px; float: right; width: 300px; }
        .totals table { width: 100%; }
        .totals td { padding: 5px; }
        .totals .total-row { font-weight: bold; font-size: 14px; }
        .footer { margin-top: 40px; font-size: 10px; text-align: center; color: #666; }
        .amount-words { margin-top: 20px; font-style: italic; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-info">
          <h2>${companyProfile?.companyName || 'Company Name'}</h2>
          <p>${companyProfile?.addressLine1 || ''}${companyProfile?.addressLine2 ? ', ' + companyProfile.addressLine2 : ''}</p>
          <p>${companyProfile?.city || ''}, ${companyProfile?.state || ''} ${companyProfile?.pincode || ''}</p>
          <p>GSTIN: ${companyProfile?.gstin || '—'}</p>
          <p>Contact: ${companyProfile?.contactNumber || ''} | Email: ${companyProfile?.email || ''}</p>
        </div>
        <div class="invoice-info">
          <h2>TAX INVOICE</h2>
          <p><strong>Invoice No:</strong> ${invoice.invoiceNumber}</p>
          <p><strong>Date:</strong> ${formatDateDMY(invoice.issueDate)}</p>
          <p><strong>Status:</strong> ${invoice.status.toUpperCase()}</p>
        </div>
        <div style="clear: both;"></div>
      </div>
      
      <div class="bill-to">
        <h3>Bill To:</h3>
        <p><strong>${invoice.customerName}</strong></p>
        ${customer ? `
          <p>${customer.address.line1}${customer.address.line2 ? ', ' + customer.address.line2 : ''}</p>
          <p>${customer.address.city}, ${customer.address.state} ${customer.address.country}</p>
          <p>Mobile: ${customer.mobile}${customer.email ? ' | Email: ' + customer.email : ''}</p>
          ${customer.gstin ? '<p>GSTIN: ' + customer.gstin + '</p>' : ''}
        ` : ''}
      </div>
      
      <table class="table">
        <thead>
          <tr>
            <th>Sl No</th>
            <th>Description</th>
            <th class="text-center">Qty</th>
            <th class="text-right">Rate</th>
            <th class="text-center">GST %</th>
            <th class="text-right">GST Amount</th>
            <th class="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>1</td>
            <td>${invoice.planName} - ${invoice.serviceProvider}</td>
            <td class="text-center">1</td>
            <td class="text-right">${formatCurrencyINR(invoice.amount)}</td>
            <td class="text-center">${invoice.gstRate}%</td>
            <td class="text-right">${formatCurrencyINR(invoice.gstAmount)}</td>
            <td class="text-right"><strong>${formatCurrencyINR(invoice.totalAmount)}</strong></td>
          </tr>
        </tbody>
      </table>
      
      <div class="totals">
        <table>
          <tr>
            <td>Subtotal:</td>
            <td class="text-right">${formatCurrencyINR(invoice.amount)}</td>
          </tr>
          <tr>
            <td>CGST (${invoice.gstRate / 2}%):</td>
            <td class="text-right">${formatCurrencyINR(invoice.gstAmount / 2)}</td>
          </tr>
          <tr>
            <td>SGST (${invoice.gstRate / 2}%):</td>
            <td class="text-right">${formatCurrencyINR(invoice.gstAmount / 2)}</td>
          </tr>
          <tr class="total-row">
            <td>Grand Total:</td>
            <td class="text-right">${formatCurrencyINR(invoice.totalAmount)}</td>
          </tr>
        </table>
      </div>
      
      <div style="clear: both;"></div>
      
      <div class="amount-words">
        <p><strong>Amount in words:</strong> ${numberToWords(invoice.totalAmount)}</p>
      </div>
      
      <div class="footer">
        <p>This is a computer generated invoice.</p>
        <p>${companyProfile?.companyName || 'Company'} - All rights reserved.</p>
      </div>
    </body>
    </html>
  `;
  
  // Open in new window for printing/download
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
 * Generate Purchase Invoice PDF
 * Replace with backend PDF generation later
 */
export const generatePurchaseInvoicePdf = async (
  invoice: PurchaseInvoice,
  companyProfile: CompanyProfile | null
): Promise<void> => {
  const cgst = invoice.gstBreakup.cgst || 0;
  const sgst = invoice.gstBreakup.sgst || 0;
  const igst = invoice.gstBreakup.igst || 0;
  const totalGst = cgst + sgst + igst;
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Purchase Invoice ${invoice.invoiceNumber}</title>
      <style>
        @page { size: A4; margin: 20mm; }
        body { font-family: Arial, sans-serif; font-size: 12px; color: #000; }
        .header { margin-bottom: 20px; }
        .company-info { margin-bottom: 15px; }
        .invoice-info { float: right; text-align: right; }
        .vendor-info { margin: 20px 0; }
        .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .table th { background-color: #f5f5f5; font-weight: bold; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .totals { margin-top: 20px; float: right; width: 300px; }
        .totals table { width: 100%; }
        .totals td { padding: 5px; }
        .totals .total-row { font-weight: bold; font-size: 14px; }
        .footer { margin-top: 40px; font-size: 10px; text-align: center; color: #666; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-info">
          <h2>${companyProfile?.companyName || 'Company Name'}</h2>
          <p>${companyProfile?.addressLine1 || ''}${companyProfile?.addressLine2 ? ', ' + companyProfile.addressLine2 : ''}</p>
          <p>${companyProfile?.city || ''}, ${companyProfile?.state || ''} ${companyProfile?.pincode || ''}</p>
          <p>GSTIN: ${companyProfile?.gstin || '—'}</p>
        </div>
        <div class="invoice-info">
          <h2>PURCHASE INVOICE</h2>
          <p><strong>Invoice No:</strong> ${invoice.invoiceNumber}</p>
          <p><strong>Date:</strong> ${formatDateDMY(invoice.issueDate)}</p>
          ${invoice.reference ? '<p><strong>Reference:</strong> ' + invoice.reference + '</p>' : ''}
        </div>
        <div style="clear: both;"></div>
      </div>
      
      <div class="vendor-info">
        <h3>Vendor Details:</h3>
        <p><strong>${invoice.vendorName}</strong></p>
      </div>
      
      <table class="table">
        <thead>
          <tr>
            <th>Description</th>
            <th class="text-center">Qty</th>
            <th class="text-right">Rate</th>
            <th class="text-right">GST</th>
            <th class="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Purchase Invoice Items</td>
            <td class="text-center">1</td>
            <td class="text-right">${formatCurrencyINR(invoice.amount)}</td>
            <td class="text-right">${formatCurrencyINR(totalGst)}</td>
            <td class="text-right"><strong>${formatCurrencyINR(invoice.totalAmount)}</strong></td>
          </tr>
        </tbody>
      </table>
      
      <div class="totals">
        <table>
          <tr>
            <td>Subtotal:</td>
            <td class="text-right">${formatCurrencyINR(invoice.amount)}</td>
          </tr>
          ${cgst > 0 ? `<tr><td>Input CGST:</td><td class="text-right">${formatCurrencyINR(cgst)}</td></tr>` : ''}
          ${sgst > 0 ? `<tr><td>Input SGST:</td><td class="text-right">${formatCurrencyINR(sgst)}</td></tr>` : ''}
          ${igst > 0 ? `<tr><td>Input IGST:</td><td class="text-right">${formatCurrencyINR(igst)}</td></tr>` : ''}
          <tr class="total-row">
            <td>Grand Total:</td>
            <td class="text-right">${formatCurrencyINR(invoice.totalAmount)}</td>
          </tr>
        </table>
      </div>
      
      <div style="clear: both;"></div>
      
      <div class="footer">
        <p>This is a computer generated purchase invoice.</p>
        <p>${companyProfile?.companyName || 'Company'} - All rights reserved.</p>
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
