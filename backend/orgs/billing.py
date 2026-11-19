"""
LCO Desk's own billing of operators: free SMS per month, paid SMS credits, monthly fee, UPI payments.

SMS rule: every operator gets `sms_free_per_month` free SMS each calendar month (Indian date).
After that each SMS uses one paid credit. With no free SMS and no credits left, the SMS is not sent
and is marked failed with NO_BALANCE_ERROR; the owner can retry it from the SMS Log after buying SMS.
"""
from datetime import datetime, time
from decimal import ROUND_HALF_UP, Decimal

from django.conf import settings
from django.db import transaction
from django.db.models import F
from django.utils import timezone

from . import cashfree
from .models import Organization, PlatformPayment

NO_BALANCE_ERROR = "No SMS balance: this month's free SMS are used up. Buy SMS in Settings > Plan & SMS, then retry."
UPI_APPS = ("gpay", "phonepe", "paytm", "bhim")


def month_start(today=None):
    today = today or timezone.localdate()
    first = today.replace(day=1)
    return timezone.make_aware(datetime.combine(first, time.min))


def free_used_this_month(org_id):
    from notifications.models import SmsMessage

    return SmsMessage.objects.filter(
        organization_id=org_id, status=SmsMessage.Status.SENT, billed_as="free", sent_at__gte=month_start()
    ).count()


def reserve_sms(org_id):
    """Pick how the next SMS is paid: 'free', 'credit', or None (no balance). Credits are taken atomically."""
    free_limit = Organization.objects.filter(pk=org_id).values_list("sms_free_per_month", flat=True).first() or 0
    if free_used_this_month(org_id) < free_limit:
        return "free"
    if Organization.objects.filter(pk=org_id, sms_credits__gt=0).update(sms_credits=F("sms_credits") - 1):
        return "credit"
    return None


def release_sms(org_id, charge):
    """The SMS was not sent after all: give a reserved credit back. (Free SMS are only counted once sent.)"""
    if charge == "credit":
        Organization.objects.filter(pk=org_id).update(sms_credits=F("sms_credits") + 1)


def money(value):
    return Decimal(value).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def sms_usage(org):
    from notifications.models import SmsMessage

    sent = SmsMessage.objects.filter(organization=org, status=SmsMessage.Status.SENT, sent_at__gte=month_start())
    return {
        "free_limit": org.sms_free_per_month,
        "free_used": sent.filter(billed_as="free").count(),
        "credits_used": sent.filter(billed_as="credit").count(),
        "credits_left": org.sms_credits,
        "blocked": SmsMessage.objects.filter(
            organization=org, status=SmsMessage.Status.FAILED, last_error=NO_BALANCE_ERROR,
            created_at__gte=month_start(),
        ).count(),
        "rate": str(money(org.sms_rate)),
    }


def sms_estimate(org):
    """
    How many SMS this operator needs in a month, from today's customers and settings
    (same rules as notifications.services.should_send_for):
      payment receipt: 1 per customer per month (cable always; internet if switched on and the customer allows SMS)
      due reminders:   1 or 2 per customer per month (number of reminder stages)
    Only active customers with a mobile number get SMS.
    """
    from customers.models import Customer, ServiceCategory

    base = Customer.objects.filter(organization=org, status=Customer.Status.ACTIVE).exclude(mobile="")
    cable = base.filter(plan__category=ServiceCategory.CABLE).count()
    # Internet SMS are switched off for now (settings.SMS_INTERNET_ENABLED): they don't count.
    internet_on = settings.SMS_INTERNET_ENABLED
    internet = base.exclude(plan__category=ServiceCategory.CABLE).filter(sms_opt_in=True).count() if internet_on else 0
    stages = 1 + (1 if org.second_reminder_days_before is not None else 0)

    receipts = cable + (internet if org.internet_payment_sms_enabled else 0)
    reminders = (cable + (internet if org.internet_reminders_enabled else 0)) * stages
    total = receipts + reminders
    extra = max(0, total - org.sms_free_per_month)
    return {
        "cable_customers": cable,
        "internet_customers": internet,
        "internet_sms_available": internet_on,
        "internet_receipts_on": internet_on and org.internet_payment_sms_enabled,
        "internet_reminders_on": internet_on and org.internet_reminders_enabled,
        "reminder_stages": stages,
        "receipts": receipts,
        "reminders": reminders,
        "total": total,
        "free": org.sms_free_per_month,
        "extra": extra,
        "extra_cost": str(money(extra * org.sms_rate)),
    }


def payment_info(org):
    note_id = f"org_{org.id}"
    return {
        "payee_name": settings.PLATFORM_UPI_PAYEE_NAME,
        "upi_ids": dict(settings.PLATFORM_UPI_IDS),
        "sms_note": f"Sms payment {note_id}",
        "renewal_note": f"Renewal Payment {note_id}",
        # Cashfree "Pay online" button: shown only when the keys are set on the server.
        "online": cashfree.enabled(org),
        "online_mode": "production" if settings.CASHFREE_ENV == "production" else "sandbox",
    }


@transaction.atomic
def approve_payment(payment, by):
    from .serializers import add_months

    payment = PlatformPayment.objects.select_for_update().get(pk=payment.pk)
    if payment.status not in (PlatformPayment.Status.PENDING, PlatformPayment.Status.CREATED):
        return payment
    org = Organization.objects.select_for_update().get(pk=payment.organization_id)
    if payment.kind == PlatformPayment.Kind.SMS:
        org.sms_credits = F("sms_credits") + payment.quantity
        org.save(update_fields=["sms_credits"])
    else:
        today = timezone.localdate()
        base = org.subscription_end if org.subscription_end and org.subscription_end >= today else today
        org.subscription_end = add_months(base, payment.quantity)
        if not org.subscription_start:
            org.subscription_start = today
        org.save(update_fields=["subscription_end", "subscription_start"])
    payment.status = PlatformPayment.Status.APPROVED
    payment.decided_by = by
    payment.decided_at = timezone.now()
    payment.save(update_fields=["status", "decided_by", "decided_at", "updated_at"])
    return payment
