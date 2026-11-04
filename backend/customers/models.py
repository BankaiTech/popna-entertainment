from decimal import ROUND_HALF_UP, Decimal

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from core.models import OrgOwnedModel
from core.validators import normalize_mobile, validate_indian_mobile

TWO_PLACES = Decimal("0.01")


class ServiceCategory(models.TextChoices):
    CABLE = "cable", "Cable TV"
    INTERNET = "internet", "Internet"


class Area(OrgOwnedModel):
    name = models.CharField(max_length=100)

    class Meta:
        ordering = ["name"]
        constraints = [models.UniqueConstraint(fields=["organization", "name"], name="uniq_area_per_org")]

    def __str__(self):
        return self.name


class Plan(OrgOwnedModel):
    provider = models.CharField(max_length=50, help_text="GTPL, RailWire, BSNL, Krishiinet...")
    name = models.CharField(max_length=100)
    category = models.CharField(max_length=20, choices=ServiceCategory.choices)
    price = models.DecimalField(max_digits=10, decimal_places=2, help_text="Monthly price before GST")
    gst_rate = models.DecimalField(
        max_digits=5, decimal_places=2, default=0, validators=[MinValueValidator(0), MaxValueValidator(28)]
    )
    installation_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["provider", "name"]
        constraints = [
            models.UniqueConstraint(fields=["organization", "provider", "name"], name="uniq_plan_per_org")
        ]

    def __str__(self):
        return f"{self.provider} - {self.name}"

    @property
    def final_price(self):
        return (self.price * (Decimal(100) + self.gst_rate) / Decimal(100)).quantize(TWO_PLACES, ROUND_HALF_UP)


class Customer(OrgOwnedModel):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        INACTIVE = "inactive", "Inactive"

    customer_code = models.CharField(max_length=30, blank=True, help_text="Operator's own ID / CAN / CAF")
    name = models.CharField(max_length=150)
    mobile = models.CharField(max_length=15, validators=[validate_indian_mobile])
    email = models.EmailField(blank=True)
    plan = models.ForeignKey(Plan, on_delete=models.PROTECT, related_name="customers")
    area = models.ForeignKey(Area, null=True, blank=True, on_delete=models.SET_NULL, related_name="customers")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    due_day = models.PositiveSmallIntegerField(
        null=True, blank=True, validators=[MinValueValidator(1), MaxValueValidator(28)],
        help_text="Day of month the bill is due. Empty = operator default.",
    )
    permanent_discount = models.DecimalField(
        max_digits=5, decimal_places=2, default=0, validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    sms_opt_in = models.BooleanField(default=True, help_text="Internet only. Cable SMS are always sent.")
    box_number = models.CharField(max_length=50, blank=True)
    stb_number = models.CharField(max_length=50, blank=True)
    can_caf_id = models.CharField(max_length=50, blank=True)
    address_line1 = models.CharField(max_length=200, blank=True)
    address_line2 = models.CharField(max_length=200, blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True, default="Tamil Nadu")
    pincode = models.CharField(max_length=10, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["name"]
        indexes = [
            models.Index(fields=["organization", "status"]),
            models.Index(fields=["organization", "mobile"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.mobile})"

    def save(self, *args, **kwargs):
        self.mobile = normalize_mobile(self.mobile)
        super().save(*args, **kwargs)

    @property
    def category(self):
        return self.plan.category

    @property
    def is_cable(self):
        return self.plan.category == ServiceCategory.CABLE

    def effective_due_day(self):
        return self.due_day or self.organization.default_due_day

    def monthly_amount(self):
        amount = self.plan.final_price * (Decimal(100) - self.permanent_discount) / Decimal(100)
        return amount.quantize(TWO_PLACES, ROUND_HALF_UP)
