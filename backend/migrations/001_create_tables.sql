-- =============================================================================
-- Popna — Multi-Industry Business Management Platform
-- PostgreSQL Schema Migration: 001_create_tables (Consolidated)
-- =============================================================================
-- Consolidated structure:
--   • organizations (industry_type, terminology for multi-industry)
--   • users (unified: super_admin | admin | employee)
--   • contacts (customers/suppliers/vendors + credit_limit, loyalty_points, tags, custom_fields JSONB)
--   • products, plans (ISP/service categories)
--   • activities (single table: complaints, connection_requests, appointments, service_requests, leads via kind + payload JSONB)
--   • invoices (kind: sales | purchase; single table)
--   • invoice_items (line items for invoices)
--   • documents (single table: quotations, purchase_orders, expenses via kind + items/payload JSONB)
--   • subscriptions (recurring billing)
--   • company_profile (branches, sms, upi, custom_field_schema JSONB)
--   • website_settings
--   • inventory (single table: product + variants/category/unit/tax in one)
--   • pos (header + items JSONB)
--   • audit_log (single table for all entity audit trail)
--   • signup_requests, sms_logs
--
-- Tables: 17 (minimal set for full platform)
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
CREATE TYPE invoice_status          AS ENUM ('draft', 'sent', 'paid', 'overdue');
CREATE TYPE invoice_type            AS ENUM ('tax_invoice', 'bill_of_supply');
CREATE TYPE invoice_kind            AS ENUM ('sales', 'purchase');
CREATE TYPE tax_type                AS ENUM ('inclusive', 'exclusive', 'none');
CREATE TYPE tax_rate_type           AS ENUM ('inclusive', 'exclusive');
CREATE TYPE inventory_product_type  AS ENUM ('physical', 'service', 'digital', 'bundle');
CREATE TYPE tracking_type           AS ENUM ('none', 'serial', 'batch');
CREATE TYPE weight_unit             AS ENUM ('g', 'kg', 'lb');
CREATE TYPE duration_unit           AS ENUM ('days', 'months', 'years');
CREATE TYPE pos_payment_method      AS ENUM ('cash', 'upi', 'card', 'bank_transfer', 'other');
CREATE TYPE pos_status              AS ENUM ('completed', 'refunded', 'voided');
CREATE TYPE sms_status              AS ENUM ('sent', 'failed', 'pending');
CREATE TYPE activity_kind           AS ENUM ('complaint', 'connection_request', 'appointment', 'service_request', 'lead');
CREATE TYPE document_kind           AS ENUM ('quotation', 'purchase_order', 'expense');

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 1: organizations
-- =============================================================================

CREATE TABLE organizations (
    id                    VARCHAR(50)           PRIMARY KEY,
    name                  VARCHAR(255)          NOT NULL,
    status                organization_status   NOT NULL DEFAULT 'active',
    allowed_modules       JSONB                 NOT NULL DEFAULT '[]',
    allowed_settings_tabs JSONB                 NOT NULL DEFAULT '[]',
    industry_type         VARCHAR(50)           DEFAULT 'general',
    terminology           JSONB                 NOT NULL DEFAULT '{}',
    subscription_start    DATE                  NOT NULL,
    subscription_end      DATE                  NOT NULL,
    created_at            TIMESTAMP             NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMP             NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE organizations IS 'Multi-tenant root; industry_type + terminology for multi-industry support';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 2: users
-- =============================================================================

CREATE TABLE users (
    id               SERIAL        PRIMARY KEY,
    organization_id  VARCHAR(50)   REFERENCES organizations(id) ON DELETE CASCADE,
    name             VARCHAR(255)  NOT NULL,
    username         VARCHAR(100)  NOT NULL,
    password_hash    VARCHAR(255)  NOT NULL,
    role             user_role     NOT NULL DEFAULT 'employee',
    status           user_status   NOT NULL DEFAULT 'active',
    allowed_modules  JSONB         NOT NULL DEFAULT '[]',
    branch_id        INT,
    allowed_permissions JSONB      DEFAULT '[]',
    created_at       TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_users_org_username ON users(organization_id, username) WHERE organization_id IS NOT NULL;
CREATE UNIQUE INDEX idx_users_superadmin_username ON users(username) WHERE organization_id IS NULL;
CREATE INDEX idx_users_org    ON users(organization_id);
CREATE INDEX idx_users_role   ON users(role);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 3: contacts (customers, suppliers, vendors + universal fields)
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

    -- Customer / payment
    password_hash         VARCHAR(255),
    connection_type       VARCHAR(100),
    package               VARCHAR(255),
    status                customer_status,
    description           TEXT,
    payment_status        payment_status  DEFAULT 'not_paid',
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
    payment_description   TEXT,
    payment_updated_at    TIMESTAMP,

    -- Supplier/Vendor
    contact_person        VARCHAR(255),
    tax_number            VARCHAR(30),
    opening_balance      DECIMAL(12,2)   DEFAULT 0,

    -- Universal (multi-industry)
    credit_limit          DECIMAL(12,2),
    loyalty_points        INT             DEFAULT 0,
    tags                  JSONB           NOT NULL DEFAULT '[]',
    custom_fields         JSONB           NOT NULL DEFAULT '{}',

    created_at            TIMESTAMP       NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, contact_type, mobile)
);

CREATE INDEX idx_contacts_org      ON contacts(organization_id);
CREATE INDEX idx_contacts_type     ON contacts(organization_id, contact_type);
CREATE INDEX idx_contacts_status   ON contacts(organization_id, status);
CREATE INDEX idx_contacts_payment  ON contacts(organization_id, payment_status);
CREATE INDEX idx_contacts_mobile   ON contacts(organization_id, mobile);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 4: products
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

CREATE INDEX idx_products_org ON products(organization_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 5: plans
-- =============================================================================

CREATE TABLE plans (
    id                    SERIAL          PRIMARY KEY,
    organization_id       VARCHAR(50)     NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    provider              VARCHAR(100)    NOT NULL,
    plan_name             VARCHAR(255)    NOT NULL,
    image_url             TEXT,
    price                 DECIMAL(10,2)   NOT NULL,
    gst_rate              DECIMAL(5,2)    NOT NULL DEFAULT 18,
    installation_amount   DECIMAL(10,2)   NOT NULL DEFAULT 0,
    description           TEXT,
    permanent_discount    DECIMAL(5,2)    DEFAULT 0,
    created_at            TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_plans_org      ON plans(organization_id);
CREATE INDEX idx_plans_provider ON plans(organization_id, provider);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 6: activities (complaints, connection_requests, appointments, service_requests, leads)
-- kind + payload JSONB hold all kind-specific fields. Minimal columns for filter/sort.
-- =============================================================================

CREATE TABLE activities (
    id               SERIAL          PRIMARY KEY,
    organization_id  VARCHAR(50)     NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    kind             activity_kind   NOT NULL,
    contact_id       INT             REFERENCES contacts(id) ON DELETE SET NULL,
    status           VARCHAR(50)     NOT NULL DEFAULT 'new',
    priority         VARCHAR(20),
    assigned_to      VARCHAR(255),
    payload          JSONB           NOT NULL DEFAULT '{}',
    created_at       TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activities_org     ON activities(organization_id);
CREATE INDEX idx_activities_kind   ON activities(organization_id, kind);
CREATE INDEX idx_activities_status ON activities(organization_id, kind, status);
CREATE INDEX idx_activities_contact ON activities(contact_id);
CREATE INDEX idx_activities_created ON activities(organization_id, created_at DESC);

COMMENT ON TABLE activities IS 'Unified: complaints, connection_requests, appointments, service_requests, leads. payload holds kind-specific fields.';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 7: invoices (sales | purchase)
-- =============================================================================

CREATE TABLE invoices (
    id               SERIAL          PRIMARY KEY,
    organization_id  VARCHAR(50)     NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    kind             invoice_kind   NOT NULL,

    invoice_number   VARCHAR(50)    NOT NULL,
    status           invoice_status  NOT NULL DEFAULT 'draft',
    issue_date       DATE            NOT NULL,
    due_date         DATE,
    created_at       TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP       NOT NULL DEFAULT NOW(),

    -- Sales (kind = sales); also used for POS-originated invoices
    branch_id        INT,
    contact_id       INT             REFERENCES contacts(id) ON DELETE SET NULL,
    customer_name    VARCHAR(255),
    service_provider VARCHAR(100),
    plan_name        VARCHAR(255),
    amount           DECIMAL(10,2),
    gst_rate         DECIMAL(5,2),
    gst_amount       DECIMAL(10,2),
    total_amount     DECIMAL(10,2),
    invoice_type     invoice_type    DEFAULT 'tax_invoice',
    place_of_supply  VARCHAR(100),
    hsn_sac          VARCHAR(20),

    -- Purchase (kind = purchase)
    vendor_name      VARCHAR(255),
    reference        VARCHAR(100),
    cgst             DECIMAL(10,2)   DEFAULT 0,
    sgst             DECIMAL(10,2)   DEFAULT 0,
    igst             DECIMAL(10,2)   DEFAULT 0,

    UNIQUE (organization_id, invoice_number)
);

CREATE INDEX idx_invoices_org     ON invoices(organization_id);
CREATE INDEX idx_invoices_kind   ON invoices(organization_id, kind);
CREATE INDEX idx_invoices_status ON invoices(organization_id, status);
CREATE INDEX idx_invoices_contact ON invoices(contact_id);
CREATE INDEX idx_invoices_date   ON invoices(organization_id, issue_date);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 8: invoice_items
-- =============================================================================

CREATE TABLE invoice_items (
    id              SERIAL          PRIMARY KEY,
    invoice_id      INT             NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    product_id      INT,
    product_name    VARCHAR(255)    NOT NULL,
    quantity        INT             NOT NULL DEFAULT 1,
    unit_price      DECIMAL(10,2)   NOT NULL,
    tax_rate        DECIMAL(5,2)    NOT NULL DEFAULT 0,
    discount        DECIMAL(10,2)   NOT NULL DEFAULT 0,
    line_total      DECIMAL(10,2)   NOT NULL,
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 9: company_profile (branches, sms, upi, custom_field_schema)
-- =============================================================================

CREATE TABLE company_profile (
    id                   SERIAL        PRIMARY KEY,
    organization_id      VARCHAR(50)   NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    company_name         VARCHAR(255)  NOT NULL DEFAULT '',
    gstin                VARCHAR(20),
    address_line1        VARCHAR(255),
    address_line2        VARCHAR(255),
    city                 VARCHAR(100),
    state                VARCHAR(100),
    country              VARCHAR(100)  DEFAULT 'India',
    pincode              VARCHAR(10),
    contact_number       VARCHAR(20),
    email                VARCHAR(255),

    branches             JSONB         NOT NULL DEFAULT '[]',
    sms_enabled          BOOLEAN       NOT NULL DEFAULT FALSE,
    sms_provider         VARCHAR(50)   DEFAULT '',
    sms_api_key          VARCHAR(255)  DEFAULT '',
    sms_sender_id        VARCHAR(20)   DEFAULT '',
    sms_template_id      VARCHAR(100)  DEFAULT '',
    sms_templates        JSONB         NOT NULL DEFAULT '{}',
    upi_id               VARCHAR(100)  DEFAULT '',
    upi_display_name     VARCHAR(255)  DEFAULT '',
    upi_enabled          BOOLEAN       NOT NULL DEFAULT FALSE,
    upi_supported_apps   JSONB         NOT NULL DEFAULT '["gpay","phonepe","paytm","bhim"]',

    custom_field_schema  JSONB         NOT NULL DEFAULT '[]',

    updated_at           TIMESTAMP     NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id)
);

COMMENT ON COLUMN company_profile.custom_field_schema IS 'Array of { id, name, label, labels?, type, entity } for custom fields';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 10: website_settings
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
-- TABLE 11: inventory
-- =============================================================================

CREATE TABLE inventory (
    id                SERIAL                  PRIMARY KEY,
    organization_id   VARCHAR(50)             NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name              VARCHAR(255)            NOT NULL,
    sku               VARCHAR(100)            NOT NULL,
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
    price             DECIMAL(10,2)           NOT NULL DEFAULT 0,
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
    batch_number      VARCHAR(100),
    expiry_date       DATE,
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

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 12: pos
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

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 13: documents (quotations, purchase_orders, expenses)
-- kind + items JSONB (for quotation/PO line items) + payload JSONB (kind-specific)
-- =============================================================================

CREATE TABLE documents (
    id               SERIAL          PRIMARY KEY,
    organization_id  VARCHAR(50)     NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    kind             document_kind   NOT NULL,
    contact_id       INT             REFERENCES contacts(id) ON DELETE SET NULL,
    vendor_id        INT             REFERENCES contacts(id) ON DELETE SET NULL,
    document_number  VARCHAR(50)     NOT NULL,
    status           VARCHAR(50)     NOT NULL DEFAULT 'draft',
    subtotal         DECIMAL(12,2)   DEFAULT 0,
    tax_total        DECIMAL(12,2)   DEFAULT 0,
    discount_amount  DECIMAL(12,2)   DEFAULT 0,
    total_amount     DECIMAL(12,2)   NOT NULL DEFAULT 0,
    items            JSONB           NOT NULL DEFAULT '[]',
    payload          JSONB           NOT NULL DEFAULT '{}',
    created_at       TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP       NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, kind, document_number)
);

CREATE INDEX idx_documents_org   ON documents(organization_id);
CREATE INDEX idx_documents_kind  ON documents(organization_id, kind);
CREATE INDEX idx_documents_status ON documents(organization_id, kind, status);
CREATE INDEX idx_documents_contact ON documents(contact_id);

COMMENT ON TABLE documents IS 'Unified: quotations, purchase_orders, expenses. items = line items; payload = kind-specific (e.g. valid_until, category, payment_method, payment_date).';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 14: subscriptions
-- =============================================================================

CREATE TABLE subscriptions (
    id                SERIAL          PRIMARY KEY,
    organization_id   VARCHAR(50)     NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    contact_id        INT             NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    plan_name         VARCHAR(255)    NOT NULL,
    amount            DECIMAL(10,2)   NOT NULL,
    billing_cycle     VARCHAR(20)     NOT NULL DEFAULT 'monthly',
    start_date        DATE            NOT NULL,
    next_billing_date DATE            NOT NULL,
    status            VARCHAR(20)     NOT NULL DEFAULT 'active',
    auto_renew        BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_org    ON subscriptions(organization_id);
CREATE INDEX idx_subscriptions_contact ON subscriptions(contact_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(organization_id, status);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 15: audit_log
-- =============================================================================

CREATE TABLE audit_log (
    id               SERIAL          PRIMARY KEY,
    organization_id  VARCHAR(50)     NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id          INT             REFERENCES users(id) ON DELETE SET NULL,
    username         VARCHAR(100),
    entity_type      VARCHAR(100)    NOT NULL,
    entity_id        VARCHAR(50),
    action           VARCHAR(50)     NOT NULL,
    meta             JSONB           DEFAULT '{}',
    created_at       TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_log_org   ON audit_log(organization_id);
CREATE INDEX idx_audit_log_entity ON audit_log(organization_id, entity_type, entity_id);
CREATE INDEX idx_audit_log_date  ON audit_log(organization_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 16: signup_requests
-- =============================================================================

CREATE TABLE signup_requests (
    id             SERIAL        PRIMARY KEY,
    name           VARCHAR(255)  NOT NULL,
    mobile         VARCHAR(15)   NOT NULL,
    email          VARCHAR(255)  NOT NULL,
    business_type  VARCHAR(100)  NOT NULL,
    business_name  VARCHAR(255)  NOT NULL,
    created_at     TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_signup_requests_date ON signup_requests(created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 17: sms_logs
-- =============================================================================

CREATE TABLE sms_logs (
    id               SERIAL        PRIMARY KEY,
    organization_id  VARCHAR(50)    NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    contact_id       INT            REFERENCES contacts(id) ON DELETE SET NULL,
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

CREATE TRIGGER set_updated_at_activities
    BEFORE UPDATE ON activities
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_documents
    BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
