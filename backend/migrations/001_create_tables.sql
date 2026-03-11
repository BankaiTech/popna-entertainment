-- =============================================================================
-- Popna Entertainment — ISP Management Platform
-- PostgreSQL Schema Migration: 001_create_tables (Consolidated)
-- =============================================================================
-- Consolidated structure:
--   • Single invoices table (type: sales | purchase)
--   • Single users table (role: super_admin | admin | employee; customers in contacts)
--   • Company profile holds: branches, sms_status, sms_templates, upi_config
--   • Single inventory table (categories, units, tax, warranty as denormalized/JSONB)
--   • Single pos table (line items in items JSONB)
--
-- Tables: 15
--   1.  organizations
--   2.  users              (unified: super_admin, admin, employee)
--   3.  contacts           (customers, suppliers, vendors; branch_id logical ref)
--   4.  products           (ISP service categories)
--   5.  plans
--   6.  complaints
--   7.  invoices           (type: sales | purchase)
--   8.  invoice_items      (line items for invoices)
--   9.  connection_requests
--  10.  company_profile    (branches, sms_status, sms_templates, upi_config)
--  11.  website_settings
--  12.  inventory          (single table: product + variants/category/unit/tax in one)
--  13.  pos                (single table: header + items JSONB)
--  14.  signup_requests
--  15.  sms_logs           (audit only)
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TYPE organization_status     AS ENUM ('active', 'disabled', 'suspended');
CREATE TYPE user_role               AS ENUM ('super_admin', 'admin', 'employee');
CREATE TYPE user_status             AS ENUM ('active', 'inactive');
CREATE TYPE contact_type            AS ENUM ('customer', 'supplier', 'vendor');
CREATE TYPE customer_status         AS ENUM ('Active', 'Inactive');
CREATE TYPE payment_status          AS ENUM ('paid', 'not_paid');
CREATE TYPE payment_method          AS ENUM ('cash', 'upi', 'card', 'other');
CREATE TYPE product_type            AS ENUM ('cable', 'internet');
CREATE TYPE complaint_status        AS ENUM ('active', 'on-hold', 'completed');
CREATE TYPE invoice_status          AS ENUM ('draft', 'sent', 'paid', 'overdue');
CREATE TYPE invoice_type            AS ENUM ('tax_invoice', 'bill_of_supply');
CREATE TYPE invoice_kind            AS ENUM ('sales', 'purchase');
CREATE TYPE connection_req_status   AS ENUM ('New', 'Converted');
CREATE TYPE tax_type                AS ENUM ('inclusive', 'exclusive', 'none');
CREATE TYPE tax_rate_type           AS ENUM ('inclusive', 'exclusive');
CREATE TYPE inventory_product_type  AS ENUM ('physical', 'service', 'digital', 'bundle');
CREATE TYPE tracking_type           AS ENUM ('none', 'serial', 'batch');
CREATE TYPE weight_unit             AS ENUM ('g', 'kg', 'lb');
CREATE TYPE duration_unit           AS ENUM ('days', 'months', 'years');
CREATE TYPE pos_payment_method      AS ENUM ('cash', 'upi', 'card', 'bank_transfer', 'other');
CREATE TYPE pos_status              AS ENUM ('completed', 'refunded', 'voided');
CREATE TYPE sms_status              AS ENUM ('sent', 'failed', 'pending');

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 1: organizations
-- Multi-tenancy root. allowed_modules controls sidebar visibility per tenant.
-- =============================================================================

CREATE TABLE organizations (
    id                    VARCHAR(50)           PRIMARY KEY,
    name                  VARCHAR(255)          NOT NULL,
    status                organization_status   NOT NULL DEFAULT 'active',
    allowed_modules       JSONB                 NOT NULL DEFAULT '[]',
    allowed_settings_tabs JSONB                 NOT NULL DEFAULT '[]',
    subscription_start    DATE                  NOT NULL,
    subscription_end      DATE                  NOT NULL,
    created_at            TIMESTAMP             NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMP             NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE organizations IS 'SaaS master table — root of all tenant data';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 2: users (unified: super_admin, admin, employee)
-- organization_id NULL for super_admin. Customers use contacts with password_hash.
-- =============================================================================

CREATE TABLE users (
    id               SERIAL        PRIMARY KEY,
    organization_id  VARCHAR(50)   REFERENCES organizations(id) ON DELETE CASCADE,
    name             VARCHAR(255)   NOT NULL,
    username         VARCHAR(100)  NOT NULL,
    password_hash    VARCHAR(255)  NOT NULL,
    role             user_role     NOT NULL DEFAULT 'employee',
    status           user_status   NOT NULL DEFAULT 'active',
    allowed_modules  JSONB         NOT NULL DEFAULT '[]',
    branch_id        INT,                    -- logical ref to company_profile.branches[n].id (no FK)
    allowed_permissions JSONB      DEFAULT '[]',  -- for super_admin managers
    created_at       TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_users_org_username ON users(organization_id, username) WHERE organization_id IS NOT NULL;
CREATE UNIQUE INDEX idx_users_superadmin_username ON users(username) WHERE organization_id IS NULL;
CREATE INDEX idx_users_org    ON users(organization_id);
CREATE INDEX idx_users_role   ON users(role);
CREATE INDEX idx_users_username ON users(username);

COMMENT ON TABLE users IS 'Unified: super_admin (org NULL), admin, employee. Customers in contacts.';
COMMENT ON COLUMN users.branch_id IS 'Logical reference to branch id in company_profile.branches JSONB';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 3: contacts (customers, suppliers, vendors)
-- branch_id is logical ref to company_profile.branches (no FK).
-- =============================================================================

CREATE TABLE contacts (
    id                    SERIAL          PRIMARY KEY,
    organization_id       VARCHAR(50)     NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    contact_type          contact_type    NOT NULL DEFAULT 'customer',

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
    additional_addresses  JSONB           DEFAULT '[]',

    -- Customer-specific
    password_hash         VARCHAR(255),
    connection_type       VARCHAR(100),
    package               VARCHAR(255),
    status                customer_status,
    description           TEXT,
    payment_status        payment_status  DEFAULT 'not_paid',
    payment_description   TEXT,
    payment_updated_at    TIMESTAMP,
    payment_method        payment_method,
    collected_amount      DECIMAL(10,2)   DEFAULT 0,
    balance_amount        DECIMAL(10,2)   DEFAULT 0,
    collected_by_username VARCHAR(100),
    box_number            VARCHAR(50),
    stb_number            VARCHAR(100),
    can_caf_id            VARCHAR(100),
    cin                   VARCHAR(100),
    area                  VARCHAR(100),
    permanent_discount    DECIMAL(5,2)    DEFAULT 0,
    branch_id             INT,

    -- Supplier/Vendor-specific
    contact_person        VARCHAR(255),
    tax_number            VARCHAR(30),
    opening_balance       DECIMAL(12,2)   DEFAULT 0,

    created_at            TIMESTAMP       NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, contact_type, mobile)
);

CREATE INDEX idx_contacts_org      ON contacts(organization_id);
CREATE INDEX idx_contacts_type     ON contacts(organization_id, contact_type);
CREATE INDEX idx_contacts_status   ON contacts(organization_id, status);
CREATE INDEX idx_contacts_payment  ON contacts(organization_id, payment_status);
CREATE INDEX idx_contacts_mobile   ON contacts(organization_id, mobile);

COMMENT ON COLUMN contacts.branch_id IS 'Logical reference to branch id in company_profile.branches JSONB';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 4: products (ISP service categories)
-- =============================================================================

CREATE TABLE products (
    id               SERIAL        PRIMARY KEY,
    organization_id  VARCHAR(50)   NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name             VARCHAR(100)  NOT NULL,
    product_type     product_type  NOT NULL,
    is_active        BOOLEAN       NOT NULL DEFAULT TRUE,
    cutoff_date      SMALLINT      CHECK (cutoff_date IS NULL OR (cutoff_date BETWEEN 1 AND 28)),
    cutoff_days      SMALLINT      CHECK (cutoff_days IS NULL OR cutoff_days >= 0),
    created_at       TIMESTAMP     NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, name)
);

CREATE INDEX idx_products_org    ON products(organization_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 5: plans
-- =============================================================================

CREATE TABLE plans (
    id                    SERIAL          PRIMARY KEY,
    organization_id       VARCHAR(50)    NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    provider              VARCHAR(100)   NOT NULL,
    plan_name             VARCHAR(255)   NOT NULL,
    image_url             TEXT,
    price                 DECIMAL(10,2)  NOT NULL,
    gst_rate              DECIMAL(5,2)   NOT NULL DEFAULT 18,
    installation_amount   DECIMAL(10,2)  NOT NULL DEFAULT 0,
    description           TEXT,
    permanent_discount    DECIMAL(5,2)   DEFAULT 0,
    created_at            TIMESTAMP      NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_plans_org      ON plans(organization_id);
CREATE INDEX idx_plans_provider ON plans(organization_id, provider);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 6: complaints
-- =============================================================================

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

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 7: invoices (single table: sales | purchase via kind)
-- =============================================================================

CREATE TABLE invoices (
    id               SERIAL          PRIMARY KEY,
    organization_id  VARCHAR(50)    NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    kind             invoice_kind   NOT NULL,

    invoice_number   VARCHAR(50)    NOT NULL,
    status           invoice_status NOT NULL DEFAULT 'draft',
    issue_date       DATE           NOT NULL,
    due_date         DATE,
    created_at       TIMESTAMP      NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP      NOT NULL DEFAULT NOW(),

    -- Sales-specific (kind = 'sales')
    branch_id        INT,
    contact_id       INT            REFERENCES contacts(id) ON DELETE SET NULL,
    customer_name    VARCHAR(255),
    service_provider VARCHAR(100),
    plan_name        VARCHAR(255),
    amount           DECIMAL(10,2),
    gst_rate         DECIMAL(5,2),
    gst_amount       DECIMAL(10,2),
    total_amount     DECIMAL(10,2),
    invoice_type     invoice_type   DEFAULT 'tax_invoice',
    place_of_supply  VARCHAR(100),
    hsn_sac          VARCHAR(20),

    -- Purchase-specific (kind = 'purchase')
    vendor_name      VARCHAR(255),
    reference        VARCHAR(100),
    cgst             DECIMAL(10,2)  DEFAULT 0,
    sgst             DECIMAL(10,2)  DEFAULT 0,
    igst             DECIMAL(10,2)  DEFAULT 0,

    UNIQUE (organization_id, invoice_number)
);

CREATE INDEX idx_invoices_org     ON invoices(organization_id);
CREATE INDEX idx_invoices_kind   ON invoices(organization_id, kind);
CREATE INDEX idx_invoices_status ON invoices(organization_id, status);
CREATE INDEX idx_invoices_contact ON invoices(contact_id);
CREATE INDEX idx_invoices_date   ON invoices(organization_id, issue_date);

COMMENT ON TABLE invoices IS 'Unified invoices: kind = sales | purchase';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 8: invoice_items (line items for both sales and purchase)
-- =============================================================================

CREATE TABLE invoice_items (
    id              SERIAL          PRIMARY KEY,
    invoice_id      INT            NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    product_id       INT,           -- inventory.id for purchase; FK added after inventory table
    product_name    VARCHAR(255)   NOT NULL,
    quantity        INT            NOT NULL DEFAULT 1,
    unit_price      DECIMAL(10,2)  NOT NULL,
    tax_rate        DECIMAL(5,2)   NOT NULL DEFAULT 0,
    tax_amount      DECIMAL(10,2)  NOT NULL DEFAULT 0,
    line_total      DECIMAL(10,2)  NOT NULL,
    created_at      TIMESTAMP      NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 9: connection_requests
-- =============================================================================

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
-- TABLE 10: company_profile (branches, sms, upi in one place)
-- branches: JSONB array of { id, name, location, address, phone, gstin, ... }
-- sms_*: provider, api_key, sender_id, template_id, enabled, templates JSONB
-- upi_*: upi_id, upi_display_name, upi_enabled, supported_apps JSONB
-- =============================================================================

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

    branches         JSONB         NOT NULL DEFAULT '[]',
    sms_enabled      BOOLEAN       NOT NULL DEFAULT FALSE,
    sms_provider     VARCHAR(50)   DEFAULT '',
    sms_api_key      VARCHAR(255)  DEFAULT '',
    sms_sender_id    VARCHAR(20)   DEFAULT '',
    sms_template_id  VARCHAR(100)  DEFAULT '',
    sms_templates    JSONB         NOT NULL DEFAULT '{}',
    upi_id           VARCHAR(100)  DEFAULT '',
    upi_display_name VARCHAR(255)  DEFAULT '',
    upi_enabled      BOOLEAN       NOT NULL DEFAULT FALSE,
    upi_supported_apps JSONB       NOT NULL DEFAULT '["gpay","phonepe","paytm","bhim"]',

    updated_at       TIMESTAMP     NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id)
);

COMMENT ON COLUMN company_profile.branches IS 'JSONB array of { id, name, location, address, phone, gstin, address_line1, city, state, country, pincode, is_active }';
COMMENT ON COLUMN company_profile.sms_templates IS 'JSONB e.g. { payment: "...", reminder: "..." } with placeholders';
COMMENT ON COLUMN company_profile.upi_supported_apps IS 'JSONB array of app keys';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 11: website_settings
-- =============================================================================

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

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 12: inventory (single table: product + category/unit/tax/warranty/variants)
-- category, subcategory, unit, tax_rate, warranty stored as names/denorm or JSONB.
-- variants: JSONB array of { name, sku, price, barcode, current_stock, ... }
-- =============================================================================

CREATE TABLE inventory (
    id                SERIAL                  PRIMARY KEY,
    organization_id   VARCHAR(50)             NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name              VARCHAR(255)            NOT NULL,
    sku               VARCHAR(100)           NOT NULL,
    category          VARCHAR(255),
    category_code     VARCHAR(50),
    subcategory       VARCHAR(255),
    unit              VARCHAR(50),
    unit_short_name   VARCHAR(20),
    tax_type          tax_type                NOT NULL DEFAULT 'exclusive',
    tax_rate_name     VARCHAR(100),
    tax_rate          DECIMAL(5,2),
    warranty_name     VARCHAR(100),
    warranty_duration INT,
    warranty_unit     duration_unit           DEFAULT 'months',
    description       TEXT,
    price             DECIMAL(10,2)          NOT NULL DEFAULT 0,
    purchase_price    DECIMAL(10,2),
    mrp               DECIMAL(10,2),
    image             TEXT,
    is_active         BOOLEAN                 NOT NULL DEFAULT TRUE,
    product_type      inventory_product_type  DEFAULT 'physical',
    brand             VARCHAR(100),
    hsn_sac_code      VARCHAR(20),
    current_stock     INT                     DEFAULT 0,
    stock_alert       INT,
    reorder_level     INT,
    tracking_type     tracking_type           NOT NULL DEFAULT 'none',
    barcode           VARCHAR(100),
    weight            DECIMAL(8,3),
    weight_unit       weight_unit,
    expiry_tracking   BOOLEAN                 NOT NULL DEFAULT FALSE,
    branch_id         INT,
    variants          JSONB                   NOT NULL DEFAULT '[]',
    created_at        TIMESTAMP               NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, sku)
);

CREATE INDEX idx_inventory_org      ON inventory(organization_id);
CREATE INDEX idx_inventory_active   ON inventory(organization_id, is_active);
CREATE INDEX idx_inventory_sku      ON inventory(organization_id, sku);
CREATE INDEX idx_inventory_barcode  ON inventory(barcode);

ALTER TABLE invoice_items
    ADD CONSTRAINT fk_invoice_items_product
    FOREIGN KEY (product_id) REFERENCES inventory(id) ON DELETE SET NULL;

COMMENT ON TABLE inventory IS 'Single inventory table: product + denormalized category/unit/tax/warranty; variants in JSONB';
COMMENT ON COLUMN inventory.variants IS 'JSONB array of variant objects (name, sku, price, barcode, current_stock, etc.)';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 13: pos (single table: header + items JSONB)
-- method: payment_method for the transaction.
-- =============================================================================

CREATE TABLE pos (
    id               SERIAL              PRIMARY KEY,
    organization_id  VARCHAR(50)         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    branch_id        INT,
    contact_id       INT                 REFERENCES contacts(id) ON DELETE SET NULL,
    customer_name    VARCHAR(255),
    subtotal         DECIMAL(10,2)       NOT NULL DEFAULT 0,
    tax_total        DECIMAL(10,2)       NOT NULL DEFAULT 0,
    discount_amount  DECIMAL(10,2)       NOT NULL DEFAULT 0,
    grand_total      DECIMAL(10,2)       NOT NULL DEFAULT 0,
    method           pos_payment_method  NOT NULL DEFAULT 'cash',
    status           pos_status          NOT NULL DEFAULT 'completed',
    notes            TEXT,
    items            JSONB               NOT NULL DEFAULT '[]',
    created_by       INT                 REFERENCES users(id) ON DELETE SET NULL,
    created_at       TIMESTAMP           NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pos_org     ON pos(organization_id);
CREATE INDEX idx_pos_contact ON pos(contact_id);
CREATE INDEX idx_pos_date    ON pos(organization_id, created_at);

COMMENT ON COLUMN pos.items IS 'JSONB array of { product_id, product_name, quantity, unit_price, tax_rate, tax_amount, line_total }';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 14: signup_requests
-- =============================================================================

CREATE TABLE signup_requests (
    id               SERIAL        PRIMARY KEY,
    name             VARCHAR(255)  NOT NULL,
    mobile           VARCHAR(15)   NOT NULL,
    email            VARCHAR(255)  NOT NULL,
    business_type    VARCHAR(100)  NOT NULL,
    business_name    VARCHAR(255)  NOT NULL,
    created_at       TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_signup_requests_date ON signup_requests(created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 15: sms_logs (audit trail only; config in company_profile)
-- =============================================================================

CREATE TABLE sms_logs (
    id               SERIAL        PRIMARY KEY,
    organization_id  VARCHAR(50)   NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    contact_id       INT           REFERENCES contacts(id) ON DELETE SET NULL,
    mobile           VARCHAR(15)   NOT NULL,
    message          TEXT          NOT NULL,
    sms_type         VARCHAR(50)   NOT NULL DEFAULT 'payment',
    status           sms_status    NOT NULL DEFAULT 'pending',
    provider_ref     VARCHAR(255),
    error_message    TEXT,
    sent_at          TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sms_logs_org     ON sms_logs(organization_id);
CREATE INDEX idx_sms_logs_contact ON sms_logs(contact_id);
CREATE INDEX idx_sms_logs_date    ON sms_logs(organization_id, sent_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- UPDATED_AT trigger
-- =============================================================================

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

CREATE TRIGGER set_updated_at_invoices
    BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
