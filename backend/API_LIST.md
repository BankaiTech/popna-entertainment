# API List — Popna (Multi-Industry, Consolidated Schema — 11 Tables)

APIs aligned with the consolidated backend schema: **inventory** (products + ISP categories + ISP plans via `catalog_type`), **activities** (complaints, connection_requests, appointments, service_requests, leads), **invoices** (sales + purchase + POS with items JSONB), **documents** (quotations, purchase_orders, expenses), **subscriptions**, **settings** (company profile + website), **audit_log** (+ SMS logs).

---

## 1. Authentication & Users

| Method | Endpoint | Description | Scope |
|--------|----------|-------------|-------|
| POST | `/auth/login` | Unified login (admin/employee/super_admin/customer) | Public |
| POST | `/auth/logout` | Logout / invalidate session | Authenticated |
| GET | `/auth/me` | Current user or customer profile | Authenticated |
| GET | `/users` | List users (admin/employee) for org | Admin (org) |
| GET | `/users/:id` | Get user by id | Admin (org) |
| POST | `/users` | Create user | Admin (org) |
| PATCH | `/users/:id` | Update user | Admin (org) |
| DELETE | `/users/:id` | Deactivate or delete user | Admin (org) |
| GET | `/superadmin/users` | List super admin users | Super Admin |
| POST | `/superadmin/users` | Create super admin user | Super Admin |
| PATCH | `/superadmin/users/:id` | Update super admin user | Super Admin |

---

## 2. Organizations (Super Admin)

| Method | Endpoint | Description | Scope |
|--------|----------|-------------|-------|
| GET | `/organizations` | List all organizations | Super Admin |
| GET | `/organizations/:id` | Get organization by id | Super Admin |
| POST | `/organizations` | Create organization | Super Admin |
| PATCH | `/organizations/:id` | Update (name, status, industry_type, terminology, etc.) | Super Admin |
| PATCH | `/organizations/:id/status` | Update status (active/disabled/suspended) | Super Admin |
| PATCH | `/organizations/:id/modules` | Update allowed_modules | Super Admin |
| PATCH | `/organizations/:id/settings-tabs` | Update allowed_settings_tabs | Super Admin |
| PATCH | `/organizations/:id/industry` | Update industry_type and terminology | Super Admin |

---

## 3. Contacts (Customers, Suppliers, Vendors)

| Method | Endpoint | Description | Scope |
|--------|----------|-------------|-------|
| GET | `/contacts` | List contacts (?type=customer\|supplier\|vendor) | Admin (org) |
| GET | `/contacts/:id` | Get contact by id | Admin (org) |
| POST | `/contacts` | Create contact | Admin (org) |
| PATCH | `/contacts/:id` | Update contact (incl. payment, credit_limit, loyalty_points, tags, custom_fields) | Admin (org) |
| DELETE | `/contacts/:id` | Delete contact | Admin (org) |
| GET | `/contacts?paymentStatus=not_paid` | Filter by payment status | Admin (org) |
| GET | `/contacts?status=Active` | Filter customers by status | Admin (org) |
| GET | `/customer/me` | Current customer profile (portal) | Customer |

---

## 4. Inventory (Unified Catalog: Products, ISP Categories, ISP Plans)

Single `inventory` table with `catalog_type` discriminator. Filter by `?catalogType=` for each category.

| Method | Endpoint | Description | Scope |
|--------|----------|-------------|-------|
| GET | `/inventory` | List inventory (?catalogType=product\|isp_category\|isp_plan, ?category=, ?isActive=) | Admin (org) |
| GET | `/inventory/:id` | Get item (with variants, meta) | Admin (org) |
| POST | `/inventory` | Create item (body includes catalog_type + meta) | Admin (org) |
| PATCH | `/inventory/:id` | Update (incl. variants, stock, batch/expiry, meta) | Admin (org) |
| DELETE | `/inventory/:id` | Soft-delete or deactivate | Admin (org) |
| GET | `/inventory/low-stock` | Items at or below stock_alert / reorder_level | Admin (org) |
| GET | `/inventory/barcode/:barcode` | Lookup by barcode (POS) | Admin (org) |

**`meta` JSONB by catalog_type:**

- **product:** `{}` (or any custom extension data)
- **isp_category:** `{ "isp_type": "cable"|"internet", "cutoff_date": 10, "cutoff_days": 7 }`
- **isp_plan:** `{ "provider": "Cable", "gst_rate": 18, "installation_amount": 500, "permanent_discount": 0 }`

**Convenience aliases (backward-compatible):**

| Method | Alias Endpoint | Maps To |
|--------|---------------|---------|
| GET | `/products` | `GET /inventory?catalogType=isp_category` |
| GET | `/products/active` | `GET /inventory?catalogType=isp_category&isActive=true` |
| POST | `/products` | `POST /inventory` with `catalog_type: 'isp_category'` |
| PATCH | `/products/:id` | `PATCH /inventory/:id` |
| DELETE | `/products/:id` | `DELETE /inventory/:id` |
| GET | `/plans` | `GET /inventory?catalogType=isp_plan` |
| GET | `/plans?provider=Cable` | `GET /inventory?catalogType=isp_plan&provider=Cable` (filter via meta) |
| POST | `/plans` | `POST /inventory` with `catalog_type: 'isp_plan'` |
| PATCH | `/plans/:id` | `PATCH /inventory/:id` |
| DELETE | `/plans/:id` | `DELETE /inventory/:id` |

---

## 5. Activities (Complaints, Connection Requests, Appointments, Service Requests, Leads)

Single resource with `kind`; filter by `?kind=` for each module.

| Method | Endpoint | Description | Scope |
|--------|----------|-------------|-------|
| GET | `/activities` | List activities (?kind=complaint\|connection_request\|appointment\|service_request\|lead, ?status=, ?contactId=) | Admin (org) |
| GET | `/activities/:id` | Get activity by id (payload contains kind-specific data) | Admin (org) |
| POST | `/activities` | Create activity (body: kind + payload) | Admin (org) |
| PATCH | `/activities/:id` | Update activity (status, priority, assigned_to, payload) | Admin (org) |
| DELETE | `/activities/:id` | Delete activity | Admin (org) |
| GET | `/customer/complaints` | List complaints for logged-in customer (kind=complaint, contactId=me) | Customer |

**Payload by kind (stored in `payload` JSONB):**

- **complaint:** customerName, mobile, connectionType, customerDescription, internalDescription, closureImageUrl, closedAt, slaHours, slaDeadline, slaBreached, escalatedTo, priority
- **connection_request:** name, mobile, email, packageId, productId, planName, productName
- **appointment:** customerName, customerMobile, serviceType, staffAssigned, scheduledAt, duration, notes
- **service_request:** customerName, customerMobile, requestType, description, resolution, slaHours, slaDeadline, slaBreached
- **lead:** name, email, mobile, source, stage, value, notes, tags, followUps (array)

---

## 6. Invoices (Sales + Purchase + POS)

Single resource with `kind`; filter by `?kind=` for each module. Line items stored as `items` JSONB. Kind-specific fields in `payload` JSONB.

| Method | Endpoint | Description | Scope |
|--------|----------|-------------|-------|
| GET | `/invoices` | List invoices (?kind=sales\|purchase\|pos, ?status=, ?branchId=, ?from=, ?to=) | Admin (org) |
| GET | `/invoices/:id` | Get invoice (items in JSONB) | Admin (org) |
| POST | `/invoices` | Create invoice (body includes kind, items[], payload) | Admin (org) |
| PATCH | `/invoices/:id` | Update invoice | Admin (org) |
| DELETE | `/invoices/:id` | Void or delete draft | Admin (org) |
| GET | `/customer/invoices` | List invoices for logged-in customer | Customer |

**`items` JSONB structure (universal for all kinds):**

```json
[
  { "productId": 1, "productName": "Dual-Band WiFi Router", "quantity": 1, "unitPrice": 1200.00, "taxRate": 18.00, "discount": 0.00, "lineTotal": 1416.00 }
]
```

**`payload` by kind:**

- **sales:** `{ serviceProvider, planName, gstRate, gstAmount, invoiceType, placeOfSupply, hsnSac }`
- **purchase:** `{ reference, cgst, sgst, igst }`
- **pos:** `{ method: "cash"|"upi"|"card"|"bank_transfer"|"other", createdBy: userId, notes: "..." }`

**Convenience aliases (backward-compatible):**

| Method | Alias Endpoint | Maps To |
|--------|---------------|---------|
| GET | `/pos` | `GET /invoices?kind=pos` |
| GET | `/pos/:id` | `GET /invoices/:id` (where kind=pos) |
| POST | `/pos` | `POST /invoices` with `kind: 'pos'` |
| PATCH | `/pos/:id` | `PATCH /invoices/:id` |

---

## 7. Documents (Quotations, Purchase Orders, Expenses)

Single resource with `kind`; filter by `?kind=` for each module.

| Method | Endpoint | Description | Scope |
|--------|----------|-------------|-------|
| GET | `/documents` | List documents (?kind=quotation\|purchase_order\|expense, ?status=) | Admin (org) |
| GET | `/documents/:id` | Get document (items + payload) | Admin (org) |
| POST | `/documents` | Create document (body: kind, document_number, contact_id or vendor_id, items, payload) | Admin (org) |
| PATCH | `/documents/:id` | Update document | Admin (org) |
| DELETE | `/documents/:id` | Delete draft document | Admin (org) |

**Payload by kind (stored in `payload` JSONB):**

- **quotation:** customerName, validUntil, notes
- **purchase_order:** vendorName, expectedDate, notes
- **expense:** category, description, taxAmount, paymentMethod, paymentDate, vendorId, vendorName, receiptImage, approvedBy, notes

---

## 8. Subscriptions

| Method | Endpoint | Description | Scope |
|--------|----------|-------------|-------|
| GET | `/subscriptions` | List subscriptions (?status=, ?contactId=) | Admin (org) |
| GET | `/subscriptions/:id` | Get subscription by id | Admin (org) |
| POST | `/subscriptions` | Create subscription | Admin (org) |
| PATCH | `/subscriptions/:id` | Update subscription (plan, amount, next_billing_date, status, auto_renew) | Admin (org) |
| DELETE | `/subscriptions/:id` | Cancel subscription | Admin (org) |
| GET | `/customer/subscriptions` | List subscriptions for logged-in customer | Customer |

---

## 9. Settings (Company Profile + Website)

Single row per org. Company profile fields as columns, website settings as JSONB blob.

| Method | Endpoint | Description | Scope |
|--------|----------|-------------|-------|
| GET | `/settings` | Get all settings (company + branches + sms + upi + custom_fields + website) | Admin (org) |
| PATCH | `/settings` | Update settings (partial: any subset of fields) | Admin (org) |
| PATCH | `/settings/custom-fields` | Update custom_field_schema | Admin (org) |
| GET | `/settings/branches` | Get branches (from settings.branches) | Admin (org) |
| GET | `/settings/website` | Get website JSONB | Admin (org) / Public (read) |
| PATCH | `/settings/website` | Update website JSONB | Admin (org) |

**Convenience aliases (backward-compatible):**

| Method | Alias Endpoint | Maps To |
|--------|---------------|---------|
| GET | `/company-profile` | `GET /settings` |
| PATCH | `/company-profile` | `PATCH /settings` |
| PATCH | `/company-profile/custom-fields` | `PATCH /settings/custom-fields` |
| GET | `/company-profile/branches` | `GET /settings/branches` |
| GET | `/website-settings` | `GET /settings/website` |
| PATCH | `/website-settings` | `PATCH /settings/website` |

---

## 10. Audit Log & SMS

Audit log tracks all entity changes. SMS logs are stored as audit entries with `entity_type='sms'`.

| Method | Endpoint | Description | Scope |
|--------|----------|-------------|-------|
| GET | `/audit-log` | List audit entries (?entityType=, ?entityId=, ?userId=, ?from=, ?to=) | Admin (org) |
| POST | `/audit-log` | Append entry (usually called internally on create/update/delete) | System |

**SMS convenience endpoints (query audit_log where entity_type='sms'):**

| Method | Endpoint | Description | Scope |
|--------|----------|-------------|-------|
| GET | `/sms-logs` | List SMS logs (?contactId=, ?from=, ?to=) — maps to `GET /audit-log?entityType=sms` | Admin (org) |
| POST | `/sms/send` | Send SMS (uses settings sms_* config), writes audit_log entry | Admin (org) / System |

**SMS `meta` JSONB structure (in audit_log):**

```json
{ "contactId": 5, "mobile": "9876543210", "message": "Payment received ₹500", "smsType": "payment", "status": "sent", "providerRef": "abc123", "errorMessage": null }
```

---

## 11. Signup Requests

| Method | Endpoint | Description | Scope |
|--------|----------|-------------|-------|
| GET | `/signup-requests` | List signup requests | Super Admin |
| POST | `/signup-requests` | Submit signup request (public form) | Public |
| DELETE | `/signup-requests/:id` | Delete signup request | Super Admin |

---

## 12. Dashboard & Reports

| Method | Endpoint | Description | Scope |
|--------|----------|-------------|-------|
| GET | `/dashboard/stats` | KPIs (customers, activities by kind, payments, invoices, subscriptions, etc.) | Admin (org) |
| GET | `/dashboard/last-customers` | Last N customers | Admin (org) |
| GET | `/customer/dashboard` | Customer dashboard (subscription, next due, renew option) | Customer |

---

## Summary by Resource (Consolidated — 11 Tables)

| Resource | Table | Notes |
|----------|-------|-------|
| Auth | — | login, logout, me |
| Users | users | CRUD; super admin CRUD |
| Organizations | organizations | CRUD + status + modules + industry_type + terminology |
| Contacts | contacts | CRUD + filters; credit_limit, loyalty_points, tags, custom_fields |
| **Inventory** | **inventory** | Unified catalog: products (catalog_type=product), ISP categories (isp_category), ISP plans (isp_plan). meta JSONB for kind-specific fields |
| **Activities** | **activities** | Complaints, connection_requests, appointments, service_requests, leads (kind + payload JSONB) |
| **Invoices** | **invoices** | Sales, purchase, POS (kind + items JSONB + payload JSONB) |
| **Documents** | **documents** | Quotations, purchase_orders, expenses (kind + items + payload JSONB) |
| Subscriptions | subscriptions | CRUD |
| **Settings** | **settings** | Company profile + website (website as JSONB blob) |
| **Audit log** | **audit_log** | All entity audit trail + SMS logs (entity_type='sms', meta JSONB) |
| Signup requests | signup_requests | List, create (public), delete |

All org-scoped APIs must enforce `organization_id` from the authenticated user. Customer-scoped APIs use the authenticated customer's `contact_id`.
