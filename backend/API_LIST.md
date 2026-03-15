# API List — Popna (Multi-Industry, Consolidated Schema)

APIs aligned with the consolidated backend schema: **activities** (complaints, connection_requests, appointments, service_requests, leads), **documents** (quotations, purchase_orders, expenses), **invoices** (sales + purchase), **subscriptions**, **audit_log**, and org/contact/settings extensions.

---

## 1. Authentication & Users

| Method | Endpoint | Description | Scope |
|--------|----------|-------------|--------|
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
|--------|----------|-------------|--------|
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
|--------|----------|-------------|--------|
| GET | `/contacts` | List contacts (?type=customer\|supplier\|vendor) | Admin (org) |
| GET | `/contacts/:id` | Get contact by id | Admin (org) |
| POST | `/contacts` | Create contact | Admin (org) |
| PATCH | `/contacts/:id` | Update contact (incl. payment, credit_limit, loyalty_points, tags, custom_fields) | Admin (org) |
| DELETE | `/contacts/:id` | Delete contact | Admin (org) |
| GET | `/contacts?paymentStatus=not_paid` | Filter by payment status | Admin (org) |
| GET | `/contacts?status=Active` | Filter customers by status | Admin (org) |
| GET | `/customer/me` | Current customer profile (portal) | Customer |

---

## 4. Products & Plans

| Method | Endpoint | Description | Scope |
|--------|----------|-------------|--------|
| GET | `/products` | List products for org | Admin (org) |
| GET | `/products/active` | List active products only | Admin (org) |
| GET | `/products/:id` | Get product by id | Admin (org) |
| POST | `/products` | Create product | Admin (org) |
| PATCH | `/products/:id` | Update product | Admin (org) |
| DELETE | `/products/:id` | Delete product | Admin (org) |
| GET | `/plans` | List plans (?provider=) | Admin (org) |
| GET | `/plans/:id` | Get plan by id | Admin (org) |
| POST | `/plans` | Create plan | Admin (org) |
| PATCH | `/plans/:id` | Update plan | Admin (org) |
| DELETE | `/plans/:id` | Delete plan | Admin (org) |

---

## 5. Activities (Complaints, Connection Requests, Appointments, Service Requests, Leads)

Single resource with `kind`; filter by `?kind=` for each module.

| Method | Endpoint | Description | Scope |
|--------|----------|-------------|--------|
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

## 6. Invoices (Sales + Purchase)

| Method | Endpoint | Description | Scope |
|--------|----------|-------------|--------|
| GET | `/invoices` | List invoices (?kind=sales\|purchase) | Admin (org) |
| GET | `/invoices/:id` | Get invoice with line items | Admin (org) |
| POST | `/invoices` | Create invoice (body includes kind, items for multi-item) | Admin (org) |
| PATCH | `/invoices/:id` | Update invoice | Admin (org) |
| DELETE | `/invoices/:id` | Void or delete draft | Admin (org) |
| GET | `/invoices/:id/items` | Get line items | Admin (org) |
| POST | `/invoices/:id/items` | Add line item(s) | Admin (org) |
| PATCH | `/invoices/:id/items/:itemId` | Update line item | Admin (org) |
| DELETE | `/invoices/:id/items/:itemId` | Remove line item | Admin (org) |
| GET | `/customer/invoices` | List invoices for logged-in customer | Customer |

---

## 7. Documents (Quotations, Purchase Orders, Expenses)

Single resource with `kind`; filter by `?kind=` for each module.

| Method | Endpoint | Description | Scope |
|--------|----------|-------------|--------|
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
|--------|----------|-------------|--------|
| GET | `/subscriptions` | List subscriptions (?status=, ?contactId=) | Admin (org) |
| GET | `/subscriptions/:id` | Get subscription by id | Admin (org) |
| POST | `/subscriptions` | Create subscription | Admin (org) |
| PATCH | `/subscriptions/:id` | Update subscription (plan, amount, next_billing_date, status, auto_renew) | Admin (org) |
| DELETE | `/subscriptions/:id` | Cancel subscription | Admin (org) |
| GET | `/customer/subscriptions` | List subscriptions for logged-in customer | Customer |

---

## 9. Company Profile (Branches, SMS, UPI, Custom Fields)

| Method | Endpoint | Description | Scope |
|--------|----------|-------------|--------|
| GET | `/company-profile` | Get profile (company + branches + sms + upi + custom_field_schema) | Admin (org) |
| PATCH | `/company-profile` | Update (partial: company, branches, sms_*, upi_*) | Admin (org) |
| PATCH | `/company-profile/custom-fields` | Update custom_field_schema (definitions with labels per locale) | Admin (org) |
| GET | `/company-profile/branches` | Get branches (or use profile.branches) | Admin (org) |

---

## 10. Website Settings

| Method | Endpoint | Description | Scope |
|--------|----------|-------------|--------|
| GET | `/website-settings` | Get website settings for org | Admin (org) / Public (read) |
| PATCH | `/website-settings` | Update website settings | Admin (org) |

---

## 11. Inventory

| Method | Endpoint | Description | Scope |
|--------|----------|-------------|--------|
| GET | `/inventory` | List inventory (?category=, ?isActive=) | Admin (org) |
| GET | `/inventory/:id` | Get item (with variants) | Admin (org) |
| POST | `/inventory` | Create inventory item | Admin (org) |
| PATCH | `/inventory/:id` | Update (incl. variants, stock, batch/expiry) | Admin (org) |
| DELETE | `/inventory/:id` | Soft-delete or deactivate | Admin (org) |
| GET | `/inventory/low-stock` | Items at or below stock_alert / reorder_level | Admin (org) |
| GET | `/inventory/barcode/:barcode` | Lookup by barcode (POS) | Admin (org) |

---

## 12. POS

| Method | Endpoint | Description | Scope |
|--------|----------|-------------|--------|
| GET | `/pos` | List POS transactions (?branchId=, ?from=, ?to=) | Admin (org) |
| GET | `/pos/:id` | Get transaction (includes items JSONB) | Admin (org) |
| POST | `/pos` | Create POS transaction (creates linked sales invoice when needed for ITR) | Admin (org) |
| PATCH | `/pos/:id` | Update (e.g. status → refunded/voided) | Admin (org) |

---

## 13. Audit Log

| Method | Endpoint | Description | Scope |
|--------|----------|-------------|--------|
| GET | `/audit-log` | List audit entries (?entityType=, ?entityId=, ?userId=, ?from=, ?to=) | Admin (org) |
| POST | `/audit-log` | Append entry (usually called internally on create/update/delete) | System |

---

## 14. Signup Requests & SMS

| Method | Endpoint | Description | Scope |
|--------|----------|-------------|--------|
| GET | `/signup-requests` | List signup requests | Super Admin |
| POST | `/signup-requests` | Submit signup request (public form) | Public |
| DELETE | `/signup-requests/:id` | Delete signup request | Super Admin |
| GET | `/sms-logs` | List SMS logs (?contactId=, ?from=, ?to=) | Admin (org) |
| POST | `/sms/send` | Send SMS (uses company_profile sms_* config) | Admin (org) / System |

---

## 15. Dashboard & Reports

| Method | Endpoint | Description | Scope |
|--------|----------|-------------|--------|
| GET | `/dashboard/stats` | KPIs (customers, activities by kind, payments, invoices, subscriptions, etc.) | Admin (org) |
| GET | `/dashboard/last-customers` | Last N customers | Admin (org) |
| GET | `/customer/dashboard` | Customer dashboard (subscription, next due, renew option) | Customer |

---

## Summary by Resource (Consolidated)

| Resource | Table | Notes |
|----------|--------|------|
| Auth | — | login, logout, me |
| Users | users | CRUD; super admin CRUD |
| Organizations | organizations | CRUD + status + modules + industry_type + terminology |
| Contacts | contacts | CRUD + filters; credit_limit, loyalty_points, tags, custom_fields |
| Products, Plans | products, plans | CRUD |
| **Activities** | **activities** | Complaints, connection_requests, appointments, service_requests, leads (kind + payload) |
| Invoices | invoices | CRUD + items; kind = sales \| purchase |
| **Documents** | **documents** | Quotations, purchase_orders, expenses (kind + items + payload) |
| **Subscriptions** | **subscriptions** | CRUD |
| Company profile | company_profile | Get/update; custom_field_schema |
| Website settings | website_settings | Get/update |
| Inventory | inventory | CRUD + low-stock + barcode |
| POS | pos | List, get, create, update (optionally create sales invoice for ITR) |
| **Audit log** | **audit_log** | List (and internal write) |
| Signup requests | signup_requests | List, create (public), delete |
| SMS logs | sms_logs | List, send |

All org-scoped APIs must enforce `organization_id` from the authenticated user. Customer-scoped APIs use the authenticated customer’s `contact_id`.
