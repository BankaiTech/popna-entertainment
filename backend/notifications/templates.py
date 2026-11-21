"""
Customer SMS texts.

Every SMS in India must EXACTLY match a DLT-registered template, or the gateway rejects it.
Each message type (payment receipt, due reminder) has its own template per language:

  receipt / en   1607100000000376221   Dear Customer {name},\\n{body}\\nThank you ... Regards,\\n{org}\\nPING4SMS
  reminder / en  1607100000000376221   (same English template)
  receipt / ta   1677100000000399500   கேபிள் சந்தா ₹{body} அன்று பெறப்பட்டது. {org}\\nPING4SMS
                                       (2 variables only, no name; {body} = "250, 19-11-2026", ₹ is fixed text)
  reminder / ta  1677100000000399495   {name}, கேபிள் கட்டணம் {body}க்குள் செலுத்தவும். {org}\nPING4SMS
                                       ({body} = "₹230, 20-11-26 ", the provider's cut-off date)

{name}, {body}, {org} are the {#var#} places (a template may leave {name} out). DLT rejects any value longer than 30 characters,
so every value is fitted to 30 here.

New template from the vendor with the SAME variables? No code change: set its id and text in .env
(SMS_TPL_<KIND>_<LANG> and SMS_TEXT_<KIND>_<LANG>, see config/settings.py). Different variables
(e.g. the new English receipt) = change BODIES below.
"""
from decimal import Decimal

from django.conf import settings

MAX_VAR_LEN = 30
LANGUAGES = ("en", "ta")
KINDS = ("receipt", "reminder")

_EN = "Dear Customer {name},\n{body}\nThank you for your continued support.\nRegards,\n{org}\nPING4SMS"
_TA_REMINDER = "{name}, கேபிள் கட்டணம் {body}க்குள் செலுத்தவும். {org}\nPING4SMS"
_TA_RECEIPT = "கேபிள் சந்தா ₹{body} அன்று பெறப்பட்டது. {org}\nPING4SMS"

DEFAULT_TEXTS = {
    ("receipt", "en"): _EN,
    ("reminder", "en"): _EN,
    ("receipt", "ta"): _TA_RECEIPT,
    ("reminder", "ta"): _TA_REMINDER,
}


def money(value):
    value = Decimal(value)
    return f"{value:.0f}" if value == value.to_integral() else f"{value:.2f}"


def fit(*options):
    """First option that fits DLT's 30-character variable limit (the last one is cut as a fallback)."""
    for text in options:
        if len(text) <= MAX_VAR_LEN:
            return text
    return options[-1][:MAX_VAR_LEN]


def short_date(d):
    return d.strftime("%d-%m-%y")


def receipt_body(lang, amount, receipt_no, balance, paid_on):
    """The middle variable of the payment receipt SMS."""
    a = money(amount)
    if lang == "ta":
        # "கேபிள் சந்தா ₹250, 19-11-2026 அன்று பெறப்பட்டது." The ₹ is part of the DLT template, not the variable.
        return fit(f"{a}, {paid_on:%d-%m-%Y}", f"{a}, {short_date(paid_on)}", a)
    seq = receipt_no.rsplit("-", 1)[-1]
    if Decimal(balance) > 0:
        return fit(f"Paid Rs.{a}, balance Rs.{money(balance)}", f"Paid Rs.{a}, bal Rs.{money(balance)}", f"Paid Rs.{a}")
    return fit(f"Paid Rs.{a}, Receipt {receipt_no}", f"Paid Rs.{a}, Receipt {seq}", f"Paid Rs.{a} Rcpt {seq}",
               f"Paid Rs.{a}")


def reminder_body(lang, amount, due_date):
    a, d = money(amount), short_date(due_date)
    if lang == "ta":
        # "Raj, கேபிள் கட்டணம் ₹230, 20-11-26 க்குள் செலுத்தவும்." (space before க்குள் as in the DLT sample)
        return fit(f"₹{a}, {d} ", f"₹{a}, {d}")
    return fit(f"Rs.{a} due {d}, pay in advance", f"Rs.{a} due {d}, pay early", f"Pay Rs.{a} by {d}",
               f"Rs.{a} due {d}")


def _key(kind, lang):
    return (kind if kind in KINDS else "receipt", lang if lang in LANGUAGES else "en")


def template_text(kind, lang):
    key = _key(kind, lang)
    override = settings.SMS_TEXT_OVERRIDES.get(key, "")
    return override.replace("\\n", "\n") if override else DEFAULT_TEXTS[key]


def template_id(kind, lang):
    return settings.SMS_TEMPLATE_IDS.get(_key(kind, lang), "")


def render(kind, lang, name, body, org):
    return template_text(kind, lang).format(
        name=str(name)[:MAX_VAR_LEN].strip(), body=str(body)[:MAX_VAR_LEN], org=str(org)[:MAX_VAR_LEN].strip()
    )
