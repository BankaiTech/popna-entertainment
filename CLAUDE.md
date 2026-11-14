# LCO Desk — guide for Claude Code

Multi-level billing, collection and field-tracking SaaS for cable TV and broadband operators (LCOs) in India.
Levels: platform admin → distributor → operator owner → manager / collection agent / technician.

## Layout
- `/` — frontend: React 18 + TypeScript + Vite + Zustand + Tailwind + i18next, installable PWA
- `/backend` — Django 5.2 + Django REST Framework + SimpleJWT + PostgreSQL (SQLite for local/tests)
- Docs: `backend/README.md`, `backend/docs/FRONTEND_INTEGRATION.md`, `backend/docs/DLT_SMS_TEMPLATES.md`
- Paths in `backend/README.md` that say `lco-desk-backend` mean the `backend/` folder.

## Commands
Frontend (repo root):
- `npm install`, `npm run dev`, `npm run build` (runs `tsc` + `vite build`)

Backend:
- `cd backend && python -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt`
- `DJANGO_DEBUG=true python manage.py test`
- `DJANGO_DEBUG=true python manage.py migrate && DJANGO_DEBUG=true python manage.py seed_demo`
- `DJANGO_DEBUG=true python manage.py runserver 8000`

**Before finishing any task:** `npm run build` and the backend tests must both pass.

## Rules (do not break these)
1. **Secrets:** never commit `.env`, API keys or tokens. The SMS API key lives only in the server `.env`.
2. **Tenant isolation:** every operator-level query filters by `request.user.organization`
   (use `OrgScopedViewSet`, `require_org`, `OrgScopedPKField`). Never trust an organization id
   from the client, including the `X-Organization-Id` header.
3. **Payments:** never edit or delete. Create with `billing.services.record_payment`,
   cancel with `cancel_payment` (owner only, reason required).
4. **SMS:** only to customers, always through `notifications.services.enqueue_customer_sms` (outbox).
   Cable payment SMS and cable reminders are always on; internet is optional per operator and customer.
   Text must match the English/Tamil DLT templates in `backend/docs/DLT_SMS_TEMPLATES.md`
   (max 30 characters per variable).
5. **Location:** only recorded between check-in and check-out. Never track off duty.
6. **Scope v1:** cable TV and ISP only. Do not build restaurant / gym / salon / healthcare features.
   Hide unused modules via `allowed_modules`; do not delete their code.
7. **Frontend API:** use `src/lib/apiClient.ts` and the helpers in `src/lib/apiHelpers.ts`
   (snake_case ↔ camelCase). Keep mock mode (`VITE_USE_MOCK_API=true`) working.
8. **Name:** user-visible name is "LCO Desk" (not "Popna"). Logo: `src/components/Logo.tsx` + `public/lcodesk-icon*.png`.
9. Keep each change focused on the task. Add backend tests for backend changes.
   Explain any new dependency, and pin it to a version that is at least two weeks old.
10. **Languages:** every user-visible string goes through translation (`useLt()` from `src/lib/lt.ts`,
    English text as the key). Add new strings to all 6 files in `public/locales/`.

## Finish every task with
- What changed (short list)
- What the user must test by hand (especially on a phone)
- Anything left undone or risky
