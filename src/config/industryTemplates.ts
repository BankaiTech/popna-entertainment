import type { IndustryType, ModuleKey, SettingsTabKey } from '@/models/types';

/** Dashboard widget keys for industry-specific KPIs */
export type DashboardWidgetKey = 'revenue' | 'contacts' | 'lowStock' | 'complaints' | 'appointments' | 'expiringSoon' | 'pendingInvoices' | 'todaySales';

/** Contact list column keys – used to show/hide columns per industry */
export type ContactListColumnKey =
  | 'id' | 'name' | 'mobile' | 'email' | 'connectionType' | 'package'
  | 'stbNumber' | 'canCafId' | 'cin' | 'area' | 'status' | 'paymentStatus'
  | 'creditLimit' | 'loyaltyPoints';

/** Contact form/sheet visibility per industry */
export interface ContactFormConfig {
  /** Show Plan tab (connection type, package, ISP-style fields) */
  showPlanTab: boolean;
  /** Show ISP-specific fields: box, STB, CAN/CAF, CIN, area, connection type, package */
  showIspFields: boolean;
  /** Show credit limit & loyalty points in More tab */
  showLoyaltyCredit: boolean;
}

export interface IndustryTemplate {
  id: IndustryType;
  labelKey: string;
  icon: string; // lucide-react icon name
  descriptionKey: string;
  enabledModules: ModuleKey[];
  enabledSettingsTabs: SettingsTabKey[];
  terminology: Record<string, string>;
  defaultCategories: string[];
  color: string; // tailwind color name
  /** Widgets to show on dashboard (order matters) */
  dashboardWidgets?: DashboardWidgetKey[];
  /** Inventory: show batch/expiry columns when true */
  inventoryConfig?: { batchExpiry?: boolean };
  /** Contact list columns and add/edit form visibility */
  contactConfig?: {
    listColumns: ContactListColumnKey[];
    form: ContactFormConfig;
  };
}

export const INDUSTRY_TEMPLATES: IndustryTemplate[] = [
  {
    id: 'isp-cable',
    labelKey: 'industry.ispCable',
    icon: 'Wifi',
    descriptionKey: 'industry.ispCableDesc',
    enabledModules: [
      'dashboard', 'contacts', 'complaints', 'payments', 'invoices',
      'purchase-invoices', 'users', 'settings', 'connection-requests',
      'inventory-products', 'products', 'branches', 'pos',
      'service-requests', 'subscriptions', 'reports', 'audit-trail',
    ],
    enabledSettingsTabs: ['company', 'products', 'billing', 'pos'],
    terminology: { customer: 'Subscriber', complaint: 'Ticket', connectionType: 'Service Plan' },
    defaultCategories: ['Modems', 'Cables', 'Set-Top Boxes', 'Routers'],
    color: 'blue',
    dashboardWidgets: ['revenue', 'contacts', 'complaints', 'pendingInvoices'],
    contactConfig: {
      listColumns: ['id', 'name', 'mobile', 'email', 'connectionType', 'package', 'stbNumber', 'canCafId', 'cin', 'area', 'status', 'paymentStatus'],
      form: { showPlanTab: true, showIspFields: true, showLoyaltyCredit: false },
    },
  },
  {
    id: 'retail',
    labelKey: 'industry.retail',
    icon: 'Store',
    descriptionKey: 'industry.retailDesc',
    enabledModules: [
      'dashboard', 'contacts', 'invoices', 'purchase-invoices', 'users',
      'settings', 'inventory-products', 'branches', 'pos',
      'expenses', 'quotations', 'purchase-orders', 'reports', 'audit-trail',
    ],
    enabledSettingsTabs: ['company', 'products', 'billing', 'pos', 'custom-fields'],
    terminology: { complaint: 'Return' },
    defaultCategories: ['General', 'Electronics', 'Clothing', 'Accessories'],
    color: 'emerald',
    dashboardWidgets: ['revenue', 'contacts', 'lowStock', 'todaySales'],
    inventoryConfig: { batchExpiry: false },
    contactConfig: {
      listColumns: ['id', 'name', 'mobile', 'email', 'status', 'paymentStatus', 'creditLimit', 'loyaltyPoints'],
      form: { showPlanTab: false, showIspFields: false, showLoyaltyCredit: true },
    },
  },
  {
    id: 'wholesale',
    labelKey: 'industry.wholesale',
    icon: 'Warehouse',
    descriptionKey: 'industry.wholesaleDesc',
    enabledModules: [
      'dashboard', 'contacts', 'invoices', 'purchase-invoices', 'users',
      'settings', 'inventory-products', 'branches',
      'expenses', 'quotations', 'purchase-orders', 'crm-leads', 'reports', 'audit-trail',
    ],
    enabledSettingsTabs: ['company', 'products', 'billing', 'custom-fields'],
    terminology: { customer: 'Dealer' },
    defaultCategories: ['Bulk Items', 'Packaged Goods', 'Raw Materials'],
    color: 'amber',
    contactConfig: {
      listColumns: ['id', 'name', 'mobile', 'email', 'status', 'paymentStatus', 'creditLimit'],
      form: { showPlanTab: false, showIspFields: false, showLoyaltyCredit: true },
    },
  },
  {
    id: 'restaurant-cafe',
    labelKey: 'industry.restaurantCafe',
    icon: 'UtensilsCrossed',
    descriptionKey: 'industry.restaurantCafeDesc',
    enabledModules: [
      'dashboard', 'contacts', 'invoices', 'users', 'settings',
      'inventory-products', 'branches', 'pos',
      'expenses', 'appointments', 'reports', 'audit-trail',
    ],
    enabledSettingsTabs: ['company', 'products', 'billing', 'pos'],
    terminology: { customer: 'Guest', appointment: 'Reservation', product: 'Menu Item' },
    defaultCategories: ['Starters', 'Main Course', 'Beverages', 'Desserts'],
    color: 'orange',
    dashboardWidgets: ['revenue', 'appointments', 'todaySales', 'contacts'],
    contactConfig: {
      listColumns: ['id', 'name', 'mobile', 'email', 'status', 'paymentStatus', 'loyaltyPoints'],
      form: { showPlanTab: false, showIspFields: false, showLoyaltyCredit: true },
    },
  },
  {
    id: 'salon-spa',
    labelKey: 'industry.salonSpa',
    icon: 'Scissors',
    descriptionKey: 'industry.salonSpaDesc',
    enabledModules: [
      'dashboard', 'contacts', 'invoices', 'users', 'settings',
      'inventory-products', 'pos',
      'expenses', 'appointments', 'subscriptions', 'crm-leads', 'reports', 'audit-trail',
    ],
    enabledSettingsTabs: ['company', 'products', 'billing', 'pos', 'custom-fields'],
    terminology: { customer: 'Client', appointment: 'Booking', product: 'Service' },
    defaultCategories: ['Hair Care', 'Skin Care', 'Spa Treatments', 'Retail Products'],
    color: 'pink',
    dashboardWidgets: ['appointments', 'revenue', 'contacts', 'todaySales'],
    contactConfig: {
      listColumns: ['id', 'name', 'mobile', 'email', 'status', 'paymentStatus', 'loyaltyPoints'],
      form: { showPlanTab: false, showIspFields: false, showLoyaltyCredit: true },
    },
  },
  {
    id: 'grocery',
    labelKey: 'industry.grocery',
    icon: 'ShoppingBasket',
    descriptionKey: 'industry.groceryDesc',
    enabledModules: [
      'dashboard', 'contacts', 'invoices', 'purchase-invoices', 'users',
      'settings', 'inventory-products', 'branches', 'pos',
      'expenses', 'purchase-orders', 'reports', 'audit-trail',
    ],
    enabledSettingsTabs: ['company', 'products', 'billing', 'pos'],
    terminology: {},
    defaultCategories: ['Fruits & Vegetables', 'Dairy', 'Snacks', 'Beverages', 'Staples'],
    color: 'green',
    dashboardWidgets: ['revenue', 'lowStock', 'expiringSoon', 'todaySales'],
    inventoryConfig: { batchExpiry: true },
    contactConfig: {
      listColumns: ['id', 'name', 'mobile', 'email', 'status', 'paymentStatus', 'creditLimit'],
      form: { showPlanTab: false, showIspFields: false, showLoyaltyCredit: true },
    },
  },
  {
    id: 'electronics',
    labelKey: 'industry.electronics',
    icon: 'Cpu',
    descriptionKey: 'industry.electronicsDesc',
    enabledModules: [
      'dashboard', 'contacts', 'complaints', 'invoices', 'purchase-invoices',
      'users', 'settings', 'inventory-products', 'branches', 'pos',
      'expenses', 'quotations', 'purchase-orders', 'service-requests', 'reports', 'audit-trail',
    ],
    enabledSettingsTabs: ['company', 'products', 'billing', 'pos', 'custom-fields'],
    terminology: { complaint: 'Warranty Claim' },
    defaultCategories: ['Mobiles', 'Laptops', 'Accessories', 'Components', 'Peripherals'],
    color: 'cyan',
    contactConfig: {
      listColumns: ['id', 'name', 'mobile', 'email', 'status', 'paymentStatus', 'creditLimit'],
      form: { showPlanTab: false, showIspFields: false, showLoyaltyCredit: true },
    },
  },
  {
    id: 'clothing-fashion',
    labelKey: 'industry.clothingFashion',
    icon: 'Shirt',
    descriptionKey: 'industry.clothingFashionDesc',
    enabledModules: [
      'dashboard', 'contacts', 'invoices', 'purchase-invoices', 'users',
      'settings', 'inventory-products', 'branches', 'pos',
      'expenses', 'quotations', 'purchase-orders', 'reports', 'audit-trail',
    ],
    enabledSettingsTabs: ['company', 'products', 'billing', 'pos'],
    terminology: {},
    defaultCategories: ['Men', 'Women', 'Kids', 'Accessories', 'Footwear'],
    color: 'violet',
    contactConfig: {
      listColumns: ['id', 'name', 'mobile', 'email', 'status', 'paymentStatus', 'loyaltyPoints'],
      form: { showPlanTab: false, showIspFields: false, showLoyaltyCredit: true },
    },
  },
  {
    id: 'healthcare-pharmacy',
    labelKey: 'industry.healthcarePharmacy',
    icon: 'Heart',
    descriptionKey: 'industry.healthcarePharmacyDesc',
    enabledModules: [
      'dashboard', 'contacts', 'invoices', 'users', 'settings',
      'inventory-products', 'branches', 'pos',
      'expenses', 'appointments', 'subscriptions', 'service-requests', 'reports', 'audit-trail',
    ],
    enabledSettingsTabs: ['company', 'products', 'billing', 'pos', 'custom-fields'],
    terminology: { customer: 'Patient', appointment: 'Consultation' },
    defaultCategories: ['Medicines', 'Medical Devices', 'Supplements', 'Personal Care'],
    color: 'red',
    dashboardWidgets: ['expiringSoon', 'appointments', 'revenue', 'lowStock', 'contacts'],
    inventoryConfig: { batchExpiry: true },
    contactConfig: {
      listColumns: ['id', 'name', 'mobile', 'email', 'status', 'paymentStatus', 'creditLimit'],
      form: { showPlanTab: false, showIspFields: false, showLoyaltyCredit: true },
    },
  },
  {
    id: 'gym-fitness',
    labelKey: 'industry.gymFitness',
    icon: 'Dumbbell',
    descriptionKey: 'industry.gymFitnessDesc',
    enabledModules: [
      'dashboard', 'contacts', 'invoices', 'users', 'settings',
      'inventory-products', 'pos',
      'expenses', 'appointments', 'subscriptions', 'crm-leads', 'reports', 'audit-trail',
    ],
    enabledSettingsTabs: ['company', 'products', 'billing', 'pos', 'custom-fields'],
    terminology: { customer: 'Member', subscription: 'Membership', appointment: 'Session' },
    defaultCategories: ['Supplements', 'Equipment', 'Apparel', 'Accessories'],
    color: 'lime',
    contactConfig: {
      listColumns: ['id', 'name', 'mobile', 'email', 'status', 'paymentStatus', 'loyaltyPoints'],
      form: { showPlanTab: false, showIspFields: false, showLoyaltyCredit: true },
    },
  },
  {
    id: 'real-estate',
    labelKey: 'industry.realEstate',
    icon: 'Building',
    descriptionKey: 'industry.realEstateDesc',
    enabledModules: [
      'dashboard', 'contacts', 'invoices', 'users', 'settings',
      'expenses', 'quotations', 'crm-leads', 'appointments', 'reports', 'audit-trail',
    ],
    enabledSettingsTabs: ['company', 'billing', 'custom-fields'],
    terminology: { customer: 'Client', quotation: 'Proposal', lead: 'Prospect' },
    defaultCategories: ['Residential', 'Commercial', 'Land', 'Rental'],
    color: 'teal',
    contactConfig: {
      listColumns: ['id', 'name', 'mobile', 'email', 'status', 'paymentStatus', 'creditLimit'],
      form: { showPlanTab: false, showIspFields: false, showLoyaltyCredit: true },
    },
  },
  {
    id: 'education',
    labelKey: 'industry.education',
    icon: 'GraduationCap',
    descriptionKey: 'industry.educationDesc',
    enabledModules: [
      'dashboard', 'contacts', 'invoices', 'users', 'settings',
      'expenses', 'subscriptions', 'appointments', 'reports', 'audit-trail',
    ],
    enabledSettingsTabs: ['company', 'billing', 'custom-fields'],
    terminology: { customer: 'Student', subscription: 'Enrollment', appointment: 'Class' },
    defaultCategories: ['Courses', 'Materials', 'Equipment'],
    color: 'indigo',
    contactConfig: {
      listColumns: ['id', 'name', 'mobile', 'email', 'status', 'paymentStatus'],
      form: { showPlanTab: false, showIspFields: false, showLoyaltyCredit: false },
    },
  },
  {
    id: 'automotive',
    labelKey: 'industry.automotive',
    icon: 'Car',
    descriptionKey: 'industry.automotiveDesc',
    enabledModules: [
      'dashboard', 'contacts', 'complaints', 'invoices', 'purchase-invoices',
      'users', 'settings', 'inventory-products', 'branches', 'pos',
      'expenses', 'quotations', 'purchase-orders', 'service-requests', 'appointments', 'reports', 'audit-trail',
    ],
    enabledSettingsTabs: ['company', 'products', 'billing', 'pos', 'custom-fields'],
    terminology: { customer: 'Vehicle Owner', serviceRequest: 'Job Card', appointment: 'Service Booking' },
    defaultCategories: ['Spare Parts', 'Oils & Fluids', 'Tires', 'Batteries', 'Accessories'],
    color: 'slate',
    contactConfig: {
      listColumns: ['id', 'name', 'mobile', 'email', 'status', 'paymentStatus', 'creditLimit'],
      form: { showPlanTab: false, showIspFields: false, showLoyaltyCredit: true },
    },
  },
  {
    id: 'professional-services',
    labelKey: 'industry.professionalServices',
    icon: 'Briefcase',
    descriptionKey: 'industry.professionalServicesDesc',
    enabledModules: [
      'dashboard', 'contacts', 'invoices', 'users', 'settings',
      'expenses', 'quotations', 'crm-leads', 'appointments', 'subscriptions', 'reports', 'audit-trail',
    ],
    enabledSettingsTabs: ['company', 'billing', 'custom-fields'],
    terminology: { customer: 'Client', quotation: 'Proposal' },
    defaultCategories: ['Consulting', 'Legal', 'Accounting', 'Design'],
    color: 'sky',
    contactConfig: {
      listColumns: ['id', 'name', 'mobile', 'email', 'status', 'paymentStatus', 'creditLimit'],
      form: { showPlanTab: false, showIspFields: false, showLoyaltyCredit: true },
    },
  },
  {
    id: 'general',
    labelKey: 'industry.general',
    icon: 'LayoutGrid',
    descriptionKey: 'industry.generalDesc',
    enabledModules: [
      'dashboard', 'contacts', 'complaints', 'payments', 'invoices',
      'purchase-invoices', 'users', 'settings', 'connection-requests',
      'inventory-products', 'products', 'branches', 'pos',
      'service-requests', 'expenses', 'quotations', 'purchase-orders',
      'crm-leads', 'subscriptions', 'appointments', 'reports', 'audit-trail',
    ],
    enabledSettingsTabs: ['company', 'products', 'billing', 'pos', 'custom-fields', 'industry'],
    terminology: {},
    defaultCategories: ['General'],
    color: 'gray',
    contactConfig: {
      listColumns: ['id', 'name', 'mobile', 'email', 'connectionType', 'package', 'stbNumber', 'canCafId', 'cin', 'area', 'status', 'paymentStatus', 'creditLimit', 'loyaltyPoints'],
      form: { showPlanTab: true, showIspFields: true, showLoyaltyCredit: true },
    },
  },
];

/** Default contact config when template has none (e.g. general: all columns, all form sections) */
const DEFAULT_CONTACT_CONFIG: NonNullable<IndustryTemplate['contactConfig']> = {
  listColumns: ['id', 'name', 'mobile', 'email', 'connectionType', 'package', 'stbNumber', 'canCafId', 'cin', 'area', 'status', 'paymentStatus', 'creditLimit', 'loyaltyPoints'],
  form: { showPlanTab: true, showIspFields: true, showLoyaltyCredit: true },
};

/** Get an industry template by its ID */
export function getTemplateById(id: IndustryType): IndustryTemplate | undefined {
  return INDUSTRY_TEMPLATES.find((t) => t.id === id);
}

/** Get contact config for an industry (never undefined) */
export function getContactConfig(template: IndustryTemplate | undefined): NonNullable<IndustryTemplate['contactConfig']> {
  return template?.contactConfig ?? DEFAULT_CONTACT_CONFIG;
}
