# LCO Desk — Go-live checklist

Two parts, hosted separately:

| Part | Where | Address (example) |
|---|---|---|
| Django API + database + scheduler | One small Linux server (VPS) | `https://api.lcodesk.in` |
| React app | Netlify | `https://app.lcodesk.in` |

`lcodesk.in` is only an example. Use your own domain everywhere below.

---

## 1. Before you start
- [ ] Domain bought (any registrar)
- [ ] GitHub repo `lco-desk` is **private**, `main` is up to date
- [ ] VPS ordered: **Ubuntu 24.04, 2 GB RAM, India region** (e.g. AWS Lightsail Mumbai or DigitalOcean Bangalore)
- [ ] You have the VPS **public IP** and can log in with an SSH key

## 2. DNS (at your domain registrar)
- [ ] `A` record: `api` → your VPS IP
- [ ] Wait until it resolves. In PowerShell: `Resolve-DnsName api.lcodesk.in` shows your IP

## 3. Server setup (from Windows PowerShell)
```powershell
ssh ubuntu@<VPS-IP>
```
Then on the server:
```bash
sudo apt update && sudo apt upgrade -y
sudo ufw allow OpenSSH && sudo ufw allow 80 && sudo ufw allow 443 && sudo ufw --force enable
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
exit
```
Log in again (`ssh ubuntu@<VPS-IP>`) so Docker works without sudo.

## 4. Get the code and configure
```bash
git clone https://github.com/<you>/lco-desk.git
cd lco-desk/backend
cp .env.example .env
python3 -c "import secrets; print(secrets.token_urlsafe(50))"   # copy this for DJANGO_SECRET_KEY
python3 -c "import secrets; print(secrets.token_urlsafe(24))"   # copy this for POSTGRES_PASSWORD
nano .env
```
Set these in `.env` (save with `Ctrl+O`, `Enter`, exit with `Ctrl+X`):

| Setting | Value |
|---|---|
| `DJANGO_SECRET_KEY` | the first random value |
| `POSTGRES_PASSWORD` | the second random value |
| `DJANGO_ALLOWED_HOSTS` | `api.lcodesk.in` |
| `DJANGO_CSRF_TRUSTED_ORIGINS` | `https://api.lcodesk.in` |
| `CORS_ALLOWED_ORIGINS` | `https://app.lcodesk.in` (add your `*.netlify.app` address too while testing, comma-separated) |
| `API_DOMAIN` | `api.lcodesk.in` |
| `SMS_BACKEND` | `console` until DLT templates are approved, then `http` |

## 5. Start the API
```bash
docker compose up -d --build
docker compose ps                     # db, web, scheduler, caddy → running
docker compose logs --tail=50 web
```
- [ ] Open `https://api.lcodesk.in/api/health` in your browser → `{"status":"ok"}` with a padlock (HTTPS)

## 6. Create your app-owner login
```bash
docker compose exec web python manage.py createsuperuser
```
This user is the **platform admin** (you).

## 7. Frontend on Netlify
1. Netlify → **Add new site → Import from GitHub** → choose `lco-desk`
2. Build command `npm run build`, publish directory `dist` (already in `netlify.toml`)
3. **Site settings → Environment variables**:

   | Key | Value |
   |---|---|
   | `VITE_USE_MOCK_API` | `false` |
   | `VITE_API_BASE_URL` | `https://api.lcodesk.in/api` |
   | `VITE_APP_NAME` | `LCO Desk` |
4. **Deploy**. Then **Domain management → Add domain** `app.lcodesk.in` and follow Netlify's DNS instructions (a `CNAME` for `app`). HTTPS is automatic.

## 8. First real operator (pilot)
1. - [ ] Log in at `https://app.lcodesk.in` with your superuser → **Operators → Add Operator** (dates, limits, owner login)
2. - [ ] Log in as that owner → **Settings**: Business Profile, Billing & Reminders, SMS sender name
3. - [ ] **Settings → Providers & Plans**: add GTPL / RailWire / BSNL... with cut-off day (cable) or validity days (internet), then plans
4. - [ ] **Customers**: add customers (try **Import** with 5 rows first)
5. - [ ] **Staff**: add collection agents (Collect + My Duty)
6. - [ ] Create this month's cable bills now (afterwards it happens automatically on the 1st):
   ```bash
   docker compose exec web python manage.py generate_bills
   ```
   Internet customers start their validity with their first payment.

## 9. Phone test (HTTPS is required for GPS and camera)
- [ ] Agent phone: open `https://app.lcodesk.in` → log in → **My Duty → Start duty** (allow location)
- [ ] **Collect** → collect ₹1 from a test customer → receipt shows
- [ ] Owner laptop: **Live Map** shows the agent; route shows the collection pin
- [ ] Sales → scan a box with the phone camera (or a USB/Bluetooth scanner) → invoice prints
- [ ] Add to home screen (installs the app)

## 10. SMS go-live (after DLT approval)
- [ ] DLT templates registered exactly as in `backend/docs/DLT_SMS_TEMPLATES.md`
- [ ] Fill `SMS_HTTP_URL`, `SMS_API_KEY`, `SMS_SENDER_ID`, `SMS_DLT_ENTITY_ID`, `SMS_TPL_*` in `.env`, set `SMS_BACKEND=http`
- [ ] `docker compose up -d` then `docker compose exec web python manage.py send_test_sms 98XXXXXXXX`

## 11. Backups (do not skip)
```bash
crontab -e
# add this line:
30 2 * * * /home/ubuntu/lco-desk/backend/scripts/backup_db.sh >> /home/ubuntu/backup.log 2>&1
```
- [ ] Run it once by hand: `~/lco-desk/backend/scripts/backup_db.sh`
- [ ] Copy `backend/backups/` off the server regularly (a backup on the same server is lost with the server)
- [ ] Practise a restore once on a test machine

## 12. Updating later
```bash
cd ~/lco-desk && git pull
cd backend && docker compose up -d --build
```
Netlify rebuilds the frontend automatically on every push to `main`.

## 13. After a week
- [ ] `SECURE_HSTS_SECONDS=31536000` in `.env`, then `docker compose up -d`
- [ ] Check **SMS logs** for failures and **Live Map** accuracy with the agents
