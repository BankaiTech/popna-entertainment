# LCO Desk on AWS — fresh setup

| Part | Where | Example address |
|---|---|---|
| React app | S3 + Cloudflare (already done) | `https://app.yourdomain.in` |
| Django API + scheduler | **EC2** (one small server, Docker) | `https://api.yourdomain.in` |
| Database | **RDS PostgreSQL** (private, encrypted, daily backups) | not reachable from the internet |

Region everywhere: **Asia Pacific (Mumbai) ap-south-1**.

**You never create tables by hand.** Django creates all of them (`migrate`) when the API starts.

---

## Step 1 — EC2 server (API)

EC2 → **Launch instance**

| Setting | Value |
|---|---|
| Name | `lcodesk-api` |
| AMI | **Ubuntu Server 24.04 LTS**, architecture **64-bit (Arm)** |
| Instance type | `t4g.small` (2 GB RAM) |
| Key pair | **Create new** → `lcodesk-key`, type RSA, format `.pem` → save it safely |
| Network | default VPC, **Auto-assign public IP: Enable** |
| Security group | **Create** `lcodesk-api-sg`: SSH 22 from **My IP** · HTTP 80 from Anywhere · HTTPS 443 from Anywhere |
| Storage | 20 GiB **gp3**, **Encrypted** |

Then **Elastic IPs → Allocate → Associate** it to `lcodesk-api`.
(A fixed IP. Without it, the IP changes every time the instance is stopped.)

## Step 2 — RDS PostgreSQL (database)

RDS → **Create database**

| Setting | Value |
|---|---|
| Method | **Standard create** |
| Engine | **PostgreSQL**, version 16.x |
| Template | Free tier if offered, otherwise **Dev/Test**, **Single-AZ** |
| DB instance identifier | `lcodesk-db` |
| Master username | `lcodesk_admin` |
| Credentials | **Self managed**, a long random password (save it in your password manager) |
| Instance class | `db.t4g.micro` |
| Storage | 20 GiB **gp3**, storage autoscaling on (max 50) |
| Connectivity | **Connect to an EC2 compute resource** → choose `lcodesk-api` |
| Public access | **No** |
| Additional configuration → Initial database name | `lcodesk` |
| Backup retention | **7 days** |
| Encryption | **Enabled** |
| Deletion protection | **Enabled** |

"Connect to an EC2 compute resource" makes AWS create two security groups so that **only `lcodesk-api` can reach the database on port 5432**. Nothing else can, not even you from home.

When it's **Available**, copy the **Endpoint** (like `lcodesk-db.xxxxxxxx.ap-south-1.rds.amazonaws.com`).

## Step 3 — DNS in Cloudflare
- `A` record: `api` → your **Elastic IP**
- **Proxy status: DNS only (grey cloud)**

Why grey: Caddy on the server gets its own HTTPS certificate. If the record is proxied while Cloudflare SSL mode is *Flexible* (common with S3 sites), you get an endless redirect loop.

## Step 4 — Log in to the server (Windows PowerShell)
```powershell
cd $HOME\Downloads
icacls lcodesk-key.pem /inheritance:r /grant:r "$($env:USERNAME):R"
ssh -i lcodesk-key.pem ubuntu@<ELASTIC-IP>
```
On the server:
```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu
exit
```
Log in again (same `ssh` command).

## Step 5 — Get the code (private repo, read-only key)
On the server:
```bash
ssh-keygen -t ed25519 -C "lcodesk-server" -f ~/.ssh/id_ed25519 -N ""
cat ~/.ssh/id_ed25519.pub
```
GitHub → your repo → **Settings → Deploy keys → Add deploy key** → paste → **leave "Allow write access" unticked**.
```bash
git clone git@github.com:<you>/lco-desk.git
cd lco-desk/backend
```

## Step 6 — Secure database connection settings
Download the RDS certificate bundle (lets the app verify it's really talking to your RDS):
```bash
mkdir -p certs
curl -fsSL -o certs/rds-global-bundle.pem https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem
cp .env.example .env
chmod 600 .env
python3 -c "import secrets; print(secrets.token_urlsafe(50))"
nano .env
```
Set:

| Setting | Value |
|---|---|
| `DJANGO_DEBUG` | `false` |
| `DJANGO_SECRET_KEY` | the random value above |
| `DJANGO_ALLOWED_HOSTS` | `api.yourdomain.in` |
| `DJANGO_CSRF_TRUSTED_ORIGINS` | `https://api.yourdomain.in` |
| `CORS_ALLOWED_ORIGINS` | `https://app.yourdomain.in` (your S3/Cloudflare app address) |
| `API_DOMAIN` | `api.yourdomain.in` |
| `POSTGRES_HOST` | the RDS **endpoint** |
| `POSTGRES_DB` | `lcodesk` |
| `POSTGRES_USER` | `lcodesk_admin` |
| `POSTGRES_PASSWORD` | the RDS master password |
| `POSTGRES_SSLMODE` | `verify-full` |
| `POSTGRES_SSLROOTCERT` | `/app/certs/rds-global-bundle.pem` |
| `SMS_BACKEND` | `console` (until DLT is approved) |

Save: `Ctrl+O`, `Enter`, `Ctrl+X`.

## Step 6b — A separate database user for the app (recommended, do it before Step 7)
So the app never uses the RDS master account. Run on the server:
```bash
docker run --rm -it -v "$PWD/certs:/certs" postgres:16-alpine \
  psql "host=<RDS-ENDPOINT> dbname=lcodesk user=lcodesk_admin sslmode=verify-full sslrootcert=/certs/rds-global-bundle.pem"
```
Enter the master password, then:
```sql
CREATE ROLE lcodesk_app LOGIN PASSWORD '<another-long-random-password>';
GRANT lcodesk_app TO lcodesk_admin;
ALTER DATABASE lcodesk OWNER TO lcodesk_app;
\q
```
In `.env` set `POSTGRES_USER=lcodesk_app` and `POSTGRES_PASSWORD=` that new password.
Keep the master password only in your password manager (for emergencies).

## Step 7 — Start (this creates all the tables)
```bash
docker compose -f docker-compose.aws.yml up -d --build
docker compose -f docker-compose.aws.yml logs --tail=40 web
```
In the logs you'll see `Applying accounts.0001_initial... OK` etc. Those are your tables being created in RDS.

Check the database connection:
```bash
docker compose -f docker-compose.aws.yml exec web python manage.py check_db
```
Expected:
```
Database: PostgreSQL 16...
Encrypted (SSL): YES (TLSv1.3, ...)
Tables created: 34
```
Open `https://api.yourdomain.in/api/health` → `{"status":"ok"}` with a padlock.

Create your app-owner login:
```bash
docker compose -f docker-compose.aws.yml exec web python manage.py createsuperuser
```

## Step 8 — Point the frontend to the API
On your laptop, in the repo root, create `.env.production`:
```
VITE_USE_MOCK_API=false
VITE_API_BASE_URL=https://api.yourdomain.in/api
VITE_APP_NAME=LCO Desk
```
```powershell
npm run build
aws s3 sync dist s3://<your-bucket> --delete
```
- S3 bucket → Properties → Static website hosting: **Index document `index.html`, Error document `index.html`** (so `/admin/...` pages work on refresh)
- Cloudflare → **Purge everything**
- Open the app → log in with your superuser → **Operators** page loads ✅

## Step 9 — First operator
Follow section 8 of `DEPLOY_CHECKLIST.md` (add operator → providers & plans → customers → staff), then:
```bash
docker compose -f docker-compose.aws.yml exec web python manage.py generate_bills
```

## Step 10 — More hardening (within the first week)
**Other:**
- Close port 22 and use **Systems Manager → Session Manager** instead of SSH
- After a week of stable HTTPS: `SECURE_HSTS_SECONDS=31536000` in `.env`
- AWS Budgets: set a monthly budget alert

## Updating later
```bash
cd ~/lco-desk && git pull
cd backend && docker compose -f docker-compose.aws.yml up -d --build
```
New migrations (new tables/columns) are applied automatically on start.

## Good to know
- **RDS runs 24×7 and is billed hourly.** If you stop it, AWS starts it again automatically after 7 days. Check the monthly cost in the AWS Pricing Calculator before going live.
- **Backups:** RDS keeps daily backups for 7 days and lets you restore to any minute in that window (RDS → Databases → Actions → Restore to point in time).
- Never put the database password in GitHub. It lives only in `.env` on the server.
