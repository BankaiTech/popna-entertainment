-- =============================================================================
-- Popna Entertainment — ISP Management Platform
-- PostgreSQL Seed Migration: 002_seed_data
-- =============================================================================
-- Mirrors mockData.ts and db.json so development/testing starts immediately
-- without manual data entry.
--
-- Record counts:
--   1 organization, 2 users, 3 branches, 1 superadmin user
--   4 products, 12 plans
--   22 contacts (customers) + 2 contacts (suppliers) + 2 contacts (vendors) = 26 contacts
--   18 complaints, 3 sales invoices
--   2 purchase invoices, 3 connection requests
--   1 company profile, 1 website settings, 1 upi payment config
--   1 sms config (disabled by default)
--   4 inventory categories, 7 inventory subcategories
--   5 inventory units, 5 inventory tax rates, 5 inventory warranties
--   5 inventory products, 2 pos transactions + line items
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- Organization
-- allowed_modules reflects ALL_MODULES from types.ts
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO organizations (id, name, status, allowed_modules, allowed_settings_tabs, subscription_start, subscription_end)
VALUES (
    'org_001',
    'Popna Entertainment',
    'active',
    '["dashboard","contacts","complaints","payments","invoices","purchase-invoices","users","settings","connection-requests","inventory-products","products","branches","pos"]',
    '["company","products","billing","pos"]',
    '2025-01-01',
    '2027-12-31'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Branches  (inserted before users so branch_id FK is resolvable)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO branches (
    organization_id, name, location, address, phone, gstin,
    address_line1, address_line2, city, state, country, pincode, is_active
)
VALUES
    (
        'org_001', 'Main Office', 'Mumbai Central',
        '101 Business Park, Mumbai, Maharashtra 400001', '9000000000', '27AABCU9603R1ZM',
        '101 Business Park', 'Andheri East', 'Mumbai', 'Maharashtra', 'India', '400069', TRUE
    ),
    (
        'org_001', 'North Branch', 'Andheri',
        '45 Link Road, Andheri West, Mumbai 400053', '9000000011', '07AABCU9603R1ZN',
        '45 Link Road', 'Andheri West', 'Mumbai', 'Maharashtra', 'India', '400053', TRUE
    ),
    (
        'org_001', 'South Branch', 'Thane',
        '7 Station Road, Thane, Maharashtra 400601', '9000000022', NULL,
        '7 Station Road', NULL, 'Thane', 'Maharashtra', 'India', '400601', TRUE
    );

-- ─────────────────────────────────────────────────────────────────────────────
-- Users
-- Usernames match mockData.ts: bankaitech (admin), bankaitech-emp (employee)
-- Generate fresh bcrypt hashes: node -e "require('bcrypt').hash('test123',10).then(console.log)"
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO users (organization_id, name, username, password_hash, role, status, allowed_modules, branch_id)
VALUES
    ('org_001', 'Admin User',    'bankaitech',     '$2b$10$PLACEHOLDER_HASH_ADMIN', 'admin',    'active', '[]',                        1),
    ('org_001', 'Employee User', 'bankaitech-emp', '$2b$10$PLACEHOLDER_HASH_EMP1',  'employee', 'active', '["contacts","complaints"]', 1);

-- ─────────────────────────────────────────────────────────────────────────────
-- Products (dynamic ISP service categories)
-- Mirrors mockData.ts providers: Cable | Internet 1 | Internet 2 | Internet 3
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO products (organization_id, name, product_type, is_active, cutoff_date, cutoff_days)
VALUES
    ('org_001', 'Cable',      'cable',    TRUE, 10,   NULL),
    ('org_001', 'Internet 1', 'internet', TRUE, NULL, 7),
    ('org_001', 'Internet 2', 'internet', TRUE, NULL, 7),
    ('org_001', 'Internet 3', 'internet', TRUE, NULL, 15);

-- ─────────────────────────────────────────────────────────────────────────────
-- Plans (12 plans — mirrors mockData.ts mockPlans)
-- provider: Cable, Internet 1, Internet 2, Internet 3
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO plans (organization_id, provider, plan_name, price, gst_rate, installation_amount, description, permanent_discount)
VALUES
    -- Cable (3 plans)
    ('org_001', 'Cable',      'Cable Basic 50 Mbps',        499,  18, 500,  'High-speed cable broadband with 50 Mbps. Perfect for small families and home offices.',     0),
    ('org_001', 'Cable',      'Cable Premium 100 Mbps',     799,  18, 500,  'Premium cable broadband with 100 Mbps. Ideal for streaming and gaming.',                    0),
    ('org_001', 'Cable',      'Cable Ultra 200 Mbps',       1299, 18, 1000, 'Ultra-fast cable broadband with 200 Mbps. Perfect for heavy users and businesses.',         0),
    -- Internet 1 (3 plans)
    ('org_001', 'Internet 1', 'Internet 1 Fiber Basic',     449,  18, 500,  'Reliable fiber connection with stable speeds and excellent coverage.',                      0),
    ('org_001', 'Internet 1', 'Internet 1 Fiber Plus',      699,  18, 500,  'Enhanced fiber connection with better speeds and reliability.',                             0),
    ('org_001', 'Internet 1', 'Internet 1 Fiber Premium',   999,  18, 1000, 'Premium fiber connection with high-speed internet for demanding users.',                    0),
    -- Internet 2 (3 plans)
    ('org_001', 'Internet 2', 'Internet 2 Express 75 Mbps', 599,  18, 500,  'Fast and reliable connection with 75 Mbps speed.',                                         0),
    ('org_001', 'Internet 2', 'Internet 2 Speed 150 Mbps',  899,  18, 500,  'High-speed connection with 150 Mbps for power users.',                                     0),
    ('org_001', 'Internet 2', 'Internet 2 Turbo 300 Mbps',  1499, 18, 1000, 'Turbo-charged connection with blazing fast 300 Mbps speeds.',                              0),
    -- Internet 3 (3 plans)
    ('org_001', 'Internet 3', 'Internet 3 Rural Connect',   399,  18, 500,  'Affordable internet solution for rural areas with good connectivity.',                      0),
    ('org_001', 'Internet 3', 'Internet 3 Home Plus',       549,  18, 500,  'Enhanced home internet connection with better speeds and coverage.',                        0),
    ('org_001', 'Internet 3', 'Internet 3 Business',        799,  18, 1000, 'Business-grade internet connection with dedicated support and reliability.',                 0);

-- ─────────────────────────────────────────────────────────────────────────────
-- Contacts — ISP Customers (contact_type = 'customer')
-- 22 records — mirrors mockData.ts mockCustomers
-- IDs will be 1–22 (auto-assigned SERIAL)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO contacts (
    organization_id, contact_type,
    name, email, mobile,
    connection_type, package, status, description,
    address_line1, address_line2, city, state, country,
    payment_status, payment_method, payment_description, payment_updated_at,
    collected_amount, balance_amount,
    box_number, stb_number, can_caf_id, cin, area,
    branch_id, created_at
)
VALUES
    -- 1: Rajesh Kumar — Cable, paid via UPI
    (
        'org_001', 'customer',
        'Rajesh Kumar', 'rajesh.kumar@example.com', '9876543210',
        'Cable', 'Cable Basic 50 Mbps', 'Active', 'Long-term customer, very satisfied with service.',
        '123 Main Street', 'Near City Park', 'Mumbai', 'Maharashtra', 'India',
        'paid', 'upi', 'Monthly bill paid via UPI on 15th.', CURRENT_TIMESTAMP - INTERVAL '10 days',
        589, 0,
        'BOX-001', 'STB-MH-001', 'CAN-2024-00001', 'CIN-MH-001', 'Andheri West',
        1, CURRENT_TIMESTAMP - INTERVAL '45 days'
    ),
    -- 2: Priya Sharma — Internet 1, not paid
    (
        'org_001', 'customer',
        'Priya Sharma', 'priya.sharma@example.com', '9876543211',
        'Internet 1', 'Internet 1 Fiber Basic', 'Active', 'New customer, installation completed last month.',
        '456 Park Avenue', 'Block A', 'Delhi', 'Delhi', 'India',
        'not_paid', NULL, NULL, NULL,
        0, 0,
        NULL, NULL, NULL, NULL, 'Connaught Place',
        1, CURRENT_TIMESTAMP - INTERVAL '25 days'
    ),
    -- 3: Amit Patel — Internet 2, inactive, balance due
    (
        'org_001', 'customer',
        'Amit Patel', 'amit.patel@example.com', '9876543212',
        'Internet 2', 'Internet 2 Express 75 Mbps', 'Inactive', 'Service temporarily suspended due to payment issues.',
        '789 Tech Road', 'Sector 5', 'Bangalore', 'Karnataka', 'India',
        'not_paid', NULL, NULL, NULL,
        0, 707,
        NULL, NULL, NULL, NULL, 'Koramangala',
        1, CURRENT_TIMESTAMP - INTERVAL '60 days'
    ),
    -- 4: Sneha Reddy — Cable Premium, inactive, balance due
    (
        'org_001', 'customer',
        'Sneha Reddy', 'sneha.reddy@example.com', '9876543213',
        'Cable', 'Cable Premium 100 Mbps', 'Inactive', 'Upgraded to premium plan recently.',
        '321 Business Park', 'Floor 3', 'Hyderabad', 'Telangana', 'India',
        'not_paid', NULL, 'Pending: December bill.', CURRENT_TIMESTAMP - INTERVAL '5 days',
        0, 943,
        'BOX-004', 'STB-TS-004', 'CAN-2024-00004', NULL, 'Banjara Hills',
        1, CURRENT_TIMESTAMP - INTERVAL '15 days'
    ),
    -- 5: Vikram Singh — Internet 3 Rural, paid cash
    (
        'org_001', 'customer',
        'Vikram Singh', 'vikram.singh@example.com', '9876543214',
        'Internet 3', 'Internet 3 Rural Connect', 'Active', 'Rural area customer, good connectivity.',
        'Village Road', 'Near Post Office', 'Pune', 'Maharashtra', 'India',
        'paid', 'cash', 'Paid in cash at local office.', CURRENT_TIMESTAMP - INTERVAL '1 day',
        471, 0,
        NULL, NULL, NULL, NULL, 'Wakad',
        1, CURRENT_TIMESTAMP - INTERVAL '5 days'
    ),
    -- 6: Anjali Mehta — Internet 1 Fiber Plus, paid UPI
    (
        'org_001', 'customer',
        'Anjali Mehta', 'anjali.mehta@example.com', '9876543215',
        'Internet 1', 'Internet 1 Fiber Plus', 'Active', 'Regular customer, always pays on time.',
        '567 Residential Complex', 'Tower B', 'Chennai', 'Tamil Nadu', 'India',
        'paid', 'upi', 'Auto-paid via Google Pay.', CURRENT_TIMESTAMP - INTERVAL '3 days',
        825, 0,
        NULL, NULL, NULL, NULL, 'T. Nagar',
        1, CURRENT_TIMESTAMP - INTERVAL '30 days'
    ),
    -- 7: Rahul Verma — Internet 2 Speed, paid card, GST customer
    (
        'org_001', 'customer',
        'Rahul Verma', 'rahul.verma@example.com', '9876543216',
        'Internet 2', 'Internet 2 Speed 150 Mbps', 'Active', 'Business customer, requires high-speed connection.',
        '890 Corporate Avenue', 'Suite 201', 'Gurgaon', 'Haryana', 'India',
        'paid', 'card', 'Paid by credit card.', CURRENT_TIMESTAMP - INTERVAL '7 days',
        1061, 0,
        NULL, NULL, NULL, NULL, 'DLF Cyber City',
        1, CURRENT_TIMESTAMP - INTERVAL '8 days'
    ),
    -- 8: Kavita Nair — Cable Ultra, paid cash
    (
        'org_001', 'customer',
        'Kavita Nair', 'kavita.nair@example.com', '9876543217',
        'Cable', 'Cable Ultra 200 Mbps', 'Active', 'Power user, needs ultra-fast speeds for work.',
        '234 Tech Hub', 'Unit 15', 'Noida', 'Uttar Pradesh', 'India',
        'paid', 'cash', 'Paid in full at office.', CURRENT_TIMESTAMP - INTERVAL '2 days',
        1533, 0,
        'BOX-008', 'STB-UP-008', 'CAN-2024-00008', 'CIN-UP-008', 'Sector 62',
        2, CURRENT_TIMESTAMP - INTERVAL '12 days'
    ),
    -- 9: Mohit Agarwal — Internet 1 Fiber Premium, inactive, not paid
    (
        'org_001', 'customer',
        'Mohit Agarwal', 'mohit.agarwal@example.com', '9876543218',
        'Internet 1', 'Internet 1 Fiber Premium', 'Inactive', 'Service disconnected, customer moved to different city.',
        '345 Green Valley', 'Apartment 4B', 'Kolkata', 'West Bengal', 'India',
        'not_paid', NULL, NULL, NULL,
        0, 0,
        NULL, NULL, NULL, NULL, NULL,
        2, CURRENT_TIMESTAMP - INTERVAL '90 days'
    ),
    -- 10: Divya Joshi — Internet 3 Home Plus, not paid
    (
        'org_001', 'customer',
        'Divya Joshi', 'divya.joshi@example.com', '9876543219',
        'Internet 3', 'Internet 3 Home Plus', 'Active', 'Home user, satisfied with current plan.',
        '678 Suburban Lane', 'House No. 12', 'Ahmedabad', 'Gujarat', 'India',
        'not_paid', NULL, NULL, NULL,
        0, 0,
        NULL, NULL, NULL, NULL, NULL,
        2, CURRENT_TIMESTAMP - INTERVAL '20 days'
    ),
    -- 11: Arjun Malhotra — Internet 2 Turbo, not paid
    (
        'org_001', 'customer',
        'Arjun Malhotra', 'arjun.malhotra@example.com', '9876543220',
        'Internet 2', 'Internet 2 Turbo 300 Mbps', 'Active', 'Gaming enthusiast, requires low latency connection.',
        '901 Gaming Street', 'Flat 302', 'Bangalore', 'Karnataka', 'India',
        'not_paid', NULL, NULL, NULL,
        0, 0,
        NULL, NULL, NULL, NULL, NULL,
        2, CURRENT_TIMESTAMP - INTERVAL '3 days'
    ),
    -- 12: Pooja Desai — Cable Basic, not paid
    (
        'org_001', 'customer',
        'Pooja Desai', 'pooja.desai@example.com', '9876543221',
        'Cable', 'Cable Basic 50 Mbps', 'Active', 'Budget-conscious customer, happy with basic plan.',
        '112 Affordable Housing', 'Block C', 'Surat', 'Gujarat', 'India',
        'not_paid', NULL, NULL, NULL,
        0, 0,
        NULL, NULL, NULL, NULL, NULL,
        2, CURRENT_TIMESTAMP - INTERVAL '18 days'
    ),
    -- 13: Suresh Iyer — Internet 1 Fiber Basic, inactive
    (
        'org_001', 'customer',
        'Suresh Iyer', 'suresh.iyer@example.com', '9876543222',
        'Internet 1', 'Internet 1 Fiber Basic', 'Inactive', 'Temporary disconnection, will reconnect next month.',
        '223 Temple Road', 'Near Market', 'Coimbatore', 'Tamil Nadu', 'India',
        'not_paid', NULL, NULL, NULL,
        0, 0,
        NULL, NULL, NULL, NULL, NULL,
        2, CURRENT_TIMESTAMP - INTERVAL '75 days'
    ),
    -- 14: Meera Krishnan — Internet 3 Business, not paid
    (
        'org_001', 'customer',
        'Meera Krishnan', 'meera.krishnan@example.com', '9876543223',
        'Internet 3', 'Internet 3 Business', 'Active', 'Small business owner, needs reliable connection for operations.',
        '334 Commercial Street', 'Shop No. 5', 'Kochi', 'Kerala', 'India',
        'not_paid', NULL, NULL, NULL,
        0, 0,
        NULL, NULL, NULL, NULL, NULL,
        3, CURRENT_TIMESTAMP - INTERVAL '10 days'
    ),
    -- 15: Nikhil Kapoor — Cable Premium, not paid
    (
        'org_001', 'customer',
        'Nikhil Kapoor', 'nikhil.kapoor@example.com', '9876543224',
        'Cable', 'Cable Premium 100 Mbps', 'Active', 'Streaming enthusiast, upgraded for better quality.',
        '445 Entertainment Avenue', 'Residency 8', 'Mumbai', 'Maharashtra', 'India',
        'not_paid', NULL, NULL, NULL,
        0, 0,
        NULL, NULL, NULL, NULL, NULL,
        3, CURRENT_TIMESTAMP - INTERVAL '7 days'
    ),
    -- 16: Riya Banerjee — Internet 2 Express, not paid
    (
        'org_001', 'customer',
        'Riya Banerjee', 'riya.banerjee@example.com', '9876543225',
        'Internet 2', 'Internet 2 Express 75 Mbps', 'Active', 'Student, needs internet for online classes.',
        '556 College Road', 'Hostel Block', 'Pune', 'Maharashtra', 'India',
        'not_paid', NULL, NULL, NULL,
        0, 0,
        NULL, NULL, NULL, NULL, NULL,
        3, CURRENT_TIMESTAMP - INTERVAL '22 days'
    ),
    -- 17: Karan Thakur — Internet 1 Fiber Plus, not paid
    (
        'org_001', 'customer',
        'Karan Thakur', 'karan.thakur@example.com', '9876543226',
        'Internet 1', 'Internet 1 Fiber Plus', 'Active', 'Remote worker, depends on stable connection.',
        '667 Work From Home', 'Apartment 9A', 'Jaipur', 'Rajasthan', 'India',
        'not_paid', NULL, NULL, NULL,
        0, 0,
        NULL, NULL, NULL, NULL, NULL,
        3, CURRENT_TIMESTAMP - INTERVAL '14 days'
    ),
    -- 18: Shreya Menon — Internet 3 Rural, inactive
    (
        'org_001', 'customer',
        'Shreya Menon', 'shreya.menon@example.com', '9876543227',
        'Internet 3', 'Internet 3 Rural Connect', 'Inactive', 'Service suspended due to area maintenance.',
        '778 Village Main Road', 'House No. 23', 'Thrissur', 'Kerala', 'India',
        'not_paid', NULL, NULL, NULL,
        0, 0,
        NULL, NULL, NULL, NULL, NULL,
        3, CURRENT_TIMESTAMP - INTERVAL '50 days'
    ),
    -- 19: Aditya Rao — Cable Ultra, not paid
    (
        'org_001', 'customer',
        'Aditya Rao', 'aditya.rao@example.com', '9876543228',
        'Cable', 'Cable Ultra 200 Mbps', 'Active', 'Tech professional, requires high-speed for development work.',
        '889 Developer Hub', 'Flat 501', 'Bangalore', 'Karnataka', 'India',
        'not_paid', NULL, NULL, NULL,
        0, 0,
        NULL, NULL, NULL, NULL, NULL,
        3, CURRENT_TIMESTAMP - INTERVAL '2 days'
    ),
    -- 20: Neha Gupta — Internet 2 Speed, not paid
    (
        'org_001', 'customer',
        'Neha Gupta', 'neha.gupta@example.com', '9876543229',
        'Internet 2', 'Internet 2 Speed 150 Mbps', 'Active', 'Content creator, needs fast upload speeds.',
        '990 Content Studio', 'Unit 7', 'Mumbai', 'Maharashtra', 'India',
        'not_paid', NULL, NULL, NULL,
        0, 0,
        NULL, NULL, NULL, NULL, NULL,
        1, CURRENT_TIMESTAMP - INTERVAL '1 day'
    ),
    -- 21: Rohit Sharma — Internet 1 Fiber Premium, not paid
    (
        'org_001', 'customer',
        'Rohit Sharma', 'rohit.sharma@example.com', '9876543230',
        'Internet 1', 'Internet 1 Fiber Premium', 'Active', 'Family plan, multiple devices connected.',
        '101 Family Home', 'Ground Floor', 'Delhi', 'Delhi', 'India',
        'not_paid', NULL, NULL, NULL,
        0, 0,
        NULL, NULL, NULL, NULL, NULL,
        1, CURRENT_TIMESTAMP - INTERVAL '6 days'
    ),
    -- 22: Ananya Das — Internet 3 Home Plus, not paid
    (
        'org_001', 'customer',
        'Ananya Das', 'ananya.das@example.com', '9876543231',
        'Internet 3', 'Internet 3 Home Plus', 'Active', 'New customer, just installed last week.',
        '202 New Colony', 'House No. 45', 'Bhubaneswar', 'Odisha', 'India',
        'not_paid', NULL, NULL, NULL,
        0, 0,
        NULL, NULL, NULL, NULL, NULL,
        1, CURRENT_TIMESTAMP - INTERVAL '4 days'
    );

-- Set GSTIN for business customer Rahul Verma
UPDATE contacts SET gstin = '06AABCT1234C1ZN'
WHERE mobile = '9876543216' AND organization_id = 'org_001' AND contact_type = 'customer';

-- ─────────────────────────────────────────────────────────────────────────────
-- Contacts — Suppliers (contact_type = 'supplier')
-- IDs: 23, 24
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO contacts (
    organization_id, contact_type,
    name, mobile, email,
    tax_number, opening_balance,
    contact_person,
    address_line1, city, state, country, pincode
)
VALUES
    (
        'org_001', 'supplier',
        'Alpha Electronics', '9200000001', 'suresh@alphaelec.com',
        '27AABCA1234B1Z6', 0,
        'Suresh Mehta',
        '12 Industrial Estate', 'Mumbai', 'Maharashtra', 'India', '400093'
    ),
    (
        'org_001', 'supplier',
        'Beta Components Pvt Ltd', '9200000002', 'anita@betacomp.com',
        '29AABCB5678C1Z3', 5000,
        'Anita Rao',
        '88 KIADB Area', 'Bangalore', 'Karnataka', 'India', '560058'
    );

-- ─────────────────────────────────────────────────────────────────────────────
-- Contacts — Vendors for purchase invoicing (contact_type = 'vendor')
-- IDs: 25, 26
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO contacts (
    organization_id, contact_type,
    name, mobile, gstin,
    city, state, country
)
VALUES
    ('org_001', 'vendor', 'TechSupply Co.',    '9000000001', '27AABCT1234C1Z5', 'Mumbai',    'Maharashtra', 'India'),
    ('org_001', 'vendor', 'NetworkParts Ltd.', '9000000002', '29AABCN5678D1Z2', 'Bangalore', 'Karnataka',   'India');

-- ─────────────────────────────────────────────────────────────────────────────
-- Complaints  (18 — mirrors mockData.ts mockComplaints)
-- contact_id references auto-assigned IDs 1–22 (customer contacts)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO complaints (
    organization_id, contact_id, customer_name, mobile, connection_type,
    customer_description, internal_description, status, closed_at, created_at
)
VALUES
    (
        'org_001', 1, 'Rajesh Kumar', '9876543210', 'Cable',
        'Internet speed is very slow during evening hours. Connection drops frequently.',
        'Checked connection logs. High traffic during peak hours. Investigating bandwidth allocation.',
        'active', NULL, CURRENT_TIMESTAMP - INTERVAL '2 days'
    ),
    (
        'org_001', 2, 'Priya Sharma', '9876543211', 'Internet 1',
        'Billing issue - charged extra amount this month. Need clarification on bill.',
        'Reviewing billing records. May be due to plan upgrade mid-month.',
        'active', NULL, CURRENT_TIMESTAMP - INTERVAL '1 day'
    ),
    (
        'org_001', 3, 'Amit Patel', '9876543212', 'Internet 2',
        'Connection not working since yesterday. No internet access at all.',
        'Urgent - Sending technician today. Suspected fiber cut in area.',
        'active', NULL, CURRENT_TIMESTAMP
    ),
    (
        'org_001', 4, 'Sneha Reddy', '9876543213', 'Cable',
        'Router needs replacement. Current router keeps restarting.',
        'Waiting for router stock. Expected delivery in 2 days.',
        'on-hold', NULL, CURRENT_TIMESTAMP - INTERVAL '5 days'
    ),
    (
        'org_001', 5, 'Vikram Singh', '9876543214', 'Internet 3',
        'Installation pending for 3 days. Need urgent installation.',
        'Scheduled for tomorrow. Technician assigned.',
        'active', NULL, CURRENT_TIMESTAMP - INTERVAL '3 days'
    ),
    (
        'org_001', 6, 'Anjali Mehta', '9876543215', 'Internet 1',
        'Slow download speeds. Not getting promised 100 Mbps.',
        'Testing connection speed. May need line optimization.',
        'on-hold', NULL, CURRENT_TIMESTAMP - INTERVAL '7 days'
    ),
    (
        'org_001', 7, 'Rahul Verma', '9876543216', 'Internet 2',
        'Connection issue resolved. Thank you for quick support.',
        'Issue resolved by resetting ONT. Customer satisfied.',
        'completed', CURRENT_TIMESTAMP - INTERVAL '10 days', CURRENT_TIMESTAMP - INTERVAL '10 days'
    ),
    (
        'org_001', 8, 'Kavita Nair', '9876543217', 'Cable',
        'Need to upgrade plan. Current plan not sufficient for work from home.',
        'Contacted customer. Upgrading to 200 Mbps plan.',
        'active', NULL, CURRENT_TIMESTAMP - INTERVAL '1 day'
    ),
    (
        'org_001', 9, 'Mohit Agarwal', '9876543218', 'Internet 1',
        'Fiber cable cut due to construction work. Need repair.',
        'Emergency repair team dispatched. ETA 4 hours.',
        'active', NULL, CURRENT_TIMESTAMP
    ),
    (
        'org_001', 10, 'Divya Joshi', '9876543219', 'Internet 3',
        'Payment gateway issue. Unable to pay online bill.',
        'Payment gateway working. Customer can try alternative payment method.',
        'on-hold', NULL, CURRENT_TIMESTAMP - INTERVAL '4 days'
    ),
    (
        'org_001', 11, 'Arjun Malhotra', '9876543220', 'Internet 2',
        'High ping in online games. Connection unstable during gaming.',
        'Checking latency. May need QoS configuration for gaming.',
        'active', NULL, CURRENT_TIMESTAMP - INTERVAL '2 days'
    ),
    (
        'org_001', 12, 'Pooja Desai', '9876543221', 'Cable',
        'Router configuration issue resolved. Working fine now.',
        'Fixed router settings. Connection stable now.',
        'completed', CURRENT_TIMESTAMP - INTERVAL '8 days', CURRENT_TIMESTAMP - INTERVAL '8 days'
    ),
    (
        'org_001', 13, 'Suresh Iyer', '9876543222', 'Internet 1',
        'Service reconnection request. Want to resume connection.',
        'Processing reconnection. Will activate within 24 hours.',
        'active', NULL, CURRENT_TIMESTAMP - INTERVAL '1 day'
    ),
    (
        'org_001', 14, 'Meera Krishnan', '9876543223', 'Internet 3',
        'Business connection needs dedicated IP address. Please provide.',
        'Dedicated IP allocation in progress. Requires network configuration.',
        'on-hold', NULL, CURRENT_TIMESTAMP - INTERVAL '6 days'
    ),
    (
        'org_001', 15, 'Nikhil Kapoor', '9876543224', 'Cable',
        'Streaming quality poor. Buffering issues on Netflix and YouTube.',
        'Investigating bandwidth allocation. May need to optimize streaming traffic.',
        'active', NULL, CURRENT_TIMESTAMP
    ),
    (
        'org_001', 16, 'Riya Banerjee', '9876543225', 'Internet 2',
        'Connection restored. Issue was from ISP side, now fixed.',
        'Network maintenance completed. All services restored.',
        'completed', CURRENT_TIMESTAMP - INTERVAL '12 days', CURRENT_TIMESTAMP - INTERVAL '12 days'
    ),
    (
        'org_001', 17, 'Karan Thakur', '9876543226', 'Internet 1',
        'Need to relocate connection to new address. Please arrange.',
        'Relocation request received. Survey scheduled for next week.',
        'active', NULL, CURRENT_TIMESTAMP - INTERVAL '2 days'
    ),
    (
        'org_001', 18, 'Shreya Menon', '9876543227', 'Internet 3',
        'Technical support ticket resolved. Customer satisfied.',
        'All issues resolved. Customer feedback positive.',
        'completed', CURRENT_TIMESTAMP - INTERVAL '15 days', CURRENT_TIMESTAMP - INTERVAL '15 days'
    );

-- ─────────────────────────────────────────────────────────────────────────────
-- Sales Invoices
-- contact_id: 1=Rajesh Kumar, 2=Priya Sharma, 3=Amit Patel
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO sales_invoices (
    organization_id, invoice_number, branch_id, contact_id, customer_name,
    service_provider, plan_name, amount, gst_rate, gst_amount, total_amount,
    status, invoice_type, issue_date, due_date
)
VALUES
    (
        'org_001', 'INV-2024-001', 1, 1, 'Rajesh Kumar',
        'Cable', 'Cable Basic 50 Mbps', 499, 18, 89.82, 588.82,
        'paid', 'tax_invoice', CURRENT_DATE - 15, CURRENT_DATE - 5
    ),
    (
        'org_001', 'INV-2024-002', 1, 2, 'Priya Sharma',
        'Internet 1', 'Internet 1 Fiber Basic', 449, 18, 80.82, 529.82,
        'sent', 'tax_invoice', CURRENT_DATE - 8, CURRENT_DATE + 2
    ),
    (
        'org_001', 'INV-2024-003', 1, 3, 'Amit Patel',
        'Internet 2', 'Internet 2 Express 75 Mbps', 599, 18, 107.82, 706.82,
        'draft', 'tax_invoice', CURRENT_DATE, CURRENT_DATE + 30
    );

-- ─────────────────────────────────────────────────────────────────────────────
-- Purchase Invoices
-- contact_id: 25=TechSupply Co. (vendor), 26=NetworkParts Ltd. (vendor)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO purchase_invoices (
    organization_id, invoice_number, contact_id, vendor_name,
    reference, amount, cgst, sgst, igst, total_amount, issue_date
)
VALUES
    (
        'org_001', 'PINV-2024-001', 25, 'TechSupply Co.',
        'PO-2024-001', 5000, 450, 450, 0, 5900, CURRENT_DATE - 20
    ),
    (
        'org_001', 'PINV-2024-002', 26, 'NetworkParts Ltd.',
        'PO-2024-002', 12000, 0, 0, 2160, 14160, CURRENT_DATE - 10
    );

-- ─────────────────────────────────────────────────────────────────────────────
-- Connection Requests
-- package_id: 1=Cable Basic, 4=Internet 1 Fiber Basic, 7=Internet 2 Express 75 Mbps
-- product_id: 1=Cable, 2=Internet 1, 3=Internet 2
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO connection_requests (
    organization_id, name, mobile, email,
    package_id, product_id, plan_name, product_name, status
)
VALUES
    ('org_001', 'Kiran Shah',  '9111000001', 'kiran@example.com', 1, 1, 'Cable Basic 50 Mbps',        'Cable',      'New'),
    ('org_001', 'Meera Nair',  '9111000002', NULL,                4, 2, 'Internet 1 Fiber Basic',     'Internet 1', 'New'),
    ('org_001', 'Ravi Reddy',  '9111000003', 'ravi@example.com',  7, 3, 'Internet 2 Express 75 Mbps', 'Internet 2', 'Converted');

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
        {"title":"High Speed","description":"Up to 300 Mbps download speeds","icon":"Zap"},
        {"title":"Reliable","description":"99.9% uptime guarantee","icon":"Shield"},
        {"title":"Support","description":"24/7 customer support","icon":"HeadphonesIcon"}
    ]',
    'View Plans',
    '/plans'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- UPI Payment Config
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO upi_payment_config (
    organization_id, upi_id, upi_display_name, enabled, supported_apps
)
VALUES (
    'org_001',
    '',
    '',
    FALSE,
    '["gpay","phonepe","paytm","bhim"]'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Inventory Categories  (ISP-specific: Network Equipment, Cables, STB, Tools)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO inventory_categories (organization_id, name, code, description)
VALUES
    ('org_001', 'Network Equipment', 'NET', 'Routers, switches, modems, and accessories'),
    ('org_001', 'Cables & Wiring',   'CBL', 'Coaxial, fiber, ethernet, and patch cables'),
    ('org_001', 'Set-Top Boxes',     'STB', 'Cable and IPTV set-top box units'),
    ('org_001', 'Tools',             'TLS', 'Installation and maintenance tools');

-- ─────────────────────────────────────────────────────────────────────────────
-- Inventory Subcategories
-- category_id: 1=Network Equipment, 2=Cables & Wiring, 3=Set-Top Boxes, 4=Tools
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
    ('org_001', 'Piece', 'Pcs'),
    ('org_001', 'Box',   'Box'),
    ('org_001', 'Meter', 'Mtr'),
    ('org_001', 'Roll',  'Roll'),
    ('org_001', 'Set',   'Set');

-- ─────────────────────────────────────────────────────────────────────────────
-- Inventory Tax Rates  (Indian GST slabs)
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
    ('org_001', 'No Warranty', 0,  'months'),
    ('org_001', '6 Months',    6,  'months'),
    ('org_001', '1 Year',      12, 'months'),
    ('org_001', '2 Years',     24, 'months'),
    ('org_001', '3 Years',     36, 'months');

-- ─────────────────────────────────────────────────────────────────────────────
-- Inventory Products
-- category_id: 1=Network Equipment, 2=Cables, 3=STB, 4=Tools
-- subcategory_id: 1=Routers, 2=Modems, 4=Coaxial Cable, 6=HD STB
-- unit_id:     1=Pcs, 3=Mtr
-- tax_rate_id: 3=GST 18%
-- warranty_id: 1=No Warranty, 2=6 Months, 3=1 Year
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
-- contact_id: 1=Rajesh Kumar (customer), NULL=walk-in
-- created_by: 1=bankaitech (admin), 2=bankaitech-emp (employee)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO pos_transactions (
    organization_id, branch_id, contact_id, customer_name,
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
-- product_id: 1=Dual-Band WiFi Router, 5=Installation Service
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO pos_transaction_items (
    transaction_id, product_id, product_name,
    quantity, unit_price, tax_rate, tax_amount, line_total
)
VALUES
    (1, 1, 'Dual-Band WiFi Router', 1, 1200, 18, 216, 1416),
    (2, 5, 'Installation Service',  1,  500, 18,  90,  590);

-- ─────────────────────────────────────────────────────────────────────────────
-- Super Admin Users  (platform-level, not scoped to any organization)
-- Password: test123 → generate hash: node -e "require('bcrypt').hash('test123',10).then(console.log)"
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO superadmin_users (name, username, password_hash, role, status, allowed_permissions)
VALUES
    ('Super Admin', 'superadmin', '$2b$10$PLACEHOLDER_HASH_SA', 'super_admin', 'active', '[]');

-- ─────────────────────────────────────────────────────────────────────────────
-- SMS Config  (disabled by default — admin enables after entering provider creds)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO sms_config (
    organization_id, provider, api_key, sender_id, template_id, enabled, payment_template
)
VALUES (
    'org_001',
    '',
    '',
    '',
    '',
    FALSE,
    'Dear {customer_name}, payment of Rs.{amount} received via {method}. Balance: Rs.{balance}. Thank you - {company}'
);
