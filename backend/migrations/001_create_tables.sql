-- =============================================================================
-- Popna Entertainment — ISP Management Platform
-- PostgreSQL Schema Migration: 001_create_tables
-- =============================================================================
-- Tables: 25
--   1.  organizations
--   2.  users
--   3.  customers          (UI label: Contacts)
--   4.  products           (ISP service categories — dynamic)
--   5.  plans
--   6.  complaints
--   7.  sales_invoices
--   8.  vendors
--   9.  purchase_invoices
--  10.  connection_requests
--  11.  company_profile
--  12.  website_settings
--  13.  client_configs
--  14.  branches
--  15.  suppliers
--  16.  inventory_categories
--  17.  inventory_subcategories
--  18.  inventory_units
--  19.  inventory_tax_rates
--  20.  inventory_warranties
--  21.  inventory_products
--  22.  inventory_product_variants
--  23.  pos_transactions
--  24.  pos_transaction_items
--  25.  upi_payment_config
-- =============================================================================

-- Enable UUID extension if preferred for PKs
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TYPE organization_status     AS ENUM ('active', 'disabled', 'suspended');
CREATE TYPE user_role               AS ENUM ('admin', 'employee');
CREATE TYPE user_status             AS ENUM ('active', 'inactive');
CREATE TYPE customer_status         AS ENUM ('Active', 'Inactive');
CREATE TYPE payment_status          AS ENUM ('paid', 'not_paid');
CREATE TYPE payment_method          AS ENUM ('cash', 'upi', 'card', 'other');
CREATE TYPE product_type            AS ENUM ('cable', 'internet');
CREATE TYPE complaint_status        AS ENUM ('active', 'on-hold', 'completed');
CREATE TYPE invoice_status          AS ENUM ('draft', 'sent', 'paid', 'overdue');
CREATE TYPE invoice_type            AS ENUM ('tax_invoice', 'bill_of_supply');
CREATE TYPE connection_req_status   AS ENUM ('New', 'Converted');
CREATE TYPE client_status           AS ENUM ('active', 'inactive');
CREATE TYPE tax_type                AS ENUM ('inclusive', 'exclusive', 'none');
CREATE TYPE tax_rate_type           AS ENUM ('inclusive', 'exclusive');
CREATE TYPE inventory_product_type  AS ENUM ('physical', 'service', 'digital', 'bundle');
CREATE TYPE tracking_type           AS ENUM ('none', 'serial', 'batch');
CREATE TYPE weight_unit             AS ENUM ('g', 'kg', 'lb');
CREATE TYPE duration_unit           AS ENUM ('days', 'months', 'years');
CREATE TYPE pos_payment_method      AS ENUM ('cash', 'upi', 'card', 'bank_transfer', 'other');
CREATE TYPE pos_status              AS ENUM ('completed', 'refunded', 'voided');

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
COMMENT ON COLUMN organizations.allowed_settings_tabs IS 'SettingsTabKey[]: company|products|billing';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 2: users
-- Admin and Employee accounts for the management panel.
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
    created_at       TIMESTAMP     NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, username)                           -- username unique per org
);

CREATE INDEX idx_users_org  ON users(organization_id);
CREATE INDEX idx_users_role ON users(organization_id, role);

COMMENT ON TABLE users IS 'Admin/Employee accounts; password stored as bcrypt/argon2 hash — NEVER plain text';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 14: branches  (defined early — referenced by customers and inventory)
-- Physical business branches/locations per organization.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE branches (
    id               SERIAL        PRIMARY KEY,
    organization_id  VARCHAR(50)   NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name             VARCHAR(255)  NOT NULL,
    location         VARCHAR(255),
    address          TEXT,
    phone            VARCHAR(20),
    is_active        BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMP     NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, name)
);

CREATE INDEX idx_branches_org    ON branches(organization_id);
CREATE INDEX idx_branches_active ON branches(organization_id, is_active);

-- branch_id on users added here (after branches table) to satisfy FK dependency
ALTER TABLE users ADD COLUMN branch_id INT REFERENCES branches(id) ON DELETE SET NULL;
CREATE INDEX idx_users_branch ON users(branch_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 3: customers  (UI label: "Contacts")
-- End-user subscriber accounts.
-- Note: Catalog module removed — merged into Inventory.
--       Customers module removed — now "Contacts" in the sidebar (same table).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE customers (
    id                    SERIAL          PRIMARY KEY,
    organization_id       VARCHAR(50)     NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name                  VARCHAR(255)    NOT NULL,
    email                 VARCHAR(255),
    mobile                VARCHAR(15)     NOT NULL,
    password_hash         VARCHAR(255),                           -- customer portal login (bcrypt)
    connection_type       VARCHAR(100)    NOT NULL,               -- service category name (dynamic)
    package               VARCHAR(255)    NOT NULL,               -- plan name
    status                customer_status NOT NULL DEFAULT 'Active',
    description           TEXT,
    -- Address (flattened for query performance)
    address_line1         VARCHAR(255)    NOT NULL DEFAULT '',
    address_line2         VARCHAR(255),
    city                  VARCHAR(100)    NOT NULL DEFAULT '',
    state                 VARCHAR(100)    NOT NULL DEFAULT '',
    country               VARCHAR(100)    NOT NULL DEFAULT 'India',
    -- Payment Collection
    payment_status        payment_status  DEFAULT 'not_paid',
    payment_description   TEXT,
    payment_updated_at    TIMESTAMP,
    payment_method        payment_method,
    collected_amount      DECIMAL(10,2)   DEFAULT 0,
    balance_amount        DECIMAL(10,2)   DEFAULT 0,
    collected_by_username VARCHAR(100),                          -- employee who collected
    -- GST & Identifiers
    gstin                 VARCHAR(20),
    box_number            VARCHAR(50),                           -- cable box number
    stb_number            VARCHAR(100),                          -- Set-Top Box / User ID
    can_caf_id            VARCHAR(100),                          -- CAN/CAF ID
    cin                   VARCHAR(100),                          -- Customer ID Number
    area                  VARCHAR(100),                          -- service area
    additional_addresses  JSONB           DEFAULT '[]',          -- Address[] extra delivery/billing addresses
    permanent_discount    DECIMAL(5,2)    DEFAULT 0,             -- permanent plan discount %
    branch_id             INT             REFERENCES branches(id) ON DELETE SET NULL,
    created_at            TIMESTAMP       NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, mobile)
);

CREATE INDEX idx_customers_org      ON customers(organization_id);
CREATE INDEX idx_customers_status   ON customers(organization_id, status);
CREATE INDEX idx_customers_type     ON customers(organization_id, connection_type);
CREATE INDEX idx_customers_payment  ON customers(organization_id, payment_status);
CREATE INDEX idx_customers_mobile   ON customers(organization_id, mobile);
CREATE INDEX idx_customers_branch   ON customers(branch_id);

COMMENT ON TABLE customers IS 'UI label: Contacts. Subscriber accounts; address flattened for SQL performance.';
COMMENT ON COLUMN customers.connection_type IS 'Service category name — dynamic, not an FK (categories renamed/deleted freely)';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 4: products
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
-- TABLE 5: plans
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
-- TABLE 6: complaints
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE complaints (
    id                     SERIAL           PRIMARY KEY,
    organization_id        VARCHAR(50)      NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    customer_id            INT              REFERENCES customers(id) ON DELETE SET NULL,
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

CREATE INDEX idx_complaints_org      ON complaints(organization_id);
CREATE INDEX idx_complaints_status   ON complaints(organization_id, status);
CREATE INDEX idx_complaints_customer ON complaints(customer_id);

COMMENT ON COLUMN complaints.closure_image_url IS 'Store S3/CDN presigned URL — never base64 in database';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 7: sales_invoices
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE sales_invoices (
    id               SERIAL          PRIMARY KEY,
    organization_id  VARCHAR(50)     NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    invoice_number   VARCHAR(50)     NOT NULL,
    customer_id      INT             REFERENCES customers(id) ON DELETE SET NULL,
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

CREATE INDEX idx_sales_invoices_org      ON sales_invoices(organization_id);
CREATE INDEX idx_sales_invoices_customer ON sales_invoices(customer_id);
CREATE INDEX idx_sales_invoices_status   ON sales_invoices(organization_id, status);
CREATE INDEX idx_sales_invoices_date     ON sales_invoices(organization_id, issue_date);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 8: vendors
-- Legacy vendor table for purchase invoicing.
-- See also: suppliers (table 15) — enhanced for inventory purchasing.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE vendors (
    id               SERIAL        PRIMARY KEY,
    organization_id  VARCHAR(50)   NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name             VARCHAR(255)  NOT NULL,
    contact          VARCHAR(20),
    gstin            VARCHAR(20),
    address_line1    VARCHAR(255),
    address_line2    VARCHAR(255),
    city             VARCHAR(100),
    state            VARCHAR(100),
    country          VARCHAR(100)  DEFAULT 'India',
    pincode          VARCHAR(10),
    created_at       TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vendors_org ON vendors(organization_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 9: purchase_invoices
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE purchase_invoices (
    id               SERIAL        PRIMARY KEY,
    organization_id  VARCHAR(50)   NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    invoice_number   VARCHAR(50)   NOT NULL,
    vendor_id        INT           NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT,
    vendor_name      VARCHAR(255)  NOT NULL,
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

CREATE INDEX idx_purchase_invoices_org    ON purchase_invoices(organization_id);
CREATE INDEX idx_purchase_invoices_vendor ON purchase_invoices(vendor_id);
CREATE INDEX idx_purchase_invoices_date   ON purchase_invoices(organization_id, issue_date);

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
-- TABLE 13: client_configs
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE client_configs (
    id               SERIAL        PRIMARY KEY,
    organization_id  VARCHAR(50)   NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    client_name      VARCHAR(255)  NOT NULL,
    username         VARCHAR(100)  NOT NULL,
    password_hash    VARCHAR(255)  NOT NULL,
    allowed_tabs     JSONB         NOT NULL DEFAULT '[]',
    status           client_status NOT NULL DEFAULT 'active',
    created_at       TIMESTAMP     NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, username)
);

CREATE INDEX idx_client_configs_org ON client_configs(organization_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 15: suppliers
-- Enhanced supplier management for inventory purchasing.
-- Supports multiple addresses via JSONB.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE suppliers (
    id                   SERIAL          PRIMARY KEY,
    organization_id      VARCHAR(50)     NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name                 VARCHAR(255)    NOT NULL,
    contact_person       VARCHAR(255),
    mobile               VARCHAR(20)     NOT NULL,
    email                VARCHAR(255),
    tax_number           VARCHAR(30),                             -- GSTIN or equivalent
    opening_balance      DECIMAL(12,2)   DEFAULT 0,
    address_line1        VARCHAR(255),
    address_line2        VARCHAR(255),
    city                 VARCHAR(100),
    state                VARCHAR(100),
    country              VARCHAR(100)    DEFAULT 'India',
    pincode              VARCHAR(10),
    additional_addresses JSONB           DEFAULT '[]',            -- Address[]
    created_at           TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_suppliers_org ON suppliers(organization_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 16: inventory_categories
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
-- TABLE 17: inventory_subcategories
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
-- TABLE 18: inventory_units
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
-- TABLE 19: inventory_tax_rates
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
-- TABLE 20: inventory_warranties
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
-- TABLE 21: inventory_products
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
    tracking_type     tracking_type           NOT NULL DEFAULT 'none', -- none | serial | batch
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
-- TABLE 22: inventory_product_variants
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE inventory_product_variants (
    id           SERIAL          PRIMARY KEY,
    product_id   INT             NOT NULL REFERENCES inventory_products(id) ON DELETE CASCADE,
    name         VARCHAR(255)    NOT NULL,                        -- e.g. "Red / XL"
    sku          VARCHAR(100),
    price        DECIMAL(10,2),                                   -- overrides product price if set
    stock        INT             DEFAULT 0,
    created_at   TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inv_variants_product ON inventory_product_variants(product_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 23: pos_transactions
-- Point-of-Sale transaction header.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE pos_transactions (
    id               SERIAL              PRIMARY KEY,
    organization_id  VARCHAR(50)         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    branch_id        INT                 REFERENCES branches(id) ON DELETE SET NULL,
    customer_id      INT                 REFERENCES customers(id) ON DELETE SET NULL,
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

CREATE INDEX idx_pos_transactions_org      ON pos_transactions(organization_id);
CREATE INDEX idx_pos_transactions_branch   ON pos_transactions(branch_id);
CREATE INDEX idx_pos_transactions_customer ON pos_transactions(customer_id);
CREATE INDEX idx_pos_transactions_date     ON pos_transactions(organization_id, created_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 24: pos_transaction_items
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
-- TABLE 25: upi_payment_config
-- UPI payment gateway configuration per organization.
-- Stores UPI ID, display name, and supported app list.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE upi_payment_config (
    id               SERIAL        PRIMARY KEY,
    organization_id  VARCHAR(50)   NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    upi_id           VARCHAR(100)  NOT NULL DEFAULT '',          -- e.g. 'popna@upi'
    upi_display_name VARCHAR(255)  NOT NULL DEFAULT '',          -- shown on payment screen
    enabled          BOOLEAN       NOT NULL DEFAULT FALSE,
    supported_apps   JSONB         NOT NULL DEFAULT '["gpay","phonepe","paytm","bhim"]',
    updated_at       TIMESTAMP     NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id)
);

CREATE INDEX idx_upi_config_org ON upi_payment_config(organization_id);

COMMENT ON TABLE upi_payment_config IS 'UPI payment gateway config per tenant. Maps to upiPayment.ts UpiPaymentConfig interface.';

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
