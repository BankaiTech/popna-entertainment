# SMS templates (DLT)

LCO Desk sends SMS **only to customers**. Owners and staff never get SMS; they see everything in the app
(Dashboard, SMS Log). Each message type has its own approved DLT template per language.

| Message | Language | Template ID | .env setting (id / text) |
|---|---|---|---|
| Payment receipt | English | 1607100000000376221 | `SMS_TPL_RECEIPT_EN` / `SMS_TEXT_RECEIPT_EN` |
| Due reminder | English | 1607100000000376221 | `SMS_TPL_REMINDER_EN` / `SMS_TEXT_REMINDER_EN` |
| Payment receipt | Tamil | **1677100000000399325** (new) | `SMS_TPL_RECEIPT_TA` / `SMS_TEXT_RECEIPT_TA` |
| Due reminder | Tamil | 1607100000000376222 (old, until a new one is approved) | `SMS_TPL_REMINDER_TA` / `SMS_TEXT_REMINDER_TA` |

The ids above are built in; set them in `.env` only to change them.
(`SMS_TPL_CUSTOMER_EN` / `_TA` and `SMS_TEXT_CUSTOMER_EN` / `_TA` are older names, still read as a fallback.)

Internet customers get **no SMS** for now (`SMS_INTERNET_ENABLED=false`). Cable SMS always go.

## Template text (must match the DLT registration exactly)

English (receipt and reminder):
```
Dear Customer {#var#},
{#var#}
Thank you for your continued support.
Regards,
{#var#}
PING4SMS
```

Tamil payment receipt (new):
```
அன்புள்ள வாடிக்கையாளர் {#var#}, உங்கள் கேபிள் கட்டணம் {#var#} அன்று பெறப்பட்டது. இப்படிக்கு {#var#}
PING4SMS
```

Tamil due reminder (old):
```
அன்புள்ள வாடிக்கையாளர் {#var#},
{#var#}
உங்கள் தொடர்ந்து வழங்கும் ஆதரவிற்கு நன்றி.
அன்புடன்,
{#var#}
PING4SMS
```

Variables: 1 = customer name, 2 = message part (below), 3 = business name (Settings → SMS → business name).
**DLT allows at most 30 characters per variable**, so LCO Desk fits each value to 30 characters.

## Variable 2

| When | English | Tamil |
|---|---|---|
| Payment received | `Paid Rs.230, Receipt 000123` | `₹230, 19-11-2026` (amount + payment date) |
| Partial payment | `Paid Rs.200, balance Rs.30` | `₹200, 19-11-2026` |
| Due reminder | `Rs.230 due 10-11-26, pay early` | `ரூ.230 10-11-26க்குள் செலுத்தவும்` |

Shorter forms are used automatically when an amount is large.

## Language
Operator default: Settings → SMS → SMS language. Per customer: customer form → SMS language.

## When the vendor approves a new template
- **Same 3 variables in the same order** (only fixed words / id changed): no code change. Set the id and
  the text in `.env` with `{name}`, `{body}`, `{org}` and `\n` for new lines, then restart.
- **Different variables** (e.g. a new English receipt like the Tamil one): change `DEFAULT_TEXTS` and
  `receipt_body()` / `reminder_body()` in `notifications/templates.py`, the preview in
  `src/components/settings/lco/SmsSettings.tsx`, this file, and the tests in `tests/test_sms_templates.py`.

## Test
```bash
docker compose -f docker-compose.aws.yml exec web python manage.py send_test_sms 98XXXXXXXX --lang en
docker compose -f docker-compose.aws.yml exec web python manage.py send_test_sms 98XXXXXXXX --lang ta
docker compose -f docker-compose.aws.yml exec web python manage.py send_test_sms 98XXXXXXXX --lang ta --kind reminder
```
