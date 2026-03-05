-- =============================================================================
-- Popna Entertainment — ISP Management Platform
-- PostgreSQL Seed Migration: 002_seed_data
-- =============================================================================
-- Inserts the same data currently in db.json / mockData.ts so development
-- and testing can start immediately without manual data entry.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- Organization
-- allowed_modules reflects the full module set from ALL_MODULES in types.ts:
--   dashboard | contacts | complaints | payments | invoices | purchase-invoices
--   | users | settings | connection-requests | inventory-products | products
--   | branches | pos
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO organizations (id, name, status, allowed_modules, allowed_settings_tabs, subscription_start, subscription_end)
VALUES (
    'org_001',
    'Popna Entertainment',
    'active',
    '["dashboard","contacts","complaints","payments","invoices","purchase-invoices","users","settings","connection-requests","inventory-products","products","branches","pos"]',
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
-- Branches
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO branches (organization_id, name, location, address, phone, is_active)
VALUES
    ('org_001', 'Main Office',    'Mumbai Central',   '101 Business Park, Mumbai, Maharashtra 400001', '9000000000', TRUE),
    ('org_001', 'North Branch',   'Andheri',          '45 Link Road, Andheri West, Mumbai 400053',     '9000000011', TRUE),
    ('org_001', 'South Branch',   'Thane',            '7 Station Road, Thane, Maharashtra 400601',     '9000000022', TRUE);

-- ─────────────────────────────────────────────────────────────────────────────
-- Products (dynamic ISP service categories)
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
-- Customers  (UI label: Contacts)
-- branch_id=1 → Main Office
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO customers (
    organization_id, name, email, mobile, connection_type, package, status,
    address_line1, address_line2, city, state, country,
    payment_status, branch_id, created_at
)
VALUES
    (
        'org_001', 'Rajesh Kumar', 'rajesh.kumar@example.com', '9876543210',
        'Cable', 'Cable Basic 50 Mbps', 'Active',
        '123 Main Street', 'Near City Park', 'Mumbai', 'Maharashtra', 'India',
        'paid', 1, '2024-01-15T10:00:00Z'
    ),
    (
        'org_001', 'Priya Sharma', 'priya.sharma@example.com', '9876543211',
        'Internet 1', 'Internet 1 Fiber Basic', 'Active',
        '456 Park Avenue', 'Block A', 'Delhi', 'Delhi', 'India',
        'not_paid', 1, '2024-01-20T10:00:00Z'
    ),
    (
        'org_001', 'Amit Patel', 'amit.patel@example.com', '9876543212',
        'Internet 2', 'Internet 2 Express 75 Mbps', 'Inactive',
        '789 Tech Road', 'Sector 5', 'Bangalore', 'Karnataka', 'India',
        'not_paid', 2, '2024-02-01T10:00:00Z'
    ),
    (
        'org_001', 'Sunita Verma', 'sunita.v@example.com', '9876543213',
        'BSNL', 'BSNL Rural Connect', 'Active',
        '22 Village Road', NULL, 'Pune', 'Maharashtra', 'India',
        'paid', 3, '2024-02-10T10:00:00Z'
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
-- Vendors  (legacy purchasing)
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

-- ─────────────────────────────────────────────────────────────────────────────
-- Suppliers  (enhanced supplier management for inventory)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO suppliers (
    organization_id, name, contact_person, mobile, email,
    tax_number, opening_balance,
    address_line1, city, state, country, pincode
)
VALUES
    (
        'org_001', 'Alpha Electronics', 'Suresh Mehta', '9200000001', 'suresh@alphaelec.com',
        '27AABCA1234B1Z6', 0,
        '12 Industrial Estate', 'Mumbai', 'Maharashtra', 'India', '400093'
    ),
    (
        'org_001', 'Beta Components Pvt Ltd', 'Anita Rao', '9200000002', 'anita@betacomp.com',
        '29AABCB5678C1Z3', 5000,
        '88 KIADB Area', 'Bangalore', 'Karnataka', 'India', '560058'
    );

-- ─────────────────────────────────────────────────────────────────────────────
-- Inventory Categories
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO inventory_categories (organization_id, name, code, description)
VALUES
    ('org_001', 'Network Equipment', 'NET', 'Routers, switches, modems, and accessories'),
    ('org_001', 'Cables & Wiring',   'CBL', 'Coaxial, fiber, ethernet, and patch cables'),
    ('org_001', 'Set-Top Boxes',     'STB', 'Cable and IPTV set-top box units'),
    ('org_001', 'Tools',             'TLS', 'Installation and maintenance tools');

-- ─────────────────────────────────────────────────────────────────────────────
-- Inventory Subcategories
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO inventory_subcategories (organization_id, category_id, name)
VALUES
    ('org_001', 1, 'Routers'),
    ('org_001', 1, 'Modems'),
    ('org_001', 1, 'Switches'),
    ('org_001', 2, 'Coaxial Cable'),
    ('org_001', 2, 'Fiber Patch Cord'),
    ('org_001', 3, 'HD STB'),
    ('org_001', 3, 'Android STB');

-- ─────────────────────────────────────────────────────────────────────────────
-- Inventory Units
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO inventory_units (organization_id, name, short_name)
VALUES
    ('org_001', 'Piece',  'Pcs'),
    ('org_001', 'Box',    'Box'),
    ('org_001', 'Meter',  'Mtr'),
    ('org_001', 'Roll',   'Roll'),
    ('org_001', 'Set',    'Set');

-- ─────────────────────────────────────────────────────────────────────────────
-- Inventory Tax Rates
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO inventory_tax_rates (organization_id, name, rate, type)
VALUES
    ('org_001', 'GST 5%',  5,  'exclusive'),
    ('org_001', 'GST 12%', 12, 'exclusive'),
    ('org_001', 'GST 18%', 18, 'exclusive'),
    ('org_001', 'GST 28%', 28, 'exclusive'),
    ('org_001', 'Exempt',   0, 'exclusive');

-- ─────────────────────────────────────────────────────────────────────────────
-- Inventory Warranties
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO inventory_warranties (organization_id, name, duration, duration_unit)
VALUES
    ('org_001', 'No Warranty',    0,  'months'),
    ('org_001', '6 Months',       6,  'months'),
    ('org_001', '1 Year',         12, 'months'),
    ('org_001', '2 Years',        24, 'months'),
    ('org_001', '3 Years',        36, 'months');

-- ─────────────────────────────────────────────────────────────────────────────
-- Inventory Products
-- category_id: 1=Network Equipment, 2=Cables, 3=STB, 4=Tools
-- unit_id:     1=Pcs, 2=Box, 3=Mtr, 4=Roll, 5=Set
-- tax_rate_id: 3=GST 18%, 1=GST 5%, 5=Exempt
-- warranty_id: 3=1 Year, 2=6 Months, 1=No Warranty
-- branch_id:   1=Main Office
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO inventory_products (
    organization_id, name, sku,
    category_id, category_code, subcategory_id,
    branch_id, unit_id, tax_type, tax_rate_id, warranty_id,
    description, price, purchase_price, mrp,
    is_active, product_type, brand, hsn_sac_code,
    current_stock, stock_alert, reorder_level, tracking_type, barcode
)
VALUES
    (
        'org_001', 'Dual-Band WiFi Router', 'NET-RTR-001',
        1, 'NET', 1,
        1, 1, 'exclusive', 3, 3,
        'AC1200 dual-band wireless router. 2.4GHz + 5GHz. 4 LAN ports.',
        1200, 850, 1499,
        TRUE, 'physical', 'TP-Link', '85176990',
        25, 5, 10, 'serial', NULL
    ),
    (
        'org_001', 'ADSL Modem', 'NET-MDM-001',
        1, 'NET', 2,
        1, 1, 'exclusive', 3, 3,
        'ADSL2+ modem with built-in splitter.',
        650, 420, 799,
        TRUE, 'physical', 'D-Link', '85176990',
        15, 3, 5, 'serial', NULL
    ),
    (
        'org_001', 'Coaxial RG6 Cable', 'CBL-COX-001',
        2, 'CBL', 4,
        1, 3, 'exclusive', 3, 1,
        'RG6 coaxial cable for cable TV connections. Per meter.',
        25, 12, 35,
        TRUE, 'physical', NULL, '85442090',
        500, 50, 100, 'none', NULL
    ),
    (
        'org_001', 'HD Set-Top Box', 'STB-HD-001',
        3, 'STB', 6,
        1, 1, 'exclusive', 3, 2,
        'HD cable set-top box with recording support.',
        1800, 1200, 2200,
        TRUE, 'physical', 'Airtel', '85287100',
        30, 5, 10, 'serial', NULL
    ),
    (
        'org_001', 'Installation Service', 'SVC-INST-001',
        NULL, NULL, NULL,
        1, 1, 'exclusive', 3, 1,
        'Standard broadband/cable installation service.',
        500, 0, 500,
        TRUE, 'service', NULL, '99833190',
        0, 0, 0, 'none', NULL
    );

-- ─────────────────────────────────────────────────────────────────────────────
-- POS Transactions (sample completed sales)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO pos_transactions (
    organization_id, branch_id, customer_id, customer_name,
    subtotal, tax_total, discount_amount, grand_total,
    payment_method, status, created_by
)
VALUES
    (
        'org_001', 1, 1, 'Rajesh Kumar',
        1200, 216, 0, 1416,
        'cash', 'completed', 1
    ),
    (
        'org_001', 1, NULL, 'Walk-in Customer',
        500, 90, 0, 590,
        'upi', 'completed', 2
    );

-- ─────────────────────────────────────────────────────────────────────────────
-- POS Transaction Items
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO pos_transaction_items (
    transaction_id, product_id, product_name,
    quantity, unit_price, tax_rate, tax_amount, line_total
)
VALUES
    (1, 1, 'Dual-Band WiFi Router', 1, 1200, 18, 216, 1416),
    (2, 5, 'Installation Service',  1,  500, 18,  90,  590);
