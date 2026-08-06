# Popna API — Postman

## Base URL

```
http://192.168.6.108:3000/api
```

Import `Popna_API_Collection.postman_collection.json` into Postman. Collection variable `baseUrl` is set to the LAN host above.

Auth: after **Login**, set `accessToken` / `refreshToken` from the response (or use a Postman test script).

## Frontend env

In `.env` (local Vite — recommended, avoids CORS):

```
VITE_USE_MOCK_API=false
VITE_API_BASE_URL=/api
```

Vite proxies `/api` → `http://192.168.6.108:3000` (see `vite.config.ts`). Restart `npm run dev` after changing `.env`.

Direct to LAN (requires backend CORS):

```
VITE_API_BASE_URL=http://192.168.6.108:3000/api
```

## Endpoints in this collection

| Group | Methods |
|-------|---------|
| Auth & Users | login, logout, refresh, me, users CRUD, superadmin users |
| Organizations | list, create, get, patch status |
| Contacts | CRUD |
| Inventory | list, create, low-stock |
| Activities | list, create |
| Invoices & POS | invoices list/create, pos list |
| Documents | list, create |
| Subscriptions | list, create |
| Settings | get/patch, website |
| Audit & SMS | audit-log, sms-logs, sms/send |
| Signup Requests | list, create, delete |
| Dashboard | stats, last-customers, customer/dashboard |

If the API runs on a different host or port, update both Postman `baseUrl` and `VITE_API_BASE_URL`.

## Frontend module map

| UI / API module | Backend path |
|-----------------|--------------|
| Auth store | `/auth/login`, logout, refresh, me |
| Users / Superadmin users | `/users`, `/superadmin/users` |
| Organizations | `/organizations` |
| Customers (contacts) | `/contacts` |
| Inventory products / ISP products / plans | `/inventory` (`catalogType`) |
| Complaints, appointments, SRs, leads, connection requests | `/activities` (`kind`) |
| Sales / purchase invoices | `/invoices` (`kind`) |
| POS checkout | `/pos` (fallback `invoices?kind=pos`) |
| Quotations, POs, expenses | `/documents` (`kind`) |
| Subscriptions | `/subscriptions` |
| Company / website settings | `/settings`, `/settings/website` |
| Signup requests | `/signup-requests` |
| Admin dashboard | `/dashboard/stats`, `/dashboard/last-customers` |
| Customer dashboard | `/customer/dashboard` |
| Audit / SMS | `/audit-log`, `/sms-logs`, `/sms/send` |

Mock path remains when `VITE_USE_MOCK_API` is not `false`.
