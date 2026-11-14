# SMS templates (DLT)

LCO Desk sends SMS **only to customers**, using two approved DLT templates.
Owners and staff never get SMS; they see everything in the app (Dashboard, SMS Log).

| Language | Template ID | Setting |
|---|---|---|
| English | 1607100000000376221 | `SMS_TPL_CUSTOMER_EN` |
| Tamil | 1607100000000376222 | `SMS_TPL_CUSTOMER_TA` |

## Template text (must match the DLT registration exactly)

English:
```
Dear Customer {#var#},
{#var#}
Thank you for your continued support.
Regards,
{#var#}
PING4SMS
```

Tamil:
```
அன்புள்ள வாடிக்கையாளர் {#var#},
{#var#}
உங்கள் தொடர்ந்து வழங்கும் ஆதரவிற்கு நன்றி.
அன்புடன்,
{#var#}
PING4SMS
```

Variables: 1 = customer name, 2 = message line, 3 = business name (Settings → SMS → sender name).
**DLT allows at most 30 characters per variable**, so LCO Desk fits each value to 30 characters.

## Message lines (variable 2)

| When | English | Tamil |
|---|---|---|
| Payment received | `Paid Rs.230, Receipt 000123` | `ரூ.230 பெறப்பட்டது, ரசீது 000123` |
| Partial payment | `Paid Rs.200, balance Rs.30` | `ரூ.200 பெறப்பட்டது, மீதி ரூ.30` |
| Due reminder | `Rs.230 due 10-11-26, pay early` | `ரூ.230 10-11-26க்குள் செலுத்தவும்` |

Shorter forms are used automatically when an amount is large.

## Language
Operator default: Settings → SMS → SMS language. Per customer: customer form → SMS language.

## If your approved wording differs
Set `SMS_TEXT_CUSTOMER_EN` / `SMS_TEXT_CUSTOMER_TA` in `.env` using `{name}`, `{body}`, `{org}` and `\n`.

## Test
```bash
docker compose -f docker-compose.aws.yml exec web python manage.py send_test_sms 98XXXXXXXX
docker compose -f docker-compose.aws.yml exec web python manage.py send_test_sms 98XXXXXXXX --lang ta
```
