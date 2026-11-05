import logging
from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.db import transaction
from django.db.models import Q, Sum
from django.utils import timezone

from customers.models import Customer, ServiceCategory
from orgs.models import Organization

from .gateway import get_gateway
from .models import SmsMessage
from .templates import render

log = logging.getLogger(__name__)
STALE_CLAIM = timedelta(minutes=10)


def _money(value):
    value = Decimal(value)
    return f"{value:.0f}" if value == value.to_integral() else f"{value:.2f}"


def enqueue(*, organization, kind, to, context, dedupe_key, payment=None, bill=None):
    """Idempotent: the same dedupe_key never creates a second SMS. Returns the new message or None."""
    if not to:
        return None
    msg, created = SmsMessage.objects.get_or_create(
        dedupe_key=dedupe_key,
        defaults={
            "organization": organization,
            "kind": kind,
            "to_mobile": to,
            "body": render(kind, context),
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
    local = timezone.localtime(payment.collected_at)
    ctx = {
        "name": customer.name,
        "mobile": customer.mobile,
        "amount": _money(payment.amount),
        "service": customer.plan.get_category_display(),
        "period": payment.bill.period.strftime("%b %Y"),
        "date": local.strftime("%d-%m-%Y"),
        "time": local.strftime("%I:%M %p"),
        "agent": payment.collected_by.display_name,
        "receipt": payment.receipt_no,
        "balance": _money(payment.bill.balance),
        "org": org.display_name,
    }
    sent = [
        enqueue(
            organization=org, kind=SmsMessage.Kind.PAYMENT_RECEIPT, to=customer.mobile, context=ctx,
            dedupe_key=f"receipt:{payment.id}:customer", payment=payment,
        )
    ]
    if org.owner_alert_mode == Organization.OwnerAlertMode.PER_PAYMENT:
        for mobile in org.alert_mobiles():
            sent.append(
                enqueue(
                    organization=org, kind=SmsMessage.Kind.OWNER_PAYMENT_ALERT, to=mobile, context=ctx,
                    dedupe_key=f"receipt:{payment.id}:owner:{mobile}", payment=payment,
                )
            )
    return [m for m in sent if m]


def queue_due_reminders(today=None):
    """
    For each operator: unpaid bills due within the next N days get ONE reminder.
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
            .select_related("customer__plan")
        )
        for bill in bills:
            customer = bill.customer
            if not should_send_for(customer, org.internet_reminders_enabled):
                continue
            ctx = {
                "name": customer.name,
                "service": customer.plan.get_category_display(),
                "amount": _money(bill.balance),
                "period": bill.period.strftime("%b %Y"),
                "due_date": bill.due_date.strftime("%d-%m-%Y"),
                "org": org.display_name,
            }
            # One SMS per reminder stage: e.g. 3 days before, then 1 day before. The smallest stage that
            # applies wins, so a late run never sends two reminders on the same day.
            days_left = (bill.due_date - today).days
            stage = min(s for s in stages if days_left <= s)
            if enqueue(
                organization=org, kind=SmsMessage.Kind.DUE_REMINDER, to=customer.mobile, context=ctx,
                dedupe_key=f"due:{bill.id}:{stage}", bill=bill,
            ):
                created += 1
    return created


def queue_owner_daily_summaries(day=None):
    from billing.models import Payment

    day = day or timezone.localdate()
    created = 0
    orgs = Organization.objects.filter(
        status=Organization.Status.ACTIVE, owner_alert_mode=Organization.OwnerAlertMode.DAILY_SUMMARY
    )
    for org in orgs:
        payments = Payment.objects.filter(
            organization=org, status=Payment.Status.VALID, collected_at__date=day
        )
        agg = payments.aggregate(
            total=Sum("amount"),
            cash=Sum("amount", filter=Q(method=Payment.Method.CASH)),
            upi=Sum("amount", filter=Q(method=Payment.Method.UPI)),
        )
        count = payments.count()
        if not count:
            continue
        ctx = {
            "org": org.display_name,
            "date": day.strftime("%d-%m-%Y"),
            "total": _money(agg["total"] or 0),
            "count": count,
            "cash": _money(agg["cash"] or 0),
            "upi": _money(agg["upi"] or 0),
        }
        for mobile in org.alert_mobiles():
            if enqueue(
                organization=org, kind=SmsMessage.Kind.OWNER_DAILY_SUMMARY, to=mobile, context=ctx,
                dedupe_key=f"summary:{org.id}:{day.isoformat()}:{mobile}",
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
        result = gateway.send(msg.to_mobile, msg.body, msg.kind)
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
