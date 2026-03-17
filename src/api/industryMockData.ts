/**
 * Industry-specific mock data factory.
 * Returns data filtered by organizationId so every API file can call
 * `getIndustryInvoices(orgId)` etc. and get relevant data.
 *
 * Org mapping:
 *   org_001 = ISP Cable   (existing mockData.ts already covers this)
 *   org_002 = Retail Store
 *   org_003 = Salon & Spa
 *   org_004 = Restaurant
 *   org_005 = Healthcare / Pharmacy
 *   org_006 = Gym / Fitness
 */
import type {
  SalesInvoice, Complaint, Expense, Quotation, PurchaseInvoice,
  PurchaseOrder, Appointment, ServiceRequest, Lead, Subscription,
  Vendor, QuotationItem, PurchaseOrderItem,
} from '@/models/types';

// ── helpers ──
const d = (ago: number) => {
  const dt = new Date(); dt.setDate(dt.getDate() - ago);
  return dt.toISOString().slice(0, 10);
};
const iso = (ago: number) => {
  const dt = new Date(); dt.setDate(dt.getDate() - ago);
  return dt.toISOString();
};
const future = (days: number) => {
  const dt = new Date(); dt.setDate(dt.getDate() + days);
  return dt.toISOString().slice(0, 10);
};

// ════════════════════════════════════════════════════════════════════════
//  INVOICES
// ════════════════════════════════════════════════════════════════════════
const retailInvoices: SalesInvoice[] = [
  { id: 1001, organizationId: 'org_002', invoiceNumber: 'INV-R-001', customerId: 101, customerName: 'Priya Sharma', serviceProvider: 'Retail', planName: 'Wireless Earbuds × 2, Phone Case × 1', amount: 3800, gstRate: 18, gstAmount: 684, totalAmount: 4484, status: 'paid', issueDate: d(5), dueDate: d(5), createdAt: d(5) },
  { id: 1002, organizationId: 'org_002', invoiceNumber: 'INV-R-002', customerId: 102, customerName: 'Ravi Menon', serviceProvider: 'Retail', planName: 'Laptop Stand × 1, USB Hub × 1', amount: 2200, gstRate: 18, gstAmount: 396, totalAmount: 2596, status: 'sent', issueDate: d(2), dueDate: future(5), createdAt: d(2) },
  { id: 1003, organizationId: 'org_002', invoiceNumber: 'INV-R-003', customerId: 103, customerName: 'Sunita Patel', serviceProvider: 'Retail', planName: 'Screen Guard × 3', amount: 600, gstRate: 18, gstAmount: 108, totalAmount: 708, status: 'draft', issueDate: d(0), dueDate: future(15), createdAt: d(0) },
];

const salonInvoices: SalesInvoice[] = [
  { id: 2001, organizationId: 'org_003', invoiceNumber: 'INV-S-001', customerId: 106, customerName: 'Kavya Reddy', serviceProvider: 'Hair Services', planName: 'Hair Cut & Style, Hair Colouring', amount: 2500, gstRate: 18, gstAmount: 450, totalAmount: 2950, status: 'paid', issueDate: d(3), dueDate: d(3), createdAt: d(3) },
  { id: 2002, organizationId: 'org_003', invoiceNumber: 'INV-S-002', customerId: 107, customerName: 'Meera Pillai', serviceProvider: 'Spa Treatments', planName: 'Full Body Spa, Facial Treatment', amount: 4500, gstRate: 18, gstAmount: 810, totalAmount: 5310, status: 'paid', issueDate: d(1), dueDate: d(1), createdAt: d(1) },
  { id: 2003, organizationId: 'org_003', invoiceNumber: 'INV-S-003', customerId: 108, customerName: 'Nisha Verma', serviceProvider: 'Hair Services', planName: 'Manicure + Pedicure', amount: 800, gstRate: 18, gstAmount: 144, totalAmount: 944, status: 'sent', issueDate: d(0), dueDate: future(7), createdAt: d(0) },
];

const restaurantInvoices: SalesInvoice[] = [
  { id: 3001, organizationId: 'org_004', invoiceNumber: 'INV-T-001', customerId: 111, customerName: 'Arjun Nair', serviceProvider: 'Food', planName: 'Butter Chicken × 2, Naan × 4, Biryani × 1', amount: 1250, gstRate: 5, gstAmount: 62.5, totalAmount: 1312.5, status: 'paid', issueDate: d(1), dueDate: d(1), createdAt: d(1) },
  { id: 3002, organizationId: 'org_004', invoiceNumber: 'INV-T-002', customerId: 112, customerName: 'Divya Krishnan', serviceProvider: 'Food', planName: 'Family Dinner - 4 persons', amount: 2800, gstRate: 5, gstAmount: 140, totalAmount: 2940, status: 'paid', issueDate: d(0), dueDate: d(0), createdAt: d(0) },
  { id: 3003, organizationId: 'org_004', invoiceNumber: 'INV-T-003', customerId: 113, customerName: 'Suresh Babu', serviceProvider: 'Food', planName: 'Lunch Package - March', amount: 2500, gstRate: 5, gstAmount: 125, totalAmount: 2625, status: 'sent', issueDate: d(3), dueDate: future(7), createdAt: d(3) },
];

const healthcareInvoices: SalesInvoice[] = [
  { id: 4001, organizationId: 'org_005', invoiceNumber: 'INV-H-001', customerId: 115, customerName: 'Gopal Rao', serviceProvider: 'Medical Services', planName: 'Consultation + Blood Test Panel', amount: 1500, gstRate: 0, gstAmount: 0, totalAmount: 1500, status: 'paid', issueDate: d(2), dueDate: d(2), createdAt: d(2) },
  { id: 4002, organizationId: 'org_005', invoiceNumber: 'INV-H-002', customerId: 116, customerName: 'Usha Natarajan', serviceProvider: 'Medicines', planName: 'Metformin 500mg × 30, Amlodipine 5mg × 30', amount: 450, gstRate: 12, gstAmount: 54, totalAmount: 504, status: 'paid', issueDate: d(1), dueDate: d(1), createdAt: d(1) },
  { id: 4003, organizationId: 'org_005', invoiceNumber: 'INV-H-003', customerId: 117, customerName: 'Babu Subramanian', serviceProvider: 'Medical Services', planName: 'X-Ray + Consultation', amount: 2200, gstRate: 0, gstAmount: 0, totalAmount: 2200, status: 'draft', issueDate: d(0), dueDate: future(10), createdAt: d(0) },
];

const gymInvoices: SalesInvoice[] = [
  { id: 5001, organizationId: 'org_006', invoiceNumber: 'INV-G-001', customerId: 120, customerName: 'Aditya Kulkarni', serviceProvider: 'Memberships', planName: 'Annual Membership Renewal', amount: 7999, gstRate: 18, gstAmount: 1439.82, totalAmount: 9438.82, status: 'paid', issueDate: d(10), dueDate: d(10), createdAt: d(10) },
  { id: 5002, organizationId: 'org_006', invoiceNumber: 'INV-G-002', customerId: 122, customerName: 'Sanjay Patil', serviceProvider: 'Personal Training', planName: 'PT Package 12 Sessions', amount: 5999, gstRate: 18, gstAmount: 1079.82, totalAmount: 7078.82, status: 'sent', issueDate: d(3), dueDate: future(7), createdAt: d(3) },
  { id: 5003, organizationId: 'org_006', invoiceNumber: 'INV-G-003', customerId: 123, customerName: 'Neha Joshi', serviceProvider: 'Memberships', planName: 'Monthly Membership - March', amount: 999, gstRate: 18, gstAmount: 179.82, totalAmount: 1178.82, status: 'paid', issueDate: d(1), dueDate: d(1), createdAt: d(1) },
];

export function getIndustryInvoices(): SalesInvoice[] {
  return [...retailInvoices, ...salonInvoices, ...restaurantInvoices, ...healthcareInvoices, ...gymInvoices];
}

// ════════════════════════════════════════════════════════════════════════
//  COMPLAINTS
// ════════════════════════════════════════════════════════════════════════
const industryComplaints: Complaint[] = [
  // Retail
  { id: 1001, organizationId: 'org_002', customerId: 101, customerName: 'Priya Sharma', mobile: '9800001001', connectionType: 'Retail', customerDescription: 'Earbuds stopped working after 2 days. Want replacement.', internalDescription: 'Under warranty. Replacement approved.', status: 'active', createdAt: iso(2), priority: 'high' },
  { id: 1002, organizationId: 'org_002', customerId: 103, customerName: 'Sunita Patel', mobile: '9800001003', connectionType: 'Retail', customerDescription: 'Wrong size delivered for clothing order.', internalDescription: 'Exchange scheduled for next visit.', status: 'on-hold', createdAt: iso(5), priority: 'medium' },
  // Salon
  { id: 2001, organizationId: 'org_003', customerId: 108, customerName: 'Nisha Verma', mobile: '9800002003', connectionType: 'Hair Services', customerDescription: 'Hair colour faded within a week.', internalDescription: 'Offering free re-do session.', status: 'active', createdAt: iso(3), priority: 'high' },
  // Restaurant
  { id: 3001, organizationId: 'org_004', customerId: 113, customerName: 'Suresh Babu', mobile: '9800003003', connectionType: 'Food', customerDescription: 'Food was cold when delivered to table.', internalDescription: 'Kitchen team notified. Complimentary dessert offered.', status: 'completed', createdAt: iso(1), priority: 'medium' },
  { id: 3002, organizationId: 'org_004', customerId: 111, customerName: 'Arjun Nair', mobile: '9800003001', connectionType: 'Food', customerDescription: 'Wrong item served. Ordered paneer but got chicken.', internalDescription: 'Replaced immediately. Kitchen staff reminded of allergy protocol.', status: 'active', createdAt: iso(0), priority: 'critical' },
  // Healthcare
  { id: 4001, organizationId: 'org_005', customerId: 117, customerName: 'Babu Subramanian', mobile: '9800004003', connectionType: 'Medical Services', customerDescription: 'Lab report delayed by 3 days.', internalDescription: 'Lab equipment was under maintenance. Report ready now.', status: 'completed', createdAt: iso(4), priority: 'high' },
  // Gym
  { id: 5001, organizationId: 'org_006', customerId: 124, customerName: 'Rahul Bhosale', mobile: '9800005005', connectionType: 'Memberships', customerDescription: 'Treadmill in zone B not working for 2 weeks.', internalDescription: 'Repair vendor contacted. ETA 3 days.', status: 'active', createdAt: iso(2), priority: 'medium' },
];

export function getIndustryComplaints(): Complaint[] {
  return [...industryComplaints];
}

// ════════════════════════════════════════════════════════════════════════
//  EXPENSES
// ════════════════════════════════════════════════════════════════════════
const industryExpenses: Expense[] = [
  // Retail
  { id: 1001, organizationId: 'org_002', expenseNumber: 'EXP-R-001', category: 'Store Rent', description: 'Monthly shop rent - March', amount: 25000, taxAmount: 0, totalAmount: 25000, paymentMethod: 'other', paymentDate: d(5), status: 'approved', approvedBy: 'admin', createdAt: iso(5) },
  { id: 1002, organizationId: 'org_002', expenseNumber: 'EXP-R-002', category: 'Packaging', description: 'Carry bags and gift wrapping', amount: 3500, taxAmount: 630, totalAmount: 4130, paymentMethod: 'upi', paymentDate: d(2), status: 'approved', approvedBy: 'admin', createdAt: iso(2) },
  // Salon
  { id: 2001, organizationId: 'org_003', expenseNumber: 'EXP-S-001', category: 'Salon Supplies', description: 'Hair dyes, shampoo, conditioner stock', amount: 8500, taxAmount: 1530, totalAmount: 10030, paymentMethod: 'upi', paymentDate: d(3), status: 'approved', approvedBy: 'admin', createdAt: iso(3) },
  { id: 2002, organizationId: 'org_003', expenseNumber: 'EXP-S-002', category: 'Rent', description: 'Monthly salon rent - March', amount: 18000, taxAmount: 0, totalAmount: 18000, paymentMethod: 'other', paymentDate: d(5), status: 'approved', approvedBy: 'admin', createdAt: iso(5) },
  // Restaurant
  { id: 3001, organizationId: 'org_004', expenseNumber: 'EXP-T-001', category: 'Ingredients', description: 'Weekly vegetable and spice purchase', amount: 12000, taxAmount: 600, totalAmount: 12600, paymentMethod: 'cash', paymentDate: d(1), status: 'approved', approvedBy: 'admin', createdAt: iso(1) },
  { id: 3002, organizationId: 'org_004', expenseNumber: 'EXP-T-002', category: 'Gas & Fuel', description: 'Commercial LPG cylinders × 4', amount: 4800, taxAmount: 240, totalAmount: 5040, paymentMethod: 'cash', paymentDate: d(3), status: 'approved', approvedBy: 'admin', createdAt: iso(3) },
  // Healthcare
  { id: 4001, organizationId: 'org_005', expenseNumber: 'EXP-H-001', category: 'Lab Equipment', description: 'Blood testing reagent kits', amount: 15000, taxAmount: 2700, totalAmount: 17700, paymentMethod: 'other', paymentDate: d(7), status: 'approved', approvedBy: 'admin', createdAt: iso(7) },
  { id: 4002, organizationId: 'org_005', expenseNumber: 'EXP-H-002', category: 'Staff Salary', description: 'Pharmacist salary - March', amount: 22000, taxAmount: 0, totalAmount: 22000, paymentMethod: 'other', paymentDate: d(1), status: 'pending', createdAt: iso(1) },
  // Gym
  { id: 5001, organizationId: 'org_006', expenseNumber: 'EXP-G-001', category: 'Equipment Maintenance', description: 'Treadmill servicing and belt replacement', amount: 6500, taxAmount: 1170, totalAmount: 7670, paymentMethod: 'upi', paymentDate: d(4), status: 'approved', approvedBy: 'admin', createdAt: iso(4) },
  { id: 5002, organizationId: 'org_006', expenseNumber: 'EXP-G-002', category: 'Utilities', description: 'Electricity bill - gym area', amount: 9800, taxAmount: 1764, totalAmount: 11564, paymentMethod: 'other', paymentDate: d(2), status: 'pending', createdAt: iso(2) },
];

export function getIndustryExpenses(): Expense[] {
  return [...industryExpenses];
}

// ════════════════════════════════════════════════════════════════════════
//  QUOTATIONS
// ════════════════════════════════════════════════════════════════════════
const mkQItems = (items: { n: string; p: number; q: number; t: number }[]): QuotationItem[] =>
  items.map((i, idx) => ({ productId: idx + 1, productName: i.n, quantity: i.q, unitPrice: i.p, taxRate: i.t, discount: 0, lineTotal: i.p * i.q * (1 + i.t / 100) }));

const industryQuotations: Quotation[] = [
  // Retail - bulk order quote
  { id: 1001, organizationId: 'org_002', quotationNumber: 'QTN-R-001', customerId: 102, customerName: 'Ravi Menon', items: mkQItems([{ n: 'Wireless Earbuds', p: 1200, q: 50, t: 18 }, { n: 'Phone Cases', p: 300, q: 100, t: 18 }]), subtotal: 90000, taxTotal: 16200, discountAmount: 0, grandTotal: 106200, status: 'sent', validUntil: future(14), createdAt: d(2) },
  // Salon – corporate event quote
  { id: 2001, organizationId: 'org_003', quotationNumber: 'QTN-S-001', customerId: 107, customerName: 'Meera Pillai', items: mkQItems([{ n: 'Bridal Makeup Package', p: 15000, q: 1, t: 18 }, { n: 'Hair Styling', p: 3000, q: 3, t: 18 }]), subtotal: 24000, taxTotal: 4320, discountAmount: 0, grandTotal: 28320, status: 'draft', validUntil: future(7), createdAt: d(0) },
];

export function getIndustryQuotations(): Quotation[] {
  return [...industryQuotations];
}

// ════════════════════════════════════════════════════════════════════════
//  VENDORS
// ════════════════════════════════════════════════════════════════════════
const industryVendors: Vendor[] = [
  { id: 1001, organizationId: 'org_002', name: 'TechBulk Distributors', contact: '9800100001', gstin: '29AABCD1234E1Z5', city: 'Bangalore', state: 'Karnataka', country: 'India', createdAt: d(200) },
  { id: 1002, organizationId: 'org_002', name: 'FashionWare Pvt Ltd', contact: '9800100002', city: 'Mumbai', state: 'Maharashtra', country: 'India', createdAt: d(180) },
  { id: 2001, organizationId: 'org_003', name: 'Beauty Essentials India', contact: '9800200001', city: 'Hyderabad', state: 'Telangana', country: 'India', createdAt: d(300) },
  { id: 3001, organizationId: 'org_004', name: 'Fresh Farm Produce', contact: '9800300001', city: 'Kochi', state: 'Kerala', country: 'India', createdAt: d(365) },
  { id: 3002, organizationId: 'org_004', name: 'Spice World Traders', contact: '9800300002', city: 'Kochi', state: 'Kerala', country: 'India', createdAt: d(300) },
  { id: 4001, organizationId: 'org_005', name: 'MedSupply India', contact: '9800400001', gstin: '33AABCM5678F1Z2', city: 'Chennai', state: 'Tamil Nadu', country: 'India', createdAt: d(400) },
  { id: 5001, organizationId: 'org_006', name: 'FitEquip Global', contact: '9800500001', city: 'Pune', state: 'Maharashtra', country: 'India', createdAt: d(250) },
  { id: 5002, organizationId: 'org_006', name: 'NutriStore Wholesale', contact: '9800500002', city: 'Pune', state: 'Maharashtra', country: 'India', createdAt: d(180) },
];

export function getIndustryVendors(): Vendor[] {
  return [...industryVendors];
}

// ════════════════════════════════════════════════════════════════════════
//  PURCHASE INVOICES
// ════════════════════════════════════════════════════════════════════════
const industryPurchaseInvoices: PurchaseInvoice[] = [
  { id: 1001, organizationId: 'org_002', invoiceNumber: 'PINV-R-001', vendorId: 1001, vendorName: 'TechBulk Distributors', reference: 'PO-R-101', amount: 45000, gstBreakup: { cgst: 4050, sgst: 4050 }, totalAmount: 53100, issueDate: d(10), createdAt: d(10) },
  { id: 2001, organizationId: 'org_003', invoiceNumber: 'PINV-S-001', vendorId: 2001, vendorName: 'Beauty Essentials India', amount: 12000, gstBreakup: { cgst: 1080, sgst: 1080 }, totalAmount: 14160, issueDate: d(8), createdAt: d(8) },
  { id: 3001, organizationId: 'org_004', invoiceNumber: 'PINV-T-001', vendorId: 3001, vendorName: 'Fresh Farm Produce', amount: 8500, gstBreakup: { cgst: 212.5, sgst: 212.5 }, totalAmount: 8925, issueDate: d(3), createdAt: d(3) },
  { id: 4001, organizationId: 'org_005', invoiceNumber: 'PINV-H-001', vendorId: 4001, vendorName: 'MedSupply India', reference: 'PO-H-201', amount: 35000, gstBreakup: { cgst: 2100, sgst: 2100 }, totalAmount: 39200, issueDate: d(7), createdAt: d(7) },
  { id: 5001, organizationId: 'org_006', invoiceNumber: 'PINV-G-001', vendorId: 5002, vendorName: 'NutriStore Wholesale', amount: 18000, gstBreakup: { cgst: 1620, sgst: 1620 }, totalAmount: 21240, issueDate: d(5), createdAt: d(5) },
];

export function getIndustryPurchaseInvoices(): PurchaseInvoice[] {
  return [...industryPurchaseInvoices];
}

// ════════════════════════════════════════════════════════════════════════
//  PURCHASE ORDERS
// ════════════════════════════════════════════════════════════════════════
const mkPOItems = (items: { n: string; p: number; q: number; t: number; r?: number }[]): PurchaseOrderItem[] =>
  items.map((i, idx) => ({ productId: idx + 1, productName: i.n, quantity: i.q, unitPrice: i.p, taxRate: i.t, lineTotal: i.p * i.q * (1 + i.t / 100), receivedQuantity: i.r ?? 0 }));

const industryPurchaseOrders: PurchaseOrder[] = [
  { id: 1001, organizationId: 'org_002', poNumber: 'PO-R-001', vendorId: 1001, vendorName: 'TechBulk Distributors', items: mkPOItems([{ n: 'Wireless Earbuds', p: 800, q: 100, t: 18, r: 80 }, { n: 'USB-C Cables', p: 150, q: 200, t: 18, r: 200 }]), subtotal: 110000, taxTotal: 19800, grandTotal: 129800, status: 'partial', expectedDate: future(5), createdAt: d(7) },
  { id: 3001, organizationId: 'org_004', poNumber: 'PO-T-001', vendorId: 3001, vendorName: 'Fresh Farm Produce', items: mkPOItems([{ n: 'Basmati Rice 25kg', p: 1800, q: 5, t: 5 }, { n: 'Cooking Oil 15L', p: 2200, q: 3, t: 5 }]), subtotal: 15600, taxTotal: 780, grandTotal: 16380, status: 'sent', expectedDate: future(2), createdAt: d(1) },
  { id: 4001, organizationId: 'org_005', poNumber: 'PO-H-001', vendorId: 4001, vendorName: 'MedSupply India', items: mkPOItems([{ n: 'Paracetamol 500mg × 1000', p: 450, q: 10, t: 12 }, { n: 'Amoxicillin 250mg × 500', p: 1200, q: 5, t: 12 }]), subtotal: 10500, taxTotal: 1260, grandTotal: 11760, status: 'sent', expectedDate: future(3), createdAt: d(2) },
  { id: 5001, organizationId: 'org_006', poNumber: 'PO-G-001', vendorId: 5001, vendorName: 'FitEquip Global', items: mkPOItems([{ n: 'Resistance Bands Set', p: 500, q: 50, t: 18 }, { n: 'Yoga Mats', p: 800, q: 30, t: 18 }]), subtotal: 49000, taxTotal: 8820, grandTotal: 57820, status: 'draft', expectedDate: future(10), createdAt: d(0) },
];

export function getIndustryPurchaseOrders(): PurchaseOrder[] {
  return [...industryPurchaseOrders];
}

// ════════════════════════════════════════════════════════════════════════
//  APPOINTMENTS
// ════════════════════════════════════════════════════════════════════════
const industryAppointments: Appointment[] = [
  // Salon
  { id: 2001, organizationId: 'org_003', customerId: 106, customerName: 'Kavya Reddy', customerMobile: '9800002001', serviceType: 'Hair Cut & Colouring', staffAssigned: 'Priya', scheduledAt: future(1) + 'T10:00:00.000Z', duration: 90, status: 'confirmed', createdAt: iso(1) },
  { id: 2002, organizationId: 'org_003', customerId: 110, customerName: 'Shalini Das', customerMobile: '9800002005', serviceType: 'Facial Treatment', staffAssigned: 'Meena', scheduledAt: future(1) + 'T14:00:00.000Z', duration: 60, status: 'scheduled', createdAt: iso(0) },
  // Restaurant
  { id: 3001, organizationId: 'org_004', customerId: 111, customerName: 'Arjun Nair', customerMobile: '9800003001', serviceType: 'Table Reservation - 4 persons', scheduledAt: future(0) + 'T19:30:00.000Z', duration: 120, status: 'confirmed', notes: 'Birthday celebration', createdAt: iso(2) },
  // Healthcare
  { id: 4001, organizationId: 'org_005', customerId: 115, customerName: 'Gopal Rao', customerMobile: '9800004001', serviceType: 'Cardiology Consultation', staffAssigned: 'Dr. Kumar', scheduledAt: future(1) + 'T09:30:00.000Z', duration: 30, status: 'scheduled', createdAt: iso(1) },
  { id: 4002, organizationId: 'org_005', customerId: 119, customerName: 'Prakash Venkat', customerMobile: '9800004005', serviceType: 'Blood Test - Complete Panel', scheduledAt: future(0) + 'T08:00:00.000Z', duration: 15, status: 'confirmed', createdAt: iso(0) },
  // Gym
  { id: 5001, organizationId: 'org_006', customerId: 120, customerName: 'Aditya Kulkarni', customerMobile: '9800005001', serviceType: 'Personal Training Session', staffAssigned: 'Trainer Raj', scheduledAt: future(0) + 'T06:30:00.000Z', duration: 60, status: 'confirmed', createdAt: iso(1) },
  { id: 5002, organizationId: 'org_006', customerId: 121, customerName: 'Pooja Deshmukh', customerMobile: '9800005002', serviceType: 'Group Yoga Class', scheduledAt: future(1) + 'T07:00:00.000Z', duration: 45, status: 'scheduled', createdAt: iso(0) },
];

export function getIndustryAppointments(): Appointment[] {
  return [...industryAppointments];
}

// ════════════════════════════════════════════════════════════════════════
//  SERVICE REQUESTS
// ════════════════════════════════════════════════════════════════════════
const industryServiceRequests: ServiceRequest[] = [
  // Retail (electronics repair)
  { id: 1001, organizationId: 'org_002', customerId: 102, customerName: 'Ravi Menon', customerMobile: '9800001002', requestType: 'Warranty Claim', description: 'Laptop charger not working, purchased 2 months ago', priority: 'high', assignedTo: 'Tech Support', status: 'in-progress', slaHours: 48, slaDeadline: future(2) + 'T10:00:00.000Z', slaBreached: false, createdAt: iso(1) },
  // Healthcare (home care)
  { id: 4001, organizationId: 'org_005', customerId: 116, customerName: 'Usha Natarajan', customerMobile: '9800004002', requestType: 'Home Visit', description: 'BP check and medicine delivery for senior patient', priority: 'high', assignedTo: 'Nurse Lakshmi', status: 'assigned', slaHours: 24, slaDeadline: future(1) + 'T09:00:00.000Z', slaBreached: false, createdAt: iso(0) },
  // Gym (equipment issue)
  { id: 5001, organizationId: 'org_006', customerId: 122, customerName: 'Sanjay Patil', customerMobile: '9800005003', requestType: 'Equipment Complaint', description: 'Smith machine cable frayed, safety hazard', priority: 'critical', assignedTo: 'Maintenance', status: 'new', slaHours: 4, slaDeadline: future(0) + 'T18:00:00.000Z', slaBreached: false, createdAt: iso(0) },
];

export function getIndustryServiceRequests(): ServiceRequest[] {
  return [...industryServiceRequests];
}

// ════════════════════════════════════════════════════════════════════════
//  LEADS
// ════════════════════════════════════════════════════════════════════════
const industryLeads: Lead[] = [
  // Retail
  { id: 1001, organizationId: 'org_002', name: 'Sharma Electronics Ltd', email: 'bulk@sharmaelec.com', mobile: '9800110001', source: 'website', stage: 'proposal', value: 150000, assignedTo: 'Sales1', followUps: [{ id: 101, date: d(3), type: 'call', notes: 'Discussed bulk pricing for earbuds', outcome: 'Interested' }], tags: ['bulk', 'corporate'], createdAt: iso(5) },
  // Salon
  { id: 2001, organizationId: 'org_003', name: 'Lakshmi Wedding Planners', mobile: '9800220001', source: 'referral', stage: 'qualified', value: 80000, followUps: [{ id: 201, date: d(2), type: 'meeting', notes: 'Wedding package discussion for 50 guests', outcome: 'Quote requested' }], tags: ['wedding', 'bulk'], createdAt: iso(4) },
  // Gym
  { id: 5001, organizationId: 'org_006', name: 'TCS Wellness Program', email: 'wellness@tcs.com', mobile: '9800550001', source: 'social', stage: 'negotiation', value: 200000, assignedTo: 'Sales1', followUps: [{ id: 501, date: d(1), type: 'meeting', notes: 'Corporate membership for 50 employees', outcome: 'Negotiating discount' }], tags: ['corporate', 'bulk'], createdAt: iso(7) },
];

export function getIndustryLeads(): Lead[] {
  return JSON.parse(JSON.stringify(industryLeads));
}

// ════════════════════════════════════════════════════════════════════════
//  SUBSCRIPTIONS
// ════════════════════════════════════════════════════════════════════════
const nm = new Date();
nm.setMonth(nm.getMonth() + 1);
const nmStr = nm.toISOString().slice(0, 10);
const nq = new Date();
nq.setMonth(nq.getMonth() + 3);
const nqStr = nq.toISOString().slice(0, 10);
const ny = new Date();
ny.setFullYear(ny.getFullYear() + 1);
const nyStr = ny.toISOString().slice(0, 10);

const industrySubscriptions: Subscription[] = [
  // Salon memberships
  { id: 2001, organizationId: 'org_003', customerId: 106, customerName: 'Kavya Reddy', planName: 'Premium Membership 3 Month', amount: 3999, billingCycle: 'quarterly', startDate: d(30), nextBillingDate: nqStr, status: 'active', autoRenew: true, createdAt: iso(30) },
  { id: 2002, organizationId: 'org_003', customerId: 107, customerName: 'Meera Pillai', planName: 'VIP Annual Package', amount: 12999, billingCycle: 'yearly', startDate: d(60), nextBillingDate: nyStr, status: 'active', autoRenew: true, createdAt: iso(60) },
  // Healthcare
  { id: 4001, organizationId: 'org_005', customerId: 115, customerName: 'Gopal Rao', planName: 'Premium Health Plan', amount: 2499, billingCycle: 'yearly', startDate: d(180), nextBillingDate: nyStr, status: 'active', autoRenew: true, createdAt: iso(180) },
  { id: 4002, organizationId: 'org_005', customerId: 116, customerName: 'Usha Natarajan', planName: 'Senior Care Plan', amount: 1999, billingCycle: 'yearly', startDate: d(200), nextBillingDate: nyStr, status: 'active', autoRenew: false, createdAt: iso(200) },
  // Gym memberships
  { id: 5001, organizationId: 'org_006', customerId: 120, customerName: 'Aditya Kulkarni', planName: 'Annual Membership', amount: 7999, billingCycle: 'yearly', startDate: d(300), nextBillingDate: nyStr, status: 'active', autoRenew: true, createdAt: iso(300) },
  { id: 5002, organizationId: 'org_006', customerId: 121, customerName: 'Pooja Deshmukh', planName: 'Quarterly Membership', amount: 2499, billingCycle: 'quarterly', startDate: d(60), nextBillingDate: nqStr, status: 'active', autoRenew: true, createdAt: iso(60) },
  { id: 5003, organizationId: 'org_006', customerId: 123, customerName: 'Neha Joshi', planName: 'Monthly Membership', amount: 999, billingCycle: 'monthly', startDate: d(5), nextBillingDate: nmStr, status: 'active', autoRenew: true, createdAt: iso(5) },
];

export function getIndustrySubscriptions(): Subscription[] {
  return [...industrySubscriptions];
}
