# LCO Desk — build tasks for Claude Code

Paste one task at a time into claude.ai/code. Review and merge the PR before starting the next.
Every task: follow CLAUDE.md, run `npm run build` and the backend tests, and end with a summary.

---

## Task 1 — Rename to LCO Desk and focus on cable/ISP  ✅ DONE (applied in this package)
Rename the app from "Popna" to "LCO Desk" in all user-visible text: `index.html` title, `public/manifest.json`
(name, short_name, description: "Billing and collection for cable TV and broadband operators"),
`package.json` name (`lco-desk`), `.env.example` (`VITE_APP_NAME=LCO Desk`), and every `public/locales/*.json`
value. Do not rename image files or import paths yet.
Hide non-cable/ISP modules (restaurant, gym, salon, healthcare, grocery, electronics, retail widgets and
industry templates) from menus and signup so only cable/ISP features show. Do not delete the code.
Done when: the app builds, no visible "Popna" remains, and the sidebar shows only cable/ISP modules.

## Task 2 — Real login and customers
With `VITE_USE_MOCK_API=false`, make login, `/auth/me`, and customers work against the Django API
(see `backend/docs/FRONTEND_INTEGRATION.md`).
- On a 401, try `POST /auth/refresh` with the refresh token once before logging out.
- Customers list/create/edit via `/contacts`; plans from `/plans`; areas from `/areas`.
- Customer form: plan dropdown (shows provider + plan name + price), area dropdown, due day,
  permanent discount, SMS opt-in (show it only for internet plans; cable SMS are always on).
- Show backend validation errors next to the right fields.
Done when: I can log in as `owner` (seed_demo) and manage customers end to end.

## Task 3 — Payment collection
Replace the old "update customer payment fields" flow with `POST /payments`.
- `PaymentCollectionModal`: amount (default = current balance), method (cash/UPI), note.
- Get GPS with `navigator.geolocation` before saving; show a clear message if location is denied.
- Show backend errors (`duty`, `location`, `amount`) as friendly messages.
- After success, show the receipt number, date/time and collector name.
- Customer history panel: `GET /payments?customer=<id>`.
- Owner only: "Cancel payment" with a required reason (`POST /payments/{id}/cancel`).
Done when: as `agent1` (checked in) I can collect a payment and see the receipt; as `owner` I can cancel it.

## Task 4 — Agent duty screen
For agents and technicians (`lco_role` from `/auth/me`), add a "My Duty" page as their home screen.
- `GET /tracking/status` on load; big "Start duty" / "End duty" buttons (send GPS with both).
- While on duty and the app is open, send `POST /tracking/ping` every 2 minutes (hook in
  `backend/docs/FRONTEND_INTEGRATION.md`). Stop when off duty.
- Show: on duty since, last location sent, today's collections count and total (`GET /payments`).
- Warn clearly when GPS permission is off. Mobile-first layout.
Done when: agent can start duty, collect, and end duty; pings stop after ending.

## Task 5 — Owner live map
Add a "Live Map" page for owner/manager using Leaflet with OpenStreetMap tiles (include the required
OSM attribution; pin leaflet/react-leaflet versions that are at least two weeks old).
- `GET /tracking/live` every 60 seconds → marker per agent with name and "last seen X min ago"
  (grey marker if older than 15 minutes).
- Pick an agent + date → `GET /tracking/route` → route line from `points`, pins from `collections`
  (popup: customer, amount, time, receipt).
Done when: with seed data and a checked-in agent, the owner sees the agent on the map and their route.

## Task 6 — Settings and SMS logs
- Remove the SMS API URL/key/sender form from `SmsTemplates.tsx` (the key now lives only on the server).
- New settings tab "Collections & SMS" bound to `GET/PATCH /organizations/{organizationId}`:
  reminder_days_before, default_due_day, internet_reminders_enabled, internet_payment_sms_enabled,
  owner_alert_mode, owner_mobile, extra_alert_mobiles, tracking_enabled, require_gps_for_collection,
  require_checkin_for_collection. Show "Cable SMS are always on" as fixed text.
- New "SMS Logs" page from `GET /sms-logs` (filter by kind and status).
Done when: owner can change reminder days and see sent/failed SMS.

## Task 7 — Dashboard
Map `GET /dashboard/stats` into the existing KPI widgets: active/inactive customers, by provider,
this month billed vs collected and collection %, pending bills, today's total (cash/UPI),
and a "Today by agent" table.
Done when: owner dashboard shows real numbers from the backend.

## Task 8 — Deployment prep
- `netlify.toml`: skip frontend builds when only `backend/` changed
  (`ignore = "git diff --quiet $CACHED_COMMIT_REF $COMMIT_REF -- . ':!backend'"`).
- Update `backend/README.md` deploy steps for this repo layout (`cd lco-desk/backend`).
- Add `DEPLOY_CHECKLIST.md` at the root: DNS, VPS, `.env` values, HTTPS check, createsuperuser,
  backups, Netlify env vars (`VITE_USE_MOCK_API=false`, `VITE_API_BASE_URL=https://<api-domain>/api`),
  CORS, and a phone test of GPS over HTTPS.
Done when: the checklist is complete and the frontend builds with production env values.
