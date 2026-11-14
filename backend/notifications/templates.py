"""
Customer SMS texts.

Every SMS in India must EXACTLY match a DLT-registered template. The operator has two
approved customer templates (one English, one Tamil) with three variables each:

    Dear Customer {#var#},          <- customer name
    {#var#}                         <- the message line (payment / reminder)
    Thank you for your continued support.
    Regards,
    {#var#}                         <- business name
    PING4SMS

DLT rejects any variable value longer than 30 characters, so every value is fitted
to 30 characters here. If your approved wording differs, set SMS_TEXT_CUSTOMER_EN /
SMS_TEXT_CUSTOMER_TA in .env (use {name}, {body}, {org} and \\n for new lines).
"""
from decimal import Decimal

from django.conf import settings

MAX_VAR_LEN = 30
LANGUAGES = ("en", "ta")

DEFAULT_TEXTS = {
    "en": (
        "Dear Customer {name},\n{body}\nThank you for your continued support.\nRegards,\n{org}\nPING4SMS"
    ),
    "ta": (
        "அன்புள்ள வாடிக்கையாளர் {name},\n{body}\nஉங்கள் தொடர்ந்து வழங்கும் ஆதரவிற்கு நன்றி.\n"
        "அன்புடன்,\n{org}\nPING4SMS"
    ),
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


def receipt_body(lang, amount, receipt_no, balance):
    a = money(amount)
    seq = receipt_no.rsplit("-", 1)[-1]
    if lang == "ta":
        if Decimal(balance) > 0:
            return fit(f"ரூ.{a} பெறப்பட்டது, மீதி ரூ.{money(balance)}", f"ரூ.{a} பெறப்பட்டது")
        return fit(f"ரூ.{a} பெறப்பட்டது, ரசீது {seq}", f"ரூ.{a} பெறப்பட்டது")
    if Decimal(balance) > 0:
        return fit(f"Paid Rs.{a}, balance Rs.{money(balance)}", f"Paid Rs.{a}, bal Rs.{money(balance)}", f"Paid Rs.{a}")
    return fit(f"Paid Rs.{a}, Receipt {receipt_no}", f"Paid Rs.{a}, Receipt {seq}", f"Paid Rs.{a} Rcpt {seq}",
               f"Paid Rs.{a}")


def reminder_body(lang, amount, due_date):
    a, d = money(amount), short_date(due_date)
    if lang == "ta":
        return fit(f"ரூ.{a} {d}க்குள் செலுத்தவும்", f"ரூ.{a} கடைசி நாள் {d}", f"ரூ.{a} {d}")
    return fit(f"Rs.{a} due {d}, pay in advance", f"Rs.{a} due {d}, pay early", f"Pay Rs.{a} by {d}",
               f"Rs.{a} due {d}")


def template_text(lang):
    override = settings.SMS_TEXT_OVERRIDES.get(lang, "")
    return override.replace("\\n", "\n") if override else DEFAULT_TEXTS[lang]


def template_id(lang):
    return settings.SMS_TEMPLATE_IDS.get(lang, "")


def render(lang, name, body, org):
    lang = lang if lang in LANGUAGES else "en"
    return template_text(lang).format(
        name=str(name)[:MAX_VAR_LEN].strip(), body=str(body)[:MAX_VAR_LEN], org=str(org)[:MAX_VAR_LEN].strip()
    )
