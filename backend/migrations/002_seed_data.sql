-- =============================================================================
-- Popna Entertainment — ISP Management Platform
-- PostgreSQL Seed Migration: 002_seed_data
-- =============================================================================
-- Inserts the same data currently in db.json / mockData.ts so development
-- and testing can start immediately without manual data entry.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- Organization
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO organizations (id, name, status, allowed_modules, allowed_settings_tabs, subscription_start, subscription_end)
VALUES (
    'org_001',
    'Popna Entertainment',
    'active',
    '["dashboard","customers","complaints","payments","catalog","invoices","purchase-invoices","users","settings","connection-requests"]',
    '["company","products","billing"]',
    '2025-01-01',
    '2026-12-31'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Admin User  (password: admin123  →  bcrypt hash shown below)
-- Generate fresh hashes with: node -e "require('bcrypt').hash('admin123',10).then(console.log)"
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO users (organization_id, name, username, password_hash, role, status)
VALUES
    ('org_001', 'Admin User',    'admin',    '$2b$10$PLACEHOLDER_HASH_ADMIN',    'admin',    'active'),
    ('org_001', 'Employee One',  'emp1',     '$2b$10$PLACEHOLDER_HASH_EMP1',     'employee', 'active');

-- ─────────────────────────────────────────────────────────────────────────────
-- Products (dynamic service categories)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO products (organization_id, name, product_type, is_active, cutoff_date, cutoff_days)
VALUES
    ('org_001', 'Cable',      'cable',    TRUE, 10,   NULL),
    ('org_001', 'Internet 1', 'internet', TRUE, NULL, 7),
    ('org_001', 'Internet 2', 'internet', TRUE, NULL, 7),
    ('org_001', 'BSNL',       'internet', TRUE, NULL, 15);

-- ─────────────────────────────────────────────────────────────────────────────
-- Plans
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO plans (organization_id, provider, plan_name, image_url, price, gst_rate, installation_amount, description, permanent_discount)
VALUES
    ('org_001', 'Cable',      'Cable Basic 50 Mbps',        NULL, 499, 18, 500, 'High-speed cable with 50 Mbps. Perfect for small families.',       0),
    ('org_001', 'Cable',      'Cable Premium 100 Mbps',     NULL, 799, 18, 500, 'Premium cable with 100 Mbps. Ideal for streaming and gaming.',     0),
    ('org_001', 'Internet 1', 'Internet 1 Fiber Basic',     NULL, 449, 18, 500, 'Reliable fiber connection with stable speeds.',                    0),
    ('org_001', 'Internet 2', 'Internet 2 Express 75 Mbps', NULL, 599, 18, 500, 'Fast Internet 2 connection with 75 Mbps speed.',                  0),
    ('org_001', 'BSNL',       'BSNL Rural Connect',         NULL, 399, 18, 500, 'Affordable broadband for rural areas with good connectivity.',     0);

-- ─────────────────────────────────────────────────────────────────────────────
-- Customers
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO customers (
    organization_id, name, email, mobile, connection_type, package, status,
    address_line1, address_line2, city, state, country,
    payment_status, created_at
)
VALUES
    (
        'org_001', 'Rajesh Kumar', 'rajesh.kumar@example.com', '9876543210',
        'Cable', 'Cable Basic 50 Mbps', 'Active',
        '123 Main Street', 'Near City Park', 'Mumbai', 'Maharashtra', 'India',
        'paid', '2024-01-15T10:00:00Z'
    ),
    (
        'org_001', 'Priya Sharma', 'priya.sharma@example.com', '9876543211',
        'Internet 1', 'Internet 1 Fiber Basic', 'Active',
        '456 Park Avenue', 'Block A', 'Delhi', 'Delhi', 'India',
        'not_paid', '2024-01-20T10:00:00Z'
    ),
    (
        'org_001', 'Amit Patel', 'amit.patel@example.com', '9876543212',
        'Internet 2', 'Internet 2 Express 75 Mbps', 'Inactive',
        '789 Tech Road', 'Sector 5', 'Bangalore', 'Karnataka', 'India',
        'not_paid', '2024-02-01T10:00:00Z'
    ),
    (
        'org_001', 'Sunita Verma', 'sunita.v@example.com', '9876543213',
        'BSNL', 'BSNL Rural Connect', 'Active',
        '22 Village Road', NULL, 'Pune', 'Maharashtra', 'India',
        'paid', '2024-02-10T10:00:00Z'
    );

-- ─────────────────────────────────────────────────────────────────────────────
-- Complaints
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO complaints (
    organization_id, customer_id, customer_name, mobile, connection_type,
    customer_description, internal_description, status, created_at
)
VALUES
    (
        'org_001', 1, 'Rajesh Kumar', '9876543210', 'Cable',
        'Internet is very slow in the evenings.',
        'Scheduled technician visit on 2024-03-05.',
        'on-hold', '2024-03-01T09:00:00Z'
    ),
    (
        'org_001', 2, 'Priya Sharma', '9876543211', 'Internet 1',
        'Connection drops every few hours.',
        NULL,
        'active', '2024-03-03T11:00:00Z'
    );

-- ─────────────────────────────────────────────────────────────────────────────
-- Sales Invoices
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO sales_invoices (
    organization_id, invoice_number, customer_id, customer_name,
    service_provider, plan_name, amount, gst_rate, gst_amount, total_amount,
    status, invoice_type, issue_date, due_date
)
VALUES
    (
        'org_001', 'INV-2024-001', 1, 'Rajesh Kumar',
        'Cable', 'Cable Basic 50 Mbps', 499, 18, 89.82, 588.82,
        'paid', 'tax_invoice', CURRENT_DATE - 15, CURRENT_DATE - 5
    ),
    (
        'org_001', 'INV-2024-002', 2, 'Priya Sharma',
        'Internet 1', 'Internet 1 Fiber Basic', 449, 18, 80.82, 529.82,
        'sent', 'tax_invoice', CURRENT_DATE - 8, CURRENT_DATE + 2
    ),
    (
        'org_001', 'INV-2024-003', 3, 'Amit Patel',
        'Internet 2', 'Internet 2 Express 75 Mbps', 599, 18, 107.82, 706.82,
        'draft', 'tax_invoice', CURRENT_DATE, CURRENT_DATE + 30
    );

-- ─────────────────────────────────────────────────────────────────────────────
-- Vendors
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO vendors (organization_id, name, contact, gstin, city, state, country)
VALUES
    ('org_001', 'TechSupply Co.',    '9000000001', '27AABCT1234C1Z5', 'Mumbai',    'Maharashtra', 'India'),
    ('org_001', 'NetworkParts Ltd.', '9000000002', '29AABCN5678D1Z2', 'Bangalore', 'Karnataka',   'India');

-- ─────────────────────────────────────────────────────────────────────────────
-- Purchase Invoices
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO purchase_invoices (
    organization_id, invoice_number, vendor_id, vendor_name,
    reference, amount, cgst, sgst, igst, total_amount, issue_date
)
VALUES
    (
        'org_001', 'PINV-2024-001', 1, 'TechSupply Co.',
        'PO-2024-001', 5000, 450, 450, 0, 5900, CURRENT_DATE - 20
    ),
    (
        'org_001', 'PINV-2024-002', 2, 'NetworkParts Ltd.',
        'PO-2024-002', 12000, 0, 0, 2160, 14160, CURRENT_DATE - 10
    );

-- ─────────────────────────────────────────────────────────────────────────────
-- Connection Requests
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO connection_requests (
    organization_id, name, mobile, email,
    package_id, product_id, plan_name, product_name, status
)
VALUES
    ('org_001', 'Kiran Shah',  '9111000001', 'kiran@example.com', 1, 1, 'Cable Basic 50 Mbps',        'Cable',      'New'),
    ('org_001', 'Meera Nair',  '9111000002', NULL,                3, 2, 'Internet 1 Fiber Basic',     'Internet 1', 'New'),
    ('org_001', 'Ravi Reddy',  '9111000003', 'ravi@example.com',  4, 3, 'Internet 2 Express 75 Mbps', 'Internet 2', 'Converted');

-- ─────────────────────────────────────────────────────────────────────────────
-- Company Profile
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO company_profile (
    organization_id, company_name, gstin,
    address_line1, city, state, country, pincode,
    contact_number, email
)
VALUES (
    'org_001', 'Popna Entertainment', '27AABCP1234E1ZX',
    '101 Business Park', 'Mumbai', 'Maharashtra', 'India', '400001',
    '9000000000', 'info@popnaentertainment.com'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Website Settings
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO website_settings (
    organization_id, hero_title, hero_subtitle, hero_description,
    highlight_section_title, highlight_cards,
    cta_button_text, cta_button_link
)
VALUES (
    'org_001',
    'Fast & Reliable Internet',
    'Connecting You to the World',
    'Choose from our wide range of broadband and cable plans tailored for homes and businesses.',
    'Why Choose Us?',
    '[
        {"title":"High Speed","description":"Up to 100 Mbps download speeds","icon":"Zap"},
        {"title":"Reliable","description":"99.9% uptime guarantee","icon":"Shield"},
        {"title":"Support","description":"24/7 customer support","icon":"HeadphonesIcon"}
    ]',
    'View Plans',
    '/plans'
);
