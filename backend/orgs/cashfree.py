"""
Cashfree Payment Gateway: operators pay LCO Desk online (SMS packs, renewals).

Flow:
  1. create_order()  - server makes a Cashfree order for an amount WE calculated, gets payment_session_id
  2. browser opens Cashfree checkout with that session id (frontend, @cashfreepayments/cashfree-js)
  3. Cashfree sends the customer back to return_url and calls our webhook (notify_url)
  4. confirm_order() - we ask Cashfree for the order; only order_status == PAID and the right amount
     approves the payment (adds SMS / extends subscription). Never trust the browser or the webhook body alone.
"""
import base64
import hashlib
import hmac
import logging
import uuid
from decimal import Decimal

import requests
from django.conf import settings

log = logging.getLogger(__name__)


class CashfreeError(Exception):
    pass


def enabled(org=None):
    """Keys set. In sandbox (fake money) only for the test operators in CASHFREE_SANDBOX_ORG_IDS."""
    if not (settings.CASHFREE_APP_ID and settings.CASHFREE_SECRET_KEY):
        return False
    if settings.CASHFREE_ENV == "production":
        return True
    return org is not None and org.id in settings.CASHFREE_SANDBOX_ORG_IDS


def _base_url():
    return "https://api.cashfree.com/pg" if settings.CASHFREE_ENV == "production" else "https://sandbox.cashfree.com/pg"


def _headers():
    return {
        "x-client-id": settings.CASHFREE_APP_ID,
        "x-client-secret": settings.CASHFREE_SECRET_KEY,
        "x-api-version": settings.CASHFREE_API_VERSION,
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


def create_order(*, order_id, amount, org, user, note):
    """Returns Cashfree's order (dict) with payment_session_id. Raises CashfreeError."""
    digits = "".join(ch for ch in (user.mobile or org.owner_mobile or "") if ch.isdigit())
    phone = digits[-10:]
    if len(phone) != 10:
        raise CashfreeError("Add your mobile number in your profile first.")
    back = settings.CASHFREE_RETURN_URL
    back += ("&" if "?" in back else "?") + f"order_id={order_id}"
    body = {
        "order_id": order_id,
        "order_amount": float(amount),
        "order_currency": "INR",
        "customer_details": {
            "customer_id": f"org_{org.id}",
            "customer_name": (org.name or "Operator")[:100],
            "customer_phone": phone,
        },
        "order_meta": {
            "return_url": back,
            "notify_url": settings.CASHFREE_NOTIFY_URL,
        },
        "order_note": note[:200],
        "order_tags": {"organization_id": str(org.id)},
    }
    try:
        resp = requests.post(f"{_base_url()}/orders", json=body, headers={**_headers(),
                             "x-idempotency-key": str(uuid.uuid4())}, timeout=20)
    except requests.RequestException as exc:
        raise CashfreeError(f"Could not reach Cashfree ({exc.__class__.__name__})") from exc
    data = resp.json() if resp.content else {}
    if resp.status_code >= 300 or not data.get("payment_session_id"):
        log.warning("Cashfree create order failed: %s %s", resp.status_code, data.get("message"))
        raise CashfreeError(data.get("message") or f"Cashfree error {resp.status_code}")
    return data


def get_order(order_id):
    try:
        resp = requests.get(f"{_base_url()}/orders/{order_id}", headers=_headers(), timeout=20)
    except requests.RequestException as exc:
        raise CashfreeError(f"Could not reach Cashfree ({exc.__class__.__name__})") from exc
    if resp.status_code >= 300:
        raise CashfreeError(f"Cashfree error {resp.status_code}")
    return resp.json()


def is_paid(order, expected_amount):
    """PAID and exactly the amount we asked for."""
    try:
        amount_ok = Decimal(str(order.get("order_amount"))).quantize(Decimal("0.01")) == Decimal(expected_amount)
    except Exception:  # noqa: BLE001 - bad data from outside means "not paid"
        return False
    return order.get("order_status") == "PAID" and amount_ok


def verify_webhook(raw_body: bytes, timestamp: str, signature: str) -> bool:
    """x-webhook-signature = base64(HMAC-SHA256(secret, timestamp + raw body))."""
    if not (timestamp and signature and settings.CASHFREE_SECRET_KEY):
        return False
    digest = hmac.new(settings.CASHFREE_SECRET_KEY.encode(), timestamp.encode() + raw_body, hashlib.sha256).digest()
    return hmac.compare_digest(base64.b64encode(digest).decode(), signature)


def confirm(payment):
    """Ask Cashfree about this order. PAID with the right amount -> approve (adds SMS / extends plan).
    Safe to call many times (return page, webhook, retries): approve_payment locks the row."""
    from django.utils import timezone

    from . import billing
    from .models import PlatformPayment

    if payment.status != PlatformPayment.Status.CREATED:
        return payment
    order = get_order(payment.gateway_order_id)
    if is_paid(order, payment.amount):
        return billing.approve_payment(payment, None)
    if order.get("order_status") in ("EXPIRED", "TERMINATED"):
        PlatformPayment.objects.filter(pk=payment.pk, status=PlatformPayment.Status.CREATED).update(
            status=PlatformPayment.Status.REJECTED, admin_note="Online payment not completed",
            decided_at=timezone.now())
        payment.refresh_from_db()
    return payment
