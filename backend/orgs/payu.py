"""
PayU (India) hosted checkout: operators pay LCO Desk online, as a second option next to Cashfree.

Flow:
  1. checkout_form() - server makes a PayU payment request for an amount WE calculated and signs it
     (SHA-512 with the salt, which never leaves the server). Browser gets {action, fields}.
  2. browser POSTs that form to PayU (UPI, cards, net banking).
  3. PayU POSTs the result to /api/payments/payu/return (and the webhook). We check the reverse hash, then
  4. confirm() asks PayU itself (verify_payment API): only status "success" with exactly our amount approves
     the payment (adds SMS / extends the subscription). The browser and the posted form are never trusted alone.

Docs: https://docs.payu.in/docs/generate-hash-payu-hosted , https://docs.payu.in/docs/verify_payment_api
"""
import hashlib
import hmac
import logging
import re
from decimal import Decimal

import requests
from django.conf import settings

log = logging.getLogger(__name__)

ORDER_ID = re.compile(r"^lcod_\d+_[0-9a-f]{12}$")


class PayUError(Exception):
    pass


def enabled(org=None):
    """Keys set. In test mode (fake money) only for the test operators in PAYU_SANDBOX_ORG_IDS."""
    if not (settings.PAYU_KEY and settings.PAYU_SALT):
        return False
    if settings.PAYU_ENV == "production":
        return True
    return org is not None and org.id in settings.PAYU_SANDBOX_ORG_IDS


def payment_url():
    return "https://secure.payu.in/_payment" if settings.PAYU_ENV == "production" else "https://test.payu.in/_payment"


def _verify_url():
    return ("https://info.payu.in/merchant/postservice.php?form=2" if settings.PAYU_ENV == "production"
            else "https://test.payu.in/merchant/postservice.php?form=2")


def _sha512(text):
    return hashlib.sha512(text.encode("utf-8")).hexdigest()


def _amount(value):
    return f"{Decimal(value):.2f}"


def _plain(text, limit):
    """PayU rejects odd characters in names; keep letters, digits and spaces."""
    return re.sub(r"\s+", " ", re.sub(r"[^A-Za-z0-9 ]", " ", str(text or ""))).strip()[:limit] or "Operator"


def request_hash(f):
    # sha512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT)
    parts = [f["key"], f["txnid"], f["amount"], f["productinfo"], f["firstname"], f["email"],
             f.get("udf1", ""), f.get("udf2", ""), f.get("udf3", ""), f.get("udf4", ""), f.get("udf5", ""),
             "", "", "", "", "", settings.PAYU_SALT]
    return _sha512("|".join(parts))


def response_hash_ok(posted):
    """Reverse hash PayU sends back: sha512([additional_charges|]SALT|status||||||udf5|...|udf1|email|firstname|
    productinfo|amount|txnid|key). Compared in constant time."""
    get = lambda k: str(posted.get(k, "") or "")  # noqa: E731
    parts = [settings.PAYU_SALT, get("status"), "", "", "", "", "", get("udf5"), get("udf4"), get("udf3"),
             get("udf2"), get("udf1"), get("email"), get("firstname"), get("productinfo"), get("amount"),
             get("txnid"), get("key")]
    if get("additional_charges"):
        parts.insert(0, get("additional_charges"))
    expected = _sha512("|".join(parts))
    return bool(settings.PAYU_SALT) and hmac.compare_digest(expected, get("hash").lower())


def checkout_form(*, order_id, amount, org, user, product):
    """The fields the browser POSTs to PayU. Raises PayUError."""
    digits = "".join(ch for ch in (user.mobile or org.contact_phone or org.owner_mobile or "") if ch.isdigit())
    phone = digits[-10:]
    if len(phone) != 10:
        raise PayUError("Add a phone number in Settings > Business Profile first.")
    fields = {
        "key": settings.PAYU_KEY,
        "txnid": order_id,
        "amount": _amount(amount),
        "productinfo": _plain(product, 100),
        "firstname": _plain(org.name, 60),
        "email": (user.email or org.contact_email or settings.PAYU_FALLBACK_EMAIL).strip(),
        "phone": phone,
        "surl": settings.PAYU_RETURN_URL,
        "furl": settings.PAYU_RETURN_URL,
        "udf1": str(org.id),
    }
    fields["hash"] = request_hash(fields)
    return {"action": payment_url(), "fields": fields}


def get_transaction(order_id):
    """Ask PayU (server to server) what happened to this txnid."""
    command = "verify_payment"
    data = {"key": settings.PAYU_KEY, "command": command, "var1": order_id,
            "hash": _sha512(f"{settings.PAYU_KEY}|{command}|{order_id}|{settings.PAYU_SALT}")}
    try:
        resp = requests.post(_verify_url(), data=data, timeout=20)
        body = resp.json()
    except (requests.RequestException, ValueError) as exc:
        raise PayUError(f"Could not reach PayU ({exc.__class__.__name__})") from exc
    if resp.status_code >= 300 or str(body.get("status")) != "1":
        raise PayUError(f"PayU error: {body.get('msg') or resp.status_code}")
    return (body.get("transaction_details") or {}).get(order_id) or {}


def is_paid(txn, expected_amount, org_id):
    try:
        amount_ok = Decimal(str(txn.get("amt") or txn.get("amount"))).quantize(Decimal("0.01")) == Decimal(expected_amount)
    except Exception:  # noqa: BLE001 - bad data from outside means "not paid"
        return False
    udf_ok = str(txn.get("udf1", org_id)) in ("", str(org_id))
    return str(txn.get("status", "")).lower() == "success" and amount_ok and udf_ok


def confirm(payment):
    """Ask PayU about this order. success with the right amount -> approve. Safe to call many times."""
    from django.utils import timezone

    from . import billing
    from .models import PlatformPayment

    if payment.status != PlatformPayment.Status.CREATED:
        return payment
    txn = get_transaction(payment.gateway_order_id)
    if is_paid(txn, payment.amount, payment.organization_id):
        return billing.approve_payment(payment, None)
    if str(txn.get("status", "")).lower() in ("failure", "failed", "dropped", "bounced", "usercancelled"):
        PlatformPayment.objects.filter(pk=payment.pk, status=PlatformPayment.Status.CREATED).update(
            status=PlatformPayment.Status.REJECTED, admin_note="Online payment not completed",
            decided_at=timezone.now())
        payment.refresh_from_db()
    return payment
