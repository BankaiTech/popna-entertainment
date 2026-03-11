# API List — Popna Entertainment (Post-Consolidation)

This document lists the APIs required by the frontend and recommended for the backend after the consolidated schema (single `invoices`, `users`, `inventory`, `pos`, and extended `company_profile`).

---

## 1. Authentication & Users

| Method | Endpoint | Description | Scope |
|--------|----------|--------------|--------|
| POST | `/auth/login` | Unified login (admin/employee/super_admin/customer by credentials) | Public |
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
|--------|----------|--------------|--------|
| GET | `/organizations` | List all organizations | Super Admin |
| GET | `/organizations/:id` | Get organization by id | Super Admin |
| POST | `/organizations` | Create organization | Super Admin |
| PATCH | `/organizations/:id` | Update organization (name, status, etc.) | Super Admin |
| PATCH | `/organizations/:id/status` | Update status (active/disabled/suspended) | Super Admin |
| PATCH | `/organizations/:id/modules` | Update allowed_modules | Super Admin |
| PATCH | `/organizations/:id/settings-tabs` | Update allowed_settings_tabs | Super Admin |

---

## 3. Contacts (Customers, Suppliers, Vendors)

| Method | Endpoint | Description | Scope |
|--------|----------|--------------|--------|
| GET | `/contacts` | List contacts (optional ?type=customer\|supplier\|vendor) | Admin (org) |
| GET | `/contacts/:id` | Get contact by id | Admin (org) |
| POST | `/contacts` | Create contact | Admin (org) |
| PATCH | `/contacts/:id` | Update contact (incl. payment fields) | Admin (org) |
| DELETE | `/contacts/:id` | Delete contact | Admin (org) |
| GET | `/contacts?paymentStatus=not_paid` | Filter by payment status | Admin (org) |
| GET | `/contacts?status=Active` | Filter customers by status | Admin (org) |
| GET | `/customer/me` | Current customer profile (portal) | Customer |

---

## 4. Products (ISP Service Categories)

| Method | Endpoint | Description | Scope |
|--------|----------|--------------|--------|
| GET | `/products` | List products for org | Admin (org) |
| GET | `/products/active` | List active products only | Admin (org) |
| GET | `/products/:id` | Get product by id | Admin (org) |
| POST | `/products` | Create product | Admin (org) |
| PATCH | `/products/:id` | Update product | Admin (org) |
| DELETE | `/products/:id` | Delete product | Admin (org) |

---

## 5. Plans

| Method | Endpoint | Description | Scope |
|--------|----------|--------------|--------|
| GET | `/plans` | List all plans for org | Admin (org) |
| GET | `/plans?provider=:name` | List plans by provider (product name) | Admin (org) |
| GET | `/plans/:id` | Get plan by id | Admin (org) |
| POST | `/plans` | Create plan | Admin (org) |
| PATCH | `/plans/:id` | Update plan | Admin (org) |
| DELETE | `/plans/:id` | Delete plan | Admin (org) |

---

## 6. Invoices (Unified: Sales + Purchase)

| Method | Endpoint | Description | Scope |
|--------|----------|--------------|--------|
| GET | `/invoices` | List invoices (optional ?kind=sales\|purchase) | Admin (org) |
| GET | `/invoices/:id` | Get invoice by id (with line items) | Admin (org) |
| POST | `/invoices` | Create invoice (body includes kind) | Admin (org) |
| PATCH | `/invoices/:id` | Update invoice | Admin (org) |
| DELETE | `/invoices/:id` | Void or delete draft invoice | Admin (org) |
| GET | `/invoices/:id/items` | Get line items for invoice | Admin (org) |
| POST | `/invoices/:id/items` | Add line item(s) | Admin (org) |
| PATCH | `/invoices/:id/items/:itemId` | Update line item | Admin (org) |
| DELETE | `/invoices/:id/items/:itemId` | Remove line item | Admin (org) |
| GET | `/customer/invoices` | List invoices for logged-in customer | Customer |

---

## 7. Complaints

| Method | Endpoint | Description | Scope |
|--------|----------|--------------|--------|
| GET | `/complaints` | List complaints (optional ?status=) | Admin (org) |
| GET | `/complaints/:id` | Get complaint by id | Admin (org) |
| POST | `/complaints` | Create complaint | Admin (org) |
| PATCH | `/complaints/:id` | Update complaint (status, closure, etc.) | Admin (org) |
| GET | `/customer/complaints` | List complaints for logged-in customer | Customer |

---

## 8. Connection Requests

| Method | Endpoint | Description | Scope |
|--------|----------|--------------|--------|
| GET | `/connection-requests` | List connection requests (?status=New\|Converted) | Admin (org) |
| GET | `/connection-requests/:id` | Get by id | Admin (org) |
| POST | `/connection-requests` | Create (public signup / website form) | Public / Admin |
| PATCH | `/connection-requests/:id` | Update (e.g. status → Converted) | Admin (org) |

---

## 9. Company Profile (Branches, SMS, UPI)

| Method | Endpoint | Description | Scope |
|--------|----------|--------------|--------|
| GET | `/company-profile` | Get profile (company + branches + sms + upi) | Admin (org) |
| PATCH | `/company-profile` | Update profile (partial: company, branches, sms_*, upi_*) | Admin (org) |
| GET | `/company-profile/branches` | Get branches (or use profile.branches JSONB) | Admin (org) |

---

## 10. Website Settings

| Method | Endpoint | Description | Scope |
|--------|----------|--------------|--------|
| GET | `/website-settings` | Get website settings for org | Admin (org) / Public (read) |
| PATCH | `/website-settings` | Update website settings | Admin (org) |

---

## 11. Inventory (Single Table)

| Method | Endpoint | Description | Scope |
|--------|----------|--------------|--------|
| GET | `/inventory` | List inventory items (optional ?category=, ?isActive=) | Admin (org) |
| GET | `/inventory/:id` | Get item by id (with variants JSONB) | Admin (org) |
| POST | `/inventory` | Create inventory item | Admin (org) |
| PATCH | `/inventory/:id` | Update item (incl. variants, stock) | Admin (org) |
| DELETE | `/inventory/:id` | Soft-delete or deactivate | Admin (org) |
| GET | `/inventory/low-stock` | Items at or below stock_alert / reorder_level | Admin (org) |
| GET | `/inventory/barcode/:barcode` | Lookup by barcode (POS) | Admin (org) |

---

## 12. POS (Single Table, Items in JSONB)

| Method | Endpoint | Description | Scope |
|--------|----------|--------------|--------|
| GET | `/pos` | List POS transactions (optional ?branchId=, ?from=, ?to=) | Admin (org) |
| GET | `/pos/:id` | Get transaction by id (includes items JSONB) | Admin (org) |
| POST | `/pos` | Create POS transaction (body includes items array) | Admin (org) |
| PATCH | `/pos/:id` | Update (e.g. status → refunded/voided) | Admin (org) |

---

## 13. Signup Requests (Public / Super Admin)

| Method | Endpoint | Description | Scope |
|--------|----------|--------------|--------|
| GET | `/signup-requests` | List signup requests | Super Admin |
| POST | `/signup-requests` | Submit signup request (public form) | Public |
| DELETE | `/signup-requests/:id` | Delete signup request | Super Admin |

---

## 14. SMS Logs (Audit)

| Method | Endpoint | Description | Scope |
|--------|----------|--------------|--------|
| GET | `/sms-logs` | List SMS logs (?contactId=, ?smsType=, ?from=, ?to=) | Admin (org) |
| POST | `/sms/send` | Send SMS (uses company_profile sms_* config) | Admin (org) / System |

---

## 15. Dashboard & Reports

| Method | Endpoint | Description | Scope |
|--------|----------|--------------|--------|
| GET | `/dashboard/stats` | KPIs (customers, complaints, payments, invoices, connections, etc.) | Admin (org) |
| GET | `/dashboard/last-customers` | Last N customers | Admin (org) |
| GET | `/customer/dashboard` | Customer dashboard (subscription, next due, renew option) | Customer |

---

## 16. UPI / Payments (Config in Company Profile)

| Method | Endpoint | Description | Scope |
|--------|----------|--------------|--------|
| GET | `/payments/upi-config` | Get UPI config (or from company-profile) | Admin (org) |
| PATCH | `/payments/upi-config` | Update UPI config (or via company-profile) | Admin (org) |

---

## Summary by Resource

- **Auth:** login, logout, me  
- **Users:** CRUD (org-scoped); super admin user CRUD  
- **Organizations:** CRUD + status + modules + settings-tabs (super admin)  
- **Contacts:** CRUD + filters (type, paymentStatus, status)  
- **Products:** CRUD + active list  
- **Plans:** CRUD + by provider  
- **Invoices:** CRUD + items CRUD, filter by kind  
- **Complaints:** CRUD + filters  
- **Connection requests:** List, create, update status  
- **Company profile:** Get, update (branches, sms, upi in one)  
- **Website settings:** Get, update  
- **Inventory:** CRUD + low-stock + barcode lookup  
- **POS:** List, get, create, update  
- **Signup requests:** List, create (public), delete  
- **SMS logs:** List, send  
- **Dashboard:** stats, last-customers; customer dashboard  

All org-scoped APIs must enforce `organization_id` from the authenticated user's context. Customer-scoped APIs use `contact_id` (or equivalent) from the authenticated customer.
