-- =============================================================================
-- Popna — Multi-Industry Business Management Platform
-- MySQL Seed Migration: 002_seed_data
-- =============================================================================
-- Aligned with 001_create_tables.sql (11 consolidated tables).
-- Mirrors mockData.ts + industryMockData.ts for immediate dev/testing.
--
-- Organizations:
--   org_001 = ISP-Cable (Popna Entertainment)
--   org_002 = Retail (MegaMart Retail)
--   org_003 = Salon & Spa (Glow Studio)
--   org_004 = Restaurant (Spice Kitchen)
--   org_005 = Healthcare/Pharmacy (MedCare Pharmacy)
--   org_006 = Gym/Fitness (FitZone Gym)
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: organizations (6 multi-industry orgs)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO organizations (id, name, status, allowed_modules, allowed_settings_tabs, industry_type, terminology, subscription_start, subscription_end)
VALUES
    -- org_001: ISP-Cable
    (
        'org_001', 'Popna Entertainment', 'active',
        '["dashboard","contacts","connection-requests","complaints","payments","invoices","purchase-invoices","inventory-products","products","subscriptions","service-requests","expenses","branches","users","settings","reports","audit-trail"]',
        '["company","products","billing","custom-fields"]',
        'isp-cable',
        '{"customer":"Subscriber","contact":"Subscribers","complaint":"Ticket","connectionType":"Service Plan","subscription":"Plans","serviceRequest":"Fault Report"}',
        '2025-01-01', '2027-12-31'
    ),
    -- org_002: Retail
    (
        'org_002', 'MegaMart Retail', 'active',
        '["dashboard","contacts","invoices","purchase-invoices","purchase-orders","quotations","inventory-products","pos","expenses","branches","users","settings","reports","audit-trail"]',
        '["company","products","billing","pos","custom-fields"]',
        'retail',
        '{"complaint":"Return/Refund"}',
        '2025-01-01', '2027-12-31'
    ),
    -- org_003: Salon & Spa
    (
        'org_003', 'Glow Studio', 'active',
        '["dashboard","contacts","invoices","purchase-invoices","inventory-products","pos","appointments","subscriptions","crm-leads","expenses","users","settings","reports","audit-trail"]',
        '["company","products","billing","pos","custom-fields"]',
        'salon-spa',
        '{"customer":"Client","contact":"Clients","appointment":"Booking","product":"Service / Treatment","subscription":"Membership"}',
        '2025-01-01', '2027-12-31'
    ),
    -- org_004: Restaurant
    (
        'org_004', 'Spice Kitchen', 'active',
        '["dashboard","contacts","invoices","purchase-invoices","purchase-orders","inventory-products","pos","appointments","complaints","expenses","branches","users","settings","reports","audit-trail"]',
        '["company","products","billing","pos"]',
        'restaurant-cafe',
        '{"customer":"Guest","contact":"Guests","appointment":"Reservation","product":"Menu Item","complaint":"Feedback"}',
        '2025-01-01', '2027-12-31'
    ),
    -- org_005: Healthcare / Pharmacy
    (
        'org_005', 'MedCare Pharmacy', 'active',
        '["dashboard","contacts","invoices","purchase-invoices","purchase-orders","inventory-products","pos","appointments","service-requests","subscriptions","expenses","branches","users","settings","reports","audit-trail"]',
        '["company","products","billing","pos","custom-fields"]',
        'healthcare-pharmacy',
        '{"customer":"Patient","contact":"Patients","appointment":"Consultation","serviceRequest":"Treatment Request","subscription":"Health Package","vendor":"Supplier"}',
        '2025-01-01', '2027-12-31'
    ),
    -- org_006: Gym / Fitness
    (
        'org_006', 'FitZone Gym', 'active',
        '["dashboard","contacts","invoices","purchase-invoices","inventory-products","pos","appointments","subscriptions","crm-leads","expenses","users","settings","reports","audit-trail"]',
        '["company","products","billing","pos","custom-fields"]',
        'gym-fitness',
        '{"customer":"Member","contact":"Members","subscription":"Membership","appointment":"Session","lead":"Prospect"}',
        '2025-01-01', '2027-12-31'
    );

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: users (1 super_admin + 6 org admins + 1 ISP employee = 8 users)
-- Passwords: test123 → replace with bcrypt hash in production
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO users (organization_id, name, username, password_hash, role, status, allowed_modules, branch_id)
VALUES
    (NULL,      'Super Admin',       'superadmin',  '$2b$10$PLACEHOLDER_HASH_SA',    'super_admin', 'active', '[]', NULL),
    ('org_001', 'ISP Admin',         'isp',         '$2b$10$PLACEHOLDER_HASH_ISP',   'admin',       'active', '[]', 1),
    ('org_001', 'ISP Employee',      'isp-emp',     '$2b$10$PLACEHOLDER_HASH_EMP',   'employee',    'active', '["contacts","complaints"]', 1),
    ('org_002', 'Retail Admin',      'retail',      '$2b$10$PLACEHOLDER_HASH_RET',   'admin',       'active', '[]', NULL),
    ('org_003', 'Salon Admin',       'salon',       '$2b$10$PLACEHOLDER_HASH_SAL',   'admin',       'active', '[]', NULL),
    ('org_004', 'Restaurant Admin',  'restaurant',  '$2b$10$PLACEHOLDER_HASH_REST',  'admin',       'active', '[]', NULL),
    ('org_005', 'Pharmacy Admin',    'pharmacy',    '$2b$10$PLACEHOLDER_HASH_PHAR',  'admin',       'active', '[]', NULL),
    ('org_006', 'Gym Admin',         'gym',         '$2b$10$PLACEHOLDER_HASH_GYM',   'admin',       'active', '[]', NULL);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: contacts — org_001 ISP Customers (22 subscribers)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO contacts (
    organization_id, contact_type,
    name, email, mobile,
    connection_type, package, status, description,
    address_line1, address_line2, city, state, country,
    payment_status, payment_method, payment_description, payment_updated_at,
    collected_amount, balance_amount,
    box_number, stb_number, can_caf_id, cin, area,
    branch_id, tags, custom_fields, created_at
)
VALUES
    ('org_001','customer','Rajesh Kumar','rajesh.kumar@example.com','9876543210','Cable','Cable Basic 50 Mbps','Active','Long-term customer, very satisfied with service.','123 Main Street','Near City Park','Mumbai','Maharashtra','India','paid','upi','Monthly bill paid via UPI on 15th.',DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 10 DAY),589,0,'BOX-001','STB-MH-001','CAN-2024-00001','CIN-MH-001','Andheri West',1,'[]','{}',DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 45 DAY)),
    ('org_001','customer','Naresh','naresh@example.com','9876543211','Internet 1','Internet 1 Fiber Basic','Active','New customer, installation completed last month.','456 Park Avenue','Block A','Delhi','Delhi','India','not_paid',NULL,NULL,NULL,0,0,NULL,NULL,NULL,NULL,'Connaught Place',1,'[]','{}',DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 25 DAY)),
    ('org_001','customer','Amit Patel','amit.patel@example.com','9876543212','Internet 2','Internet 2 Express 75 Mbps','Inactive','Service temporarily suspended due to payment issues.','789 Tech Road','Sector 5','Bangalore','Karnataka','India','not_paid',NULL,NULL,NULL,0,707,NULL,NULL,NULL,NULL,'Koramangala',1,'[]','{}',DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 60 DAY)),
    ('org_001','customer','Sneha Reddy','sneha.reddy@example.com','9876543213','Cable','Cable Premium 100 Mbps','Inactive','Upgraded to premium plan recently.','321 Business Park','Floor 3','Hyderabad','Telangana','India','not_paid',NULL,'Pending: December bill.',DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 5 DAY),0,943,'BOX-004','STB-TS-004','CAN-2024-00004',NULL,'Banjara Hills',1,'[]','{}',DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 15 DAY)),
    ('org_001','customer','Vikram Singh','vikram.singh@example.com','9876543214','Internet 3','Internet 3 Rural Connect','Active','Rural area customer, good connectivity.','Village Road','Near Post Office','Pune','Maharashtra','India','paid','cash','Paid in cash at local office.',DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 1 DAY),471,0,NULL,NULL,NULL,NULL,'Wakad',1,'[]','{}',DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 5 DAY)),
    ('org_001','customer','Anjali Mehta','anjali.mehta@example.com','9876543215','Internet 1','Internet 1 Fiber Plus','Active','Regular customer, always pays on time.','567 Residential Complex','Tower B','Chennai','Tamil Nadu','India','paid','upi','Auto-paid via Google Pay.',DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 3 DAY),825,0,NULL,NULL,NULL,NULL,'T. Nagar',1,'[]','{}',DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 30 DAY)),
    ('org_001','customer','Rahul Verma','rahul.verma@example.com','9876543216','Internet 2','Internet 2 Speed 150 Mbps','Active','Business customer, requires high-speed connection.','890 Corporate Avenue','Suite 201','Gurgaon','Haryana','India','paid','card','Paid by credit card.',DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 7 DAY),1061,0,NULL,NULL,NULL,NULL,'DLF Cyber City',1,'[]','{}',DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 8 DAY)),
    ('org_001','customer','Kavita Nair','kavita.nair@example.com','9876543217','Cable','Cable Ultra 200 Mbps','Active','Power user, needs ultra-fast speeds for work.','234 Tech Hub','Unit 15','Noida','Uttar Pradesh','India','paid','cash','Paid in full at office.',DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 2 DAY),1533,0,'BOX-008','STB-UP-008','CAN-2024-00008','CIN-UP-008','Sector 62',2,'[]','{}',DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 12 DAY)),
    ('org_001','customer','Mohit Agarwal','mohit.agarwal@example.com','9876543218','Internet 1','Internet 1 Fiber Premium','Inactive','Service disconnected, customer moved to different city.','345 Green Valley','Apartment 4B','Kolkata','West Bengal','India','not_paid',NULL,NULL,NULL,0,0,NULL,NULL,NULL,NULL,NULL,2,'[]','{}',DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 90 DAY)),
    ('org_001','customer','Divya Joshi','divya.joshi@example.com','9876543219','Internet 3','Internet 3 Home Plus','Active','Home user, satisfied with current plan.','678 Suburban Lane','House No. 12','Ahmedabad','Gujarat','India','not_paid',NULL,NULL,NULL,0,0,NULL,NULL,NULL,NULL,NULL,2,'[]','{}',DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 20 DAY)),
    ('org_001','customer','Arjun Malhotra','arjun.malhotra@example.com','9876543220','Internet 2','Internet 2 Turbo 300 Mbps','Active','Gaming enthusiast, requires low latency connection.','901 Gaming Street','Flat 302','Bangalore','Karnataka','India','not_paid',NULL,NULL,NULL,0,0,NULL,NULL,NULL,NULL,NULL,2,'[]','{}',DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 3 DAY)),
    ('org_001','customer','Pooja Desai','pooja.desai@example.com','9876543221','Cable','Cable Basic 50 Mbps','Active','Budget-conscious customer.','112 Affordable Housing','Block C','Surat','Gujarat','India','not_paid',NULL,NULL,NULL,0,0,NULL,NULL,NULL,NULL,NULL,2,'[]','{}',DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 18 DAY)),
    ('org_001','customer','Suresh Iyer','suresh.iyer@example.com','9876543222','Internet 1','Internet 1 Fiber Basic','Inactive','Temporary disconnection, will reconnect next month.','223 Temple Road','Near Market','Coimbatore','Tamil Nadu','India','not_paid',NULL,NULL,NULL,0,0,NULL,NULL,NULL,NULL,NULL,2,'[]','{}',DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 75 DAY)),
    ('org_001','customer','Meera Krishnan','meera.krishnan@example.com','9876543223','Internet 3','Internet 3 Business','Active','Small business owner.','334 Commercial Street','Shop No. 5','Kochi','Kerala','India','not_paid',NULL,NULL,NULL,0,0,NULL,NULL,NULL,NULL,NULL,3,'[]','{}',DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 10 DAY)),
    ('org_001','customer','Nikhil Kapoor','nikhil.kapoor@example.com','9876543224','Cable','Cable Premium 100 Mbps','Active','Streaming enthusiast.','445 Entertainment Avenue','Residency 8','Mumbai','Maharashtra','India','not_paid',NULL,NULL,NULL,0,0,NULL,NULL,NULL,NULL,NULL,3,'[]','{}',DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 7 DAY)),
    ('org_001','customer','Riya Banerjee','riya.banerjee@example.com','9876543225','Internet 2','Internet 2 Express 75 Mbps','Active','Student, needs internet for online classes.','556 College Road','Hostel Block','Pune','Maharashtra','India','not_paid',NULL,NULL,NULL,0,0,NULL,NULL,NULL,NULL,NULL,3,'[]','{}',DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 22 DAY)),
    ('org_001','customer','Karan Thakur','karan.thakur@example.com','9876543226','Internet 1','Internet 1 Fiber Plus','Active','Remote worker.','667 Work From Home','Apartment 9A','Jaipur','Rajasthan','India','not_paid',NULL,NULL,NULL,0,0,NULL,NULL,NULL,NULL,NULL,3,'[]','{}',DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 14 DAY)),
    ('org_001','customer','Shreya Menon','shreya.menon@example.com','9876543227','Internet 3','Internet 3 Rural Connect','Inactive','Service suspended due to area maintenance.','778 Village Main Road','House No. 23','Thrissur','Kerala','India','not_paid',NULL,NULL,NULL,0,0,NULL,NULL,NULL,NULL,NULL,3,'[]','{}',DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 50 DAY)),
    ('org_001','customer','Aditya Rao','aditya.rao@example.com','9876543228','Cable','Cable Ultra 200 Mbps','Active','Tech professional.','889 Developer Hub','Flat 501','Bangalore','Karnataka','India','not_paid',NULL,NULL,NULL,0,0,NULL,NULL,NULL,NULL,NULL,3,'[]','{}',DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 2 DAY)),
    ('org_001','customer','Neha Gupta','neha.gupta@example.com','9876543229','Internet 2','Internet 2 Speed 150 Mbps','Active','Content creator.','990 Content Studio','Unit 7','Mumbai','Maharashtra','India','not_paid',NULL,NULL,NULL,0,0,NULL,NULL,NULL,NULL,NULL,1,'[]','{}',DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 1 DAY)),
    ('org_001','customer','Rohit Sharma','rohit.sharma@example.com','9876543230','Internet 1','Internet 1 Fiber Premium','Active','Family plan, multiple devices connected.','101 Family Home','Ground Floor','Delhi','Delhi','India','not_paid',NULL,NULL,NULL,0,0,NULL,NULL,NULL,NULL,NULL,1,'[]','{}',DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 6 DAY)),
    ('org_001','customer','Ananya Das','ananya.das@example.com','9876543231','Internet 3','Internet 3 Home Plus','Active','New customer, just installed last week.','202 New Colony','House No. 45','Bhubaneswar','Odisha','India','not_paid',NULL,NULL,NULL,0,0,NULL,NULL,NULL,NULL,NULL,1,'[]','{}',DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 4 DAY));

-- Set GSTIN for business customer Rahul Verma
UPDATE contacts SET gstin = '06AABCT1234C1ZN'
WHERE mobile = '9876543216' AND organization_id = 'org_001' AND contact_type = 'customer';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: contacts — org_002 Retail Customers (5)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO contacts (organization_id, contact_type, name, email, mobile, status, city, state, country, loyalty_points, tags, custom_fields)
VALUES
    ('org_002','customer','Priya Sharma','priya.s@example.com','9301000001','Active','Mumbai','Maharashtra','India',250,'["regular"]','{}'),
    ('org_002','customer','Ravi Menon','ravi.m@example.com','9301000002','Active','Pune','Maharashtra','India',180,'[]','{}'),
    ('org_002','customer','Sunita Patel','sunita.p@example.com','9301000003','Active','Ahmedabad','Gujarat','India',320,'["vip"]','{}'),
    ('org_002','customer','Deepak Joshi','deepak.j@example.com','9301000004','Active','Mumbai','Maharashtra','India',90,'[]','{}'),
    ('org_002','customer','Anjana Kumar','anjana.k@example.com','9301000005','Inactive','Surat','Gujarat','India',0,'[]','{}');

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: contacts — org_003 Salon Clients (5)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO contacts (organization_id, contact_type, name, email, mobile, status, city, state, country, loyalty_points, tags, custom_fields)
VALUES
    ('org_003','customer','Kavya Reddy','kavya.r@example.com','9302000001','Active','Hyderabad','Telangana','India',150,'["premium"]','{}'),
    ('org_003','customer','Meera Pillai','meera.p@example.com','9302000002','Active','Kochi','Kerala','India',80,'[]','{}'),
    ('org_003','customer','Nisha Verma','nisha.v@example.com','9302000003','Active','Mumbai','Maharashtra','India',200,'["regular"]','{}'),
    ('org_003','customer','Rekha Iyer','rekha.i@example.com','9302000004','Active','Chennai','Tamil Nadu','India',60,'[]','{}'),
    ('org_003','customer','Shalini Das','shalini.d@example.com','9302000005','Inactive','Kolkata','West Bengal','India',0,'[]','{}');

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: contacts — org_004 Restaurant Guests (4)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO contacts (organization_id, contact_type, name, email, mobile, status, city, state, country, loyalty_points, tags, custom_fields)
VALUES
    ('org_004','customer','Arjun Nair','arjun.n@example.com','9303000001','Active','Bangalore','Karnataka','India',100,'["regular"]','{}'),
    ('org_004','customer','Divya Krishnan','divya.k@example.com','9303000002','Active','Chennai','Tamil Nadu','India',50,'[]','{}'),
    ('org_004','customer','Suresh Babu','suresh.b@example.com','9303000003','Active','Bangalore','Karnataka','India',200,'["vip"]','{}'),
    ('org_004','customer','Latha Menon','latha.m@example.com','9303000004','Active','Kochi','Kerala','India',30,'[]','{}');

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: contacts — org_005 Healthcare Patients (5)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO contacts (organization_id, contact_type, name, email, mobile, status, city, state, country, tags, custom_fields)
VALUES
    ('org_005','customer','Gopal Rao','gopal.r@example.com','9304000001','Active','Hyderabad','Telangana','India','[]','{}'),
    ('org_005','customer','Usha Natarajan','usha.n@example.com','9304000002','Active','Chennai','Tamil Nadu','India','[]','{}'),
    ('org_005','customer','Babu Subramanian','babu.s@example.com','9304000003','Active','Coimbatore','Tamil Nadu','India','[]','{}'),
    ('org_005','customer','Saroja Devi','saroja.d@example.com','9304000004','Active','Madurai','Tamil Nadu','India','[]','{}'),
    ('org_005','customer','Prakash Venkat','prakash.v@example.com','9304000005','Active','Bangalore','Karnataka','India','[]','{}');

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: contacts — org_006 Gym Members (6)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO contacts (organization_id, contact_type, name, email, mobile, status, city, state, country, loyalty_points, tags, custom_fields)
VALUES
    ('org_006','customer','Aditya Kulkarni','aditya.k@example.com','9305000001','Active','Pune','Maharashtra','India',300,'["premium"]','{}'),
    ('org_006','customer','Pooja Deshmukh','pooja.d@example.com','9305000002','Active','Pune','Maharashtra','India',150,'[]','{}'),
    ('org_006','customer','Sanjay Patil','sanjay.p@example.com','9305000003','Active','Mumbai','Maharashtra','India',220,'["regular"]','{}'),
    ('org_006','customer','Neha Joshi','neha.j@example.com','9305000004','Active','Pune','Maharashtra','India',80,'[]','{}'),
    ('org_006','customer','Rahul Bhosale','rahul.b@example.com','9305000005','Active','Nashik','Maharashtra','India',100,'[]','{}'),
    ('org_006','customer','Smita Gaikwad','smita.g@example.com','9305000006','Inactive','Pune','Maharashtra','India',0,'[]','{}');

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: contacts — Suppliers & Vendors (multi-org)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO contacts (organization_id, contact_type, name, mobile, email, tax_number, opening_balance, contact_person, address_line1, city, state, country, pincode, tags, custom_fields)
VALUES
    -- org_001 ISP suppliers
    ('org_001','supplier','Alpha Electronics','9200000001','suresh@alphaelec.com','27AABCA1234B1Z6',0,'Suresh Mehta','12 Industrial Estate','Mumbai','Maharashtra','India','400093','[]','{}'),
    ('org_001','supplier','Beta Components Pvt Ltd','9200000002','anita@betacomp.com','29AABCB5678C1Z3',5000,'Anita Rao','88 KIADB Area','Bangalore','Karnataka','India','560058','[]','{}'),
    -- org_002 Retail vendors
    ('org_002','vendor','TechBulk Distributors','9400000001','sales@techbulk.com','27AABCT5678D1Z1',0,'Rajiv Gupta','45 MIDC','Mumbai','Maharashtra','India','400093','[]','{}'),
    ('org_002','vendor','FashionWare Pvt Ltd','9400000002','orders@fashionware.com','27AABCF1234E1Z2',0,'Sneha Kulkarni','12 Textile Market','Surat','Gujarat','India','395003','[]','{}'),
    -- org_003 Salon vendor
    ('org_003','vendor','Beauty Essentials India','9400000003','info@beautyessentials.com','29AABCB9876F1Z3',0,'Meena Sharma','78 Beauty Lane','Bangalore','Karnataka','India','560001','[]','{}'),
    -- org_004 Restaurant vendors
    ('org_004','vendor','Fresh Farm Produce','9400000004','orders@freshfarm.com','29AABCF2345G1Z4',0,'Sunil Reddy','Market Yard','Bangalore','Karnataka','India','560002','[]','{}'),
    ('org_004','vendor','Spice World Traders','9400000005','sales@spiceworld.com','32AABCS3456H1Z5',0,'Rani Menon','Spice Market','Kochi','Kerala','India','682001','[]','{}'),
    -- org_005 Healthcare vendor
    ('org_005','vendor','MedSupply India','9400000006','orders@medsupply.com','33AABCM4567I1Z6',0,'Dr. Ramesh','Pharma Hub','Chennai','Tamil Nadu','India','600001','[]','{}'),
    -- org_006 Gym vendors
    ('org_006','vendor','FitEquip Global','9400000007','sales@fitequip.com','27AABCF5678J1Z7',0,'Amit Shah','Industrial Zone','Pune','Maharashtra','India','411001','[]','{}'),
    ('org_006','vendor','NutriStore Wholesale','9400000008','bulk@nutristore.com','27AABCN6789K1Z8',0,'Priya Jain','Market Road','Pune','Maharashtra','India','411002','[]','{}');

-- org_001 ISP vendors (for purchase invoices)
INSERT INTO contacts (organization_id, contact_type, name, mobile, gstin, city, state, country, tags, custom_fields)
VALUES
    ('org_001','vendor','TechSupply Co.','9000000001','27AABCT1234C1Z5','Mumbai','Maharashtra','India','[]','{}'),
    ('org_001','vendor','NetworkParts Ltd.','9000000002','29AABCN5678D1Z2','Bangalore','Karnataka','India','[]','{}');

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: inventory — org_001 ISP Categories (catalog_type = 'isp_category')
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO inventory (organization_id, catalog_type, name, price, is_active, variants, meta)
VALUES
    ('org_001','isp_category','Cable',      0,TRUE,'[]','{"isp_type":"cable","cutoff_date":10}'),
    ('org_001','isp_category','Internet 1', 0,TRUE,'[]','{"isp_type":"internet","cutoff_days":7}'),
    ('org_001','isp_category','Internet 2', 0,TRUE,'[]','{"isp_type":"internet","cutoff_days":7}'),
    ('org_001','isp_category','Internet 3', 0,TRUE,'[]','{"isp_type":"internet","cutoff_days":15}');

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: inventory — org_001 ISP Plans (catalog_type = 'isp_plan')
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO inventory (organization_id, catalog_type, name, price, description, is_active, variants, meta)
VALUES
    ('org_001','isp_plan','Cable Basic 50 Mbps',       499, 'High-speed cable broadband with 50 Mbps.',TRUE,'[]','{"provider":"Cable","gst_rate":18,"installation_amount":500,"permanent_discount":0}'),
    ('org_001','isp_plan','Cable Premium 100 Mbps',    799, 'Premium cable broadband with 100 Mbps.',TRUE,'[]','{"provider":"Cable","gst_rate":18,"installation_amount":500,"permanent_discount":0}'),
    ('org_001','isp_plan','Cable Ultra 200 Mbps',      1299,'Ultra-fast cable broadband with 200 Mbps.',TRUE,'[]','{"provider":"Cable","gst_rate":18,"installation_amount":1000,"permanent_discount":0}'),
    ('org_001','isp_plan','Internet 1 Fiber Basic',    449, 'Reliable fiber connection with stable speeds.',TRUE,'[]','{"provider":"Internet 1","gst_rate":18,"installation_amount":500,"permanent_discount":0}'),
    ('org_001','isp_plan','Internet 1 Fiber Plus',     699, 'Enhanced fiber connection with better speeds.',TRUE,'[]','{"provider":"Internet 1","gst_rate":18,"installation_amount":500,"permanent_discount":0}'),
    ('org_001','isp_plan','Internet 1 Fiber Premium',  999, 'Premium fiber connection for demanding users.',TRUE,'[]','{"provider":"Internet 1","gst_rate":18,"installation_amount":1000,"permanent_discount":0}'),
    ('org_001','isp_plan','Internet 2 Express 75 Mbps',599, 'Fast and reliable 75 Mbps connection.',TRUE,'[]','{"provider":"Internet 2","gst_rate":18,"installation_amount":500,"permanent_discount":0}'),
    ('org_001','isp_plan','Internet 2 Speed 150 Mbps', 899, 'High-speed 150 Mbps for power users.',TRUE,'[]','{"provider":"Internet 2","gst_rate":18,"installation_amount":500,"permanent_discount":0}'),
    ('org_001','isp_plan','Internet 2 Turbo 300 Mbps', 1499,'Blazing fast 300 Mbps speeds.',TRUE,'[]','{"provider":"Internet 2","gst_rate":18,"installation_amount":1000,"permanent_discount":0}'),
    ('org_001','isp_plan','Internet 3 Rural Connect',  399, 'Affordable internet for rural areas.',TRUE,'[]','{"provider":"Internet 3","gst_rate":18,"installation_amount":500,"permanent_discount":0}'),
    ('org_001','isp_plan','Internet 3 Home Plus',      549, 'Enhanced home internet with better coverage.',TRUE,'[]','{"provider":"Internet 3","gst_rate":18,"installation_amount":500,"permanent_discount":0}'),
    ('org_001','isp_plan','Internet 3 Business',       799, 'Business-grade internet with dedicated support.',TRUE,'[]','{"provider":"Internet 3","gst_rate":18,"installation_amount":1000,"permanent_discount":0}');

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: inventory — org_001 ISP Products (catalog_type = 'product')
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO inventory (organization_id, catalog_type, name, sku, category, category_code, subcategory, unit, unit_short_name, description, price, purchase_price, mrp, is_active, product_form, brand, hsn_sac_code, tax_type, tax_rate_name, tax_rate, warranty_name, warranty_duration, warranty_unit, current_stock, stock_alert, reorder_level, tracking_type, branch_id, variants, meta)
VALUES
    ('org_001','product','Dual-Band WiFi Router','NET-RTR-001','Network Equipment','NET','Routers','Piece','Pcs','AC1200 dual-band wireless router.',1200,850,1499,TRUE,'physical','TP-Link','85176990','exclusive','GST 18%',18,'1 Year',12,'months',25,5,10,'serial',1,'[]','{}'),
    ('org_001','product','ADSL Modem','NET-MDM-001','Network Equipment','NET','Modems','Piece','Pcs','ADSL2+ modem with built-in splitter.',650,420,799,TRUE,'physical','D-Link','85176990','exclusive','GST 18%',18,'1 Year',12,'months',15,3,5,'serial',1,'[]','{}'),
    ('org_001','product','Coaxial RG6 Cable','CBL-COX-001','Cables & Wiring','CBL','Coaxial Cable','Meter','Mtr','RG6 coaxial cable for cable TV.',25,12,35,TRUE,'physical',NULL,'85442090','exclusive','GST 18%',18,'No Warranty',0,'months',500,50,100,'none',1,'[]','{}'),
    ('org_001','product','HD Set-Top Box','STB-HD-001','Set-Top Boxes','STB','HD STB','Piece','Pcs','HD cable set-top box with recording.',1800,1200,2200,TRUE,'physical','Airtel','85287100','exclusive','GST 18%',18,'6 Months',6,'months',30,5,10,'serial',1,'[]','{}'),
    ('org_001','product','Installation Service','SVC-INST-001',NULL,NULL,NULL,'Piece','Pcs','Standard broadband/cable installation.',500,0,500,TRUE,'service',NULL,'99833190','exclusive','GST 18%',18,'No Warranty',0,'months',0,0,0,'none',1,'[]','{}');

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: inventory — org_002 Retail Products
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO inventory (organization_id, catalog_type, name, sku, category, price, purchase_price, mrp, is_active, product_form, tax_type, tax_rate, hsn_sac_code, current_stock, stock_alert, tracking_type, variants, meta)
VALUES
    ('org_002','product','Wireless Earbuds Pro','RET-EAR-001','Electronics',1499,900,1799,TRUE,'physical','exclusive',18,'85183000',50,10,'serial','[]','{}'),
    ('org_002','product','Laptop Stand Aluminium','RET-LST-001','Electronics',899,550,1099,TRUE,'physical','exclusive',18,'83062900',30,5,'none','[]','{}'),
    ('org_002','product','USB-C Hub 7-in-1','RET-USB-001','Electronics',1299,750,1599,TRUE,'physical','exclusive',18,'84733020',25,5,'none','[]','{}'),
    ('org_002','product','Screen Guard Tempered','RET-SCR-001','Accessories',199,80,249,TRUE,'physical','exclusive',18,'70072190',200,20,'none','[]','{}'),
    ('org_002','product','Cotton T-Shirt','RET-TSH-001','Clothing',599,300,799,TRUE,'physical','exclusive',5,'61091000',100,15,'none','[]','{}');

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: inventory — org_003 Salon Services & Products
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO inventory (organization_id, catalog_type, name, sku, category, price, is_active, product_form, tax_type, tax_rate, variants, meta)
VALUES
    ('org_003','product','Hair Cut - Women','SAL-HC-001','Hair Services',500,TRUE,'service','exclusive',18,'[]','{}'),
    ('org_003','product','Hair Coloring','SAL-CLR-001','Hair Services',2000,TRUE,'service','exclusive',18,'[]','{}'),
    ('org_003','product','Full Body Spa','SAL-SPA-001','Spa Treatments',3500,TRUE,'service','exclusive',18,'[]','{}'),
    ('org_003','product','Classic Facial','SAL-FCL-001','Skin Care',1200,TRUE,'service','exclusive',18,'[]','{}'),
    ('org_003','product','Manicure & Pedicure','SAL-MNP-001','Nail Care',800,TRUE,'service','exclusive',18,'[]','{}');

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: inventory — org_004 Restaurant Menu Items
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO inventory (organization_id, catalog_type, name, sku, category, price, is_active, product_form, tax_type, tax_rate, variants, meta)
VALUES
    ('org_004','product','Butter Chicken','RST-BC-001','Main Course',350,TRUE,'physical','inclusive',5,'[]','{}'),
    ('org_004','product','Hyderabadi Biryani','RST-BIR-001','Main Course',280,TRUE,'physical','inclusive',5,'[]','{}'),
    ('org_004','product','Paneer Tikka','RST-PT-001','Starters',220,TRUE,'physical','inclusive',5,'[]','{}'),
    ('org_004','product','Masala Dosa','RST-MD-001','Main Course',120,TRUE,'physical','inclusive',5,'[]','{}'),
    ('org_004','product','Fresh Lime Soda','RST-FLS-001','Beverages',60,TRUE,'physical','inclusive',5,'[]','{}');

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: inventory — org_005 Healthcare Products
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO inventory (organization_id, catalog_type, name, sku, category, price, purchase_price, is_active, product_form, tax_type, tax_rate, current_stock, stock_alert, tracking_type, variants, meta)
VALUES
    ('org_005','product','Paracetamol 500mg','MED-PAR-001','OTC Medicines',25,12,TRUE,'physical','exclusive',12,500,50,'batch','[]','{}'),
    ('org_005','product','Blood Pressure Monitor','MED-BPM-001','Medical Devices',1800,1200,TRUE,'physical','exclusive',12,20,5,'serial','[]','{}'),
    ('org_005','product','Consultation - General','MED-CON-001','Consultation',500,0,TRUE,'service','none',0,0,0,'none','[]','{}'),
    ('org_005','product','Blood Test - CBC','MED-CBC-001','Lab Tests',350,0,TRUE,'service','none',0,0,0,'none','[]','{}'),
    ('org_005','product','X-Ray - Chest','MED-XRC-001','Diagnostics',800,0,TRUE,'service','none',0,0,0,'none','[]','{}');

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: inventory — org_006 Gym Products
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO inventory (organization_id, catalog_type, name, sku, category, price, purchase_price, is_active, product_form, tax_type, tax_rate, current_stock, stock_alert, variants, meta)
VALUES
    ('org_006','product','Whey Protein 1kg','GYM-WP-001','Supplements',2499,1800,TRUE,'physical','exclusive',18,30,5,'[]','{}'),
    ('org_006','product','BCAA Powder','GYM-BCAA-001','Supplements',1299,900,TRUE,'physical','exclusive',18,20,5,'[]','{}'),
    ('org_006','product','Gym Gloves','GYM-GLV-001','Accessories',499,250,TRUE,'physical','exclusive',18,40,10,'[]','{}'),
    ('org_006','product','Personal Training - 1 Session','GYM-PT-001','Services',500,0,TRUE,'service','exclusive',18,0,0,'[]','{}');

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: activities — org_001 ISP Complaints (kind = 'complaint')
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO activities (organization_id, kind, contact_id, status, priority, payload, created_at)
VALUES
    ('org_001','complaint',1,'active','medium','{"customerName":"Rajesh Kumar","mobile":"9876543210","connectionType":"Cable","customerDescription":"Internet speed is very slow during evening hours.","internalDescription":"Investigating bandwidth allocation."}',DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 2 DAY)),
    ('org_001','complaint',2,'active','high','{"customerName":"Naresh","mobile":"9876543211","connectionType":"Internet 1","customerDescription":"Billing issue - charged extra amount this month.","internalDescription":"Reviewing billing records."}',DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 1 DAY)),
    ('org_001','complaint',3,'active','critical','{"customerName":"Amit Patel","mobile":"9876543212","connectionType":"Internet 2","customerDescription":"Connection not working since yesterday.","internalDescription":"Suspected fiber cut. Technician dispatched."}',CURRENT_TIMESTAMP),
    ('org_001','complaint',4,'on-hold','medium','{"customerName":"Sneha Reddy","mobile":"9876543213","connectionType":"Cable","customerDescription":"Router needs replacement.","internalDescription":"Waiting for router stock."}',DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 5 DAY)),
    ('org_001','complaint',5,'active','high','{"customerName":"Vikram Singh","mobile":"9876543214","connectionType":"Internet 3","customerDescription":"Installation pending for 3 days.","internalDescription":"Scheduled for tomorrow."}',DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 3 DAY)),
    ('org_001','complaint',6,'on-hold','low','{"customerName":"Anjali Mehta","mobile":"9876543215","connectionType":"Internet 1","customerDescription":"Slow download speeds.","internalDescription":"May need line optimization."}',DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 7 DAY)),
    ('org_001','complaint',7,'completed','medium','{"customerName":"Rahul Verma","mobile":"9876543216","connectionType":"Internet 2","customerDescription":"Connection issue resolved.","internalDescription":"Issue resolved by resetting ONT."}',DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 10 DAY)),
    ('org_001','complaint',8,'active','medium','{"customerName":"Kavita Nair","mobile":"9876543217","connectionType":"Cable","customerDescription":"Need to upgrade plan.","internalDescription":"Upgrading to 200 Mbps plan."}',DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 1 DAY)),
    ('org_001','complaint',9,'active','critical','{"customerName":"Mohit Agarwal","mobile":"9876543218","connectionType":"Internet 1","customerDescription":"Fiber cable cut due to construction.","internalDescription":"Emergency repair team dispatched."}',CURRENT_TIMESTAMP),
    ('org_001','complaint',10,'on-hold','low','{"customerName":"Divya Joshi","mobile":"9876543219","connectionType":"Internet 3","customerDescription":"Payment gateway issue.","internalDescription":"Customer can try alternative payment."}',DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 4 DAY));

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: activities — org_001 Connection Requests (kind = 'connection_request')
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO activities (organization_id, kind, contact_id, status, payload)
VALUES
    ('org_001','connection_request',NULL,'new','{"name":"Kiran Shah","mobile":"9111000001","email":"kiran@example.com","planName":"Cable Basic 50 Mbps","productName":"Cable"}'),
    ('org_001','connection_request',NULL,'new','{"name":"Meera Nair","mobile":"9111000002","email":null,"planName":"Internet 1 Fiber Basic","productName":"Internet 1"}'),
    ('org_001','connection_request',NULL,'converted','{"name":"Ravi Reddy","mobile":"9111000003","email":"ravi@example.com","planName":"Internet 2 Express 75 Mbps","productName":"Internet 2"}');

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: activities — Multi-industry Complaints
-- ─────────────────────────────────────────────────────────────────────────────

-- org_004 Restaurant complaints
INSERT INTO activities (organization_id, kind, contact_id, status, priority, payload, created_at)
VALUES
    ('org_004','complaint',32,'active','high','{"customerName":"Arjun Nair","mobile":"9303000001","description":"Food was served cold. Butter chicken was not up to the usual standard.","internalDescription":"Reviewing kitchen process."}',DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 1 DAY)),
    ('org_004','complaint',33,'completed','medium','{"customerName":"Divya Krishnan","mobile":"9303000002","description":"Waiting time was too long for takeaway order.","internalDescription":"Resolved. Offered complimentary dessert."}',DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 5 DAY));

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: activities — Appointments (salon, restaurant, healthcare, gym)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO activities (organization_id, kind, contact_id, status, payload)
VALUES
    -- Salon bookings
    ('org_003','appointment',23,'scheduled','{"customerName":"Kavya Reddy","mobile":"9302000001","serviceType":"Hair Coloring","staffAssigned":"Priya Stylist","scheduledAt":"2026-03-28T10:00:00","duration":90,"notes":"Prefers natural shades"}'),
    ('org_003','appointment',24,'confirmed','{"customerName":"Meera Pillai","mobile":"9302000002","serviceType":"Classic Facial","staffAssigned":"Anu Therapist","scheduledAt":"2026-03-28T14:00:00","duration":60}'),
    -- Restaurant reservations
    ('org_004','appointment',32,'confirmed','{"customerName":"Arjun Nair","mobile":"9303000001","serviceType":"Table Reservation","scheduledAt":"2026-03-28T19:30:00","duration":120,"notes":"4 guests, window seat preferred"}'),
    -- Healthcare consultations
    ('org_005','appointment',36,'scheduled','{"customerName":"Gopal Rao","mobile":"9304000001","serviceType":"General Consultation","staffAssigned":"Dr. Ramesh","scheduledAt":"2026-03-28T09:00:00","duration":30}'),
    ('org_005','appointment',37,'confirmed','{"customerName":"Usha Natarajan","mobile":"9304000002","serviceType":"Blood Test - CBC","scheduledAt":"2026-03-28T08:00:00","duration":15}'),
    -- Gym sessions
    ('org_006','appointment',41,'scheduled','{"customerName":"Aditya Kulkarni","mobile":"9305000001","serviceType":"Personal Training","staffAssigned":"Ravi Trainer","scheduledAt":"2026-03-28T06:00:00","duration":60}'),
    ('org_006','appointment',42,'confirmed','{"customerName":"Pooja Deshmukh","mobile":"9305000002","serviceType":"Yoga Class","scheduledAt":"2026-03-28T07:00:00","duration":60}');

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: activities — Service Requests
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO activities (organization_id, kind, contact_id, status, priority, payload)
VALUES
    ('org_001','service_request',1,'assigned','high','{"customerName":"Rajesh Kumar","mobile":"9876543210","requestType":"Router Reset","description":"Router not responding after power outage","assignedTo":"Field Tech - Sunil","slaHours":4}'),
    ('org_005','service_request',36,'new','medium','{"customerName":"Gopal Rao","mobile":"9304000001","requestType":"Home Visit","description":"BP monitoring for elderly patient","slaHours":24}'),
    ('org_006','service_request',43,'in-progress','high','{"customerName":"Sanjay Patil","mobile":"9305000003","requestType":"Equipment Complaint","description":"Treadmill belt slipping - safety hazard","assignedTo":"Maintenance - Vikas","slaHours":8}');

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: activities — CRM Leads (salon, gym)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO activities (organization_id, kind, contact_id, status, payload)
VALUES
    ('org_003','lead',NULL,'new','{"name":"Lakshmi Wedding Planners","mobile":"9600000001","email":"lakshmi@weddings.com","source":"referral","value":50000,"notes":"Looking for bridal packages for 20+ events"}'),
    ('org_006','lead',NULL,'contacted','{"name":"TCS Wellness Program","mobile":"9600000002","email":"wellness@tcs.com","source":"website","value":200000,"notes":"Corporate membership for 50+ employees"}');

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: invoices — Sales (all orgs)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO invoices (organization_id, kind, invoice_number, status, issue_date, due_date, branch_id, contact_id, customer_name, subtotal, tax_total, total_amount, items, payload)
VALUES
    -- org_001 ISP sales invoices
    ('org_001','sales','INV-2024-001','paid',DATE_SUB(CURRENT_DATE, INTERVAL 15 DAY),DATE_SUB(CURRENT_DATE, INTERVAL 5 DAY),1,1,'Rajesh Kumar',499,89.82,588.82,'[]','{"serviceProvider":"Cable","planName":"Cable Basic 50 Mbps","gstRate":18,"gstAmount":89.82,"invoiceType":"tax_invoice"}'),
    ('org_001','sales','INV-2024-002','sent',DATE_SUB(CURRENT_DATE, INTERVAL 8 DAY),DATE_ADD(CURRENT_DATE, INTERVAL 2 DAY),1,2,'Naresh',449,80.82,529.82,'[]','{"serviceProvider":"Internet 1","planName":"Internet 1 Fiber Basic","gstRate":18,"gstAmount":80.82,"invoiceType":"tax_invoice"}'),
    ('org_001','sales','INV-2024-003','draft',CURRENT_DATE,DATE_ADD(CURRENT_DATE, INTERVAL 30 DAY),1,3,'Amit Patel',599,107.82,706.82,'[]','{"serviceProvider":"Internet 2","planName":"Internet 2 Express 75 Mbps","gstRate":18,"gstAmount":107.82,"invoiceType":"tax_invoice"}'),

    -- org_002 Retail invoices
    ('org_002','sales','INV-R-001','paid',DATE_SUB(CURRENT_DATE, INTERVAL 10 DAY),DATE_SUB(CURRENT_DATE, INTERVAL 3 DAY),NULL,23,'Priya Sharma',2398,431.64,2829.64,'[{"productName":"Wireless Earbuds Pro","quantity":1,"unitPrice":1499,"taxRate":18,"lineTotal":1768.82},{"productName":"Laptop Stand Aluminium","quantity":1,"unitPrice":899,"taxRate":18,"lineTotal":1060.82}]','{"invoiceType":"tax_invoice"}'),
    ('org_002','sales','INV-R-002','sent',DATE_SUB(CURRENT_DATE, INTERVAL 5 DAY),DATE_ADD(CURRENT_DATE, INTERVAL 10 DAY),NULL,24,'Ravi Menon',1299,233.82,1532.82,'[{"productName":"USB-C Hub 7-in-1","quantity":1,"unitPrice":1299,"taxRate":18,"lineTotal":1532.82}]','{"invoiceType":"tax_invoice"}'),

    -- org_003 Salon invoices
    ('org_003','sales','INV-S-001','paid',DATE_SUB(CURRENT_DATE, INTERVAL 7 DAY),DATE_SUB(CURRENT_DATE, INTERVAL 7 DAY),NULL,28,'Kavya Reddy',2500,450,2950,'[{"productName":"Hair Cut - Women","quantity":1,"unitPrice":500,"taxRate":18,"lineTotal":590},{"productName":"Hair Coloring","quantity":1,"unitPrice":2000,"taxRate":18,"lineTotal":2360}]','{"invoiceType":"tax_invoice"}'),
    ('org_003','sales','INV-S-002','paid',DATE_SUB(CURRENT_DATE, INTERVAL 3 DAY),DATE_SUB(CURRENT_DATE, INTERVAL 3 DAY),NULL,29,'Meera Pillai',3500,630,4130,'[{"productName":"Full Body Spa","quantity":1,"unitPrice":3500,"taxRate":18,"lineTotal":4130}]','{"invoiceType":"tax_invoice"}'),

    -- org_004 Restaurant invoices
    ('org_004','sales','INV-T-001','paid',DATE_SUB(CURRENT_DATE, INTERVAL 2 DAY),DATE_SUB(CURRENT_DATE, INTERVAL 2 DAY),NULL,32,'Arjun Nair',630,30,660,'[{"productName":"Butter Chicken","quantity":1,"unitPrice":350,"taxRate":5,"lineTotal":350},{"productName":"Hyderabadi Biryani","quantity":1,"unitPrice":280,"taxRate":5,"lineTotal":280}]','{"invoiceType":"bill_of_supply"}'),

    -- org_005 Healthcare invoices
    ('org_005','sales','INV-H-001','paid',DATE_SUB(CURRENT_DATE, INTERVAL 6 DAY),DATE_SUB(CURRENT_DATE, INTERVAL 6 DAY),NULL,36,'Gopal Rao',850,0,850,'[{"productName":"Consultation - General","quantity":1,"unitPrice":500,"taxRate":0,"lineTotal":500},{"productName":"Blood Test - CBC","quantity":1,"unitPrice":350,"taxRate":0,"lineTotal":350}]','{"invoiceType":"bill_of_supply"}'),

    -- org_006 Gym invoices
    ('org_006','sales','INV-G-001','paid',DATE_SUB(CURRENT_DATE, INTERVAL 4 DAY),DATE_SUB(CURRENT_DATE, INTERVAL 4 DAY),NULL,41,'Aditya Kulkarni',2499,449.82,2948.82,'[{"productName":"Whey Protein 1kg","quantity":1,"unitPrice":2499,"taxRate":18,"lineTotal":2948.82}]','{"invoiceType":"tax_invoice"}'),
    ('org_006','sales','INV-G-002','sent',DATE_SUB(CURRENT_DATE, INTERVAL 1 DAY),DATE_ADD(CURRENT_DATE, INTERVAL 14 DAY),NULL,43,'Sanjay Patil',3000,540,3540,'[{"productName":"Personal Training - 1 Session","quantity":6,"unitPrice":500,"taxRate":18,"lineTotal":3540}]','{"invoiceType":"tax_invoice"}');

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: invoices — Purchase (multi-org)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO invoices (organization_id, kind, invoice_number, status, issue_date, contact_id, vendor_name, subtotal, tax_total, total_amount, items, payload)
VALUES
    ('org_001','purchase','PINV-2024-001','draft',DATE_SUB(CURRENT_DATE, INTERVAL 20 DAY),49,'TechSupply Co.',5000,900,5900,'[]','{"reference":"PO-2024-001","cgst":450,"sgst":450,"igst":0}'),
    ('org_001','purchase','PINV-2024-002','draft',DATE_SUB(CURRENT_DATE, INTERVAL 10 DAY),50,'NetworkParts Ltd.',12000,2160,14160,'[]','{"reference":"PO-2024-002","cgst":0,"sgst":0,"igst":2160}'),
    ('org_002','purchase','PINV-R-001','paid',DATE_SUB(CURRENT_DATE, INTERVAL 12 DAY),51,'TechBulk Distributors',15000,2700,17700,'[{"productName":"Wireless Earbuds Pro","quantity":20,"unitPrice":900,"taxRate":18,"lineTotal":21240}]','{"reference":"PO-R-001","cgst":1350,"sgst":1350,"igst":0}'),
    ('org_004','purchase','PINV-T-001','paid',DATE_SUB(CURRENT_DATE, INTERVAL 8 DAY),54,'Fresh Farm Produce',12000,600,12600,'[]','{"reference":"Weekly Order","cgst":300,"sgst":300,"igst":0}'),
    ('org_005','purchase','PINV-H-001','paid',DATE_SUB(CURRENT_DATE, INTERVAL 15 DAY),56,'MedSupply India',25000,3000,28000,'[]','{"reference":"MED-PO-001","cgst":1500,"sgst":1500,"igst":0}');

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: invoices — POS (retail, restaurant, salon, gym)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO invoices (organization_id, kind, invoice_number, status, issue_date, branch_id, contact_id, customer_name, subtotal, tax_total, discount_amount, total_amount, items, payload)
VALUES
    ('org_001','pos','POS-ISP-001','completed',CURRENT_DATE,1,1,'Rajesh Kumar',1200,216,0,1416,'[{"productName":"Dual-Band WiFi Router","quantity":1,"unitPrice":1200,"taxRate":18,"taxAmount":216,"lineTotal":1416}]','{"method":"cash","createdBy":2}'),
    ('org_002','pos','POS-R-001','completed',CURRENT_DATE,NULL,NULL,'Walk-in Customer',199,35.82,0,234.82,'[{"productName":"Screen Guard Tempered","quantity":1,"unitPrice":199,"taxRate":18,"taxAmount":35.82,"lineTotal":234.82}]','{"method":"card","createdBy":4}'),
    ('org_004','pos','POS-T-001','completed',CURRENT_DATE,NULL,32,'Arjun Nair',630,30,0,660,'[{"productName":"Butter Chicken","quantity":1,"unitPrice":350,"taxRate":5},{"productName":"Hyderabadi Biryani","quantity":1,"unitPrice":280,"taxRate":5}]','{"method":"upi","createdBy":6}');

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: documents — Quotations
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO documents (organization_id, kind, contact_id, document_number, status, subtotal, tax_total, total_amount, items, payload)
VALUES
    ('org_002','quotation',24,'QT-R-001','sent',90000,16200,106200,'[{"productName":"Wireless Earbuds Pro","quantity":50,"unitPrice":1499,"taxRate":18,"lineTotal":88441},{"productName":"Earbuds Case Cover","quantity":50,"unitPrice":301,"taxRate":18,"lineTotal":17759}]','{"validUntil":"2026-04-15","notes":"Bulk order for corporate gifting"}'),
    ('org_003','quotation',28,'QT-S-001','draft',24000,4320,28320,'[{"productName":"Bridal Makeup Package","quantity":1,"unitPrice":15000,"taxRate":18,"lineTotal":17700},{"productName":"Hair Styling - Bridal","quantity":1,"unitPrice":9000,"taxRate":18,"lineTotal":10620}]','{"validUntil":"2026-04-30","notes":"Wedding package for April event"}');

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: documents — Purchase Orders
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO documents (organization_id, kind, vendor_id, document_number, status, subtotal, tax_total, total_amount, items, payload)
VALUES
    ('org_002','purchase_order',51,'PO-R-001','sent',18000,3240,21240,'[{"productName":"Wireless Earbuds Pro","quantity":20,"unitPrice":900,"taxRate":18}]','{"expectedDelivery":"2026-04-01","receivedQuantity":20}'),
    ('org_004','purchase_order',54,'PO-T-001','sent',12000,600,12600,'[{"productName":"Fresh Vegetables","quantity":1,"unitPrice":5000},{"productName":"Chicken & Meat","quantity":1,"unitPrice":7000}]','{"expectedDelivery":"2026-03-27","notes":"Weekly supply"}'),
    ('org_005','purchase_order',56,'PO-H-001','draft',25000,3000,28000,'[{"productName":"Paracetamol 500mg (Box of 100)","quantity":50,"unitPrice":500}]','{"expectedDelivery":"2026-04-05"}');

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: documents — Expenses (all orgs)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO documents (organization_id, kind, document_number, status, total_amount, items, payload)
VALUES
    ('org_001','expense','EXP-ISP-001','approved',15000,'[]','{"category":"Infrastructure","paymentMethod":"bank_transfer","paymentDate":"2026-03-15","description":"Monthly server hosting and bandwidth charges"}'),
    ('org_002','expense','EXP-R-001','approved',25000,'[]','{"category":"Rent","paymentMethod":"bank_transfer","paymentDate":"2026-03-01","description":"Store rent - March 2026"}'),
    ('org_002','expense','EXP-R-002','approved',3500,'[]','{"category":"Supplies","paymentMethod":"cash","paymentDate":"2026-03-10","description":"Packaging materials and bags"}'),
    ('org_003','expense','EXP-S-001','approved',8500,'[]','{"category":"Supplies","paymentMethod":"upi","paymentDate":"2026-03-05","description":"Hair dyes, shampoos, and salon consumables"}'),
    ('org_003','expense','EXP-S-002','approved',18000,'[]','{"category":"Rent","paymentMethod":"bank_transfer","paymentDate":"2026-03-01","description":"Salon space rent - March 2026"}'),
    ('org_004','expense','EXP-T-001','approved',12000,'[]','{"category":"Ingredients","paymentMethod":"cash","paymentDate":"2026-03-20","description":"Weekly fresh produce and grocery purchase"}'),
    ('org_004','expense','EXP-T-002','approved',4800,'[]','{"category":"Utilities","paymentMethod":"bank_transfer","paymentDate":"2026-03-15","description":"Commercial gas cylinder refill"}'),
    ('org_005','expense','EXP-H-001','approved',15000,'[]','{"category":"Equipment","paymentMethod":"bank_transfer","paymentDate":"2026-03-10","description":"Lab equipment calibration and maintenance"}'),
    ('org_005','expense','EXP-H-002','approved',22000,'[]','{"category":"Salary","paymentMethod":"bank_transfer","paymentDate":"2026-03-01","description":"Staff salary - nursing and pharmacy assistants"}'),
    ('org_006','expense','EXP-G-001','approved',6500,'[]','{"category":"Maintenance","paymentMethod":"upi","paymentDate":"2026-03-12","description":"Gym equipment maintenance and repair"}'),
    ('org_006','expense','EXP-G-002','approved',9800,'[]','{"category":"Utilities","paymentMethod":"bank_transfer","paymentDate":"2026-03-15","description":"Electricity and water charges"}');

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: subscriptions (salon, healthcare, gym memberships)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO subscriptions (organization_id, contact_id, plan_name, amount, billing_cycle, start_date, next_billing_date, status, auto_renew)
VALUES
    -- Salon memberships
    ('org_003',28,'Basic Membership 1 Month',1500,'monthly','2026-03-01','2026-04-01','active',TRUE),
    ('org_003',29,'Premium Membership 3 Month',3999,'quarterly','2026-02-01','2026-05-01','active',TRUE),
    -- Healthcare packages
    ('org_005',36,'Basic Health Plan',999,'monthly','2026-03-01','2026-04-01','active',TRUE),
    ('org_005',38,'Senior Care Plan',1999,'monthly','2026-02-15','2026-03-15','active',TRUE),
    -- Gym memberships
    ('org_006',41,'Annual Membership',7999,'yearly','2026-01-01','2027-01-01','active',TRUE),
    ('org_006',42,'Quarterly Membership',2499,'quarterly','2026-03-01','2026-06-01','active',TRUE),
    ('org_006',43,'Monthly Membership',999,'monthly','2026-03-01','2026-04-01','active',TRUE);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: settings (one row per org — company + branches + sms + upi + website)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO settings (
    organization_id, company_name, gstin, address_line1, city, state, country, pincode, contact_number, email,
    branches, sms_enabled, sms_provider, sms_api_key, sms_sender_id, sms_template_id, sms_templates,
    upi_id, upi_display_name, upi_enabled, upi_supported_apps,
    custom_field_schema, website
)
VALUES
    -- org_001 ISP
    (
        'org_001', 'Popna Entertainment', '27AABCP1234E1ZX',
        '101 Business Park', 'Mumbai', 'Maharashtra', 'India', '400001', '9000000000', 'info@popnaentertainment.com',
        '[{"id":1,"name":"Main Office","location":"Mumbai Central","address":"101 Business Park, Mumbai 400001","phone":"9000000000","gstin":"27AABCU9603R1ZM","isActive":true},{"id":2,"name":"North Branch","location":"Andheri","address":"45 Link Road, Andheri West, Mumbai 400053","phone":"9000000011","gstin":"07AABCU9603R1ZN","isActive":true},{"id":3,"name":"South Branch","location":"Thane","address":"7 Station Road, Thane 400601","phone":"9000000022","isActive":true}]',
        FALSE,'','','','','{"payment":"Dear {customer_name}, payment of Rs.{amount} received via {method}. Balance: Rs.{balance}. Thank you - {company}"}',
        '','',FALSE,'["gpay","phonepe","paytm","bhim"]',
        '[]',
        '{"heroTitle":"Fast & Reliable Internet","heroSubtitle":"Connecting You to the World","heroDescription":"Choose from our wide range of broadband and cable plans.","highlightSectionTitle":"Why Choose Us?","highlightCards":[{"title":"High Speed","description":"Up to 300 Mbps","icon":"Zap"},{"title":"Reliable","description":"99.9% uptime","icon":"Shield"},{"title":"Support","description":"24/7 support","icon":"HeadphonesIcon"}],"ctaButtonText":"View Plans","ctaButtonLink":"/plans"}'
    ),
    -- org_002 Retail
    (
        'org_002', 'MegaMart Retail', '27AABCM5678F1ZY',
        '45 Shopping Complex', 'Mumbai', 'Maharashtra', 'India', '400050', '9100000001', 'info@megamart.com',
        '[]', FALSE,'','','','','{}', '','',FALSE,'["gpay","phonepe","paytm","bhim"]', '[]', '{}'
    ),
    -- org_003 Salon
    (
        'org_003', 'Glow Studio', '36AABCG1234G1ZW',
        '12 Beauty Lane', 'Hyderabad', 'Telangana', 'India', '500001', '9100000002', 'hello@glowstudio.com',
        '[]', FALSE,'','','','','{}', '','',FALSE,'["gpay","phonepe","paytm","bhim"]', '[]', '{}'
    ),
    -- org_004 Restaurant
    (
        'org_004', 'Spice Kitchen', '29AABCS5678H1ZV',
        '78 Food Street', 'Bangalore', 'Karnataka', 'India', '560001', '9100000003', 'orders@spicekitchen.com',
        '[]', FALSE,'','','','','{}', '','',FALSE,'["gpay","phonepe","paytm","bhim"]', '[]', '{}'
    ),
    -- org_005 Healthcare
    (
        'org_005', 'MedCare Pharmacy', '33AABCM9012I1ZU',
        '25 Hospital Road', 'Chennai', 'Tamil Nadu', 'India', '600001', '9100000004', 'care@medcarepharmacy.com',
        '[]', FALSE,'','','','','{}', '','',FALSE,'["gpay","phonepe","paytm","bhim"]', '[]', '{}'
    ),
    -- org_006 Gym
    (
        'org_006', 'FitZone Gym', '27AABCF3456J1ZT',
        '90 Fitness Avenue', 'Pune', 'Maharashtra', 'India', '411001', '9100000005', 'info@fitzonegym.com',
        '[]', FALSE,'','','','','{}', '','',FALSE,'["gpay","phonepe","paytm","bhim"]', '[]', '{}'
    );
