# LCO Desk — Backend (Django)

> This folder is `backend/` inside the `lco-desk` repo. The React app is at the repo root.
> For going live, follow **DEPLOY_CHECKLIST.md** at the repo root.

Multi-level billing, collection and field-tracking backend for cable TV and broadband operators (LCOs).

**Levels:** Platform admin → Distributor → Operator (owner) → Manager / Collection agent / Technician

**What's built**

| Feature | Status |
|---|---|
| JWT login, roles, multi-tenant isolation | ✅ |
| Distributors, operators, staff users | ✅ |
| Areas, plans (cable / internet), customers | ✅ |
| Monthly bills, payments with receipt numbers, cancel with reason | ✅ |
| Payment SMS to customer + owner (cable always, internet optional) | ✅ |
| Due-date reminder SMS, N days before (cable always, internet optional) | ✅ |
| Owner daily summary SMS (optional instead of per-payment SMS) | ✅ |
| Agent check-in/out, live location, day route, GPS on every collection | ✅ |
| SMS outbox with retries + SMS logs | ✅ |
| Scheduler (no Redis/Celery needed) | ✅ |
| Subscriptions, plan limits, modules per operator and per staff member | ✅ |
| Cable cut-off day vs internet rolling validity, cut-off list, 2-stage reminders | ✅ |
| Stock, suppliers, purchases, GST sales invoices, serial/barcode scanning | ✅ |
| 74 automated tests | ✅ |
| Complaints, new connections, reports, expenses, bulk import | Next |

---

## 1. Run on your laptop (10 minutes)

```bash
cd lco-desk/backend
python3 -m venv .venv
source .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Local settings: debug on, SQLite, SMS printed to console
echo "DJANGO_DEBUG=true" > .env
echo "SMS_BACKEND=console" >> .env

python manage.py migrate
python manage.py seed_demo           # demo operator + users + customers
python manage.py test                # should say: OK
python manage.py runserver 8000
```

Demo logins (password `Demo@12345`): `platform`, `distributor`, `owner`, `manager`, `agent1`, `tech1`.

- API: http://127.0.0.1:8000/api/health
- Admin panel: http://127.0.0.1:8000/admin (login as `platform`)

In a second terminal, run the scheduler (sends SMS, runs daily jobs):

```bash
python manage.py run_scheduler
```

## 2. Connect the React frontend

In the frontend `.env`:

```
VITE_USE_MOCK_API=false
VITE_API_BASE_URL=/api            # Vite forwards /api to Django on :8000 (no CORS setup)
VITE_APP_NAME=LCO Desk
```

Login, `/auth/me` and `/contacts` work with the existing code. Payments, tracking and settings need small
frontend changes — see **docs/FRONTEND_INTEGRATION.md**.

## 3. Set up ping4sms (do this early — DLT approval takes days)

1. **DLT registration** (mandatory in India): register your business (entity), a 6-letter sender ID (header)
   and the 4 message templates in **docs/DLT_SMS_TEMPLATES.md**. Your ping4sms account manager can guide this.
2. Copy the **Send SMS API URL** from your ping4sms panel into `SMS_HTTP_URL` in `.env`, replacing the real
   values with placeholders: `{api_key} {sender} {mobile} {message} {template_id} {entity_id} {route}`.
3. Fill `SMS_API_KEY`, `SMS_SENDER_ID`, `SMS_DLT_ENTITY_ID` and the 4 `SMS_TPL_*` template IDs.
4. Set `SMS_BACKEND=http` and test with your own number:
   ```bash
   python manage.py send_test_sms 98XXXXXXXX
   ```
5. If the gateway needs `91` before the number, set `SMS_MOBILE_PREFIX=91`.

The SMS API key lives **only in the server `.env`**. It is never sent to the browser.

## 4. Deploy on a fresh VPS (step by step)

**Server:** Ubuntu 24.04, 2 GB RAM, India region (e.g. Mumbai or Bangalore).

**4.1 Point a domain at the server.** In your DNS, add an `A` record: `api.lcodesk.in → <server IP>` (`lcodesk.in` is an example — use the domain you actually own).

**4.2 Log in and secure the server**

```bash
ssh ubuntu@<server-ip>
sudo apt update && sudo apt upgrade -y
sudo ufw allow OpenSSH
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

**4.3 Install Docker**

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
exit    # log out and back in so the group applies
```

**4.4 Get the code and configure**

```bash
git clone <your-private-repo-url> lco-desk
cd lco-desk/backend
cp .env.example .env
nano .env     # set DJANGO_SECRET_KEY, POSTGRES_PASSWORD, API_DOMAIN, hosts, CORS, SMS values
```

**4.5 Start everything**

```bash
docker compose up -d --build
docker compose ps                       # db, web, scheduler, caddy should be "running"
docker compose logs -f web              # Ctrl+C to stop watching
```

**4.6 Create your platform admin login**

```bash
docker compose exec web python manage.py createsuperuser
```

Open `https://api.lcodesk.in/api/health` — you should see `{"status":"ok"}`.

**4.7 Backups (do not skip)**

```bash
crontab -e
# add:
30 2 * * * /home/ubuntu/lco-desk/backend/scripts/backup_db.sh >> /home/ubuntu/backup.log 2>&1
```

Copy the `backups/` folder to cloud storage regularly. A backup on the same server is lost if the server is.

**4.8 Updating later**

```bash
git pull
docker compose up -d --build
```

## 5. Who can do what

| Role | Can do |
|---|---|
| `platform_admin` (you) | Everything: distributors, operators, all users |
| `distributor` | Create/view own operators, summary numbers. **No customer personal data.** |
| `owner` | Everything inside own operator: staff, settings, customers, cancel payments |
| `manager` | Customers, plans, bills, payments, SMS logs, live map. No staff or settings |
| `agent` | View customers, collect payments (own list only), check in/out |
| `technician` | Check in/out (complaints come in Phase 2) |

Tenant isolation: the operator always comes from the logged-in user. The frontend's `X-Organization-Id`
header is ignored.

## 6. Main API endpoints (all under `/api/`)

| Method | Path | Who |
|---|---|---|
| POST | `auth/login`, `auth/refresh`, `auth/logout` | everyone |
| GET | `auth/me` | everyone |
| CRUD | `users` | platform admin, owner (manager read-only) |
| CRUD | `organizations`, `distributors` | platform admin / distributor / owner (own settings) |
| GET | `distributor/summary` | platform admin, distributor |
| CRUD | `areas`, `plans`, `contacts` (= `customers`) | office: write · all staff: read |
| GET | `bills?period=2026-11&status=unpaid` · POST `bills/generate` | office, agent (read) |
| GET/POST | `payments` · POST `payments/{id}/cancel` | office, agent · cancel: owner |
| GET | `sms-logs` | office |
| GET | `dashboard/stats` | office |
| GET | `tracking/status` · POST `tracking/check-in`, `check-out`, `ping` | agent, technician |
| GET | `tracking/live`, `tracking/route?user_id=&date=` | office |

## 7. Scheduler jobs (`run_scheduler`)

| When | Job |
|---|---|
| Every 30 seconds | Send pending SMS (retries with back-off, max 5 tries) |
| 06:00 on day 1 | Create this month's bills |
| 09:00 daily | Queue due reminders for bills due within `reminder_days_before` days |
| 21:00 daily | Owner daily summary (only operators who chose `daily_summary`) |
| 03:00 daily | Delete location data older than 90 days |

Each daily job runs at most once per day (see the `JobRun` table in admin). You can also run any job by hand:
`generate_bills --period 2026-11`, `queue_due_reminders`, `send_owner_summaries`, `send_sms_outbox`,
`purge_old_locations`.

## 8. Operator settings (PATCH `/api/organizations/{id}` as owner)

| Field | Default | Meaning |
|---|---|---|
| `reminder_days_before` | 3 | Reminder SMS this many days before the due date |
| `default_due_day` | 10 | Due day when a customer has none |
| `internet_reminders_enabled` | false | Cable reminders are always on |
| `internet_payment_sms_enabled` | false | Cable payment SMS are always on |
| `owner_alert_mode` | `per_payment` | Or `daily_summary` to save SMS cost |
| `owner_mobile`, `extra_alert_mobiles` | — | Who gets owner alerts |
| `require_checkin_for_collection` | true | Agents must check in before collecting |
| `require_gps_for_collection` | true | Agents must send GPS with each payment |
| `tracking_enabled` | true | Turn location features off completely |

## 9. Privacy and security notes

- Tell staff in writing that location is recorded **only between check-in and check-out**, and why.
- Location data is auto-deleted after `LOCATION_RETENTION_DAYS` (90).
- Payments are never edited or deleted. Owners cancel with a reason; everything is in the audit log.
- Collection time is server time, so it cannot be back-dated from a phone.
- Never commit `.env`. Rotate the ping4sms key if it was ever shared in chat or code.
