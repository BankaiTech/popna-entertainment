import type { IndustryType, ModuleKey, SettingsTabKey } from '@/models/types';

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
  },
];

/** Get an industry template by its ID */
export function getTemplateById(id: IndustryType): IndustryTemplate | undefined {
  return INDUSTRY_TEMPLATES.find((t) => t.id === id);
}
