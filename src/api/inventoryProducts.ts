import type { InventoryProduct, Category, SubCategory, Unit, Branch, TaxRate, Warranty } from '@/models/types';
import { MOCK_ORGANIZATION_ID } from '@/models/types';

// ===== Seed Data =====
let unitsData: Unit[] = [
    { id: 1, organizationId: MOCK_ORGANIZATION_ID, name: 'Pieces', shortName: 'Pc', createdAt: new Date().toISOString() },
    { id: 2, organizationId: MOCK_ORGANIZATION_ID, name: 'Kilogram', shortName: 'Kg', createdAt: new Date().toISOString() },
    { id: 3, organizationId: MOCK_ORGANIZATION_ID, name: 'Litre', shortName: 'L', createdAt: new Date().toISOString() },
    { id: 4, organizationId: MOCK_ORGANIZATION_ID, name: 'Meter', shortName: 'm', createdAt: new Date().toISOString() },
    { id: 5, organizationId: MOCK_ORGANIZATION_ID, name: 'Box', shortName: 'Box', createdAt: new Date().toISOString() },
];

let categoriesData: Category[] = [
    { id: 1, organizationId: MOCK_ORGANIZATION_ID, name: 'Electronics', code: 'ELEC', description: 'Electronic items', createdAt: new Date().toISOString() },
    { id: 2, organizationId: MOCK_ORGANIZATION_ID, name: 'Groceries', code: 'GROC', description: 'Grocery items', createdAt: new Date().toISOString() },
    { id: 3, organizationId: MOCK_ORGANIZATION_ID, name: 'Clothing', code: 'CLTH', description: 'Clothing & apparel', createdAt: new Date().toISOString() },
];

let subCategoriesData: SubCategory[] = [
    { id: 1, organizationId: MOCK_ORGANIZATION_ID, categoryId: 1, name: 'Mobile Phones', createdAt: new Date().toISOString() },
    { id: 2, organizationId: MOCK_ORGANIZATION_ID, categoryId: 1, name: 'Laptops', createdAt: new Date().toISOString() },
    { id: 3, organizationId: MOCK_ORGANIZATION_ID, categoryId: 2, name: 'Beverages', createdAt: new Date().toISOString() },
    { id: 4, organizationId: MOCK_ORGANIZATION_ID, categoryId: 3, name: 'Men', createdAt: new Date().toISOString() },
    { id: 5, organizationId: MOCK_ORGANIZATION_ID, categoryId: 3, name: 'Women', createdAt: new Date().toISOString() },
];

let branchesData: Branch[] = [
    { id: 1, organizationId: MOCK_ORGANIZATION_ID, name: 'Main Branch', location: 'Chennai', createdAt: new Date().toISOString(), isActive: true },
    { id: 2, organizationId: MOCK_ORGANIZATION_ID, name: 'Branch 2', location: 'Coimbatore', createdAt: new Date().toISOString(), isActive: false },
];

let taxRatesData: TaxRate[] = [
    { id: 1, organizationId: MOCK_ORGANIZATION_ID, name: 'GST 5%', rate: 5, type: 'exclusive', createdAt: new Date().toISOString() },
    { id: 2, organizationId: MOCK_ORGANIZATION_ID, name: 'GST 12%', rate: 12, type: 'exclusive', createdAt: new Date().toISOString() },
    { id: 3, organizationId: MOCK_ORGANIZATION_ID, name: 'GST 18%', rate: 18, type: 'exclusive', createdAt: new Date().toISOString() },
    { id: 4, organizationId: MOCK_ORGANIZATION_ID, name: 'GST 28%', rate: 28, type: 'exclusive', createdAt: new Date().toISOString() },
    { id: 5, organizationId: MOCK_ORGANIZATION_ID, name: 'No Tax', rate: 0, type: 'exclusive', createdAt: new Date().toISOString() },
];

let warrantiesData: Warranty[] = [
    { id: 1, organizationId: MOCK_ORGANIZATION_ID, name: '6 Months', duration: 6, durationUnit: 'months', createdAt: new Date().toISOString() },
    { id: 2, organizationId: MOCK_ORGANIZATION_ID, name: '1 Year', duration: 1, durationUnit: 'years', createdAt: new Date().toISOString() },
    { id: 3, organizationId: MOCK_ORGANIZATION_ID, name: '2 Years', duration: 2, durationUnit: 'years', createdAt: new Date().toISOString() },
];

let inventoryProductsData: InventoryProduct[] = [
    {
        id: 1, organizationId: MOCK_ORGANIZATION_ID, name: 'Samsung Galaxy S24', sku: 'SAM-S24-001',
        categoryId: 1, categoryCode: 'ELEC', subCategoryId: 1, branchId: 1, unitId: 1,
        stockAlert: 10, taxType: 'exclusive', taxRateId: 3, warrantyId: 2,
        description: 'Samsung Galaxy S24 Ultra', price: 79999, image: undefined, currentStock: 25,
        variants: [
            { id: 1, variantName: '128GB Black', price: 79999, taxType: 'exclusive', skuId: 'SAM-S24-128B', warrantyId: 2, currentStock: 15 },
            { id: 2, variantName: '256GB Silver', price: 89999, taxType: 'exclusive', skuId: 'SAM-S24-256S', warrantyId: 2, currentStock: 10 },
        ],
        isActive: true, createdAt: new Date().toISOString(),
    },
    {
        id: 2, organizationId: MOCK_ORGANIZATION_ID, name: 'Organic Green Tea', sku: 'TEA-GRN-001',
        categoryId: 2, categoryCode: 'GROC', subCategoryId: 3, branchId: 1, unitId: 5,
        stockAlert: 50, taxType: 'inclusive', taxRateId: 1, warrantyId: undefined,
        description: 'Premium organic green tea - 100 bags', price: 299, image: undefined, currentStock: 120,
        variants: [], isActive: true, createdAt: new Date().toISOString(),
    },
    {
        id: 3, organizationId: MOCK_ORGANIZATION_ID, name: 'TP-Link Archer AX73', sku: 'TPL-AX73-001',
        categoryId: 1, categoryCode: 'ELEC', subCategoryId: 2, branchId: 1, unitId: 1,
        stockAlert: 5, taxType: 'exclusive', taxRateId: 3, warrantyId: 3,
        description: 'AX5400 Dual-Band Wi-Fi 6 Router', price: 8999, image: undefined, currentStock: 18,
        variants: [], isActive: true, createdAt: new Date().toISOString(),
    },
    {
        id: 4, organizationId: MOCK_ORGANIZATION_ID, name: 'Internet Basic 50 Mbps', sku: 'PLN-INT-050',
        categoryId: 1, categoryCode: 'ELEC', subCategoryId: undefined, branchId: 1, unitId: 1,
        stockAlert: 0, taxType: 'exclusive', taxRateId: 3, warrantyId: undefined,
        productType: 'service',
        description: 'Basic internet plan - 50 Mbps unlimited', price: 499, image: undefined,
        variants: [], isActive: true, createdAt: new Date().toISOString(),
    },
    {
        id: 5, organizationId: MOCK_ORGANIZATION_ID, name: 'Internet Pro 100 Mbps', sku: 'PLN-INT-100',
        categoryId: 1, categoryCode: 'ELEC', subCategoryId: undefined, branchId: 1, unitId: 1,
        stockAlert: 0, taxType: 'exclusive', taxRateId: 3, warrantyId: undefined,
        productType: 'service',
        description: 'Pro internet plan - 100 Mbps unlimited with OTT bundle', price: 799, image: undefined,
        variants: [], isActive: true, createdAt: new Date().toISOString(),
    },
    {
        id: 6, organizationId: MOCK_ORGANIZATION_ID, name: 'Cable TV Basic', sku: 'PLN-CBL-BAS',
        categoryId: 1, categoryCode: 'ELEC', subCategoryId: undefined, branchId: 1, unitId: 1,
        stockAlert: 0, taxType: 'inclusive', taxRateId: 2, warrantyId: undefined,
        productType: 'service',
        description: 'Basic cable TV - 200+ channels', price: 250, image: undefined,
        variants: [], isActive: true, createdAt: new Date().toISOString(),
    },
    {
        id: 7, organizationId: MOCK_ORGANIZATION_ID, name: 'Men Casual T-Shirt', sku: 'CLT-TSH-001',
        categoryId: 3, categoryCode: 'CLTH', subCategoryId: 4, branchId: 1, unitId: 1,
        stockAlert: 20, taxType: 'exclusive', taxRateId: 1, warrantyId: undefined,
        description: 'Premium cotton casual t-shirt', price: 599, image: undefined, currentStock: 85,
        variants: [
            { id: 1, variantName: 'S - Black', price: 599, taxType: 'exclusive', skuId: 'CLT-TSH-SB', currentStock: 20 },
            { id: 2, variantName: 'M - Black', price: 599, taxType: 'exclusive', skuId: 'CLT-TSH-MB', currentStock: 25 },
            { id: 3, variantName: 'L - White', price: 649, taxType: 'exclusive', skuId: 'CLT-TSH-LW', currentStock: 15 },
            { id: 4, variantName: 'XL - Blue', price: 649, taxType: 'exclusive', skuId: 'CLT-TSH-XLB', currentStock: 25 },
        ],
        isActive: true, createdAt: new Date().toISOString(),
    },
    {
        id: 8, organizationId: MOCK_ORGANIZATION_ID, name: 'Basmati Rice Premium', sku: 'GRC-RIC-001',
        categoryId: 2, categoryCode: 'GROC', subCategoryId: 3, branchId: 1, unitId: 2,
        stockAlert: 100, taxType: 'inclusive', taxRateId: 5, warrantyId: undefined,
        description: 'Premium aged basmati rice - 5kg pack', price: 450, image: undefined, currentStock: 200,
        variants: [
            { id: 1, variantName: '1 Kg Pack', price: 120, taxType: 'inclusive', skuId: 'GRC-RIC-1K', currentStock: 80 },
            { id: 2, variantName: '5 Kg Pack', price: 450, taxType: 'inclusive', skuId: 'GRC-RIC-5K', currentStock: 120 },
        ],
        isActive: true, createdAt: new Date().toISOString(),
    },
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
    getAll: async (): Promise<InventoryProduct[]> => Promise.resolve([...inventoryProductsData]),

    getById: async (id: number): Promise<InventoryProduct> => {
        const product = inventoryProductsData.find((p) => p.id === id);
        if (!product) throw new Error('Product not found');
        return Promise.resolve(product);
    },

    create: async (product: Omit<InventoryProduct, 'id' | 'createdAt'>): Promise<InventoryProduct> => {
        const newProduct: InventoryProduct = {
            ...product,
            organizationId: product.organizationId ?? MOCK_ORGANIZATION_ID,
            id: nextId(inventoryProductsData),
            createdAt: new Date().toISOString(),
        };
        inventoryProductsData.push(newProduct);
        return Promise.resolve(newProduct);
    },

    update: async (id: number, product: Partial<InventoryProduct>): Promise<InventoryProduct> => {
        const i = inventoryProductsData.findIndex((p) => p.id === id);
        if (i === -1) throw new Error('Product not found');
        inventoryProductsData[i] = { ...inventoryProductsData[i], ...product };
        return Promise.resolve(inventoryProductsData[i]);
    },

    delete: async (id: number): Promise<void> => {
        inventoryProductsData = inventoryProductsData.filter((p) => p.id !== id);
    },

    importBulk: async (products: Omit<InventoryProduct, 'id' | 'createdAt'>[]): Promise<InventoryProduct[]> => {
        const created = products.map((p, i) => ({
            ...p,
            organizationId: p.organizationId ?? MOCK_ORGANIZATION_ID,
            id: nextId(inventoryProductsData) + i,
            createdAt: new Date().toISOString(),
        }));
        inventoryProductsData.push(...created);
        return Promise.resolve(created);
    },
};
