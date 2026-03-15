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

/**
 * MODULE GUIDE (what each module does — helps avoid confusion):
 *
 *  dashboard          — KPI overview cards + charts
 *  contacts           — Customers / subscribers / clients / patients (CRM base)
 *  invoices           — Sales invoices (billing customers)
 *  purchase-invoices  — Supplier/vendor bills received
 *  purchase-orders    — Formal purchase orders sent to suppliers
 *  quotations         — Estimates/proposals sent to customers before invoicing
 *  payments           — ISP-ONLY: bulk payment collection from subscribers (field collection)
 *  subscriptions      — Recurring billing plans / memberships
 *  inventory-products — Physical goods + services inventory (SKU, stock, variants, barcode)
 *  products           — ISP-ONLY: service connection types (Cable TV, Fiber) with billing cutoff config
 *  pos                — Point-of-sale counter billing (walk-in customers, barcode scan, thermal print)
 *  expenses           — Operational expense tracking (rent, salary, utilities, etc.)
 *  complaints         — Customer complaint / ticket management
 *  service-requests   — Technician / field service job management (different from complaints)
 *  connection-requests— ISP-ONLY: new connection applications from prospective subscribers
 *  appointments       — Scheduled bookings / sessions / reservations
 *  crm-leads          — Sales pipeline: leads → prospects → won deals
 *  branches           — Multi-location / branch management
 *  users              — Staff accounts, roles, permissions
 *  settings           — Company profile, billing config, products, POS settings
 *  reports            — Business analytics and downloadable reports
 *  audit-trail        — Action log for compliance and accountability
 */

export const INDUSTRY_TEMPLATES: IndustryTemplate[] = [

  // ─────────────────────────────────────────────────────────────────────────────
  // ISP / CABLE TV
  // Unique modules: payments (field collection), products (service types), connection-requests
  // Excluded: quotations (ISPs don't quote), crm-leads (direct subscriptions), appointments
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'isp-cable',
    labelKey: 'industry.ispCable',
    icon: 'Wifi',
    descriptionKey: 'industry.ispCableDesc',
    enabledModules: [
      'dashboard',
      'contacts',           // Subscribers
      'connection-requests',// New connection applications
      'complaints',         // Technical support tickets
      'payments',           // Bulk field payment collection from subscribers
      'invoices',           // Monthly bills
      'purchase-invoices',  // Hardware/equipment bills from vendors
      'inventory-products', // Modems, STBs, routers, cables (physical stock)
      'products',           // ISP service types: Cable TV, Fiber Internet (with cutoff config)
      'subscriptions',      // Recurring billing plan management
      'service-requests',   // Field technician dispatch for fault resolution
      'expenses',           // Operational costs
      'branches',           // Zones / service areas / offices
      'users',
      'settings',
      'reports',
      'audit-trail',
    ],
    // POS excluded: ISPs don't typically have walk-in counters for billing
    enabledSettingsTabs: ['company', 'products', 'billing', 'custom-fields'],
    terminology: {
      customer: 'Subscriber',
      contact: 'Subscribers',
      complaint: 'Ticket',
      connectionType: 'Service Plan',
      subscription: 'Plans',
      serviceRequest: 'Fault Report',
    },
    defaultCategories: ['Modems', 'Cables', 'Set-Top Boxes', 'Routers', 'Splitters'],
    color: 'blue',
    dashboardWidgets: ['revenue', 'contacts', 'complaints', 'pendingInvoices'],
    contactConfig: {
      listColumns: ['id', 'name', 'mobile', 'email', 'connectionType', 'package', 'stbNumber', 'canCafId', 'cin', 'area', 'status', 'paymentStatus'],
      form: { showPlanTab: true, showIspFields: true, showLoyaltyCredit: false },
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // RETAIL STORE
  // Buys stock from suppliers, sells at counter via POS
  // Excluded: appointments, subscriptions, crm-leads, complaints, service-requests, payments, products, connection-requests
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'retail',
    labelKey: 'industry.retail',
    icon: 'Store',
    descriptionKey: 'industry.retailDesc',
    enabledModules: [
      'dashboard',
      'contacts',           // Customers (loyalty, credit)
      'invoices',           // Sales bills
      'purchase-invoices',  // Supplier bills
      'purchase-orders',    // Stock replenishment orders to suppliers
      'quotations',         // Custom order quotes
      'inventory-products', // Product catalogue + stock management
      'pos',                // Walk-in counter billing with barcode
      'expenses',           // Store operating costs
      'branches',           // Multiple store locations
      'users',
      'settings',
      'reports',
      'audit-trail',
    ],
    enabledSettingsTabs: ['company', 'products', 'billing', 'pos', 'custom-fields'],
    terminology: { complaint: 'Return/Refund' },
    defaultCategories: ['General', 'Electronics', 'Clothing', 'Accessories', 'Stationery'],
    color: 'emerald',
    dashboardWidgets: ['revenue', 'contacts', 'lowStock', 'todaySales'],
    inventoryConfig: { batchExpiry: false },
    contactConfig: {
      listColumns: ['id', 'name', 'mobile', 'email', 'status', 'paymentStatus', 'creditLimit', 'loyaltyPoints'],
      form: { showPlanTab: false, showIspFields: false, showLoyaltyCredit: true },
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // WHOLESALE / DISTRIBUTION
  // B2B — large volume, formal POs, dealer/distributor network
  // Excluded: POS (counter billing rare in wholesale), appointments (B2B leads handled via CRM)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'wholesale',
    labelKey: 'industry.wholesale',
    icon: 'Warehouse',
    descriptionKey: 'industry.wholesaleDesc',
    enabledModules: [
      'dashboard',
      'contacts',           // Dealers, distributors, retailers
      'invoices',           // Sales invoices (B2B)
      'purchase-invoices',  // Manufacturer / supplier bills
      'purchase-orders',    // Bulk orders to manufacturers
      'quotations',         // Price quotations for bulk buyers
      'inventory-products', // Warehouse stock management
      'crm-leads',          // New dealer/distributor pipeline
      'expenses',           // Warehouse / logistics costs
      'branches',           // Warehouses / regional offices
      'users',
      'settings',
      'reports',
      'audit-trail',
    ],
    // No POS (wholesale counter billing unusual), no appointments, no subscriptions
    enabledSettingsTabs: ['company', 'products', 'billing', 'custom-fields'],
    terminology: { customer: 'Dealer', contact: 'Dealers', lead: 'Prospects' },
    defaultCategories: ['Bulk Items', 'Packaged Goods', 'Raw Materials', 'Industrial'],
    color: 'amber',
    contactConfig: {
      listColumns: ['id', 'name', 'mobile', 'email', 'status', 'paymentStatus', 'creditLimit'],
      form: { showPlanTab: false, showIspFields: false, showLoyaltyCredit: true },
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // RESTAURANT / CAFÉ
  // Food service — menu items as inventory, table reservations, ingredient orders
  // Excluded: subscriptions (rare), quotations, crm-leads, service-requests
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'restaurant-cafe',
    labelKey: 'industry.restaurantCafe',
    icon: 'UtensilsCrossed',
    descriptionKey: 'industry.restaurantCafeDesc',
    enabledModules: [
      'dashboard',
      'contacts',           // Regular guests (loyalty program)
      'invoices',           // Table / takeaway bills
      'purchase-invoices',  // Ingredient / supplier bills
      'purchase-orders',    // Daily / weekly ingredient orders
      'inventory-products', // Menu items + ingredients stock
      'pos',                // Table-side / counter billing
      'appointments',       // Table reservations
      'complaints',         // Customer feedback / complaints
      'expenses',           // Operational costs (rent, utilities, wages)
      'branches',           // Multiple outlets
      'users',
      'settings',
      'reports',
      'audit-trail',
    ],
    enabledSettingsTabs: ['company', 'products', 'billing', 'pos'],
    terminology: {
      customer: 'Guest',
      contact: 'Guests',
      appointment: 'Reservation',
      product: 'Menu Item',
      complaint: 'Feedback',
    },
    defaultCategories: ['Starters', 'Main Course', 'Beverages', 'Desserts', 'Specials'],
    color: 'orange',
    dashboardWidgets: ['revenue', 'appointments', 'todaySales', 'contacts'],
    contactConfig: {
      listColumns: ['id', 'name', 'mobile', 'email', 'status', 'paymentStatus', 'loyaltyPoints'],
      form: { showPlanTab: false, showIspFields: false, showLoyaltyCredit: true },
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // SALON / SPA
  // Service-based with product retail; memberships, client bookings
  // Excluded: purchase-orders (buy small quantities), branches (usually single location), quotations
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'salon-spa',
    labelKey: 'industry.salonSpa',
    icon: 'Scissors',
    descriptionKey: 'industry.salonSpaDesc',
    enabledModules: [
      'dashboard',
      'contacts',           // Clients
      'invoices',           // Service + product sales bills
      'purchase-invoices',  // Product supplier bills (shampoos, dyes, spa supplies)
      'inventory-products', // Salon products (used in services + retail sales)
      'pos',                // Walk-in / appointment checkout
      'appointments',       // Bookings / sessions
      'subscriptions',      // Memberships (monthly/annual packages)
      'crm-leads',          // New client acquisition
      'expenses',           // Rent, staff, supplies
      'users',
      'settings',
      'reports',
      'audit-trail',
    ],
    enabledSettingsTabs: ['company', 'products', 'billing', 'pos', 'custom-fields'],
    terminology: {
      customer: 'Client',
      contact: 'Clients',
      appointment: 'Booking',
      product: 'Service / Treatment',
      subscription: 'Membership',
    },
    defaultCategories: ['Hair Services', 'Skin Care', 'Spa Treatments', 'Nail Care', 'Retail Products'],
    color: 'pink',
    dashboardWidgets: ['appointments', 'revenue', 'contacts', 'todaySales'],
    contactConfig: {
      listColumns: ['id', 'name', 'mobile', 'email', 'status', 'paymentStatus', 'loyaltyPoints'],
      form: { showPlanTab: false, showIspFields: false, showLoyaltyCredit: true },
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // GROCERY / SUPERMARKET
  // High-volume FMCG — expiry tracking, fast POS, daily purchase orders
  // Excluded: quotations, crm-leads, appointments, service-requests, subscriptions, complaints
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'grocery',
    labelKey: 'industry.grocery',
    icon: 'ShoppingBasket',
    descriptionKey: 'industry.groceryDesc',
    enabledModules: [
      'dashboard',
      'contacts',           // Regular customers (credit accounts, loyalty)
      'invoices',           // Customer bills
      'purchase-invoices',  // Supplier bills
      'purchase-orders',    // Daily / weekly stock orders
      'inventory-products', // Product catalogue + expiry / batch tracking
      'pos',                // Fast barcode billing at counter
      'expenses',           // Shop operating costs
      'branches',           // Multiple stores
      'users',
      'settings',
      'reports',
      'audit-trail',
    ],
    enabledSettingsTabs: ['company', 'products', 'billing', 'pos'],
    terminology: {},
    defaultCategories: ['Fruits & Vegetables', 'Dairy', 'Staples', 'Snacks', 'Beverages', 'Personal Care'],
    color: 'green',
    dashboardWidgets: ['revenue', 'lowStock', 'expiringSoon', 'todaySales'],
    inventoryConfig: { batchExpiry: true },
    contactConfig: {
      listColumns: ['id', 'name', 'mobile', 'email', 'status', 'paymentStatus', 'creditLimit'],
      form: { showPlanTab: false, showIspFields: false, showLoyaltyCredit: true },
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // ELECTRONICS STORE
  // Sells + repairs: warranty claims, service jobs, quotations for bulk orders
  // Excluded: appointments, subscriptions, crm-leads, connection-requests, payments
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'electronics',
    labelKey: 'industry.electronics',
    icon: 'Cpu',
    descriptionKey: 'industry.electronicsDesc',
    enabledModules: [
      'dashboard',
      'contacts',           // Customers
      'complaints',         // Warranty claims / defect reports
      'invoices',           // Sales bills
      'purchase-invoices',  // Supplier bills
      'purchase-orders',    // Stock orders from distributors
      'quotations',         // Bulk / project quotes
      'inventory-products', // Products catalogue + stock
      'service-requests',   // Repair job management
      'pos',                // Walk-in billing
      'expenses',           // Store operating costs
      'branches',           // Multiple stores
      'users',
      'settings',
      'reports',
      'audit-trail',
    ],
    enabledSettingsTabs: ['company', 'products', 'billing', 'pos', 'custom-fields'],
    terminology: { complaint: 'Warranty Claim', serviceRequest: 'Repair Job' },
    defaultCategories: ['Mobiles', 'Laptops', 'Accessories', 'Components', 'Peripherals', 'Home Appliances'],
    color: 'cyan',
    contactConfig: {
      listColumns: ['id', 'name', 'mobile', 'email', 'status', 'paymentStatus', 'creditLimit'],
      form: { showPlanTab: false, showIspFields: false, showLoyaltyCredit: true },
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // CLOTHING / FASHION
  // Retail garments with size/colour variants; custom tailoring via quotations
  // Excluded: complaints (handled as returns at POS), appointments, subscriptions, crm-leads
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'clothing-fashion',
    labelKey: 'industry.clothingFashion',
    icon: 'Shirt',
    descriptionKey: 'industry.clothingFashionDesc',
    enabledModules: [
      'dashboard',
      'contacts',           // Customers (loyalty)
      'invoices',           // Sales bills
      'purchase-invoices',  // Supplier / manufacturer bills
      'purchase-orders',    // Season stock orders
      'quotations',         // Custom tailoring estimates
      'inventory-products', // Garments + variants (size, colour)
      'pos',                // Walk-in billing
      'expenses',           // Store costs
      'branches',           // Multiple outlets
      'users',
      'settings',
      'reports',
      'audit-trail',
    ],
    enabledSettingsTabs: ['company', 'products', 'billing', 'pos'],
    terminology: { complaint: 'Return / Alteration' },
    defaultCategories: ['Men', 'Women', 'Kids', 'Accessories', 'Footwear', 'Ethnic Wear'],
    color: 'violet',
    contactConfig: {
      listColumns: ['id', 'name', 'mobile', 'email', 'status', 'paymentStatus', 'loyaltyPoints'],
      form: { showPlanTab: false, showIspFields: false, showLoyaltyCredit: true },
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // HEALTHCARE / PHARMACY
  // Medicines + consultations; batch/expiry critical; health packages as subscriptions
  // Excluded: quotations, crm-leads (patients don't come through a sales pipeline)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'healthcare-pharmacy',
    labelKey: 'industry.healthcarePharmacy',
    icon: 'Heart',
    descriptionKey: 'industry.healthcarePharmacyDesc',
    enabledModules: [
      'dashboard',
      'contacts',           // Patients
      'invoices',           // Medicine sales / consultation billing
      'purchase-invoices',  // Distributor bills for medicines
      'purchase-orders',    // Medicine reorder from distributors
      'inventory-products', // Medicines + devices (batch, expiry mandatory)
      'pos',                // Pharmacy counter billing
      'appointments',       // Doctor consultations / check-up schedules
      'service-requests',   // Home care / treatment follow-up requests
      'subscriptions',      // Health packages (annual health check, chronic care plans)
      'expenses',           // Clinic / pharmacy operational costs
      'branches',           // Multiple pharmacy locations
      'users',
      'settings',
      'reports',
      'audit-trail',
    ],
    enabledSettingsTabs: ['company', 'products', 'billing', 'pos', 'custom-fields'],
    terminology: {
      customer: 'Patient',
      contact: 'Patients',
      appointment: 'Consultation',
      serviceRequest: 'Treatment Request',
      subscription: 'Health Package',
    },
    defaultCategories: ['Prescription Medicines', 'OTC Medicines', 'Medical Devices', 'Supplements', 'Personal Care'],
    color: 'red',
    dashboardWidgets: ['expiringSoon', 'appointments', 'revenue', 'lowStock'],
    inventoryConfig: { batchExpiry: true },
    contactConfig: {
      listColumns: ['id', 'name', 'mobile', 'email', 'status', 'paymentStatus', 'creditLimit'],
      form: { showPlanTab: false, showIspFields: false, showLoyaltyCredit: true },
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // GYM / FITNESS CENTER
  // Membership-driven; trainer sessions, supplement retail
  // Excluded: purchase-orders (buy in small lots), branches (usually 1 gym), quotations
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'gym-fitness',
    labelKey: 'industry.gymFitness',
    icon: 'Dumbbell',
    descriptionKey: 'industry.gymFitnessDesc',
    enabledModules: [
      'dashboard',
      'contacts',           // Members
      'invoices',           // Membership + product sales bills
      'purchase-invoices',  // Equipment / supplement supplier bills
      'inventory-products', // Supplements, merchandise, equipment
      'pos',                // Counter billing for supplements / merchandise
      'appointments',       // Trainer sessions / group classes
      'subscriptions',      // Monthly / annual memberships
      'crm-leads',          // Prospective member pipeline
      'expenses',           // Rent, equipment maintenance, staff
      'users',
      'settings',
      'reports',
      'audit-trail',
    ],
    enabledSettingsTabs: ['company', 'products', 'billing', 'pos', 'custom-fields'],
    terminology: {
      customer: 'Member',
      contact: 'Members',
      subscription: 'Membership',
      appointment: 'Session',
      lead: 'Prospect',
    },
    defaultCategories: ['Supplements', 'Equipment', 'Apparel', 'Accessories'],
    color: 'lime',
    dashboardWidgets: ['revenue', 'appointments', 'contacts', 'pendingInvoices'],
    contactConfig: {
      listColumns: ['id', 'name', 'mobile', 'email', 'status', 'paymentStatus', 'loyaltyPoints'],
      form: { showPlanTab: false, showIspFields: false, showLoyaltyCredit: true },
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // REAL ESTATE
  // Pure service; no physical inventory; CRM-heavy; proposal-driven
  // Excluded: POS, inventory, purchase-invoices, purchase-orders, service-requests, subscriptions
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'real-estate',
    labelKey: 'industry.realEstate',
    icon: 'Building',
    descriptionKey: 'industry.realEstateDesc',
    enabledModules: [
      'dashboard',
      'contacts',           // Buyers, sellers, tenants
      'invoices',           // Commission / sale / rent invoices
      'quotations',         // Property proposals / term sheets
      'crm-leads',          // Property prospects pipeline
      'appointments',       // Site visits / meetings
      'complaints',         // Tenant / buyer grievances
      'expenses',           // Marketing, admin, travel costs
      'users',
      'settings',
      'reports',
      'audit-trail',
    ],
    enabledSettingsTabs: ['company', 'billing', 'custom-fields'],
    terminology: {
      customer: 'Client',
      contact: 'Clients',
      quotation: 'Proposal',
      lead: 'Prospect',
      appointment: 'Site Visit',
      complaint: 'Grievance',
    },
    defaultCategories: ['Residential', 'Commercial', 'Land / Plot', 'Rental'],
    color: 'teal',
    contactConfig: {
      listColumns: ['id', 'name', 'mobile', 'email', 'status', 'paymentStatus', 'creditLimit'],
      form: { showPlanTab: false, showIspFields: false, showLoyaltyCredit: false },
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // EDUCATION / COACHING
  // Tuition / coaching center; course fees, class schedules
  // Excluded: POS, purchase-orders, quotations, crm-leads, service-requests, complaints (rare)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'education',
    labelKey: 'industry.education',
    icon: 'GraduationCap',
    descriptionKey: 'industry.educationDesc',
    enabledModules: [
      'dashboard',
      'contacts',           // Students
      'invoices',           // Fee bills
      'purchase-invoices',  // Books / stationery / equipment from suppliers
      'inventory-products', // Books, stationery, uniforms sold to students
      'pos',                // Counter sale of books / stationery
      'appointments',       // Class schedules / parent-teacher meetings
      'subscriptions',      // Course enrollments / term fees
      'expenses',           // Rent, staff salary, utilities
      'users',
      'settings',
      'reports',
      'audit-trail',
    ],
    enabledSettingsTabs: ['company', 'billing', 'custom-fields'],
    terminology: {
      customer: 'Student',
      contact: 'Students',
      subscription: 'Enrollment',
      appointment: 'Class / Session',
    },
    defaultCategories: ['Courses', 'Books', 'Stationery', 'Uniforms', 'Equipment'],
    color: 'indigo',
    contactConfig: {
      listColumns: ['id', 'name', 'mobile', 'email', 'status', 'paymentStatus'],
      form: { showPlanTab: false, showIspFields: false, showLoyaltyCredit: false },
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // AUTOMOTIVE (Car Service / Workshop)
  // Repairs + spare parts; job cards, service bookings, repair estimates
  // Excluded: subscriptions (rare), crm-leads (walk-in driven), connection-requests, payments
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'automotive',
    labelKey: 'industry.automotive',
    icon: 'Car',
    descriptionKey: 'industry.automotiveDesc',
    enabledModules: [
      'dashboard',
      'contacts',           // Vehicle owners
      'complaints',         // Vehicle defect reports
      'invoices',           // Service + parts bills
      'purchase-invoices',  // Parts / consumables supplier bills
      'purchase-orders',    // Spare parts orders
      'quotations',         // Repair estimates / work orders
      'inventory-products', // Spare parts + consumables stock
      'service-requests',   // Job cards (active repair work)
      'appointments',       // Service booking slots
      'pos',                // Walk-in billing / cash payments
      'expenses',           // Workshop operating costs
      'branches',           // Multiple workshops / service centers
      'users',
      'settings',
      'reports',
      'audit-trail',
    ],
    enabledSettingsTabs: ['company', 'products', 'billing', 'pos', 'custom-fields'],
    terminology: {
      customer: 'Vehicle Owner',
      contact: 'Vehicle Owners',
      serviceRequest: 'Job Card',
      appointment: 'Service Booking',
      complaint: 'Vehicle Complaint',
    },
    defaultCategories: ['Spare Parts', 'Oils & Fluids', 'Tyres', 'Batteries', 'Accessories', 'Body Parts'],
    color: 'slate',
    contactConfig: {
      listColumns: ['id', 'name', 'mobile', 'email', 'status', 'paymentStatus', 'creditLimit'],
      form: { showPlanTab: false, showIspFields: false, showLoyaltyCredit: true },
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // PROFESSIONAL SERVICES (CA / Law / Consulting / Agency)
  // Pure service; retainers, proposals, client meetings, no physical goods
  // Excluded: POS, inventory, purchase-invoices, purchase-orders, complaints, connection-requests
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'professional-services',
    labelKey: 'industry.professionalServices',
    icon: 'Briefcase',
    descriptionKey: 'industry.professionalServicesDesc',
    enabledModules: [
      'dashboard',
      'contacts',           // Clients
      'invoices',           // Service billing / retainer invoices
      'quotations',         // Project proposals / scope of work
      'crm-leads',          // New business pipeline
      'appointments',       // Client meetings / consultations
      'subscriptions',      // Retainer contracts (monthly / annual)
      'expenses',           // Office and travel expenses
      'users',
      'settings',
      'reports',
      'audit-trail',
    ],
    enabledSettingsTabs: ['company', 'billing', 'custom-fields'],
    terminology: {
      customer: 'Client',
      contact: 'Clients',
      quotation: 'Proposal',
      appointment: 'Meeting',
      subscription: 'Retainer',
      lead: 'Prospect',
    },
    defaultCategories: ['Consulting', 'Legal', 'Accounting', 'Design', 'IT Services'],
    color: 'sky',
    contactConfig: {
      listColumns: ['id', 'name', 'mobile', 'email', 'status', 'paymentStatus', 'creditLimit'],
      form: { showPlanTab: false, showIspFields: false, showLoyaltyCredit: false },
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // GENERAL (all modules — for testing, custom businesses, or initial setup)
  // When super admin hasn't assigned an industry yet.
  // ─────────────────────────────────────────────────────────────────────────────
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

/** Default contact config when template has none */
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
