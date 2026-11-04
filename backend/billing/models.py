from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone

from core.models import OrgOwnedModel


class Bill(OrgOwnedModel):
    class Status(models.TextChoices):
        UNPAID = "unpaid", "Unpaid"
        PARTIAL = "partial", "Partially paid"
        PAID = "paid", "Paid"
        CANCELLED = "cancelled", "Cancelled"

    customer = models.ForeignKey("customers.Customer", on_delete=models.PROTECT, related_name="bills")
    period = models.DateField(help_text="First day of the billing month")
    amount_due = models.DecimalField(max_digits=10, decimal_places=2)
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    due_date = models.DateField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.UNPAID)

    class Meta:
        ordering = ["-period", "customer__name"]
        constraints = [models.UniqueConstraint(fields=["customer", "period"], name="uniq_bill_per_month")]
        indexes = [
            models.Index(fields=["organization", "period", "status"]),
            models.Index(fields=["organization", "due_date", "status"]),
        ]

    def __str__(self):
        return f"{self.customer} {self.period:%b %Y}"

    @property
    def balance(self):
        return max(self.amount_due - self.amount_paid, 0)

    def refresh_status(self):
        if self.status == self.Status.CANCELLED:
            return
        if self.amount_paid <= 0:
            self.status = self.Status.UNPAID
        elif self.amount_paid < self.amount_due:
            self.status = self.Status.PARTIAL
        else:
            self.status = self.Status.PAID


class Payment(OrgOwnedModel):
    class Method(models.TextChoices):
        CASH = "cash", "Cash"
        UPI = "upi", "UPI"
        CARD = "card", "Card"
        OTHER = "other", "Other"

    class Status(models.TextChoices):
        VALID = "valid", "Valid"
        CANCELLED = "cancelled", "Cancelled"

    bill = models.ForeignKey(Bill, on_delete=models.PROTECT, related_name="payments")
    customer = models.ForeignKey("customers.Customer", on_delete=models.PROTECT, related_name="payments")
    amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(1)])
    method = models.CharField(max_length=10, choices=Method.choices, default=Method.CASH)
    collected_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="payments_collected"
    )
    # Server time — the client cannot back-date a collection.
    collected_at = models.DateTimeField(default=timezone.now)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    location_accuracy_m = models.FloatField(null=True, blank=True)
    receipt_no = models.CharField(max_length=40)
    note = models.CharField(max_length=200, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.VALID)
    cancelled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.PROTECT, related_name="+"
    )
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancel_reason = models.CharField(max_length=200, blank=True)

    class Meta:
        ordering = ["-collected_at"]
        constraints = [models.UniqueConstraint(fields=["organization", "receipt_no"], name="uniq_receipt_per_org")]
        indexes = [
            models.Index(fields=["organization", "-collected_at"]),
            models.Index(fields=["organization", "collected_by", "-collected_at"]),
        ]

    def __str__(self):
        return f"{self.receipt_no} Rs.{self.amount}"


class ReceiptCounter(models.Model):
    """
    Kept in its own table on purpose: saving operator settings can never
    overwrite the counter and cause duplicate receipt numbers.
    """

    organization = models.OneToOneField("orgs.Organization", on_delete=models.CASCADE, primary_key=True)
    last_number = models.PositiveIntegerField(default=0)
