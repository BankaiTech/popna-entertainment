"""
SMS texts. In India every SMS must EXACTLY match a DLT-registered template.
Register these texts on your DLT portal (variables become {#var#}), then put the
template IDs in .env. If DLT asks you to change wording, override the text with
SMS_TEXT_<KIND> in .env instead of editing code.
"""
from django.conf import settings

DEFAULT_TEXTS = {
    "payment_receipt": (
        "Dear {name}, Rs.{amount} received for {service} {period} on {date} {time} by {agent}. "
        "Receipt {receipt}. Balance Rs.{balance}. -{org}"
    ),
    "owner_payment_alert": (
        "{agent} collected Rs.{amount} from {name} ({mobile}) on {date} {time}. Receipt {receipt}. -LCO Desk"
    ),
    "due_reminder": (
        "Dear {name}, your {service} payment of Rs.{amount} is due on {due_date}. "
        "Please pay in advance to avoid disconnection. -{org}"
    ),
    "owner_daily_summary": (
        "{org}: {date} collections Rs.{total} from {count} payments. Cash Rs.{cash}, UPI Rs.{upi}. -LCO Desk"
    ),
}

# DLT variables are usually limited to 30 characters each.
MAX_VAR_LEN = 30


def render(kind, context):
    text = settings.SMS_TEXT_OVERRIDES.get(kind) or DEFAULT_TEXTS[kind]
    safe = {k: str(v)[:MAX_VAR_LEN] for k, v in context.items()}
    return text.format(**safe)
