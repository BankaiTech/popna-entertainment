-- =============================================================================
-- Popna Entertainment — ISP Management Platform
-- PostgreSQL Schema Migration: 001_create_tables
-- =============================================================================
-- Tables: 26
--   1.  organizations
--   2.  branches           (defined early — referenced by users & contacts)
--   3.  users
--   4.  contacts           (unified: customers + suppliers + vendors)
--   5.  products           (ISP service categories — dynamic)
--   6.  plans
--   7.  complaints
--   8.  sales_invoices
--   9.  purchase_invoices
--  10.  connection_requests
--  11.  company_profile
--  12.  website_settings
--  13.  inventory_categories
--  14.  inventory_subcategories
--  15.  inventory_units
--  16.  inventory_tax_rates
--  17.  inventory_warranties
--  18.  inventory_products
--  19.  inventory_product_variants
--  20.  pos_transactions
--  21.  pos_transaction_items
--  22.  upi_payment_config
--  23.  superadmin_users
--  24.  signup_requests
--  25.  sms_config
--  26.  sms_logs
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TYPE organization_status     AS ENUM ('active', 'disabled', 'suspended');
CREATE TYPE user_role               AS ENUM ('admin', 'employee');
CREATE TYPE user_status             AS ENUM ('active', 'inactive');
CREATE TYPE contact_type            AS ENUM ('customer', 'supplier', 'vendor');
CREATE TYPE customer_status         AS ENUM ('Active', 'Inactive');
CREATE TYPE payment_status          AS ENUM ('paid', 'not_paid');
CREATE TYPE payment_method          AS ENUM ('cash', 'upi', 'card', 'other');
CREATE TYPE product_type            AS ENUM ('cable', 'internet');
CREATE TYPE complaint_status        AS ENUM ('active', 'on-hold', 'completed');
CREATE TYPE invoice_status          AS ENUM ('draft', 'sent', 'paid', 'overdue');
CREATE TYPE invoice_type            AS ENUM ('tax_invoice', 'bill_of_supply');
CREATE TYPE connection_req_status   AS ENUM ('New', 'Converted');
CREATE TYPE tax_type                AS ENUM ('inclusive', 'exclusive', 'none');
CREATE TYPE tax_rate_type           AS ENUM ('inclusive', 'exclusive');
CREATE TYPE inventory_product_type  AS ENUM ('physical', 'service', 'digital', 'bundle');
CREATE TYPE tracking_type           AS ENUM ('none', 'serial', 'batch');
CREATE TYPE weight_unit             AS ENUM ('g', 'kg', 'lb');
CREATE TYPE duration_unit           AS ENUM ('days', 'months', 'years');
CREATE TYPE pos_payment_method      AS ENUM ('cash', 'upi', 'card', 'bank_transfer', 'other');
CREATE TYPE pos_status              AS ENUM ('completed', 'refunded', 'voided');
CREATE TYPE superadmin_role         AS ENUM ('super_admin', 'manager');
CREATE TYPE sms_status              AS ENUM ('sent', 'failed', 'pending');

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 1: organizations
-- Multi-tenancy root. Every other table references this via organization_id.
-- allowed_modules controls sidebar visibility per tenant.
-- Valid ModuleKeys: dashboard | contacts | complaints | payments | invoices |
--   purchase-invoices | users | settings | connection-requests |
--   inventory-products | products | branches | pos
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE organizations (
    id                    VARCHAR(50)           PRIMARY KEY,          -- e.g. 'org_001'
    name                  VARCHAR(255)          NOT NULL,
    status                organization_status   NOT NULL DEFAULT 'active',
    allowed_modules       JSONB                 NOT NULL DEFAULT '[]', -- ModuleKey[]
    allowed_settings_tabs JSONB                 NOT NULL DEFAULT '[]', -- SettingsTabKey[]
    subscription_start    DATE                  NOT NULL,
    subscription_end      DATE                  NOT NULL,
    created_at            TIMESTAMP             NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMP             NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE organizations IS 'SaaS master table — root of all tenant data';
COMMENT ON COLUMN organizations.allowed_modules IS 'ModuleKey[]: dashboard|contacts|complaints|payments|invoices|purchase-invoices|users|settings|connection-requests|inventory-products|products|branches|pos';
COMMENT ON COLUMN organizations.allowed_settings_tabs IS 'SettingsTabKey[]: company|products|billing|pos';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 2: branches  (defined early — referenced by users and contacts)
-- Physical business branches/locations per organization.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE branches (
    id               SERIAL        PRIMARY KEY,
    organization_id  VARCHAR(50)   NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name             VARCHAR(255)  NOT NULL,
    location         VARCHAR(255),
    address          TEXT,                                              -- @deprecated: use structured fields below
    phone            VARCHAR(20),
    gstin            VARCHAR(20),                                      -- branch-level GSTIN
    address_line1    VARCHAR(255),
    address_line2    VARCHAR(255),
    city             VARCHAR(100),
    state            VARCHAR(100),
    country          VARCHAR(100)  DEFAULT 'India',
    pincode          VARCHAR(10),
    is_active        BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMP     NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, name)
);

CREATE INDEX idx_branches_org    ON branches(organization_id);
CREATE INDEX idx_branches_active ON branches(organization_id, is_active);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 3: users
-- Admin and Employee accounts for the management panel.
-- branch_id added here after branches table satisfies FK dependency.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE users (
    id               SERIAL        PRIMARY KEY,
    organization_id  VARCHAR(50)   NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name             VARCHAR(255)  NOT NULL,
    username         VARCHAR(100)  NOT NULL,
    password_hash    VARCHAR(255)  NOT NULL,                     -- bcrypt/argon2 hash
    role             user_role     NOT NULL DEFAULT 'employee',
    status           user_status   NOT NULL DEFAULT 'active',
    allowed_modules  JSONB         NOT NULL DEFAULT '[]',        -- ModuleKey[] for employee access control
    branch_id        INT           REFERENCES branches(id) ON DELETE SET NULL,
    created_at       TIMESTAMP     NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, username)                           -- username unique per org
);

CREATE INDEX idx_users_org    ON users(organization_id);
CREATE INDEX idx_users_role   ON users(organization_id, role);
CREATE INDEX idx_users_branch ON users(branch_id);

COMMENT ON TABLE users IS 'Admin/Employee accounts; password stored as bcrypt/argon2 hash — NEVER plain text';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 4: contacts
-- Unified contact table combining ISP customers, inventory suppliers, and vendors.
-- contact_type discriminates between the three roles.
--
--   'customer' — ISP subscriber account (UI: Contacts module)
--   'supplier' — Inventory/purchase supplier (UI: Suppliers in Inventory)
--   'vendor'   — Vendor for purchase invoicing (linked to purchase_invoices)
--
-- ISP-specific fields (used when contact_type = 'customer'):
--   connection_type, package, status, payment_*, box_number, stb_number,
--   can_caf_id, cin, area, permanent_discount, password_hash
--
-- Supplier/Vendor-specific fields (contact_type IN ('supplier','vendor')):
--   contact_person, tax_number, opening_balance
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE contacts (
    id                    SERIAL          PRIMARY KEY,
    organization_id       VARCHAR(50)     NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    contact_type          contact_type    NOT NULL DEFAULT 'customer',

    -- ── Common fields ────────────────────────────────────────────────────────
    name                  VARCHAR(255)    NOT NULL,
    email                 VARCHAR(255),
    mobile                VARCHAR(20)     NOT NULL,
    gstin                 VARCHAR(20),
    address_line1         VARCHAR(255),
    address_line2         VARCHAR(255),
    city                  VARCHAR(100),
    state                 VARCHAR(100),
    country               VARCHAR(100)    NOT NULL DEFAULT 'India',
    pincode               VARCHAR(10),
    additional_addresses  JSONB           DEFAULT '[]',           -- Address[] extra billing/delivery addresses

    -- ── Customer-specific (contact_type = 'customer') ────────────────────────
    password_hash         VARCHAR(255),                           -- customer portal login (bcrypt)
    connection_type       VARCHAR(100),                          -- ISP service category name (dynamic)
    package               VARCHAR(255),                          -- plan name
    status                customer_status,                       -- Active | Inactive (customers only)
    description           TEXT,
    -- Payment Collection
    payment_status        payment_status  DEFAULT 'not_paid',
    payment_description   TEXT,
    payment_updated_at    TIMESTAMP,
    payment_method        payment_method,
    collected_amount      DECIMAL(10,2)   DEFAULT 0,
    balance_amount        DECIMAL(10,2)   DEFAULT 0,
    collected_by_username VARCHAR(100),                          -- employee who collected
    -- Cable-specific identifiers
    box_number            VARCHAR(50),                           -- cable box number
    stb_number            VARCHAR(100),                          -- Set-Top Box / User ID
    can_caf_id            VARCHAR(100),                          -- CAN/CAF ID
    cin                   VARCHAR(100),                          -- Customer ID Number
    area                  VARCHAR(100),                          -- service area
    permanent_discount    DECIMAL(5,2)    DEFAULT 0,             -- permanent plan discount %
    branch_id             INT             REFERENCES branches(id) ON DELETE SET NULL,

    -- ── Supplier/Vendor-specific (contact_type IN ('supplier','vendor')) ─────
    contact_person        VARCHAR(255),                          -- primary contact name
    tax_number            VARCHAR(30),                           -- GSTIN or equivalent tax ID
    opening_balance       DECIMAL(12,2)   DEFAULT 0,            -- supplier opening balance

    created_at            TIMESTAMP       NOT NULL DEFAULT NOW(),

    -- Same mobile may not repeat within the same type in the same org
    UNIQUE (organization_id, contact_type, mobile)
);

CREATE INDEX idx_contacts_org      ON contacts(organization_id);
CREATE INDEX idx_contacts_type     ON contacts(organization_id, contact_type);
CREATE INDEX idx_contacts_status   ON contacts(organization_id, status);
CREATE INDEX idx_contacts_conn     ON contacts(organization_id, connection_type);
CREATE INDEX idx_contacts_payment  ON contacts(organization_id, payment_status);
CREATE INDEX idx_contacts_mobile   ON contacts(organization_id, mobile);
CREATE INDEX idx_contacts_branch   ON contacts(branch_id);

COMMENT ON TABLE contacts IS 'Unified contact table: ISP customers, inventory suppliers, and vendors in one place.';
COMMENT ON COLUMN contacts.contact_type IS 'customer = ISP subscriber | supplier = inventory supplier | vendor = purchase invoice vendor';
COMMENT ON COLUMN contacts.connection_type IS 'Customer only. Service category name — dynamic, not an FK.';
COMMENT ON COLUMN contacts.tax_number IS 'Supplier/Vendor only. GSTIN or equivalent tax registration number.';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 5: products
-- ISP service categories (e.g. "Cable", "Internet 1"). Fully dynamic.
-- Distinct from inventory_products (physical/digital goods for POS).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE products (
    id               SERIAL        PRIMARY KEY,
    organization_id  VARCHAR(50)   NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name             VARCHAR(100)  NOT NULL,
    product_type     product_type  NOT NULL,
    is_active        BOOLEAN       NOT NULL DEFAULT TRUE,
    cutoff_date      SMALLINT      CHECK (cutoff_date BETWEEN 1 AND 28),  -- cable: day of month
    cutoff_days      SMALLINT      CHECK (cutoff_days >= 0),              -- internet: days after due
    created_at       TIMESTAMP     NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, name)
);

CREATE INDEX idx_products_org    ON products(organization_id);
CREATE INDEX idx_products_active ON products(organization_id, is_active);

COMMENT ON TABLE products IS 'ISP service categories managed by admin. Not to be confused with inventory_products.';
COMMENT ON COLUMN products.cutoff_date IS 'Cable only: day of month for billing cut-off (1–28)';
COMMENT ON COLUMN products.cutoff_days IS 'Internet only: days after due date before service cut-off';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 6: plans
-- Subscription plans offered under each ISP service category.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE plans (
    id                    SERIAL          PRIMARY KEY,
    organization_id       VARCHAR(50)     NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    provider              VARCHAR(100)    NOT NULL,               -- maps to product/category name
    plan_name             VARCHAR(255)    NOT NULL,
    image_url             TEXT,
    price                 DECIMAL(10,2)   NOT NULL,               -- base price before GST
    gst_rate              DECIMAL(5,2)    NOT NULL DEFAULT 18,    -- GST %
    installation_amount   DECIMAL(10,2)   NOT NULL DEFAULT 0,
    description           TEXT,
    permanent_discount    DECIMAL(5,2)    DEFAULT 0,
    created_at            TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_plans_org      ON plans(organization_id);
CREATE INDEX idx_plans_provider ON plans(organization_id, provider);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 7: complaints
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE complaints (
    id                     SERIAL           PRIMARY KEY,
    organization_id        VARCHAR(50)      NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    contact_id             INT              REFERENCES contacts(id) ON DELETE SET NULL,
    customer_name          VARCHAR(255)     NOT NULL,
    mobile                 VARCHAR(15)      NOT NULL,
    connection_type        VARCHAR(100)     NOT NULL,
    customer_description   TEXT             NOT NULL,
    internal_description   TEXT,
    status                 complaint_status NOT NULL DEFAULT 'active',
    closure_image_url      TEXT,
    closed_at              TIMESTAMP,
    created_at             TIMESTAMP        NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_complaints_org     ON complaints(organization_id);
CREATE INDEX idx_complaints_status  ON complaints(organization_id, status);
CREATE INDEX idx_complaints_contact ON complaints(contact_id);

COMMENT ON COLUMN complaints.closure_image_url IS 'Store S3/CDN presigned URL — never base64 in database';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 8: sales_invoices
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE sales_invoices (
    id               SERIAL          PRIMARY KEY,
    organization_id  VARCHAR(50)     NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    invoice_number   VARCHAR(50)     NOT NULL,
    branch_id        INT             REFERENCES branches(id) ON DELETE SET NULL,
    contact_id       INT             REFERENCES contacts(id) ON DELETE SET NULL,
    customer_name    VARCHAR(255)    NOT NULL,
    service_provider VARCHAR(100)    NOT NULL,
    plan_name        VARCHAR(255)    NOT NULL,
    amount           DECIMAL(10,2)   NOT NULL,
    gst_rate         DECIMAL(5,2)    NOT NULL,
    gst_amount       DECIMAL(10,2)   NOT NULL,
    total_amount     DECIMAL(10,2)   NOT NULL,
    status           invoice_status  NOT NULL DEFAULT 'draft',
    invoice_type     invoice_type    NOT NULL DEFAULT 'tax_invoice',
    place_of_supply  VARCHAR(100),
    hsn_sac          VARCHAR(20),
    issue_date       DATE            NOT NULL,
    due_date         DATE            NOT NULL,
    created_at       TIMESTAMP       NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, invoice_number)
);

CREATE INDEX idx_sales_invoices_org     ON sales_invoices(organization_id);
CREATE INDEX idx_sales_invoices_contact ON sales_invoices(contact_id);
CREATE INDEX idx_sales_invoices_status  ON sales_invoices(organization_id, status);
CREATE INDEX idx_sales_invoices_date    ON sales_invoices(organization_id, issue_date);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 9: purchase_invoices
-- contact_id references a contact with contact_type = 'vendor' or 'supplier'.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE purchase_invoices (
    id               SERIAL        PRIMARY KEY,
    organization_id  VARCHAR(50)   NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    invoice_number   VARCHAR(50)   NOT NULL,
    contact_id       INT           NOT NULL REFERENCES contacts(id) ON DELETE RESTRICT,  -- vendor/supplier
    vendor_name      VARCHAR(255)  NOT NULL,                     -- denormalized
    reference        VARCHAR(100),
    amount           DECIMAL(10,2) NOT NULL,
    cgst             DECIMAL(10,2) DEFAULT 0,
    sgst             DECIMAL(10,2) DEFAULT 0,
    igst             DECIMAL(10,2) DEFAULT 0,
    total_amount     DECIMAL(10,2) NOT NULL,
    issue_date       DATE          NOT NULL,
    created_at       TIMESTAMP     NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, invoice_number)
);

CREATE INDEX idx_purchase_invoices_org     ON purchase_invoices(organization_id);
CREATE INDEX idx_purchase_invoices_contact ON purchase_invoices(contact_id);
CREATE INDEX idx_purchase_invoices_date    ON purchase_invoices(organization_id, issue_date);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 10: connection_requests
-- Lead capture from the public website; admin converts to customer.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE connection_requests (
    id               SERIAL                  PRIMARY KEY,
    organization_id  VARCHAR(50)             NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name             VARCHAR(255)            NOT NULL,
    mobile           VARCHAR(15)             NOT NULL,
    email            VARCHAR(255),
    package_id       INT                     REFERENCES plans(id) ON DELETE SET NULL,
    product_id       INT                     REFERENCES products(id) ON DELETE SET NULL,
    plan_name        VARCHAR(255)            NOT NULL,
    product_name     VARCHAR(100)            NOT NULL,
    status           connection_req_status   NOT NULL DEFAULT 'New',
    created_at       TIMESTAMP               NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conn_req_org    ON connection_requests(organization_id);
CREATE INDEX idx_conn_req_status ON connection_requests(organization_id, status);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 11: company_profile
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE company_profile (
    id               SERIAL        PRIMARY KEY,
    organization_id  VARCHAR(50)   NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    company_name     VARCHAR(255)  NOT NULL DEFAULT '',
    gstin            VARCHAR(20),
    address_line1    VARCHAR(255),
    address_line2    VARCHAR(255),
    city             VARCHAR(100),
    state            VARCHAR(100),
    country          VARCHAR(100)  DEFAULT 'India',
    pincode          VARCHAR(10),
    contact_number   VARCHAR(20),
    email            VARCHAR(255),
    updated_at       TIMESTAMP     NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 12: website_settings
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE website_settings (
    id                       SERIAL        PRIMARY KEY,
    organization_id          VARCHAR(50)   NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    hero_title               VARCHAR(255)  DEFAULT '',
    hero_subtitle            VARCHAR(255)  DEFAULT '',
    hero_description         TEXT          DEFAULT '',
    hero_image               TEXT,
    highlight_section_title  VARCHAR(255)  DEFAULT '',
    highlight_cards          JSONB         NOT NULL DEFAULT '[]',
    cta_button_text          VARCHAR(100)  DEFAULT '',
    cta_button_link          VARCHAR(255)  DEFAULT '',
    updated_at               TIMESTAMP     NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id)
);

COMMENT ON COLUMN website_settings.highlight_cards IS 'JSONB array of { title, description, icon } objects';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 13: inventory_categories
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE inventory_categories (
    id               SERIAL        PRIMARY KEY,
    organization_id  VARCHAR(50)   NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name             VARCHAR(255)  NOT NULL,
    code             VARCHAR(50)   NOT NULL,
    description      TEXT,
    created_at       TIMESTAMP     NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, code)
);

CREATE INDEX idx_inv_categories_org ON inventory_categories(organization_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 14: inventory_subcategories
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE inventory_subcategories (
    id               SERIAL        PRIMARY KEY,
    organization_id  VARCHAR(50)   NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    category_id      INT           NOT NULL REFERENCES inventory_categories(id) ON DELETE CASCADE,
    name             VARCHAR(255)  NOT NULL,
    created_at       TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inv_subcategories_org      ON inventory_subcategories(organization_id);
CREATE INDEX idx_inv_subcategories_category ON inventory_subcategories(category_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 15: inventory_units
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE inventory_units (
    id               SERIAL        PRIMARY KEY,
    organization_id  VARCHAR(50)   NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name             VARCHAR(100)  NOT NULL,
    short_name       VARCHAR(20)   NOT NULL,
    created_at       TIMESTAMP     NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, short_name)
);

CREATE INDEX idx_inv_units_org ON inventory_units(organization_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 16: inventory_tax_rates
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE inventory_tax_rates (
    id               SERIAL          PRIMARY KEY,
    organization_id  VARCHAR(50)     NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name             VARCHAR(100)    NOT NULL,
    rate             DECIMAL(5,2)    NOT NULL,
    type             tax_rate_type   NOT NULL DEFAULT 'exclusive',
    created_at       TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inv_tax_rates_org ON inventory_tax_rates(organization_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 17: inventory_warranties
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE inventory_warranties (
    id               SERIAL          PRIMARY KEY,
    organization_id  VARCHAR(50)     NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name             VARCHAR(100)    NOT NULL,
    duration         INT             NOT NULL,
    duration_unit    duration_unit   NOT NULL DEFAULT 'months',
    created_at       TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inv_warranties_org ON inventory_warranties(organization_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 18: inventory_products
-- Physical/digital/service/bundle goods for POS and inventory management.
-- Distinct from the ISP service categories in the products table.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE inventory_products (
    id                SERIAL                  PRIMARY KEY,
    organization_id   VARCHAR(50)             NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name              VARCHAR(255)            NOT NULL,
    sku               VARCHAR(100)            NOT NULL,
    category_id       INT                     REFERENCES inventory_categories(id) ON DELETE SET NULL,
    category_code     VARCHAR(50),                               -- denormalized
    subcategory_id    INT                     REFERENCES inventory_subcategories(id) ON DELETE SET NULL,
    branch_id         INT                     REFERENCES branches(id) ON DELETE SET NULL,
    unit_id           INT                     REFERENCES inventory_units(id) ON DELETE SET NULL,
    tax_type          tax_type                NOT NULL DEFAULT 'exclusive',
    tax_rate_id       INT                     REFERENCES inventory_tax_rates(id) ON DELETE SET NULL,
    warranty_id       INT                     REFERENCES inventory_warranties(id) ON DELETE SET NULL,
    description       TEXT,
    price             DECIMAL(10,2)           NOT NULL DEFAULT 0,  -- selling price
    purchase_price    DECIMAL(10,2),                              -- cost price for margin calc
    mrp               DECIMAL(10,2),                              -- MRP printed on label (FMCG/retail)
    image             TEXT,                                       -- S3/CDN URL (never base64)
    is_active         BOOLEAN                 NOT NULL DEFAULT TRUE,
    product_type      inventory_product_type  DEFAULT 'physical',
    brand             VARCHAR(100),
    hsn_sac_code      VARCHAR(20),                               -- Indian GST: HSN (goods) or SAC (services)
    current_stock     INT                     DEFAULT 0,
    stock_alert       INT,                                       -- low-stock alert threshold
    reorder_level     INT,                                       -- triggers reorder alert
    tracking_type     tracking_type           NOT NULL DEFAULT 'none',
    barcode           VARCHAR(100),                              -- EAN-13, UPC-A, or custom
    weight            DECIMAL(8,3),
    weight_unit       weight_unit,
    expiry_tracking   BOOLEAN                 NOT NULL DEFAULT FALSE,
    created_at        TIMESTAMP               NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, sku)
);

CREATE INDEX idx_inv_products_org      ON inventory_products(organization_id);
CREATE INDEX idx_inv_products_active   ON inventory_products(organization_id, is_active);
CREATE INDEX idx_inv_products_category ON inventory_products(category_id);
CREATE INDEX idx_inv_products_branch   ON inventory_products(branch_id);
CREATE INDEX idx_inv_products_sku      ON inventory_products(organization_id, sku);
CREATE INDEX idx_inv_products_barcode  ON inventory_products(barcode);

COMMENT ON TABLE inventory_products IS 'Physical/digital goods for POS and inventory. Not to be confused with ISP service categories in products table.';
COMMENT ON COLUMN inventory_products.hsn_sac_code IS 'HSN (goods) or SAC (services) — mandatory for Indian GST compliance';
COMMENT ON COLUMN inventory_products.image IS 'Store S3/CDN presigned URL — never base64 in database';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 19: inventory_product_variants
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE inventory_product_variants (
    id              SERIAL          PRIMARY KEY,
    product_id      INT             NOT NULL REFERENCES inventory_products(id) ON DELETE CASCADE,
    name            VARCHAR(255)    NOT NULL,                     -- e.g. "Red / XL", "128GB"
    sku             VARCHAR(100),                                 -- variant-level SKU
    price           DECIMAL(10,2),                                -- overrides product price if set
    purchase_price  DECIMAL(10,2),                                -- variant-level cost price
    mrp             DECIMAL(10,2),                                -- variant-level MRP
    tax_type        tax_type        DEFAULT 'exclusive',
    warranty_id     INT             REFERENCES inventory_warranties(id) ON DELETE SET NULL,
    barcode         VARCHAR(100),                                 -- variant-level barcode (EAN/UPC)
    current_stock   INT             DEFAULT 0,
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inv_variants_product ON inventory_product_variants(product_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 20: pos_transactions
-- Point-of-Sale transaction header.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE pos_transactions (
    id               SERIAL              PRIMARY KEY,
    organization_id  VARCHAR(50)         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    branch_id        INT                 REFERENCES branches(id) ON DELETE SET NULL,
    contact_id       INT                 REFERENCES contacts(id) ON DELETE SET NULL,
    customer_name    VARCHAR(255),                                -- denormalized (walk-in or linked)
    subtotal         DECIMAL(10,2)       NOT NULL DEFAULT 0,
    tax_total        DECIMAL(10,2)       NOT NULL DEFAULT 0,
    discount_amount  DECIMAL(10,2)       NOT NULL DEFAULT 0,
    grand_total      DECIMAL(10,2)       NOT NULL DEFAULT 0,
    payment_method   pos_payment_method  NOT NULL DEFAULT 'cash',
    status           pos_status          NOT NULL DEFAULT 'completed',
    notes            TEXT,
    created_by       INT                 REFERENCES users(id) ON DELETE SET NULL,
    created_at       TIMESTAMP           NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pos_transactions_org     ON pos_transactions(organization_id);
CREATE INDEX idx_pos_transactions_branch  ON pos_transactions(branch_id);
CREATE INDEX idx_pos_transactions_contact ON pos_transactions(contact_id);
CREATE INDEX idx_pos_transactions_date    ON pos_transactions(organization_id, created_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 21: pos_transaction_items
-- Line items for each POS transaction.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE pos_transaction_items (
    id              SERIAL          PRIMARY KEY,
    transaction_id  INT             NOT NULL REFERENCES pos_transactions(id) ON DELETE CASCADE,
    product_id      INT             REFERENCES inventory_products(id) ON DELETE SET NULL,
    product_name    VARCHAR(255)    NOT NULL,                     -- denormalized
    quantity        INT             NOT NULL DEFAULT 1,
    unit_price      DECIMAL(10,2)   NOT NULL,
    tax_rate        DECIMAL(5,2)    NOT NULL DEFAULT 0,
    tax_amount      DECIMAL(10,2)   NOT NULL DEFAULT 0,
    line_total      DECIMAL(10,2)   NOT NULL,                     -- (unit_price * qty) + tax_amount
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pos_items_transaction ON pos_transaction_items(transaction_id);
CREATE INDEX idx_pos_items_product     ON pos_transaction_items(product_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 22: upi_payment_config
-- UPI payment gateway configuration per organization.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE upi_payment_config (
    id               SERIAL        PRIMARY KEY,
    organization_id  VARCHAR(50)   NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    upi_id           VARCHAR(100)  NOT NULL DEFAULT '',           -- e.g. 'popna@upi'
    upi_display_name VARCHAR(255)  NOT NULL DEFAULT '',           -- shown on payment screen
    enabled          BOOLEAN       NOT NULL DEFAULT FALSE,
    supported_apps   JSONB         NOT NULL DEFAULT '["gpay","phonepe","paytm","bhim"]',
    updated_at       TIMESTAMP     NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id)
);

CREATE INDEX idx_upi_config_org ON upi_payment_config(organization_id);

COMMENT ON TABLE upi_payment_config IS 'UPI payment gateway config per tenant. Maps to UpiPaymentConfig interface in upiPayment.ts.';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 23: superadmin_users
-- Platform-level super admin accounts (NOT scoped to any organization).
-- Roles: super_admin (full access) | manager (permission-based access).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE superadmin_users (
    id                    SERIAL            PRIMARY KEY,
    name                  VARCHAR(255)      NOT NULL,
    username              VARCHAR(100)      NOT NULL UNIQUE,          -- globally unique
    password_hash         VARCHAR(255)      NOT NULL,                 -- bcrypt/argon2 hash
    role                  superadmin_role   NOT NULL DEFAULT 'manager',
    status                user_status       NOT NULL DEFAULT 'active',
    allowed_permissions   JSONB             DEFAULT '[]',             -- SAPermissionKey[] for managers
    created_at            TIMESTAMP         NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE superadmin_users IS 'Platform-level admin accounts. Not tied to any organization.';
COMMENT ON COLUMN superadmin_users.allowed_permissions IS 'SAPermissionKey[]: sa_dashboard|sa_organizations_view|sa_organizations_add|sa_organizations_edit|sa_organizations_inactive|sa_signup_requests|sa_users';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 24: signup_requests
-- Business signup requests submitted from the public landing page.
-- Managed by super admins via the SignupRequests page.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE signup_requests (
    id               SERIAL        PRIMARY KEY,
    name             VARCHAR(255)  NOT NULL,
    mobile           VARCHAR(15)   NOT NULL,
    email            VARCHAR(255)  NOT NULL,
    business_type    VARCHAR(100)  NOT NULL,                     -- e.g. 'ISP', 'Cable Operator', 'Retail'
    business_name    VARCHAR(255)  NOT NULL,
    created_at       TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_signup_requests_date ON signup_requests(created_at DESC);

COMMENT ON TABLE signup_requests IS 'Public signup requests from potential tenants. Not scoped to an organization.';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 25: sms_config
-- SMS provider configuration per organization.
-- Supports 3rd-party SMS APIs (MSG91, Twilio, TextLocal, etc.).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE sms_config (
    id               SERIAL        PRIMARY KEY,
    organization_id  VARCHAR(50)   NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    provider         VARCHAR(50)   NOT NULL DEFAULT '',           -- e.g. 'msg91', 'twilio', 'textlocal'
    api_key          VARCHAR(255)  NOT NULL DEFAULT '',           -- provider API key / auth token
    sender_id        VARCHAR(20)   NOT NULL DEFAULT '',           -- 6-char sender ID (Indian DLT)
    template_id      VARCHAR(100)  DEFAULT '',                    -- DLT-approved template ID
    enabled          BOOLEAN       NOT NULL DEFAULT FALSE,
    -- Payment SMS template placeholders: {customer_name}, {amount}, {method}, {balance}, {company}
    payment_template TEXT          DEFAULT 'Dear {customer_name}, payment of Rs.{amount} received via {method}. Balance: Rs.{balance}. Thank you - {company}',
    updated_at       TIMESTAMP     NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id)
);

CREATE INDEX idx_sms_config_org ON sms_config(organization_id);

COMMENT ON TABLE sms_config IS 'SMS gateway config per tenant. Backend sends SMS on payment collection.';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 26: sms_logs
-- Audit trail for all SMS sent by the system.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE sms_logs (
    id               SERIAL        PRIMARY KEY,
    organization_id  VARCHAR(50)   NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    contact_id       INT           REFERENCES contacts(id) ON DELETE SET NULL,
    mobile           VARCHAR(15)   NOT NULL,
    message          TEXT          NOT NULL,
    sms_type         VARCHAR(50)   NOT NULL DEFAULT 'payment',    -- payment | reminder | welcome | custom
    status           sms_status    NOT NULL DEFAULT 'pending',
    provider_ref     VARCHAR(255),                                -- provider message ID for tracking
    error_message    TEXT,                                        -- failure reason if status = 'failed'
    sent_at          TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sms_logs_org     ON sms_logs(organization_id);
CREATE INDEX idx_sms_logs_contact ON sms_logs(contact_id);
CREATE INDEX idx_sms_logs_date    ON sms_logs(organization_id, sent_at DESC);
CREATE INDEX idx_sms_logs_type    ON sms_logs(organization_id, sms_type);

COMMENT ON TABLE sms_logs IS 'Audit trail for all SMS sent. Tracks delivery for debugging and compliance.';

-- ─────────────────────────────────────────────────────────────────────────────
-- UPDATED_AT trigger function
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_organizations
    BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_company_profile
    BEFORE UPDATE ON company_profile
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_website_settings
    BEFORE UPDATE ON website_settings
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_upi_payment_config
    BEFORE UPDATE ON upi_payment_config
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_sms_config
    BEFORE UPDATE ON sms_config
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
