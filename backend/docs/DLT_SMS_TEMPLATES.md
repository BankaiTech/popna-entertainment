# DLT templates to register (for ping4sms)

Every SMS in India must match a DLT-registered template exactly. Register these 4 as **Service Implicit**
(transactional) templates. In DLT, each `{variable}` below becomes `{#var#}`. Each variable can usually hold up
to 30 characters — the backend cuts longer values to 30.

If DLT asks you to change any wording, put your approved text in `.env` (`SMS_TEXT_PAYMENT_RECEIPT=...` etc.)
using the same `{variable}` names. No code change needed.

## 1. Payment receipt → customer (`SMS_TPL_PAYMENT_RECEIPT`)
```
Dear {name}, Rs.{amount} received for {service} {period} on {date} {time} by {agent}. Receipt {receipt}. Balance Rs.{balance}. -{org}
```

## 2. Payment alert → owner (`SMS_TPL_OWNER_PAYMENT_ALERT`)
```
{agent} collected Rs.{amount} from {name} ({mobile}) on {date} {time}. Receipt {receipt}. -LCO Desk
```

## 3. Due reminder → customer (`SMS_TPL_DUE_REMINDER`)
```
Dear {name}, your {service} bill of Rs.{amount} for {period} is due on {due_date}. Please pay on time to avoid disconnection. -{org}
```

## 4. Daily summary → owner (`SMS_TPL_OWNER_DAILY_SUMMARY`)
```
{org}: {date} collections Rs.{total} from {count} payments. Cash Rs.{cash}, UPI Rs.{upi}. -LCO Desk
```

## Cost notes
- English SMS: 160 characters per credit. Template 1 is ~150 characters with typical values = 1 credit.
- Tamil (Unicode) SMS: only 70 characters per credit, so 2–3× the cost. Start with English.
- Owners choosing `daily_summary` instead of `per_payment` saves one SMS per collection.
