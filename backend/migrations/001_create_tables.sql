-- =============================================================================
-- Popna — Multi-Industry Business Management Platform
-- PostgreSQL Schema Migration: 001_create_tables (Consolidated)
-- =============================================================================
-- Consolidated structure (11 tables):
--   • organizations (industry_type, terminology for multi-industry)
--   • users (unified: super_admin | admin | employee)
--   • contacts (customers/suppliers/vendors + credit_limit, loyalty_points, tags, custom_fields JSONB)
--   • inventory (unified catalog: general products, ISP categories, ISP plans via catalog_type + meta JSONB)
--   • activities (single table: complaints, connection_requests, appointments, service_requests, leads via kind + payload JSONB)
--   • invoices (sales | purchase | pos; line items as JSONB; kind-specific data in payload JSONB)
--   • documents (quotations, purchase_orders, expenses via kind + items/payload JSONB)
--   • subscriptions (recurring billing)
--   • settings (company profile + branches + sms + upi + custom_field_schema + website JSONB)
--   • audit_log (all entity audit trail + SMS logs via entity_type='sms')
--   • signup_requests
--
-- Tables: 11 (minimal set for full platform)
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TYPE organization_status  AS ENUM ('active', 'disabled', 'suspended');
CREATE TYPE user_role            AS ENUM ('super_admin', 'admin', 'employee');
CREATE TYPE user_status          AS ENUM ('active', 'inactive');
CREATE TYPE contact_type         AS ENUM ('customer', 'supplier', 'vendor');
CREATE TYPE customer_status      AS ENUM ('Active', 'Inactive');
CREATE TYPE payment_status       AS ENUM ('paid', 'not_paid');
CREATE TYPE payment_method       AS ENUM ('cash', 'upi', 'card', 'bank_transfer', 'other');
CREATE TYPE catalog_type         AS ENUM ('product', 'isp_category', 'isp_plan');
CREATE TYPE product_form         AS ENUM ('physical', 'service', 'digital', 'bundle');
CREATE TYPE tax_type             AS ENUM ('inclusive', 'exclusive', 'none');
CREATE TYPE tracking_type        AS ENUM ('none', 'serial', 'batch');
CREATE TYPE weight_unit          AS ENUM ('g', 'kg', 'lb');
CREATE TYPE duration_unit        AS ENUM ('days', 'months', 'years');
CREATE TYPE activity_kind        AS ENUM ('complaint', 'connection_request', 'appointment', 'service_request', 'lead');
CREATE TYPE invoice_kind         AS ENUM ('sales', 'purchase', 'pos');
CREATE TYPE invoice_status       AS ENUM ('draft', 'sent', 'paid', 'overdue', 'completed', 'refunded', 'voided');
CREATE TYPE invoice_type         AS ENUM ('tax_invoice', 'bill_of_supply');
CREATE TYPE document_kind        AS ENUM ('quotation', 'purchase_order', 'expense');

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 1: organizations
-- ─────────────────────────────────────────────────────────────────────────────

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
-- ─────────────────────────────────────────────────────────────────────────────

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
-- ─────────────────────────────────────────────────────────────────────────────

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
    opening_balance       DECIMAL(12,2)   DEFAULT 0,

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
-- TABLE 4: inventory (unified catalog: products + ISP categories + ISP plans)
-- catalog_type discriminator: 'product' | 'isp_category' | 'isp_plan'
-- meta JSONB holds kind-specific fields
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE inventory (
    id                SERIAL          PRIMARY KEY,
    organization_id   VARCHAR(50)     NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Discriminator
    catalog_type      catalog_type    NOT NULL DEFAULT 'product',

    name              VARCHAR(255)    NOT NULL,
    sku               VARCHAR(100),
    category          VARCHAR(255),
    category_code     VARCHAR(50),
    subcategory       VARCHAR(255),
    unit              VARCHAR(50),
    unit_short_name   VARCHAR(20),
    description       TEXT,
    price             DECIMAL(10,2)   NOT NULL DEFAULT 0,
    purchase_price    DECIMAL(10,2),
    mrp               DECIMAL(10,2),
    image             TEXT,
    is_active         BOOLEAN         NOT NULL DEFAULT TRUE,

    -- Product classification
    product_form      product_form    DEFAULT 'physical',
    brand             VARCHAR(100),
    hsn_sac_code      VARCHAR(20),

    -- Tax
    tax_type          tax_type        NOT NULL DEFAULT 'exclusive',
    tax_rate_name     VARCHAR(100),
    tax_rate          DECIMAL(5,2),

    -- Warranty
    warranty_name     VARCHAR(100),
    warranty_duration INT,
    warranty_unit     duration_unit   DEFAULT 'months',

    -- Stock management (catalog_type = 'product' only)
    current_stock     INT             DEFAULT 0,
    stock_alert       INT,
    reorder_level     INT,
    tracking_type     tracking_type   NOT NULL DEFAULT 'none',
    barcode           VARCHAR(100),
    weight            DECIMAL(8,3),
    weight_unit       weight_unit,
    expiry_tracking   BOOLEAN         NOT NULL DEFAULT FALSE,
    branch_id         INT,
    batch_number      VARCHAR(100),
    expiry_date       DATE,
    variants          JSONB           NOT NULL DEFAULT '[]',

    -- Kind-specific data
    -- isp_category: { "isp_type": "cable"|"internet", "cutoff_date": 10, "cutoff_days": 7 }
    -- isp_plan:     { "provider": "Cable", "gst_rate": 18, "installation_amount": 500, "permanent_discount": 0 }
    -- product:      {} (or any custom extension data)
    meta              JSONB           NOT NULL DEFAULT '{}',

    created_at        TIMESTAMP       NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, sku)
);

CREATE INDEX idx_inventory_org          ON inventory(organization_id);
CREATE INDEX idx_inventory_catalog_type ON inventory(organization_id, catalog_type);
CREATE INDEX idx_inventory_active       ON inventory(organization_id, is_active);
CREATE INDEX idx_inventory_sku          ON inventory(organization_id, sku);
CREATE INDEX idx_inventory_barcode      ON inventory(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX idx_inventory_category     ON inventory(organization_id, category);
CREATE INDEX idx_inventory_meta         ON inventory USING GIN (meta);

COMMENT ON TABLE inventory IS 'Unified catalog: general products (catalog_type=product), ISP service categories (isp_category), ISP pricing plans (isp_plan). meta JSONB holds kind-specific fields.';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 5: activities (complaints, connection_requests, appointments, service_requests, leads)
-- kind + payload JSONB hold all kind-specific fields
-- ─────────────────────────────────────────────────────────────────────────────

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
CREATE INDEX idx_activities_kind    ON activities(organization_id, kind);
CREATE INDEX idx_activities_status  ON activities(organization_id, kind, status);
CREATE INDEX idx_activities_contact ON activities(contact_id);
CREATE INDEX idx_activities_created ON activities(organization_id, created_at DESC);

COMMENT ON TABLE activities IS 'Unified: complaints, connection_requests, appointments, service_requests, leads. payload JSONB holds kind-specific fields.';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 6: invoices (sales | purchase | pos — with line items as JSONB)
-- Absorbs: invoice_items (→ items JSONB), pos (→ kind='pos')
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE invoices (
    id               SERIAL          PRIMARY KEY,
    organization_id  VARCHAR(50)     NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    kind             invoice_kind    NOT NULL,

    invoice_number   VARCHAR(50)     NOT NULL,
    status           invoice_status  NOT NULL DEFAULT 'draft',
    issue_date       DATE            NOT NULL,
    due_date         DATE,

    -- Parties
    branch_id        INT,
    contact_id       INT             REFERENCES contacts(id) ON DELETE SET NULL,
    customer_name    VARCHAR(255),
    vendor_name      VARCHAR(255),

    -- Financials
    subtotal         DECIMAL(12,2)   DEFAULT 0,
    tax_total        DECIMAL(12,2)   DEFAULT 0,
    discount_amount  DECIMAL(12,2)   DEFAULT 0,
    total_amount     DECIMAL(12,2)   NOT NULL DEFAULT 0,

    -- Line items (replaces invoice_items table)
    -- Array of: { productId, productName, quantity, unitPrice, taxRate, discount, lineTotal }
    items            JSONB           NOT NULL DEFAULT '[]',

    -- Kind-specific data
    -- sales:    { serviceProvider, planName, gstRate, gstAmount, invoiceType, placeOfSupply, hsnSac }
    -- purchase: { reference, cgst, sgst, igst }
    -- pos:      { method, createdBy, notes }
    payload          JSONB           NOT NULL DEFAULT '{}',

    created_at       TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP       NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, invoice_number)
);

CREATE INDEX idx_invoices_org     ON invoices(organization_id);
CREATE INDEX idx_invoices_kind    ON invoices(organization_id, kind);
CREATE INDEX idx_invoices_status  ON invoices(organization_id, status);
CREATE INDEX idx_invoices_contact ON invoices(contact_id);
CREATE INDEX idx_invoices_date    ON invoices(organization_id, issue_date);
CREATE INDEX idx_invoices_pos     ON invoices(organization_id, created_at DESC) WHERE kind = 'pos';

COMMENT ON TABLE invoices IS 'Unified: sales invoices, purchase invoices, POS transactions. items JSONB holds line items. payload JSONB holds kind-specific fields.';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 7: documents (quotations, purchase_orders, expenses)
-- kind + items JSONB (for quotation/PO line items) + payload JSONB (kind-specific)
-- ─────────────────────────────────────────────────────────────────────────────

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

CREATE INDEX idx_documents_org     ON documents(organization_id);
CREATE INDEX idx_documents_kind    ON documents(organization_id, kind);
CREATE INDEX idx_documents_status  ON documents(organization_id, kind, status);
CREATE INDEX idx_documents_contact ON documents(contact_id);

COMMENT ON TABLE documents IS 'Unified: quotations, purchase_orders, expenses. items JSONB = line items; payload JSONB = kind-specific (e.g. valid_until, category, payment_method, payment_date).';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 8: subscriptions
-- ─────────────────────────────────────────────────────────────────────────────

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

CREATE INDEX idx_subscriptions_org     ON subscriptions(organization_id);
CREATE INDEX idx_subscriptions_contact ON subscriptions(contact_id);
CREATE INDEX idx_subscriptions_status  ON subscriptions(organization_id, status);
CREATE INDEX idx_subscriptions_billing ON subscriptions(next_billing_date) WHERE status = 'active';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 9: settings (merges company_profile + website_settings)
-- Single row per org with company fields as columns + website as JSONB
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE settings (
    id                   SERIAL        PRIMARY KEY,
    organization_id      VARCHAR(50)   NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Company profile
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

    -- Branches
    branches             JSONB         NOT NULL DEFAULT '[]',

    -- SMS config
    sms_enabled          BOOLEAN       NOT NULL DEFAULT FALSE,
    sms_provider         VARCHAR(50)   DEFAULT '',
    sms_api_key          VARCHAR(255)  DEFAULT '',
    sms_sender_id        VARCHAR(20)   DEFAULT '',
    sms_template_id      VARCHAR(100)  DEFAULT '',
    sms_templates        JSONB         NOT NULL DEFAULT '{}',

    -- UPI config
    upi_id               VARCHAR(100)  DEFAULT '',
    upi_display_name     VARCHAR(255)  DEFAULT '',
    upi_enabled          BOOLEAN       NOT NULL DEFAULT FALSE,
    upi_supported_apps   JSONB         NOT NULL DEFAULT '["gpay","phonepe","paytm","bhim"]',

    -- Custom fields schema
    custom_field_schema  JSONB         NOT NULL DEFAULT '[]',

    -- Website settings (JSONB blob — always read/written atomically)
    -- { heroTitle, heroSubtitle, heroDescription, heroImage, highlightSectionTitle,
    --   highlightCards, ctaButtonText, ctaButtonLink }
    website              JSONB         NOT NULL DEFAULT '{}',

    updated_at           TIMESTAMP     NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id)
);

COMMENT ON COLUMN settings.custom_field_schema IS 'Array of { id, name, label, labels?, type, entity } for custom fields';
COMMENT ON COLUMN settings.website IS 'Website settings: heroTitle, heroSubtitle, heroDescription, heroImage, highlightSectionTitle, highlightCards[], ctaButtonText, ctaButtonLink';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 10: audit_log (absorbs sms_logs via entity_type='sms')
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE audit_log (
    id               SERIAL          PRIMARY KEY,
    organization_id  VARCHAR(50)     NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id          INT             REFERENCES users(id) ON DELETE SET NULL,
    username         VARCHAR(100),
    entity_type      VARCHAR(100)    NOT NULL,
        -- Standard: 'contact', 'invoice', 'inventory', 'activity', 'document',
        --           'subscription', 'settings', 'user'
        -- SMS:      'sms' (absorbs sms_logs)
    entity_id        VARCHAR(50),
    action           VARCHAR(50)     NOT NULL,
        -- Standard: 'create', 'update', 'delete', 'login', 'logout', 'export'
        -- SMS:      'sms_sent', 'sms_failed'
    meta             JSONB           DEFAULT '{}',
        -- For entity_type='sms': { contactId, mobile, message, smsType, status, providerRef, errorMessage }
    created_at       TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_log_org    ON audit_log(organization_id);
CREATE INDEX idx_audit_log_entity ON audit_log(organization_id, entity_type, entity_id);
CREATE INDEX idx_audit_log_date   ON audit_log(organization_id, created_at DESC);
CREATE INDEX idx_audit_log_sms    ON audit_log(organization_id, created_at DESC) WHERE entity_type = 'sms';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 11: signup_requests
-- ─────────────────────────────────────────────────────────────────────────────

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
-- UPDATED_AT trigger
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

CREATE TRIGGER set_updated_at_settings
    BEFORE UPDATE ON settings
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
