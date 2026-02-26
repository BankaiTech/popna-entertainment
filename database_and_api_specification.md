# Popna Entertainment — Database & API Specification

> Complete backend specification for the ISP Management SaaS Platform.
> SQL migration files: `backend/migrations/001_create_tables.sql` and `002_seed_data.sql`

---

## Summary

| Category | Count |
|---|---|
| **Database Tables** | **13** |
| **API Endpoints** | **58** |

---

## Database Tables (13 Total)

### Table 1: `organizations`
> SaaS master table — every other table is isolated by `organization_id`.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `VARCHAR(50)` | PK | e.g. `'org_001'` |
| `name` | `VARCHAR(255)` | NOT NULL | |
| `status` | `ENUM('active','disabled','suspended')` | DEFAULT `'active'` | |
| `allowed_modules` | `JSONB` | NOT NULL | Array of `ModuleKey` strings |
| `allowed_settings_tabs` | `JSONB` | NOT NULL | Array of `SettingsTabKey` strings |
| `subscription_start` | `DATE` | NOT NULL | |
| `subscription_end` | `DATE` | NOT NULL | |
| `created_at` | `TIMESTAMP` | DEFAULT NOW() | |
| `updated_at` | `TIMESTAMP` | DEFAULT NOW() | Auto-updated via trigger |

**Available modules:** `dashboard`, `customers`, `complaints`, `payments`, `catalog`, `invoices`, `purchase-invoices`, `users`, `settings`, `connection-requests`
**Available settings tabs:** `company`, `products`, `billing`

---

### Table 2: `users`
> Admin & Employee accounts for the management panel.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `SERIAL` | PK | |
| `organization_id` | `VARCHAR(50)` | FK → organizations | |
| `name` | `VARCHAR(255)` | NOT NULL | |
| `username` | `VARCHAR(100)` | UNIQUE per org, NOT NULL | |
| `password_hash` | `VARCHAR(255)` | NOT NULL | bcrypt/argon2 — **never plain text** |
| `role` | `ENUM('admin','employee')` | NOT NULL | |
| `status` | `ENUM('active','inactive')` | DEFAULT `'active'` | |
| `created_at` | `TIMESTAMP` | DEFAULT NOW() | |

---

### Table 3: `customers`
> End-user subscriber accounts. Address is flattened into columns for SQL performance.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `SERIAL` | PK | |
| `organization_id` | `VARCHAR(50)` | FK → organizations | |
| `name` | `VARCHAR(255)` | NOT NULL | |
| `email` | `VARCHAR(255)` | NULLABLE | |
| `mobile` | `VARCHAR(15)` | UNIQUE per org, NOT NULL | Login identifier |
| `password_hash` | `VARCHAR(255)` | NULLABLE | Customer portal login |
| `connection_type` | `VARCHAR(100)` | NOT NULL | Product name (dynamic, not FK) |
| `package` | `VARCHAR(255)` | NOT NULL | Plan name |
| `status` | `ENUM('Active','Inactive')` | DEFAULT `'Active'` | |
| `description` | `TEXT` | NULLABLE | |
| `address_line1` | `VARCHAR(255)` | NOT NULL | |
| `address_line2` | `VARCHAR(255)` | NULLABLE | |
| `city` | `VARCHAR(100)` | NOT NULL | |
| `state` | `VARCHAR(100)` | NOT NULL | |
| `country` | `VARCHAR(100)` | DEFAULT `'India'` | |
| `payment_status` | `ENUM('paid','not_paid')` | NULLABLE | |
| `payment_description` | `TEXT` | NULLABLE | |
| `payment_updated_at` | `TIMESTAMP` | NULLABLE | |
| `payment_method` | `ENUM('cash','upi','card','other')` | NULLABLE | |
| `collected_amount` | `DECIMAL(10,2)` | DEFAULT 0 | Supports partial payment |
| `balance_amount` | `DECIMAL(10,2)` | DEFAULT 0 | Remaining after partial payment |
| `collected_by_username` | `VARCHAR(100)` | NULLABLE | Employee who collected |
| `gstin` | `VARCHAR(20)` | NULLABLE | For GST invoicing |
| `box_number` | `VARCHAR(50)` | NULLABLE | Cable box number |
| `stb_number` | `VARCHAR(100)` | NULLABLE | Set-Top Box / User ID |
| `can_caf_id` | `VARCHAR(100)` | NULLABLE | CAN/CAF ID |
| `cin` | `VARCHAR(100)` | NULLABLE | Customer Identification Number |
| `area` | `VARCHAR(100)` | NULLABLE | Service area |
| `permanent_discount` | `DECIMAL(5,2)` | DEFAULT 0 | Discount % applied to plan |
| `created_at` | `TIMESTAMP` | DEFAULT NOW() | |

---

### Table 4: `products`
> Dynamic service categories managed by admin (e.g. "Cable", "Internet 1"). Fully dynamic — no hardcoded names.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `SERIAL` | PK | |
| `organization_id` | `VARCHAR(50)` | FK → organizations | |
| `name` | `VARCHAR(100)` | UNIQUE per org, NOT NULL | |
| `product_type` | `ENUM('cable','internet')` | NOT NULL | |
| `is_active` | `BOOLEAN` | DEFAULT `TRUE` | |
| `cutoff_date` | `SMALLINT` | CHECK 1–28, NULLABLE | Cable: day of month for cut-off |
| `cutoff_days` | `SMALLINT` | CHECK ≥ 0, NULLABLE | Internet: days after due for cut-off |
| `created_at` | `TIMESTAMP` | DEFAULT NOW() | |

---

### Table 5: `plans`
> Subscription plans offered under each product/service.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `SERIAL` | PK | |
| `organization_id` | `VARCHAR(50)` | FK → organizations | |
| `provider` | `VARCHAR(100)` | NOT NULL | Maps to product name |
| `plan_name` | `VARCHAR(255)` | NOT NULL | |
| `image_url` | `TEXT` | NULLABLE | |
| `price` | `DECIMAL(10,2)` | NOT NULL | Base price before GST |
| `gst_rate` | `DECIMAL(5,2)` | NOT NULL | Default 18% |
| `installation_amount` | `DECIMAL(10,2)` | DEFAULT 0 | One-time fee |
| `description` | `TEXT` | NULLABLE | |
| `permanent_discount` | `DECIMAL(5,2)` | DEFAULT 0 | Plan-level discount % |
| `created_at` | `TIMESTAMP` | DEFAULT NOW() | |

---

### Table 6: `complaints`
> Customer service complaints / support tickets.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `SERIAL` | PK | |
| `organization_id` | `VARCHAR(50)` | FK → organizations | |
| `customer_id` | `INT` | FK → customers, SET NULL on delete | |
| `customer_name` | `VARCHAR(255)` | NOT NULL | Denormalized |
| `mobile` | `VARCHAR(15)` | NOT NULL | |
| `connection_type` | `VARCHAR(100)` | NOT NULL | |
| `customer_description` | `TEXT` | NOT NULL | Customer's text |
| `internal_description` | `TEXT` | NULLABLE | Admin/employee notes |
| `status` | `ENUM('active','on-hold','completed')` | DEFAULT `'active'` | |
| `closure_image_url` | `TEXT` | NULLABLE | S3/CDN URL — **never base64** |
| `closed_at` | `TIMESTAMP` | NULLABLE | |
| `created_at` | `TIMESTAMP` | DEFAULT NOW() | |

---

### Table 7: `sales_invoices`
> GST-compliant invoices generated for customer billing.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `SERIAL` | PK | |
| `organization_id` | `VARCHAR(50)` | FK → organizations | |
| `invoice_number` | `VARCHAR(50)` | UNIQUE per org | e.g. `'INV-2024-001'` |
| `customer_id` | `INT` | FK → customers, SET NULL | |
| `customer_name` | `VARCHAR(255)` | NOT NULL | Denormalized |
| `service_provider` | `VARCHAR(100)` | NOT NULL | Product name |
| `plan_name` | `VARCHAR(255)` | NOT NULL | |
| `amount` | `DECIMAL(10,2)` | NOT NULL | Base pre-GST amount |
| `gst_rate` | `DECIMAL(5,2)` | NOT NULL | |
| `gst_amount` | `DECIMAL(10,2)` | NOT NULL | Calculated |
| `total_amount` | `DECIMAL(10,2)` | NOT NULL | amount + gst_amount |
| `status` | `ENUM('draft','sent','paid','overdue')` | DEFAULT `'draft'` | |
| `invoice_type` | `ENUM('tax_invoice','bill_of_supply')` | DEFAULT `'tax_invoice'` | GST compliance |
| `place_of_supply` | `VARCHAR(100)` | NULLABLE | GST: state name/code |
| `hsn_sac` | `VARCHAR(20)` | NULLABLE | GST: HSN/SAC code |
| `issue_date` | `DATE` | NOT NULL | |
| `due_date` | `DATE` | NOT NULL | |
| `created_at` | `TIMESTAMP` | DEFAULT NOW() | |

---

### Table 8: `vendors`
> Suppliers/vendors for purchase invoicing.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `SERIAL` | PK | |
| `organization_id` | `VARCHAR(50)` | FK → organizations | |
| `name` | `VARCHAR(255)` | NOT NULL | |
| `contact` | `VARCHAR(20)` | NULLABLE | |
| `gstin` | `VARCHAR(20)` | NULLABLE | |
| `address_line1` | `VARCHAR(255)` | NULLABLE | |
| `address_line2` | `VARCHAR(255)` | NULLABLE | |
| `city` | `VARCHAR(100)` | NULLABLE | |
| `state` | `VARCHAR(100)` | NULLABLE | |
| `country` | `VARCHAR(100)` | DEFAULT `'India'` | |
| `pincode` | `VARCHAR(10)` | NULLABLE | |
| `created_at` | `TIMESTAMP` | DEFAULT NOW() | |

---

### Table 9: `purchase_invoices`
> Invoices received from vendors. GST breakup flattened into CGST/SGST/IGST columns.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `SERIAL` | PK | |
| `organization_id` | `VARCHAR(50)` | FK → organizations | |
| `invoice_number` | `VARCHAR(50)` | UNIQUE per org | e.g. `'PINV-2024-001'` |
| `vendor_id` | `INT` | FK → vendors | |
| `vendor_name` | `VARCHAR(255)` | NOT NULL | Denormalized |
| `reference` | `VARCHAR(100)` | NULLABLE | PO/GRN reference |
| `amount` | `DECIMAL(10,2)` | NOT NULL | Pre-tax amount |
| `cgst` | `DECIMAL(10,2)` | DEFAULT 0 | Central GST |
| `sgst` | `DECIMAL(10,2)` | DEFAULT 0 | State GST |
| `igst` | `DECIMAL(10,2)` | DEFAULT 0 | Integrated GST |
| `total_amount` | `DECIMAL(10,2)` | NOT NULL | |
| `issue_date` | `DATE` | NOT NULL | |
| `created_at` | `TIMESTAMP` | DEFAULT NOW() | |

---

### Table 10: `connection_requests`
> Public plan request forms. No auth required to create.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `SERIAL` | PK | |
| `organization_id` | `VARCHAR(50)` | FK → organizations | |
| `name` | `VARCHAR(255)` | NOT NULL | |
| `mobile` | `VARCHAR(15)` | NOT NULL | |
| `email` | `VARCHAR(255)` | NULLABLE | |
| `package_id` | `INT` | FK → plans, SET NULL | |
| `product_id` | `INT` | FK → products, SET NULL | |
| `plan_name` | `VARCHAR(255)` | NOT NULL | Denormalized |
| `product_name` | `VARCHAR(100)` | NOT NULL | Denormalized |
| `status` | `ENUM('New','Converted')` | DEFAULT `'New'` | |
| `created_at` | `TIMESTAMP` | DEFAULT NOW() | |

---

### Table 11: `company_profile`
> Business/company profile — one row per organization.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `SERIAL` | PK | |
| `organization_id` | `VARCHAR(50)` | UNIQUE FK → organizations | One row per org |
| `company_name` | `VARCHAR(255)` | NOT NULL | |
| `gstin` | `VARCHAR(20)` | NULLABLE | Company GST number |
| `address_line1` | `VARCHAR(255)` | NULLABLE | |
| `address_line2` | `VARCHAR(255)` | NULLABLE | |
| `city` | `VARCHAR(100)` | NULLABLE | |
| `state` | `VARCHAR(100)` | NULLABLE | |
| `country` | `VARCHAR(100)` | DEFAULT `'India'` | |
| `pincode` | `VARCHAR(10)` | NULLABLE | |
| `contact_number` | `VARCHAR(20)` | NULLABLE | |
| `email` | `VARCHAR(255)` | NULLABLE | |
| `updated_at` | `TIMESTAMP` | DEFAULT NOW() | Auto-updated |

---

### Table 12: `website_settings`
> Public website configuration — one row per organization.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `SERIAL` | PK | |
| `organization_id` | `VARCHAR(50)` | UNIQUE FK → organizations | |
| `hero_title` | `VARCHAR(255)` | | |
| `hero_subtitle` | `VARCHAR(255)` | | |
| `hero_description` | `TEXT` | | |
| `hero_image` | `TEXT` | NULLABLE | Image URL |
| `highlight_section_title` | `VARCHAR(255)` | | |
| `highlight_cards` | `JSONB` | NOT NULL | Array of `{ title, description, icon }` |
| `cta_button_text` | `VARCHAR(100)` | | |
| `cta_button_link` | `VARCHAR(255)` | | |
| `updated_at` | `TIMESTAMP` | DEFAULT NOW() | Auto-updated |

---

### Table 13: `client_configs`
> Partner/client dashboard access — controls which sidebar tabs they can see.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `SERIAL` | PK | |
| `organization_id` | `VARCHAR(50)` | FK → organizations | |
| `client_name` | `VARCHAR(255)` | NOT NULL | |
| `username` | `VARCHAR(100)` | UNIQUE per org, NOT NULL | |
| `password_hash` | `VARCHAR(255)` | NOT NULL | bcrypt hash |
| `allowed_tabs` | `JSONB` | NOT NULL | Array of tab key strings |
| `status` | `ENUM('active','inactive')` | DEFAULT `'active'` | |
| `created_at` | `TIMESTAMP` | DEFAULT NOW() | |

---

## Entity Relationship Diagram

```
organizations ──< users
             ──< customers ──< complaints
             ──< products
             ──< plans      ──< connection_requests >── products
             ──< complaints
             ──< sales_invoices
             ──< vendors ──< purchase_invoices
             ──< connection_requests
             ──║ company_profile      (one-to-one)
             ──║ website_settings     (one-to-one)
             ──< client_configs
```

---

## API Endpoints (58 Total)

All endpoints are prefixed with `/api`. All protected endpoints require `Authorization: Bearer <JWT>`.

---

### 1. Auth — 5 endpoints

| # | Method | Endpoint | Auth | Description |
|---|---|---|---|---|
| 1 | `POST` | `/api/auth/admin/login` | Public | Admin/Employee login with `{ username, password, organizationId }` |
| 2 | `POST` | `/api/auth/customer/login` | Public | Customer login with `{ mobile, password, organizationId }` |
| 3 | `POST` | `/api/auth/logout` | Bearer | Invalidate token/session |
| 4 | `GET` | `/api/auth/me` | Bearer | Get current user profile from token |
| 5 | `POST` | `/api/auth/admin/change-password` | Bearer | Change own password `{ currentPassword, newPassword }` |

**Login response:**
```json
{
  "token": "<JWT>",
  "user": { "id": 1, "name": "Admin", "role": "admin", "organizationId": "org_001" }
}
```

---

### 2. Organizations (Super Admin) — 6 endpoints

| # | Method | Endpoint | Auth | Description |
|---|---|---|---|---|
| 6 | `GET` | `/api/organizations` | Super Admin | List all organizations |
| 7 | `GET` | `/api/organizations/:id` | Super Admin | Get organization by ID |
| 8 | `POST` | `/api/organizations` | Super Admin | Create organization |
| 9 | `PUT` | `/api/organizations/:id` | Super Admin | Update organization |
| 10 | `PATCH` | `/api/organizations/:id/status` | Super Admin | Update status `{ status }` |
| 11 | `POST` | `/api/organizations/:id/renew` | Super Admin | Renew subscription `{ months }` |

---

### 3. Users — 4 endpoints

| # | Method | Endpoint | Auth | Description |
|---|---|---|---|---|
| 12 | `GET` | `/api/users` | Admin | List all users in org |
| 13 | `POST` | `/api/users` | Admin | Create user `{ name, username, password, role }` |
| 14 | `PUT` | `/api/users/:id` | Admin | Update user (role, status, password) |
| 15 | `DELETE` | `/api/users/:id` | Admin | Delete user |

---

### 4. Customers — 6 endpoints

| # | Method | Endpoint | Auth | Description |
|---|---|---|---|---|
| 16 | `GET` | `/api/customers` | Employee/Admin | List all customers (supports `?search=`, `?status=`, `?connectionType=`) |
| 17 | `GET` | `/api/customers/:id` | Employee/Admin | Get customer by ID |
| 18 | `POST` | `/api/customers` | Employee/Admin | Create customer |
| 19 | `PUT` | `/api/customers/:id` | Employee/Admin | Full update customer |
| 20 | `PATCH` | `/api/customers/:id/payment` | Employee/Admin | Update payment status `{ paymentStatus, collectedAmount, paymentMethod, ... }` |
| 21 | `DELETE` | `/api/customers/:id` | Admin | Delete customer |

---

### 5. Products — 6 endpoints

| # | Method | Endpoint | Auth | Description |
|---|---|---|---|---|
| 22 | `GET` | `/api/products` | Employee/Admin | List all products |
| 23 | `GET` | `/api/products/active` | Public | List active products only (for public dropdown) |
| 24 | `GET` | `/api/products/:id` | Employee/Admin | Get product by ID |
| 25 | `POST` | `/api/products` | Admin | Create product |
| 26 | `PUT` | `/api/products/:id` | Admin | Update product (name, type, cutoff config) |
| 27 | `DELETE` | `/api/products/:id` | Admin | Delete product |

---

### 6. Plans — 6 endpoints

| # | Method | Endpoint | Auth | Description |
|---|---|---|---|---|
| 28 | `GET` | `/api/plans` | Public | List all plans (supports `?provider=`) |
| 29 | `GET` | `/api/plans/:id` | Public | Get plan by ID |
| 30 | `GET` | `/api/plans/by-product/:productId` | Public | Get plans for a specific product |
| 31 | `POST` | `/api/plans` | Admin | Create plan |
| 32 | `PUT` | `/api/plans/:id` | Admin | Update plan |
| 33 | `DELETE` | `/api/plans/:id` | Admin | Delete plan |

---

### 7. Complaints — 6 endpoints

| # | Method | Endpoint | Auth | Description |
|---|---|---|---|---|
| 34 | `GET` | `/api/complaints` | Employee/Admin | List all complaints (supports `?status=`) |
| 35 | `GET` | `/api/complaints/:id` | Employee/Admin | Get complaint by ID |
| 36 | `POST` | `/api/complaints` | Employee/Admin | Create complaint |
| 37 | `PUT` | `/api/complaints/:id` | Employee/Admin | Update complaint (status, notes, closure) |
| 38 | `DELETE` | `/api/complaints/:id` | Admin | Delete complaint |
| 39 | `GET` | `/api/complaints/active/count` | Employee/Admin | Get active complaint count |

**Note:** For `closureImage` — use `POST /api/uploads` to get a presigned URL, then store the URL in the complaint. Do **not** accept base64 in this endpoint.

---

### 8. Sales Invoices — 5 endpoints

| # | Method | Endpoint | Auth | Description |
|---|---|---|---|---|
| 40 | `GET` | `/api/invoices` | Admin | List all invoices (supports `?status=`, `?customerId=`) |
| 41 | `GET` | `/api/invoices/:id` | Admin | Get invoice by ID |
| 42 | `POST` | `/api/invoices` | Admin | Create invoice |
| 43 | `PUT` | `/api/invoices/:id` | Admin | Update invoice (status, fields) |
| 44 | `GET` | `/api/invoices/:id/pdf` | Admin | Stream PDF of invoice |

---

### 9. Vendors — 4 endpoints

| # | Method | Endpoint | Auth | Description |
|---|---|---|---|---|
| 45 | `GET` | `/api/vendors` | Admin | List all vendors |
| 46 | `GET` | `/api/vendors/:id` | Admin | Get vendor by ID |
| 47 | `POST` | `/api/vendors` | Admin | Create vendor |
| 48 | `PUT` | `/api/vendors/:id` | Admin | Update vendor |

---

### 10. Purchase Invoices — 4 endpoints

| # | Method | Endpoint | Auth | Description |
|---|---|---|---|---|
| 49 | `GET` | `/api/purchase-invoices` | Admin | List all purchase invoices |
| 50 | `GET` | `/api/purchase-invoices/:id` | Admin | Get purchase invoice by ID |
| 51 | `POST` | `/api/purchase-invoices` | Admin | Create purchase invoice |
| 52 | `GET` | `/api/purchase-invoices/:id/pdf` | Admin | Stream PDF of purchase invoice |

---

### 11. Connection Requests — 5 endpoints

| # | Method | Endpoint | Auth | Description |
|---|---|---|---|---|
| 53 | `GET` | `/api/connection-requests` | Admin | List all requests (supports `?status=`) |
| 54 | `GET` | `/api/connection-requests/:id` | Admin | Get request by ID |
| 55 | `POST` | `/api/connection-requests` | **Public** | Submit a plan request (no auth) |
| 56 | `PATCH` | `/api/connection-requests/:id/status` | Admin | Update status `{ status }` |
| 57 | `DELETE` | `/api/connection-requests/:id` | Admin | Delete request |

---

### 12. Dashboard — 2 endpoints

| # | Method | Endpoint | Auth | Description |
|---|---|---|---|---|
| — | `GET` | `/api/dashboard/stats` | Employee/Admin | Aggregated KPI stats (computed from DB) |
| — | `GET` | `/api/dashboard/recent-customers?limit=5` | Employee/Admin | Most recently added customers |

**Stats response shape:**
```json
{
  "totalCustomers": 42,
  "newCustomersThisMonth": 5,
  "activeCustomers": 38,
  "inactiveCustomers": 4,
  "activeByProvider": { "Cable": 15, "Internet 1": 12 },
  "inactiveByProvider": { "Cable": 2 },
  "totalAmountCollected": 24500,
  "totalPendingAmount": 8200,
  "overdueAmount": 1500,
  "totalComplaints": 10,
  "activeComplaints": 3,
  "onHoldComplaints": 2,
  "newConnectionRequests": 7,
  "convertedConnections": 4,
  "totalActivePlans": 5,
  "totalProducts": 4
}
```

---

### 13. Settings — 4 endpoints

| # | Method | Endpoint | Auth | Description |
|---|---|---|---|---|
| — | `GET` | `/api/settings/company-profile` | Admin | Get company profile |
| — | `PUT` | `/api/settings/company-profile` | Admin | Update company profile |
| — | `GET` | `/api/settings/website` | **Public** | Get website settings |
| — | `PUT` | `/api/settings/website` | Admin | Update website settings |

---

### 14. File Uploads — 1 endpoint

| # | Method | Endpoint | Auth | Description |
|---|---|---|---|---|
| — | `POST` | `/api/uploads/presigned-url` | Employee/Admin | Get S3 presigned URL for direct upload `{ filename, contentType }` |

---

## API Access Control Matrix

| API Group | Public | Customer | Employee | Admin | Super Admin |
|---|---|---|---|---|---|
| Auth | ✅ | ✅ | ✅ | ✅ | ✅ |
| Organizations | ❌ | ❌ | ❌ | ❌ | ✅ Full |
| Dashboard | ❌ | ❌ | ✅ Read | ✅ Read | ✅ |
| Users | ❌ | ❌ | ❌ | ✅ Full | ✅ |
| Customers | ❌ | Own data | ✅ Read/Write | ✅ Full | ✅ |
| Products | ✅ Active only | ✅ Active only | ✅ Read | ✅ Full | ✅ |
| Plans | ✅ Read | ✅ Read | ✅ Read | ✅ Full | ✅ |
| Complaints | ❌ | ✅ Own only | ✅ Read/Write | ✅ Full | ✅ |
| Sales Invoices | ❌ | ❌ | ❌ | ✅ Full | ✅ |
| Vendors | ❌ | ❌ | ❌ | ✅ Full | ✅ |
| Purchase Invoices | ❌ | ❌ | ❌ | ✅ Full | ✅ |
| Connection Requests | ✅ Create only | ❌ | ❌ | ✅ Full | ✅ |
| Settings (company) | ❌ | ❌ | ❌ | ✅ Full | ✅ |
| Settings (website) | ✅ Read | ✅ Read | ❌ | ✅ Full | ✅ |
| Client Configs | ❌ | ❌ | ❌ | ✅ Full | ✅ |
| File Uploads | ❌ | ❌ | ✅ | ✅ | ✅ |

---

## Security Checklist

- [ ] All passwords hashed with **bcrypt** (cost 10+) or **argon2id** — never plain text
- [ ] JWTs signed with RS256 or HS256 with a strong secret; short expiry (15 min access + 7 day refresh)
- [ ] Every query filtered by `organization_id` from the JWT — no cross-tenant data leaks
- [ ] Complaint closure images uploaded to S3/cloud storage — **never store base64 in DB**
- [ ] Rate limiting on public endpoints: `/api/connection-requests` (POST), `/api/auth/*/login`
- [ ] Input validation on all endpoints (Zod / Joi)
- [ ] `place_of_supply` and `hsn_sac` required for GST-compliant tax invoices
- [ ] HTTPS enforced in production; CORS restricted to known frontend origins
