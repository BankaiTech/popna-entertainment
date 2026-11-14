import logging
from datetime import timedelta
from django.conf import settings
from django.db import transaction
from django.utils import timezone

from customers.models import Customer, ServiceCategory
from orgs.models import Organization

from .gateway import get_gateway
from .models import SmsMessage
from .templates import receipt_body, reminder_body, render, template_id

log = logging.getLogger(__name__)
STALE_CLAIM = timedelta(minutes=10)


def customer_language(customer, org=None):
    org = org or customer.organization
    return customer.sms_language or org.sms_language or "en"


def enqueue_customer_sms(*, customer, kind, body, dedupe_key, payment=None, bill=None):
    """
    The ONLY way to queue an SMS: it always goes to a customer, using the operator's approved
    English or Tamil template. Idempotent: the same dedupe_key never creates a second SMS.
    """
    if not customer.mobile:
        return None
    org = customer.organization
    lang = customer_language(customer, org)
    msg, created = SmsMessage.objects.get_or_create(
        dedupe_key=dedupe_key,
        defaults={
            "organization": org,
            "kind": kind,
            "customer": customer,
            "recipient_name": customer.name,
            "to_mobile": customer.mobile,
            "language": lang,
            "template_id": template_id(lang),
            "body": render(lang, customer.name, body(lang), org.display_name),
            "payment": payment,
            "bill": bill,
        },
    )
    return msg if created else None


def should_send_for(customer, internet_flag):
    """Cable: always (operator requirement). Internet: only if the operator AND customer allow it."""
    if customer.plan.category == ServiceCategory.CABLE:
        return True
    return bool(internet_flag and customer.sms_opt_in)


def queue_payment_sms(payment):
    customer = payment.customer
    org = payment.organization
    if not should_send_for(customer, org.internet_payment_sms_enabled):
        return []
    msg = enqueue_customer_sms(
        customer=customer, kind=SmsMessage.Kind.PAYMENT_RECEIPT,
        body=lambda lang: receipt_body(lang, payment.amount, payment.receipt_no, payment.bill.balance),
        dedupe_key=f"receipt:{payment.id}:customer", payment=payment,
    )
    return [msg] if msg else []


def queue_due_reminders(today=None):
    """
    For each operator: unpaid bills due within the next N days get ONE reminder per stage.
    Using a window (not an exact date) means a missed day still sends the reminder.
    """
    from billing.models import Bill

    today = today or timezone.localdate()
    created = 0
    for org in Organization.objects.filter(status=Organization.Status.ACTIVE):
        stages = sorted({org.reminder_days_before, *([org.second_reminder_days_before]
                                                      if org.second_reminder_days_before is not None else [])})
        window_end = today + timedelta(days=max(stages))
        bills = (
            Bill.objects.filter(
                organization=org,
                status__in=[Bill.Status.UNPAID, Bill.Status.PARTIAL],
                due_date__gte=today,
                due_date__lte=window_end,
                customer__status=Customer.Status.ACTIVE,
            )
            .select_related("customer__plan", "customer__organization")
        )
        for bill in bills:
            customer = bill.customer
            if not should_send_for(customer, org.internet_reminders_enabled):
                continue
            # One SMS per reminder stage: e.g. 3 days before, then 1 day before. The smallest stage that
            # applies wins, so a late run never sends two reminders on the same day.
            days_left = (bill.due_date - today).days
            stage = min(s for s in stages if days_left <= s)
            if enqueue_customer_sms(
                customer=customer, kind=SmsMessage.Kind.DUE_REMINDER,
                body=lambda lang, b=bill: reminder_body(lang, b.balance, b.due_date),
                dedupe_key=f"due:{bill.id}:{stage}", bill=bill,
            ):
                created += 1
    return created


def _claim_batch(limit):
    now = timezone.now()
    # Release rows stuck in "sending" (e.g. the process crashed mid-send).
    SmsMessage.objects.filter(status=SmsMessage.Status.SENDING, claimed_at__lt=now - STALE_CLAIM).update(
        status=SmsMessage.Status.PENDING
    )
    with transaction.atomic():
        ids = list(
            SmsMessage.objects.select_for_update(skip_locked=True)
            .filter(status=SmsMessage.Status.PENDING, next_attempt_at__lte=now)
            .order_by("id")
            .values_list("id", flat=True)[:limit]
        )
        SmsMessage.objects.filter(id__in=ids).update(status=SmsMessage.Status.SENDING, claimed_at=now)
    return SmsMessage.objects.filter(id__in=ids).order_by("id")


def process_outbox(limit=100, gateway=None):
    gateway = gateway or get_gateway()
    sent = failed = 0
    for msg in _claim_batch(limit):
        result = gateway.send(msg)
        msg.attempts += 1
        if result.ok:
            msg.status = SmsMessage.Status.SENT
            msg.sent_at = timezone.now()
            msg.provider_ref = result.provider_ref[:100]
            msg.last_error = ""
            sent += 1
        else:
            msg.last_error = result.error[:1000]
            if msg.attempts >= settings.SMS_MAX_ATTEMPTS:
                msg.status = SmsMessage.Status.FAILED
                failed += 1
            else:
                msg.status = SmsMessage.Status.PENDING
                msg.next_attempt_at = timezone.now() + timedelta(minutes=2 ** msg.attempts)
            log.warning("SMS %s attempt %s failed: %s", msg.id, msg.attempts, msg.last_error)
        msg.claimed_at = None
        msg.save()
    return {"sent": sent, "failed": failed}
