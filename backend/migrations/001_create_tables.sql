-- =============================================================================
-- Popna Entertainment — ISP Management Platform
-- PostgreSQL Schema Migration: 001_create_tables
-- =============================================================================
-- Tables: 13
--   1.  organizations
--   2.  users
--   3.  customers
--   4.  products
--   5.  plans
--   6.  complaints
--   7.  sales_invoices
--   8.  vendors
--   9.  purchase_invoices
--  10.  connection_requests
--  11.  company_profile
--  12.  website_settings
--  13.  client_configs
-- =============================================================================

-- Enable UUID extension if preferred for PKs
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TYPE organization_status   AS ENUM ('active', 'disabled', 'suspended');
CREATE TYPE user_role              AS ENUM ('admin', 'employee');
CREATE TYPE user_status            AS ENUM ('active', 'inactive');
CREATE TYPE customer_status        AS ENUM ('Active', 'Inactive');
CREATE TYPE payment_status         AS ENUM ('paid', 'not_paid');
CREATE TYPE payment_method         AS ENUM ('cash', 'upi', 'card', 'other');
CREATE TYPE product_type           AS ENUM ('cable', 'internet');
CREATE TYPE complaint_status       AS ENUM ('active', 'on-hold', 'completed');
CREATE TYPE invoice_status         AS ENUM ('draft', 'sent', 'paid', 'overdue');
CREATE TYPE invoice_type           AS ENUM ('tax_invoice', 'bill_of_supply');
CREATE TYPE connection_req_status  AS ENUM ('New', 'Converted');
CREATE TYPE client_status          AS ENUM ('active', 'inactive');

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 1: organizations
-- Multi-tenancy root. Every other table references this via organization_id.
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
COMMENT ON COLUMN organizations.allowed_modules IS 'Array of ModuleKey strings controlling sidebar access';
COMMENT ON COLUMN organizations.allowed_settings_tabs IS 'Array of SettingsTabKey strings controlling settings tab access';

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
    created_at       TIMESTAMP     NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, username)                           -- username unique per org
);

CREATE INDEX idx_users_org ON users(organization_id);
CREATE INDEX idx_users_role ON users(organization_id, role);

COMMENT ON TABLE users IS 'Admin/Employee accounts; password stored as bcrypt/argon2 hash — NEVER plain text';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 3: customers
-- End-user subscriber accounts (internet/cable customers).
-- Address is flattened into columns for query performance.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE customers (
    id                    SERIAL          PRIMARY KEY,
    organization_id       VARCHAR(50)     NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name                  VARCHAR(255)    NOT NULL,
    email                 VARCHAR(255),
    mobile                VARCHAR(15)     NOT NULL,
    password_hash         VARCHAR(255),                           -- customer portal login (bcrypt)
    connection_type       VARCHAR(100)    NOT NULL,               -- product name (dynamic)
    package               VARCHAR(255)    NOT NULL,               -- plan name
    status                customer_status NOT NULL DEFAULT 'Active',
    description           TEXT,
    -- Address (flattened)
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
    permanent_discount    DECIMAL(5,2)    DEFAULT 0,             -- permanent plan discount %
    created_at            TIMESTAMP       NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, mobile)                             -- mobile unique per org
);

CREATE INDEX idx_customers_org      ON customers(organization_id);
CREATE INDEX idx_customers_status   ON customers(organization_id, status);
CREATE INDEX idx_customers_type     ON customers(organization_id, connection_type);
CREATE INDEX idx_customers_payment  ON customers(organization_id, payment_status);
CREATE INDEX idx_customers_mobile   ON customers(organization_id, mobile);

COMMENT ON TABLE customers IS 'Subscriber accounts; address flattened into columns for SQL query performance';
COMMENT ON COLUMN customers.connection_type IS 'References product name (dynamic, not an FK — products are deleted/renamed freely)';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 4: products
-- Service categories managed by admin (e.g. "Cable", "Internet 1").
-- Fully dynamic — no hardcoded service names.
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

COMMENT ON COLUMN products.cutoff_date IS 'Cable only: day of month for billing cut-off (1–28)';
COMMENT ON COLUMN products.cutoff_days IS 'Internet only: days after due date before service cut-off';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 5: plans
-- Subscription plans offered under each product/service.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE plans (
    id                    SERIAL          PRIMARY KEY,
    organization_id       VARCHAR(50)     NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    provider              VARCHAR(100)    NOT NULL,               -- maps to product name
    plan_name             VARCHAR(255)    NOT NULL,
    image_url             TEXT,
    price                 DECIMAL(10,2)   NOT NULL,               -- base price before GST
    gst_rate              DECIMAL(5,2)    NOT NULL DEFAULT 18,    -- GST %
    installation_amount   DECIMAL(10,2)   NOT NULL DEFAULT 0,
    description           TEXT,
    permanent_discount    DECIMAL(5,2)    DEFAULT 0,              -- plan-level discount %
    created_at            TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_plans_org      ON plans(organization_id);
CREATE INDEX idx_plans_provider ON plans(organization_id, provider);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 6: complaints
-- Customer service complaints / support tickets.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE complaints (
    id                     SERIAL           PRIMARY KEY,
    organization_id        VARCHAR(50)      NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    customer_id            INT              REFERENCES customers(id) ON DELETE SET NULL,
    customer_name          VARCHAR(255)     NOT NULL,             -- denormalized for display
    mobile                 VARCHAR(15)      NOT NULL,
    connection_type        VARCHAR(100)     NOT NULL,
    customer_description   TEXT             NOT NULL,
    internal_description   TEXT,
    status                 complaint_status NOT NULL DEFAULT 'active',
    closure_image_url      TEXT,                                  -- S3/CDN URL (NOT base64)
    closed_at              TIMESTAMP,
    created_at             TIMESTAMP        NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_complaints_org      ON complaints(organization_id);
CREATE INDEX idx_complaints_status   ON complaints(organization_id, status);
CREATE INDEX idx_complaints_customer ON complaints(customer_id);

COMMENT ON COLUMN complaints.closure_image_url IS 'Store S3/CDN presigned URL — never base64 in database';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 7: sales_invoices
-- GST-compliant invoices generated for customer billing.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE sales_invoices (
    id               SERIAL          PRIMARY KEY,
    organization_id  VARCHAR(50)     NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    invoice_number   VARCHAR(50)     NOT NULL,                    -- e.g. 'INV-2024-001'
    customer_id      INT             REFERENCES customers(id) ON DELETE SET NULL,
    customer_name    VARCHAR(255)    NOT NULL,                    -- denormalized
    service_provider VARCHAR(100)    NOT NULL,                    -- product name
    plan_name        VARCHAR(255)    NOT NULL,
    amount           DECIMAL(10,2)   NOT NULL,                    -- base amount (pre-GST)
    gst_rate         DECIMAL(5,2)    NOT NULL,
    gst_amount       DECIMAL(10,2)   NOT NULL,
    total_amount     DECIMAL(10,2)   NOT NULL,                    -- amount + gst_amount
    status           invoice_status  NOT NULL DEFAULT 'draft',
    invoice_type     invoice_type    NOT NULL DEFAULT 'tax_invoice',
    place_of_supply  VARCHAR(100),                                -- GST: state name/code
    hsn_sac          VARCHAR(20),                                 -- GST: HSN/SAC code
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
-- Suppliers/vendors for purchase invoicing.
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
-- Invoices received from vendors/suppliers.
-- GST breakup (CGST / SGST / IGST) flattened into columns.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE purchase_invoices (
    id               SERIAL        PRIMARY KEY,
    organization_id  VARCHAR(50)   NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    invoice_number   VARCHAR(50)   NOT NULL,
    vendor_id        INT           NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT,
    vendor_name      VARCHAR(255)  NOT NULL,                      -- denormalized
    reference        VARCHAR(100),                                -- PO/GRN reference
    amount           DECIMAL(10,2) NOT NULL,                      -- pre-tax amount
    cgst             DECIMAL(10,2) DEFAULT 0,                     -- Central GST
    sgst             DECIMAL(10,2) DEFAULT 0,                     -- State GST
    igst             DECIMAL(10,2) DEFAULT 0,                     -- Integrated GST
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
-- Public-facing plan request forms from prospective customers.
-- No auth required to create; admin manages conversion.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE connection_requests (
    id               SERIAL                  PRIMARY KEY,
    organization_id  VARCHAR(50)             NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name             VARCHAR(255)            NOT NULL,
    mobile           VARCHAR(15)             NOT NULL,
    email            VARCHAR(255),
    package_id       INT                     REFERENCES plans(id) ON DELETE SET NULL,
    product_id       INT                     REFERENCES products(id) ON DELETE SET NULL,
    plan_name        VARCHAR(255)            NOT NULL,            -- denormalized
    product_name     VARCHAR(100)            NOT NULL,            -- denormalized
    status           connection_req_status   NOT NULL DEFAULT 'New',
    created_at       TIMESTAMP               NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conn_req_org    ON connection_requests(organization_id);
CREATE INDEX idx_conn_req_status ON connection_requests(organization_id, status);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 11: company_profile
-- Company/business profile per organization (one row per org).
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
    UNIQUE (organization_id)                                      -- one row per org
);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 12: website_settings
-- Public website configuration per organization (one row per org).
-- highlight_cards stored as JSONB: [{ title, description, icon }]
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE website_settings (
    id                       SERIAL        PRIMARY KEY,
    organization_id          VARCHAR(50)   NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    hero_title               VARCHAR(255)  DEFAULT '',
    hero_subtitle            VARCHAR(255)  DEFAULT '',
    hero_description         TEXT          DEFAULT '',
    hero_image               TEXT,                                -- image URL
    highlight_section_title  VARCHAR(255)  DEFAULT '',
    highlight_cards          JSONB         NOT NULL DEFAULT '[]', -- HighlightCard[]
    cta_button_text          VARCHAR(100)  DEFAULT '',
    cta_button_link          VARCHAR(255)  DEFAULT '',
    updated_at               TIMESTAMP     NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id)
);

COMMENT ON COLUMN website_settings.highlight_cards IS 'JSONB array of { title, description, icon } objects';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 13: client_configs
-- Partner/client dashboard access configuration.
-- Controls which sidebar tabs a client/partner company can access.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE client_configs (
    id               SERIAL        PRIMARY KEY,
    organization_id  VARCHAR(50)   NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    client_name      VARCHAR(255)  NOT NULL,
    username         VARCHAR(100)  NOT NULL,
    password_hash    VARCHAR(255)  NOT NULL,
    allowed_tabs     JSONB         NOT NULL DEFAULT '[]',         -- string[]
    status           client_status NOT NULL DEFAULT 'active',
    created_at       TIMESTAMP     NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, username)
);

CREATE INDEX idx_client_configs_org ON client_configs(organization_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- UPDATED_AT trigger function
-- Automatically updates updated_at on row modification.
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
