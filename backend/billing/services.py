import calendar
from datetime import date, timedelta
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


def current_bill(customer, today=None):
    """
    The bill a collection goes against.
    Cable:    this month's bill (due on the provider's fixed cut-off day).
    Internet: the open renewal bill, or a new one starting at expiry (or today if already expired).
    """
    today = today or timezone.localdate()
    if customer.is_cable:
        return get_or_create_bill(customer, month_start(today))
    open_bill = (
        Bill.objects.filter(customer=customer, status__in=[Bill.Status.UNPAID, Bill.Status.PARTIAL])
        .order_by("-period").first()
    )
    if open_bill:
        return open_bill
    start = customer.valid_until if customer.valid_until and customer.valid_until >= today else today
    bill, _ = Bill.objects.get_or_create(
        customer=customer, period=start,
        defaults={"organization_id": customer.organization_id, "amount_due": customer.monthly_amount(),
                  "due_date": start},
    )
    return bill


def generate_internet_renewals(today=None, organization=None):
    """Daily: create the renewal bill for internet customers whose plan expires soon. Safe to rerun."""
    today = today or timezone.localdate()
    customers = Customer.objects.filter(
        status=Customer.Status.ACTIVE, plan__category="internet", valid_until__isnull=False,
        organization__status=Organization.Status.ACTIVE,
    ).select_related("plan", "organization")
    if organization is not None:
        customers = customers.filter(organization=organization)
    created = 0
    for c in customers:
        window = max(c.organization.reminder_days_before, c.organization.second_reminder_days_before or 0)
        if (c.valid_until - today).days > window:
            continue
        if Bill.objects.filter(customer=c, status__in=[Bill.Status.UNPAID, Bill.Status.PARTIAL]).exists():
            continue
        _, made = Bill.objects.get_or_create(
            customer=c, period=c.valid_until,
            defaults={"organization_id": c.organization_id, "amount_due": c.monthly_amount(),
                      "due_date": c.valid_until},
        )
        created += int(made)
    return created


def generate_bills(period, organization=None):
    """Monthly cable bills (internet renews on its own dates). Safe to run many times."""
    customers = Customer.objects.filter(
        status=Customer.Status.ACTIVE, plan__category="cable"
    ).select_related("plan", "organization")
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
                   accuracy=None, note="", discount=0):
    from notifications.services import queue_payment_sms
    from tracking.models import DutySession, LocationPing

    org = customer.organization
    amount = Decimal(amount)
    discount = Decimal(discount or 0)
    if discount and user.role not in ("owner", "manager"):
        raise ValidationError({"discount": "Only the owner or manager can give a discount."})
    if amount < 0 or discount < 0 or amount + discount <= 0:
        raise ValidationError({"amount": "Enter an amount to collect."})
    is_field_staff = user.role in ("agent", "technician")

    if is_field_staff and org.require_gps_for_collection and (latitude is None or longitude is None):
        raise ValidationError({"location": "Location is required to record a collection. Turn on GPS."})

    session = None
    if is_field_staff and org.tracking_enabled:
        session = DutySession.objects.filter(user=user, ended_at__isnull=True).first()
        if org.require_checkin_for_collection and session is None:
            raise ValidationError({"duty": "Check in for duty before collecting payments."})

    if bill is None:
        bill = current_bill(customer)
    bill = Bill.objects.select_for_update().get(pk=bill.pk)
    was_paid = bill.status == Bill.Status.PAID
    if bill.customer_id != customer.id:
        raise ValidationError({"bill_id": "This bill belongs to a different customer."})
    if bill.status == Bill.Status.CANCELLED:
        raise ValidationError({"bill_id": "This bill is cancelled."})
    if amount + discount > bill.balance:
        raise ValidationError({"amount": f"Amount is more than the balance (Rs.{bill.balance})."})

    payment = Payment.objects.create(
        organization=org,
        bill=bill,
        customer=customer,
        amount=amount,
        discount=discount,
        method=method,
        collected_by=user,
        latitude=latitude,
        longitude=longitude,
        location_accuracy_m=accuracy,
        receipt_no=_next_receipt_no(org),
        note=note,
    )
    bill.amount_paid += amount
    bill.discount += discount
    bill.refresh_status()
    fields = ["amount_paid", "discount", "status", "updated_at"]
    if not was_paid and bill.status == Bill.Status.PAID and not customer.is_cable:
        # Internet: renew validity — from the old expiry if paid in advance, else from today.
        today = timezone.localdate()
        bill.previous_valid_until = customer.valid_until
        start = max(bill.period, today)
        customer.valid_until = start + timedelta(days=customer.validity_days())
        customer.save(update_fields=["valid_until", "updated_at"])
        fields.append("previous_valid_until")
    bill.save(update_fields=fields)

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
    was_paid = bill.status == Bill.Status.PAID
    bill.amount_paid -= payment.amount
    bill.discount -= payment.discount
    bill.refresh_status()
    bill.save(update_fields=["amount_paid", "discount", "status", "updated_at"])
    customer = payment.customer
    if was_paid and bill.status != Bill.Status.PAID and not customer.is_cable:
        customer.valid_until = bill.previous_valid_until  # undo the renewal
        customer.save(update_fields=["valid_until", "updated_at"])
    payment.status = Payment.Status.CANCELLED
    payment.cancelled_by = user
    payment.cancelled_at = timezone.now()
    payment.cancel_reason = reason
    payment.save(update_fields=["status", "cancelled_by", "cancelled_at", "cancel_reason", "updated_at"])
    audit(user, "payment_cancelled", payment, receipt=payment.receipt_no, reason=reason)
    return payment
