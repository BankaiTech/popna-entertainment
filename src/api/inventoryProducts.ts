import type { InventoryProduct, Category, SubCategory, Unit, Branch, TaxRate, Warranty } from '@/models/types';
import { MOCK_ORGANIZATION_ID } from '@/models/types';
import { inventoryResource } from '@/api/resources';
import { useMockApi } from '@/lib/http';

const now = () => new Date().toISOString();

// ===== Seed Data =====
let unitsData: Unit[] = [
    { id: 1, organizationId: MOCK_ORGANIZATION_ID, name: 'Pieces', shortName: 'Pc', createdAt: now() },
    { id: 2, organizationId: MOCK_ORGANIZATION_ID, name: 'Kilogram', shortName: 'Kg', createdAt: now() },
    { id: 3, organizationId: MOCK_ORGANIZATION_ID, name: 'Litre', shortName: 'L', createdAt: now() },
    { id: 4, organizationId: MOCK_ORGANIZATION_ID, name: 'Meter', shortName: 'm', createdAt: now() },
    { id: 5, organizationId: MOCK_ORGANIZATION_ID, name: 'Box', shortName: 'Box', createdAt: now() },
    { id: 6, organizationId: MOCK_ORGANIZATION_ID, name: 'Serving', shortName: 'Srv', createdAt: now() },
    { id: 7, organizationId: MOCK_ORGANIZATION_ID, name: 'Session', shortName: 'Sess', createdAt: now() },
    { id: 8, organizationId: MOCK_ORGANIZATION_ID, name: 'Strip', shortName: 'Strp', createdAt: now() },
];

let categoriesData: Category[] = [
    // ISP (org_001)
    { id: 1, organizationId: MOCK_ORGANIZATION_ID, name: 'Electronics', code: 'ELEC', description: 'Electronic items', createdAt: now() },
    { id: 2, organizationId: MOCK_ORGANIZATION_ID, name: 'Groceries', code: 'GROC', description: 'Grocery items', createdAt: now() },
    { id: 3, organizationId: MOCK_ORGANIZATION_ID, name: 'Clothing', code: 'CLTH', description: 'Clothing & apparel', createdAt: now() },
    // Retail (org_002)
    { id: 101, organizationId: 'org_002', name: 'Accessories', code: 'ACCS', description: 'Phone accessories, cables', createdAt: now() },
    { id: 102, organizationId: 'org_002', name: 'Electronics', code: 'ELEC', description: 'Phones, laptops, gadgets', createdAt: now() },
    { id: 103, organizationId: 'org_002', name: 'Stationery', code: 'STAT', description: 'Office and school supplies', createdAt: now() },
    // Salon (org_003)
    { id: 201, organizationId: 'org_003', name: 'Hair Products', code: 'HAIR', description: 'Shampoo, conditioner, serum', createdAt: now() },
    { id: 202, organizationId: 'org_003', name: 'Skin Care', code: 'SKIN', description: 'Face wash, cream, lotion', createdAt: now() },
    { id: 203, organizationId: 'org_003', name: 'Services', code: 'SRVS', description: 'Hair cut, spa, facial', createdAt: now() },
    // Restaurant (org_004)
    { id: 301, organizationId: 'org_004', name: 'Main Course', code: 'MAIN', description: 'Rice, curry, biryani', createdAt: now() },
    { id: 302, organizationId: 'org_004', name: 'Beverages', code: 'BVRG', description: 'Tea, coffee, juice', createdAt: now() },
    { id: 303, organizationId: 'org_004', name: 'Starters', code: 'STRT', description: 'Snacks and appetizers', createdAt: now() },
    // Healthcare (org_005)
    { id: 401, organizationId: 'org_005', name: 'Medicines', code: 'MEDS', description: 'Prescription and OTC medicines', createdAt: now() },
    { id: 402, organizationId: 'org_005', name: 'Medical Supplies', code: 'MSUP', description: 'Consumables and devices', createdAt: now() },
    { id: 403, organizationId: 'org_005', name: 'Lab Services', code: 'LABS', description: 'Blood tests and diagnostics', createdAt: now() },
    // Gym (org_006)
    { id: 501, organizationId: 'org_006', name: 'Supplements', code: 'SUPP', description: 'Protein, vitamins, pre-workout', createdAt: now() },
    { id: 502, organizationId: 'org_006', name: 'Merchandise', code: 'MERCH', description: 'T-shirts, bottles, bands', createdAt: now() },
    { id: 503, organizationId: 'org_006', name: 'Memberships', code: 'MEMB', description: 'Monthly, quarterly, annual memberships', createdAt: now() },
];

let subCategoriesData: SubCategory[] = [
    // ISP
    { id: 1, organizationId: MOCK_ORGANIZATION_ID, categoryId: 1, name: 'Mobile Phones', createdAt: now() },
    { id: 2, organizationId: MOCK_ORGANIZATION_ID, categoryId: 1, name: 'Laptops', createdAt: now() },
    { id: 3, organizationId: MOCK_ORGANIZATION_ID, categoryId: 2, name: 'Beverages', createdAt: now() },
    { id: 4, organizationId: MOCK_ORGANIZATION_ID, categoryId: 3, name: 'Men', createdAt: now() },
    { id: 5, organizationId: MOCK_ORGANIZATION_ID, categoryId: 3, name: 'Women', createdAt: now() },
    // Retail
    { id: 101, organizationId: 'org_002', categoryId: 101, name: 'Earbuds & Headphones', createdAt: now() },
    { id: 102, organizationId: 'org_002', categoryId: 101, name: 'Cables & Chargers', createdAt: now() },
    { id: 103, organizationId: 'org_002', categoryId: 102, name: 'Smartphones', createdAt: now() },
    // Salon
    { id: 201, organizationId: 'org_003', categoryId: 201, name: 'Shampoo', createdAt: now() },
    { id: 202, organizationId: 'org_003', categoryId: 202, name: 'Face Care', createdAt: now() },
    // Restaurant
    { id: 301, organizationId: 'org_004', categoryId: 301, name: 'North Indian', createdAt: now() },
    { id: 302, organizationId: 'org_004', categoryId: 301, name: 'South Indian', createdAt: now() },
    { id: 303, organizationId: 'org_004', categoryId: 302, name: 'Hot Beverages', createdAt: now() },
    // Healthcare
    { id: 401, organizationId: 'org_005', categoryId: 401, name: 'Tablets', createdAt: now() },
    { id: 402, organizationId: 'org_005', categoryId: 401, name: 'Syrups', createdAt: now() },
    // Gym
    { id: 501, organizationId: 'org_006', categoryId: 501, name: 'Whey Protein', createdAt: now() },
    { id: 502, organizationId: 'org_006', categoryId: 502, name: 'Gym Wear', createdAt: now() },
];

let branchesData: Branch[] = [
    { id: 1, organizationId: MOCK_ORGANIZATION_ID, name: 'Main Branch', location: 'Chennai', createdAt: now(), isActive: true },
    { id: 2, organizationId: MOCK_ORGANIZATION_ID, name: 'Branch 2', location: 'Coimbatore', createdAt: now(), isActive: false },
    { id: 101, organizationId: 'org_002', name: 'Main Store', location: 'Bangalore MG Road', createdAt: now(), isActive: true },
    { id: 201, organizationId: 'org_003', name: 'Salon - Jubilee Hills', location: 'Hyderabad', createdAt: now(), isActive: true },
    { id: 301, organizationId: 'org_004', name: 'Main Kitchen', location: 'Kochi MG Road', createdAt: now(), isActive: true },
    { id: 401, organizationId: 'org_005', name: 'Clinic & Pharmacy', location: 'Chennai T Nagar', createdAt: now(), isActive: true },
    { id: 501, organizationId: 'org_006', name: 'Main Gym', location: 'Pune Hinjewadi', createdAt: now(), isActive: true },
];

let taxRatesData: TaxRate[] = [
    { id: 1, organizationId: MOCK_ORGANIZATION_ID, name: 'GST 5%', rate: 5, type: 'exclusive', createdAt: now() },
    { id: 2, organizationId: MOCK_ORGANIZATION_ID, name: 'GST 12%', rate: 12, type: 'exclusive', createdAt: now() },
    { id: 3, organizationId: MOCK_ORGANIZATION_ID, name: 'GST 18%', rate: 18, type: 'exclusive', createdAt: now() },
    { id: 4, organizationId: MOCK_ORGANIZATION_ID, name: 'GST 28%', rate: 28, type: 'exclusive', createdAt: now() },
    { id: 5, organizationId: MOCK_ORGANIZATION_ID, name: 'No Tax', rate: 0, type: 'exclusive', createdAt: now() },
];

let warrantiesData: Warranty[] = [
    { id: 1, organizationId: MOCK_ORGANIZATION_ID, name: '6 Months', duration: 6, durationUnit: 'months', createdAt: now() },
    { id: 2, organizationId: MOCK_ORGANIZATION_ID, name: '1 Year', duration: 1, durationUnit: 'years', createdAt: now() },
    { id: 3, organizationId: MOCK_ORGANIZATION_ID, name: '2 Years', duration: 2, durationUnit: 'years', createdAt: now() },
];

let inventoryProductsData: InventoryProduct[] = [
    // ── ISP (org_001) ──
    { id: 1, organizationId: MOCK_ORGANIZATION_ID, name: 'Samsung Galaxy S24', sku: 'SAM-S24-001', categoryId: 1, categoryCode: 'ELEC', subCategoryId: 1, branchId: 1, unitId: 1, stockAlert: 10, taxType: 'exclusive', taxRateId: 3, warrantyId: 2, description: 'Samsung Galaxy S24 Ultra', price: 79999, currentStock: 25, variants: [{ id: 1, variantName: '128GB Black', price: 79999, taxType: 'exclusive', skuId: 'SAM-S24-128B', warrantyId: 2, currentStock: 15 }, { id: 2, variantName: '256GB Silver', price: 89999, taxType: 'exclusive', skuId: 'SAM-S24-256S', warrantyId: 2, currentStock: 10 }], isActive: true, createdAt: now() },
    { id: 2, organizationId: MOCK_ORGANIZATION_ID, name: 'Organic Green Tea', sku: 'TEA-GRN-001', categoryId: 2, categoryCode: 'GROC', subCategoryId: 3, branchId: 1, unitId: 5, stockAlert: 50, taxType: 'inclusive', taxRateId: 1, description: 'Premium organic green tea - 100 bags', price: 299, currentStock: 120, variants: [], isActive: true, createdAt: now() },
    { id: 3, organizationId: MOCK_ORGANIZATION_ID, name: 'TP-Link Archer AX73', sku: 'TPL-AX73-001', categoryId: 1, categoryCode: 'ELEC', subCategoryId: 2, branchId: 1, unitId: 1, stockAlert: 5, taxType: 'exclusive', taxRateId: 3, warrantyId: 3, description: 'AX5400 Dual-Band Wi-Fi 6 Router', price: 8999, currentStock: 18, variants: [], isActive: true, createdAt: now() },
    { id: 4, organizationId: MOCK_ORGANIZATION_ID, name: 'Internet Basic 50 Mbps', sku: 'PLN-INT-050', categoryId: 1, categoryCode: 'ELEC', branchId: 1, unitId: 1, stockAlert: 0, taxType: 'exclusive', taxRateId: 3, productType: 'service', description: 'Basic internet plan - 50 Mbps unlimited', price: 499, variants: [], isActive: true, createdAt: now() },
    { id: 5, organizationId: MOCK_ORGANIZATION_ID, name: 'Internet Pro 100 Mbps', sku: 'PLN-INT-100', categoryId: 1, categoryCode: 'ELEC', branchId: 1, unitId: 1, stockAlert: 0, taxType: 'exclusive', taxRateId: 3, productType: 'service', description: 'Pro internet plan - 100 Mbps unlimited', price: 799, variants: [], isActive: true, createdAt: now() },
    { id: 6, organizationId: MOCK_ORGANIZATION_ID, name: 'Cable TV Basic', sku: 'PLN-CBL-BAS', categoryId: 1, categoryCode: 'ELEC', branchId: 1, unitId: 1, stockAlert: 0, taxType: 'inclusive', taxRateId: 2, productType: 'service', description: 'Basic cable TV - 200+ channels', price: 250, variants: [], isActive: true, createdAt: now() },

    // ── Retail (org_002) ──
    { id: 1001, organizationId: 'org_002', name: 'Wireless Earbuds Pro', sku: 'RET-EAR-001', categoryId: 101, categoryCode: 'ACCS', subCategoryId: 101, branchId: 101, unitId: 1, stockAlert: 20, taxType: 'exclusive', taxRateId: 3, warrantyId: 1, description: 'Bluetooth 5.3 wireless earbuds with ANC', price: 1899, currentStock: 150, variants: [{ id: 1, variantName: 'Black', price: 1899, taxType: 'exclusive', skuId: 'RET-EAR-BLK', currentStock: 80 }, { id: 2, variantName: 'White', price: 1899, taxType: 'exclusive', skuId: 'RET-EAR-WHT', currentStock: 70 }], isActive: true, createdAt: now() },
    { id: 1002, organizationId: 'org_002', name: 'USB-C Fast Charger 65W', sku: 'RET-CHG-001', categoryId: 101, categoryCode: 'ACCS', subCategoryId: 102, branchId: 101, unitId: 1, stockAlert: 30, taxType: 'exclusive', taxRateId: 3, warrantyId: 1, description: 'GaN 65W fast charger with USB-C', price: 1299, currentStock: 200, variants: [], isActive: true, createdAt: now() },
    { id: 1003, organizationId: 'org_002', name: 'Phone Case Premium', sku: 'RET-CSE-001', categoryId: 101, categoryCode: 'ACCS', branchId: 101, unitId: 1, stockAlert: 50, taxType: 'exclusive', taxRateId: 3, description: 'Shockproof premium phone case', price: 349, currentStock: 500, variants: [{ id: 1, variantName: 'iPhone 15', price: 349, taxType: 'exclusive', skuId: 'RET-CSE-IP15', currentStock: 200 }, { id: 2, variantName: 'Samsung S24', price: 349, taxType: 'exclusive', skuId: 'RET-CSE-S24', currentStock: 180 }, { id: 3, variantName: 'OnePlus 12', price: 299, taxType: 'exclusive', skuId: 'RET-CSE-OP12', currentStock: 120 }], isActive: true, createdAt: now() },
    { id: 1004, organizationId: 'org_002', name: 'Laptop Stand Adjustable', sku: 'RET-LST-001', categoryId: 102, categoryCode: 'ELEC', branchId: 101, unitId: 1, stockAlert: 10, taxType: 'exclusive', taxRateId: 3, description: 'Aluminum adjustable laptop stand', price: 1599, currentStock: 45, variants: [], isActive: true, createdAt: now() },
    { id: 1005, organizationId: 'org_002', name: 'Screen Guard Tempered', sku: 'RET-SG-001', categoryId: 101, categoryCode: 'ACCS', branchId: 101, unitId: 1, stockAlert: 100, taxType: 'exclusive', taxRateId: 3, description: '9H tempered glass screen protector', price: 199, currentStock: 800, variants: [], isActive: true, createdAt: now() },

    // ── Salon & Spa (org_003) ──
    { id: 2001, organizationId: 'org_003', name: 'L\'Oreal Hair Serum', sku: 'SAL-SRM-001', categoryId: 201, categoryCode: 'HAIR', subCategoryId: 201, branchId: 201, unitId: 1, stockAlert: 10, taxType: 'exclusive', taxRateId: 3, description: 'Professional hair serum 100ml', price: 650, currentStock: 35, variants: [], isActive: true, createdAt: now() },
    { id: 2002, organizationId: 'org_003', name: 'Keratin Shampoo 500ml', sku: 'SAL-SHP-001', categoryId: 201, categoryCode: 'HAIR', subCategoryId: 201, branchId: 201, unitId: 1, stockAlert: 15, taxType: 'exclusive', taxRateId: 3, description: 'Professional keratin shampoo', price: 890, currentStock: 40, variants: [], isActive: true, createdAt: now() },
    { id: 2003, organizationId: 'org_003', name: 'Facial Cream Gold', sku: 'SAL-FC-001', categoryId: 202, categoryCode: 'SKIN', subCategoryId: 202, branchId: 201, unitId: 1, stockAlert: 8, taxType: 'exclusive', taxRateId: 3, description: 'Gold facial treatment cream 200g', price: 1200, currentStock: 20, variants: [], isActive: true, createdAt: now() },
    { id: 2004, organizationId: 'org_003', name: 'Hair Cut & Style', sku: 'SAL-HC-001', categoryId: 203, categoryCode: 'SRVS', branchId: 201, unitId: 7, stockAlert: 0, taxType: 'exclusive', taxRateId: 3, productType: 'service', description: 'Professional haircut and styling', price: 500, variants: [{ id: 1, variantName: 'Men', price: 300, taxType: 'exclusive', skuId: 'SAL-HC-M' }, { id: 2, variantName: 'Women', price: 500, taxType: 'exclusive', skuId: 'SAL-HC-W' }], isActive: true, createdAt: now() },
    { id: 2005, organizationId: 'org_003', name: 'Full Body Spa', sku: 'SAL-SPA-001', categoryId: 203, categoryCode: 'SRVS', branchId: 201, unitId: 7, stockAlert: 0, taxType: 'exclusive', taxRateId: 3, productType: 'service', description: 'Relaxation full body spa treatment 90 min', price: 2500, variants: [], isActive: true, createdAt: now() },

    // ── Restaurant (org_004) ──
    { id: 3001, organizationId: 'org_004', name: 'Butter Chicken', sku: 'RST-BC-001', categoryId: 301, categoryCode: 'MAIN', subCategoryId: 301, branchId: 301, unitId: 6, stockAlert: 0, taxType: 'inclusive', taxRateId: 1, description: 'Classic North Indian butter chicken', price: 350, variants: [{ id: 1, variantName: 'Half', price: 200, taxType: 'inclusive', skuId: 'RST-BC-H' }, { id: 2, variantName: 'Full', price: 350, taxType: 'inclusive', skuId: 'RST-BC-F' }], isActive: true, createdAt: now() },
    { id: 3002, organizationId: 'org_004', name: 'Hyderabadi Biryani', sku: 'RST-BIR-001', categoryId: 301, categoryCode: 'MAIN', subCategoryId: 301, branchId: 301, unitId: 6, stockAlert: 0, taxType: 'inclusive', taxRateId: 1, description: 'Authentic Hyderabadi dum biryani', price: 300, variants: [{ id: 1, variantName: 'Veg', price: 250, taxType: 'inclusive', skuId: 'RST-BIR-V' }, { id: 2, variantName: 'Chicken', price: 300, taxType: 'inclusive', skuId: 'RST-BIR-C' }, { id: 3, variantName: 'Mutton', price: 400, taxType: 'inclusive', skuId: 'RST-BIR-M' }], isActive: true, createdAt: now() },
    { id: 3003, organizationId: 'org_004', name: 'Masala Dosa', sku: 'RST-MD-001', categoryId: 301, categoryCode: 'MAIN', subCategoryId: 302, branchId: 301, unitId: 6, stockAlert: 0, taxType: 'inclusive', taxRateId: 1, description: 'Crispy South Indian masala dosa with sambar', price: 120, variants: [], isActive: true, createdAt: now() },
    { id: 3004, organizationId: 'org_004', name: 'Filter Coffee', sku: 'RST-COF-001', categoryId: 302, categoryCode: 'BVRG', subCategoryId: 303, branchId: 301, unitId: 6, stockAlert: 0, taxType: 'inclusive', taxRateId: 1, description: 'Traditional South Indian filter coffee', price: 60, variants: [], isActive: true, createdAt: now() },
    { id: 3005, organizationId: 'org_004', name: 'Paneer Tikka', sku: 'RST-PT-001', categoryId: 303, categoryCode: 'STRT', branchId: 301, unitId: 6, stockAlert: 0, taxType: 'inclusive', taxRateId: 1, description: 'Grilled paneer tikka with mint chutney', price: 220, variants: [], isActive: true, createdAt: now() },
    { id: 3006, organizationId: 'org_004', name: 'Fresh Lime Soda', sku: 'RST-FLS-001', categoryId: 302, categoryCode: 'BVRG', branchId: 301, unitId: 6, stockAlert: 0, taxType: 'inclusive', taxRateId: 1, description: 'Fresh lime soda sweet/salt', price: 50, variants: [], isActive: true, createdAt: now() },

    // ── Healthcare / Pharmacy (org_005) ──
    { id: 4001, organizationId: 'org_005', name: 'Paracetamol 500mg', sku: 'MED-PCM-500', categoryId: 401, categoryCode: 'MEDS', subCategoryId: 401, branchId: 401, unitId: 8, stockAlert: 100, taxType: 'exclusive', taxRateId: 2, description: 'Paracetamol 500mg (strip of 10)', price: 30, currentStock: 500, variants: [], isActive: true, createdAt: now() },
    { id: 4002, organizationId: 'org_005', name: 'Amoxicillin 250mg', sku: 'MED-AMX-250', categoryId: 401, categoryCode: 'MEDS', subCategoryId: 401, branchId: 401, unitId: 8, stockAlert: 50, taxType: 'exclusive', taxRateId: 2, description: 'Amoxicillin 250mg (strip of 10)', price: 85, currentStock: 200, variants: [], isActive: true, createdAt: now() },
    { id: 4003, organizationId: 'org_005', name: 'Digital BP Monitor', sku: 'MED-BPM-001', categoryId: 402, categoryCode: 'MSUP', branchId: 401, unitId: 1, stockAlert: 5, taxType: 'exclusive', taxRateId: 2, warrantyId: 2, description: 'Omron digital blood pressure monitor', price: 2500, currentStock: 15, variants: [], isActive: true, createdAt: now() },
    { id: 4004, organizationId: 'org_005', name: 'Cough Syrup 100ml', sku: 'MED-CSY-100', categoryId: 401, categoryCode: 'MEDS', subCategoryId: 402, branchId: 401, unitId: 1, stockAlert: 30, taxType: 'exclusive', taxRateId: 2, description: 'Non-drowsy cough syrup 100ml', price: 120, currentStock: 80, variants: [], isActive: true, createdAt: now() },
    { id: 4005, organizationId: 'org_005', name: 'Complete Blood Panel', sku: 'LAB-CBC-001', categoryId: 403, categoryCode: 'LABS', branchId: 401, unitId: 7, stockAlert: 0, taxType: 'exclusive', taxRateId: 5, productType: 'service', description: 'Complete blood count test', price: 600, variants: [], isActive: true, createdAt: now() },

    // ── Gym / Fitness (org_006) ──
    { id: 5001, organizationId: 'org_006', name: 'Whey Protein 1kg', sku: 'GYM-WP-001', categoryId: 501, categoryCode: 'SUPP', subCategoryId: 501, branchId: 501, unitId: 1, stockAlert: 10, taxType: 'exclusive', taxRateId: 3, description: 'Gold standard whey protein isolate 1kg', price: 2499, currentStock: 40, variants: [{ id: 1, variantName: 'Chocolate', price: 2499, taxType: 'exclusive', skuId: 'GYM-WP-CHO', currentStock: 20 }, { id: 2, variantName: 'Vanilla', price: 2499, taxType: 'exclusive', skuId: 'GYM-WP-VAN', currentStock: 20 }], isActive: true, createdAt: now() },
    { id: 5002, organizationId: 'org_006', name: 'BCAA Supplement', sku: 'GYM-BCAA-001', categoryId: 501, categoryCode: 'SUPP', branchId: 501, unitId: 1, stockAlert: 15, taxType: 'exclusive', taxRateId: 3, description: 'BCAA 2:1:1 ratio, 30 servings', price: 999, currentStock: 60, variants: [], isActive: true, createdAt: now() },
    { id: 5003, organizationId: 'org_006', name: 'Gym T-Shirt Dri-Fit', sku: 'GYM-TSH-001', categoryId: 502, categoryCode: 'MERCH', subCategoryId: 502, branchId: 501, unitId: 1, stockAlert: 20, taxType: 'exclusive', taxRateId: 1, description: 'Moisture-wicking gym t-shirt', price: 699, currentStock: 100, variants: [{ id: 1, variantName: 'M - Black', price: 699, taxType: 'exclusive', skuId: 'GYM-TSH-MB', currentStock: 30 }, { id: 2, variantName: 'L - Black', price: 699, taxType: 'exclusive', skuId: 'GYM-TSH-LB', currentStock: 35 }, { id: 3, variantName: 'XL - Grey', price: 749, taxType: 'exclusive', skuId: 'GYM-TSH-XLG', currentStock: 35 }], isActive: true, createdAt: now() },
    { id: 5004, organizationId: 'org_006', name: 'Shaker Bottle 700ml', sku: 'GYM-SHK-001', categoryId: 502, categoryCode: 'MERCH', branchId: 501, unitId: 1, stockAlert: 25, taxType: 'exclusive', taxRateId: 3, description: 'Leak-proof protein shaker bottle', price: 299, currentStock: 75, variants: [], isActive: true, createdAt: now() },
    { id: 5005, organizationId: 'org_006', name: 'Monthly Membership', sku: 'GYM-MEM-MO', categoryId: 503, categoryCode: 'MEMB', branchId: 501, unitId: 7, stockAlert: 0, taxType: 'exclusive', taxRateId: 3, productType: 'service', description: 'Monthly gym access membership', price: 999, variants: [], isActive: true, createdAt: now() },
    { id: 5006, organizationId: 'org_006', name: 'Annual Membership', sku: 'GYM-MEM-AN', categoryId: 503, categoryCode: 'MEMB', branchId: 501, unitId: 7, stockAlert: 0, taxType: 'exclusive', taxRateId: 3, productType: 'service', description: 'Annual gym membership with locker', price: 7999, variants: [], isActive: true, createdAt: now() },
];

// ===== Helper for ID generation =====
const nextId = <T extends { id: number }>(arr: T[]) => Math.max(...arr.map((x) => x.id), 0) + 1;

// ===== Units API =====
export const unitsApi = {
    getAll: async (): Promise<Unit[]> => Promise.resolve([...unitsData]),
    create: async (unit: Omit<Unit, 'id' | 'createdAt'>): Promise<Unit> => {
        const newUnit: Unit = { ...unit, organizationId: unit.organizationId ?? MOCK_ORGANIZATION_ID, id: nextId(unitsData), createdAt: new Date().toISOString() };
        unitsData.push(newUnit);
        return Promise.resolve(newUnit);
    },
    update: async (id: number, unit: Partial<Unit>): Promise<Unit> => {
        const i = unitsData.findIndex((u) => u.id === id);
        if (i === -1) throw new Error('Unit not found');
        unitsData[i] = { ...unitsData[i], ...unit };
        return Promise.resolve(unitsData[i]);
    },
    delete: async (id: number): Promise<void> => {
        unitsData = unitsData.filter((u) => u.id !== id);
    },
};

// ===== Categories API =====
export const categoriesApi = {
    getAll: async (): Promise<Category[]> => Promise.resolve([...categoriesData]),
    create: async (cat: Omit<Category, 'id' | 'createdAt'>): Promise<Category> => {
        const newCat: Category = { ...cat, organizationId: cat.organizationId ?? MOCK_ORGANIZATION_ID, id: nextId(categoriesData), createdAt: new Date().toISOString() };
        categoriesData.push(newCat);
        return Promise.resolve(newCat);
    },
    update: async (id: number, cat: Partial<Category>): Promise<Category> => {
        const i = categoriesData.findIndex((c) => c.id === id);
        if (i === -1) throw new Error('Category not found');
        categoriesData[i] = { ...categoriesData[i], ...cat };
        return Promise.resolve(categoriesData[i]);
    },
    delete: async (id: number): Promise<void> => {
        categoriesData = categoriesData.filter((c) => c.id !== id);
    },
};

// ===== SubCategories API =====
export const subCategoriesApi = {
    getAll: async (): Promise<SubCategory[]> => Promise.resolve([...subCategoriesData]),
    getByCategoryId: async (categoryId: number): Promise<SubCategory[]> => Promise.resolve(subCategoriesData.filter((s) => s.categoryId === categoryId)),
    create: async (sub: Omit<SubCategory, 'id' | 'createdAt'>): Promise<SubCategory> => {
        const newSub: SubCategory = { ...sub, organizationId: sub.organizationId ?? MOCK_ORGANIZATION_ID, id: nextId(subCategoriesData), createdAt: new Date().toISOString() };
        subCategoriesData.push(newSub);
        return Promise.resolve(newSub);
    },
    delete: async (id: number): Promise<void> => {
        subCategoriesData = subCategoriesData.filter((s) => s.id !== id);
    },
};

// ===== Branches API =====
export const branchesApi = {
    getAll: async (): Promise<Branch[]> => Promise.resolve([...branchesData]),
    create: async (branch: Omit<Branch, 'id' | 'createdAt'>): Promise<Branch> => {
        const newBranch: Branch = { ...branch, organizationId: branch.organizationId ?? MOCK_ORGANIZATION_ID, id: nextId(branchesData), createdAt: new Date().toISOString() };
        branchesData.push(newBranch);
        return Promise.resolve(newBranch);
    },
    update: async (id: number, branch: Partial<Branch>): Promise<Branch> => {
        const i = branchesData.findIndex((b) => b.id === id);
        if (i === -1) throw new Error('Branch not found');
        branchesData[i] = { ...branchesData[i], ...branch };
        return Promise.resolve(branchesData[i]);
    },
    delete: async (id: number): Promise<void> => {
        branchesData = branchesData.filter((b) => b.id !== id);
    },
};

// ===== Tax Rates API =====
export const taxRatesApi = {
    getAll: async (): Promise<TaxRate[]> => Promise.resolve([...taxRatesData]),
    create: async (tax: Omit<TaxRate, 'id' | 'createdAt'>): Promise<TaxRate> => {
        const newTax: TaxRate = { ...tax, organizationId: tax.organizationId ?? MOCK_ORGANIZATION_ID, id: nextId(taxRatesData), createdAt: new Date().toISOString() };
        taxRatesData.push(newTax);
        return Promise.resolve(newTax);
    },
    update: async (id: number, tax: Partial<TaxRate>): Promise<TaxRate> => {
        const i = taxRatesData.findIndex((t) => t.id === id);
        if (i === -1) throw new Error('Tax Rate not found');
        taxRatesData[i] = { ...taxRatesData[i], ...tax };
        return Promise.resolve(taxRatesData[i]);
    },
    delete: async (id: number): Promise<void> => {
        taxRatesData = taxRatesData.filter((t) => t.id !== id);
    },
};

// ===== Warranties API =====
export const warrantiesApi = {
    getAll: async (): Promise<Warranty[]> => Promise.resolve([...warrantiesData]),
    create: async (w: Omit<Warranty, 'id' | 'createdAt'>): Promise<Warranty> => {
        const newW: Warranty = { ...w, organizationId: w.organizationId ?? MOCK_ORGANIZATION_ID, id: nextId(warrantiesData), createdAt: new Date().toISOString() };
        warrantiesData.push(newW);
        return Promise.resolve(newW);
    },
    delete: async (id: number): Promise<void> => {
        warrantiesData = warrantiesData.filter((w) => w.id !== id);
    },
};

// ===== Inventory Products API =====
export const inventoryProductsApi = {
    getAll: async (): Promise<InventoryProduct[]> => {
        if (useMockApi()) {
            return Promise.resolve([...inventoryProductsData]);
        }
        return inventoryResource.list<InventoryProduct>({ catalogType: 'product' });
    },

    getById: async (id: number): Promise<InventoryProduct> => {
        if (useMockApi()) {
            const product = inventoryProductsData.find((p) => p.id === id);
            if (!product) throw new Error('Product not found');
            return Promise.resolve(product);
        }
        return inventoryResource.get<InventoryProduct>(id);
    },

    create: async (product: Omit<InventoryProduct, 'id' | 'createdAt'>): Promise<InventoryProduct> => {
        if (useMockApi()) {
            const newProduct: InventoryProduct = {
                ...product,
                organizationId: product.organizationId ?? MOCK_ORGANIZATION_ID,
                id: nextId(inventoryProductsData),
                createdAt: new Date().toISOString(),
            };
            inventoryProductsData.push(newProduct);
            return Promise.resolve(newProduct);
        }
        return inventoryResource.create<InventoryProduct>({ catalogType: 'product', ...product });
    },

    update: async (id: number, product: Partial<InventoryProduct>): Promise<InventoryProduct> => {
        if (useMockApi()) {
            const i = inventoryProductsData.findIndex((p) => p.id === id);
            if (i === -1) throw new Error('Product not found');
            inventoryProductsData[i] = { ...inventoryProductsData[i], ...product };
            return Promise.resolve(inventoryProductsData[i]);
        }
        return inventoryResource.update<InventoryProduct>(id, { ...product });
    },

    delete: async (id: number): Promise<void> => {
        if (useMockApi()) {
            inventoryProductsData = inventoryProductsData.filter((p) => p.id !== id);
            return;
        }
        await inventoryResource.remove(id);
    },

    importBulk: async (products: Omit<InventoryProduct, 'id' | 'createdAt'>[]): Promise<InventoryProduct[]> => {
        if (useMockApi()) {
            const created = products.map((p, i) => ({
                ...p,
                organizationId: p.organizationId ?? MOCK_ORGANIZATION_ID,
                id: nextId(inventoryProductsData) + i,
                createdAt: new Date().toISOString(),
            }));
            inventoryProductsData.push(...created);
            return Promise.resolve(created);
        }
        const created: InventoryProduct[] = [];
        for (const p of products) {
            created.push(await inventoryResource.create<InventoryProduct>({ catalogType: 'product', ...p }));
        }
        return created;
    },
};
