-- =============================================================================
-- Popna — Multi-Industry Business Management Platform
-- MySQL Schema Migration: 001_create_tables (Consolidated)
-- =============================================================================
-- Consolidated structure (11 tables):
--   • organizations (industry_type, terminology for multi-industry)
--   • users (unified: super_admin | admin | employee)
--   • contacts (customers/suppliers/vendors + credit_limit, loyalty_points, tags, custom_fields JSON)
--   • inventory (unified catalog: general products, ISP categories, ISP plans via catalog_type + meta JSON)
--   • activities (single table: complaints, connection_requests, appointments, service_requests, leads via kind + payload JSON)
--   • invoices (sales | purchase | pos; line items as JSON; kind-specific data in payload JSON)
--   • documents (quotations, purchase_orders, expenses via kind + items/payload JSON)
--   • subscriptions (recurring billing)
--   • settings (company profile + branches + sms + upi + custom_field_schema + website JSON)
--   • audit_log (all entity audit trail + SMS logs via entity_type='sms')
--   • signup_requests
--
-- Tables: 11 (minimal set for full platform)
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- NOTE: MySQL uses inline ENUM types (no separate CREATE TYPE needed)
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 1: organizations
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE organizations (
    id                    VARCHAR(50)           PRIMARY KEY,
    name                  VARCHAR(255)          NOT NULL,
    status                ENUM('active', 'disabled', 'suspended') NOT NULL DEFAULT 'active',
    allowed_modules       JSON                  NOT NULL,
    allowed_settings_tabs JSON                  NOT NULL,
    industry_type         VARCHAR(50)           DEFAULT 'general',
    terminology           JSON                  NOT NULL,
    subscription_start    DATE                  NOT NULL,
    subscription_end      DATE                  NOT NULL,
    created_at            TIMESTAMP             NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP             NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) COMMENT = 'Multi-tenant root; industry_type + terminology for multi-industry support';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 2: users
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE users (
    id               INT AUTO_INCREMENT  PRIMARY KEY,
    organization_id  VARCHAR(50),
    name             VARCHAR(255)  NOT NULL,
    username         VARCHAR(100)  NOT NULL,
    password_hash    VARCHAR(255)  NOT NULL,
    role             ENUM('super_admin', 'admin', 'employee') NOT NULL DEFAULT 'employee',
    status           ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    allowed_modules  JSON          NOT NULL,
    branch_id        INT,
    allowed_permissions JSON,
    created_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- MySQL doesn't support partial unique indexes; use a generated column + unique index approach
ALTER TABLE users ADD COLUMN _org_username_key VARCHAR(150) AS (
    CASE WHEN organization_id IS NOT NULL THEN CONCAT(organization_id, '::', username) ELSE NULL END
) STORED;
CREATE UNIQUE INDEX idx_users_org_username ON users(_org_username_key);

-- For super_admin uniqueness (org IS NULL), use another generated column
ALTER TABLE users ADD COLUMN _superadmin_username_key VARCHAR(100) AS (
    CASE WHEN organization_id IS NULL THEN username ELSE NULL END
) STORED;
CREATE UNIQUE INDEX idx_users_superadmin_username ON users(_superadmin_username_key);

CREATE INDEX idx_users_org    ON users(organization_id);
CREATE INDEX idx_users_role   ON users(role);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 3: contacts (customers, suppliers, vendors + universal fields)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE contacts (
    id                    INT AUTO_INCREMENT  PRIMARY KEY,
    organization_id       VARCHAR(50)     NOT NULL,
    contact_type          ENUM('customer', 'supplier', 'vendor') NOT NULL DEFAULT 'customer',

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
    additional_addresses  JSON,

    -- Customer / payment
    password_hash         VARCHAR(255),
    connection_type       VARCHAR(100),
    package               VARCHAR(255),
    status                ENUM('Active', 'Inactive'),
    description           TEXT,
    payment_status        ENUM('paid', 'not_paid') DEFAULT 'not_paid',
    payment_method        ENUM('cash', 'upi', 'card', 'bank_transfer', 'other'),
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
    payment_updated_at    TIMESTAMP       NULL,

    -- Supplier/Vendor
    contact_person        VARCHAR(255),
    tax_number            VARCHAR(30),
    opening_balance       DECIMAL(12,2)   DEFAULT 0,

    -- Universal (multi-industry)
    credit_limit          DECIMAL(12,2),
    loyalty_points        INT             DEFAULT 0,
    tags                  JSON            NOT NULL,
    custom_fields         JSON            NOT NULL,

    created_at            TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_contacts_org_type_mobile (organization_id, contact_type, mobile),
    CONSTRAINT fk_contacts_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX idx_contacts_org      ON contacts(organization_id);
CREATE INDEX idx_contacts_type     ON contacts(organization_id, contact_type);
CREATE INDEX idx_contacts_status   ON contacts(organization_id, status);
CREATE INDEX idx_contacts_payment  ON contacts(organization_id, payment_status);
CREATE INDEX idx_contacts_mobile   ON contacts(organization_id, mobile);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 4: inventory (unified catalog: products + ISP categories + ISP plans)
-- catalog_type discriminator: 'product' | 'isp_category' | 'isp_plan'
-- meta JSON holds kind-specific fields
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE inventory (
    id                INT AUTO_INCREMENT  PRIMARY KEY,
    organization_id   VARCHAR(50)     NOT NULL,

    -- Discriminator
    catalog_type      ENUM('product', 'isp_category', 'isp_plan') NOT NULL DEFAULT 'product',

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
    product_form      ENUM('physical', 'service', 'digital', 'bundle') DEFAULT 'physical',
    brand             VARCHAR(100),
    hsn_sac_code      VARCHAR(20),

    -- Tax
    tax_type          ENUM('inclusive', 'exclusive', 'none') NOT NULL DEFAULT 'exclusive',
    tax_rate_name     VARCHAR(100),
    tax_rate          DECIMAL(5,2),

    -- Warranty
    warranty_name     VARCHAR(100),
    warranty_duration INT,
    warranty_unit     ENUM('days', 'months', 'years') DEFAULT 'months',

    -- Stock management (catalog_type = 'product' only)
    current_stock     INT             DEFAULT 0,
    stock_alert       INT,
    reorder_level     INT,
    tracking_type     ENUM('none', 'serial', 'batch') NOT NULL DEFAULT 'none',
    barcode           VARCHAR(100),
    weight            DECIMAL(8,3),
    weight_unit       ENUM('g', 'kg', 'lb'),
    expiry_tracking   BOOLEAN         NOT NULL DEFAULT FALSE,
    branch_id         INT,
    batch_number      VARCHAR(100),
    expiry_date       DATE,
    variants          JSON            NOT NULL,

    -- Kind-specific data
    -- isp_category: { "isp_type": "cable"|"internet", "cutoff_date": 10, "cutoff_days": 7 }
    -- isp_plan:     { "provider": "Cable", "gst_rate": 18, "installation_amount": 500, "permanent_discount": 0 }
    -- product:      {} (or any custom extension data)
    meta              JSON            NOT NULL,

    created_at        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_inventory_org_sku (organization_id, sku),
    CONSTRAINT fk_inventory_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
) COMMENT = 'Unified catalog: general products (catalog_type=product), ISP service categories (isp_category), ISP pricing plans (isp_plan). meta JSON holds kind-specific fields.';

CREATE INDEX idx_inventory_org          ON inventory(organization_id);
CREATE INDEX idx_inventory_catalog_type ON inventory(organization_id, catalog_type);
CREATE INDEX idx_inventory_active       ON inventory(organization_id, is_active);
CREATE INDEX idx_inventory_sku          ON inventory(organization_id, sku);
CREATE INDEX idx_inventory_barcode      ON inventory(barcode);
CREATE INDEX idx_inventory_category     ON inventory(organization_id, category);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 5: activities (complaints, connection_requests, appointments, service_requests, leads)
-- kind + payload JSON hold all kind-specific fields
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE activities (
    id               INT AUTO_INCREMENT  PRIMARY KEY,
    organization_id  VARCHAR(50)     NOT NULL,
    kind             ENUM('complaint', 'connection_request', 'appointment', 'service_request', 'lead') NOT NULL,
    contact_id       INT,
    status           VARCHAR(50)     NOT NULL DEFAULT 'new',
    priority         VARCHAR(20),
    assigned_to      VARCHAR(255),
    payload          JSON            NOT NULL,
    created_at       TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_activities_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT fk_activities_contact FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL
) COMMENT = 'Unified: complaints, connection_requests, appointments, service_requests, leads. payload JSON holds kind-specific fields.';

CREATE INDEX idx_activities_org     ON activities(organization_id);
CREATE INDEX idx_activities_kind    ON activities(organization_id, kind);
CREATE INDEX idx_activities_status  ON activities(organization_id, kind, status);
CREATE INDEX idx_activities_contact ON activities(contact_id);
CREATE INDEX idx_activities_created ON activities(organization_id, created_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 6: invoices (sales | purchase | pos — with line items as JSON)
-- Absorbs: invoice_items (→ items JSON), pos (→ kind='pos')
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE invoices (
    id               INT AUTO_INCREMENT  PRIMARY KEY,
    organization_id  VARCHAR(50)     NOT NULL,
    kind             ENUM('sales', 'purchase', 'pos') NOT NULL,

    invoice_number   VARCHAR(50)     NOT NULL,
    status           ENUM('draft', 'sent', 'paid', 'overdue', 'completed', 'refunded', 'voided') NOT NULL DEFAULT 'draft',
    issue_date       DATE            NOT NULL,
    due_date         DATE,

    -- Parties
    branch_id        INT,
    contact_id       INT,
    customer_name    VARCHAR(255),
    vendor_name      VARCHAR(255),

    -- Financials
    subtotal         DECIMAL(12,2)   DEFAULT 0,
    tax_total        DECIMAL(12,2)   DEFAULT 0,
    discount_amount  DECIMAL(12,2)   DEFAULT 0,
    total_amount     DECIMAL(12,2)   NOT NULL DEFAULT 0,

    -- Line items (replaces invoice_items table)
    -- Array of: { productId, productName, quantity, unitPrice, taxRate, discount, lineTotal }
    items            JSON            NOT NULL,

    -- Kind-specific data
    -- sales:    { serviceProvider, planName, gstRate, gstAmount, invoiceType, placeOfSupply, hsnSac }
    -- purchase: { reference, cgst, sgst, igst }
    -- pos:      { method, createdBy, notes }
    payload          JSON            NOT NULL,

    created_at       TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_invoices_org_number (organization_id, invoice_number),
    CONSTRAINT fk_invoices_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT fk_invoices_contact FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL
) COMMENT = 'Unified: sales invoices, purchase invoices, POS transactions. items JSON holds line items. payload JSON holds kind-specific fields.';

CREATE INDEX idx_invoices_org     ON invoices(organization_id);
CREATE INDEX idx_invoices_kind    ON invoices(organization_id, kind);
CREATE INDEX idx_invoices_status  ON invoices(organization_id, status);
CREATE INDEX idx_invoices_contact ON invoices(contact_id);
CREATE INDEX idx_invoices_date    ON invoices(organization_id, issue_date);
CREATE INDEX idx_invoices_pos     ON invoices(organization_id, kind, created_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 7: documents (quotations, purchase_orders, expenses)
-- kind + items JSON (for quotation/PO line items) + payload JSON (kind-specific)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE documents (
    id               INT AUTO_INCREMENT  PRIMARY KEY,
    organization_id  VARCHAR(50)     NOT NULL,
    kind             ENUM('quotation', 'purchase_order', 'expense') NOT NULL,
    contact_id       INT,
    vendor_id        INT,
    document_number  VARCHAR(50)     NOT NULL,
    status           VARCHAR(50)     NOT NULL DEFAULT 'draft',
    subtotal         DECIMAL(12,2)   DEFAULT 0,
    tax_total        DECIMAL(12,2)   DEFAULT 0,
    discount_amount  DECIMAL(12,2)   DEFAULT 0,
    total_amount     DECIMAL(12,2)   NOT NULL DEFAULT 0,
    items            JSON            NOT NULL,
    payload          JSON            NOT NULL,
    created_at       TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_documents_org_kind_number (organization_id, kind, document_number),
    CONSTRAINT fk_documents_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT fk_documents_contact FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL,
    CONSTRAINT fk_documents_vendor FOREIGN KEY (vendor_id) REFERENCES contacts(id) ON DELETE SET NULL
) COMMENT = 'Unified: quotations, purchase_orders, expenses. items JSON = line items; payload JSON = kind-specific (e.g. valid_until, category, payment_method, payment_date).';

CREATE INDEX idx_documents_org     ON documents(organization_id);
CREATE INDEX idx_documents_kind    ON documents(organization_id, kind);
CREATE INDEX idx_documents_status  ON documents(organization_id, kind, status);
CREATE INDEX idx_documents_contact ON documents(contact_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 8: subscriptions
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE subscriptions (
    id                INT AUTO_INCREMENT  PRIMARY KEY,
    organization_id   VARCHAR(50)     NOT NULL,
    contact_id        INT             NOT NULL,
    plan_name         VARCHAR(255)    NOT NULL,
    amount            DECIMAL(10,2)   NOT NULL,
    billing_cycle     VARCHAR(20)     NOT NULL DEFAULT 'monthly',
    start_date        DATE            NOT NULL,
    next_billing_date DATE            NOT NULL,
    status            VARCHAR(20)     NOT NULL DEFAULT 'active',
    auto_renew        BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_subscriptions_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT fk_subscriptions_contact FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
);

CREATE INDEX idx_subscriptions_org     ON subscriptions(organization_id);
CREATE INDEX idx_subscriptions_contact ON subscriptions(contact_id);
CREATE INDEX idx_subscriptions_status  ON subscriptions(organization_id, status);
CREATE INDEX idx_subscriptions_billing ON subscriptions(next_billing_date, status);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 9: settings (merges company_profile + website_settings)
-- Single row per org with company fields as columns + website as JSON
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE settings (
    id                   INT AUTO_INCREMENT  PRIMARY KEY,
    organization_id      VARCHAR(50)   NOT NULL,

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
    branches             JSON          NOT NULL,

    -- SMS config
    sms_enabled          BOOLEAN       NOT NULL DEFAULT FALSE,
    sms_provider         VARCHAR(50)   DEFAULT '',
    sms_api_key          VARCHAR(255)  DEFAULT '',
    sms_sender_id        VARCHAR(20)   DEFAULT '',
    sms_template_id      VARCHAR(100)  DEFAULT '',
    sms_templates        JSON          NOT NULL,

    -- UPI config
    upi_id               VARCHAR(100)  DEFAULT '',
    upi_display_name     VARCHAR(255)  DEFAULT '',
    upi_enabled          BOOLEAN       NOT NULL DEFAULT FALSE,
    upi_supported_apps   JSON          NOT NULL,

    -- Custom fields schema (Array of { id, name, label, labels?, type, entity })
    custom_field_schema  JSON          NOT NULL,

    -- Website settings (JSON blob — always read/written atomically)
    -- { heroTitle, heroSubtitle, heroDescription, heroImage, highlightSectionTitle,
    --   highlightCards, ctaButtonText, ctaButtonLink }
    website              JSON          NOT NULL,

    updated_at           TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_settings_org (organization_id),
    CONSTRAINT fk_settings_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 10: audit_log (absorbs sms_logs via entity_type='sms')
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE audit_log (
    id               INT AUTO_INCREMENT  PRIMARY KEY,
    organization_id  VARCHAR(50)     NOT NULL,
    user_id          INT,
    username         VARCHAR(100),
    entity_type      VARCHAR(100)    NOT NULL,
        -- Standard: 'contact', 'invoice', 'inventory', 'activity', 'document',
        --           'subscription', 'settings', 'user'
        -- SMS:      'sms' (absorbs sms_logs)
    entity_id        VARCHAR(50),
    action           VARCHAR(50)     NOT NULL,
        -- Standard: 'create', 'update', 'delete', 'login', 'logout', 'export'
        -- SMS:      'sms_sent', 'sms_failed'
    meta             JSON,
        -- For entity_type='sms': { contactId, mobile, message, smsType, status, providerRef, errorMessage }
    created_at       TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_log_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT fk_audit_log_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_audit_log_org    ON audit_log(organization_id);
CREATE INDEX idx_audit_log_entity ON audit_log(organization_id, entity_type, entity_id);
CREATE INDEX idx_audit_log_date   ON audit_log(organization_id, created_at);
CREATE INDEX idx_audit_log_sms    ON audit_log(organization_id, entity_type, created_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 11: signup_requests
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE signup_requests (
    id             INT AUTO_INCREMENT  PRIMARY KEY,
    name           VARCHAR(255)  NOT NULL,
    mobile         VARCHAR(15)   NOT NULL,
    email          VARCHAR(255)  NOT NULL,
    business_type  VARCHAR(100)  NOT NULL,
    business_name  VARCHAR(255)  NOT NULL,
    created_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_signup_requests_date ON signup_requests(created_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- UPDATED_AT triggers
-- NOTE: organizations, invoices, activities, documents, and settings use
--       ON UPDATE CURRENT_TIMESTAMP on the updated_at column (built-in MySQL).
--       No manual triggers needed.
-- ─────────────────────────────────────────────────────────────────────────────
