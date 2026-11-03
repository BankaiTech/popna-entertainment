import calendar
from datetime import date
from decimal import Decimal

from django.db import IntegrityError, transaction
from django.db.models import F
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from core.audit import audit
from customers.models import Customer
from orgs.models import Organization

from .models import Bill, Payment, ReceiptCounter


def month_start(d):
    return date(d.year, d.month, 1)


def parse_period(value):
    """'2026-11' -> date(2026, 11, 1)"""
    try:
        year, month = (int(x) for x in value.split("-")[:2])
        return date(year, month, 1)
    except (ValueError, AttributeError):
        raise ValidationError({"period": "Use YYYY-MM, e.g. 2026-11."})


def due_date_for(customer, period):
    last_day = calendar.monthrange(period.year, period.month)[1]
    return date(period.year, period.month, min(customer.effective_due_day(), last_day))


def get_or_create_bill(customer, period):
    bill, _ = Bill.objects.get_or_create(
        customer=customer,
        period=period,
        defaults={
            "organization_id": customer.organization_id,
            "amount_due": customer.monthly_amount(),
            "due_date": due_date_for(customer, period),
        },
    )
    return bill


def generate_bills(period, organization=None):
    """Create this month's bill for every active customer. Safe to run many times."""
    customers = Customer.objects.filter(status=Customer.Status.ACTIVE).select_related("plan", "organization")
    if organization is not None:
        customers = customers.filter(organization=organization)
    customers = customers.filter(organization__status=Organization.Status.ACTIVE)
    existing = set(Bill.objects.filter(period=period).values_list("customer_id", flat=True))
    new_bills = [
        Bill(
            organization_id=c.organization_id,
            customer=c,
            period=period,
            amount_due=c.monthly_amount(),
            due_date=due_date_for(c, period),
        )
        for c in customers
        if c.id not in existing
    ]
    Bill.objects.bulk_create(new_bills, ignore_conflicts=True)
    return len(new_bills)


def _next_receipt_no(org):
    # Row lock so two agents saving at the same moment never get the same receipt number.
    try:
        with transaction.atomic():
            ReceiptCounter.objects.get_or_create(organization=org)
    except IntegrityError:
        pass  # created by a parallel request
    counter = ReceiptCounter.objects.select_for_update().get(organization=org)
    ReceiptCounter.objects.filter(pk=counter.pk).update(last_number=F("last_number") + 1)
    return f"{org.code}-{counter.last_number + 1:06d}"


@transaction.atomic
def record_payment(*, user, customer, amount, method, bill=None, latitude=None, longitude=None,
                   accuracy=None, note=""):
    from notifications.services import queue_payment_sms
    from tracking.models import DutySession, LocationPing

    org = customer.organization
    amount = Decimal(amount)
    is_field_staff = user.role in ("agent", "technician")

    if is_field_staff and org.require_gps_for_collection and (latitude is None or longitude is None):
        raise ValidationError({"location": "Location is required to record a collection. Turn on GPS."})

    session = None
    if is_field_staff and org.tracking_enabled:
        session = DutySession.objects.filter(user=user, ended_at__isnull=True).first()
        if org.require_checkin_for_collection and session is None:
            raise ValidationError({"duty": "Check in for duty before collecting payments."})

    if bill is None:
        bill = get_or_create_bill(customer, month_start(timezone.localdate()))
    bill = Bill.objects.select_for_update().get(pk=bill.pk)
    if bill.customer_id != customer.id:
        raise ValidationError({"bill_id": "This bill belongs to a different customer."})
    if bill.status == Bill.Status.CANCELLED:
        raise ValidationError({"bill_id": "This bill is cancelled."})
    if amount > bill.balance:
        raise ValidationError({"amount": f"Amount is more than the balance (Rs.{bill.balance})."})

    payment = Payment.objects.create(
        organization=org,
        bill=bill,
        customer=customer,
        amount=amount,
        method=method,
        collected_by=user,
        latitude=latitude,
        longitude=longitude,
        location_accuracy_m=accuracy,
        receipt_no=_next_receipt_no(org),
        note=note,
    )
    bill.amount_paid += amount
    bill.refresh_status()
    bill.save(update_fields=["amount_paid", "status", "updated_at"])

    if latitude is not None and longitude is not None and session is not None:
        LocationPing.objects.create(
            organization=org, user=user, session=session, latitude=latitude, longitude=longitude,
            accuracy_m=accuracy, source=LocationPing.Source.PAYMENT,
        )

    # Outbox pattern: SMS rows are written in the SAME transaction, then sent by the scheduler.
    queue_payment_sms(payment)
    audit(user, "payment_recorded", payment, receipt=payment.receipt_no, amount=amount, method=method)
    return payment


@transaction.atomic
def cancel_payment(*, user, payment, reason):
    payment = Payment.objects.select_for_update().get(pk=payment.pk)
    if payment.status == Payment.Status.CANCELLED:
        raise ValidationError({"detail": "Payment is already cancelled."})
    bill = Bill.objects.select_for_update().get(pk=payment.bill_id)
    bill.amount_paid -= payment.amount
    bill.refresh_status()
    bill.save(update_fields=["amount_paid", "status", "updated_at"])
    payment.status = Payment.Status.CANCELLED
    payment.cancelled_by = user
    payment.cancelled_at = timezone.now()
    payment.cancel_reason = reason
    payment.save(update_fields=["status", "cancelled_by", "cancelled_at", "cancel_reason", "updated_at"])
    audit(user, "payment_cancelled", payment, receipt=payment.receipt_no, reason=reason)
    return payment
