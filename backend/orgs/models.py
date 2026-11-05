from datetime import date

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone

from core.models import TimeStampedModel
from core.validators import normalize_mobile, validate_indian_mobile

# Module keys understood by the React app (ALL_MODULES in src/models/types.ts).
DEFAULT_MODULES = [
    "dashboard", "contacts", "collect", "duty", "live-map", "cutoff", "connection-requests", "complaints",
    "payments", "invoices", "purchase-invoices", "inventory-products", "products", "users", "settings", "reports",
]
DEFAULT_SETTINGS_TABS = ["company", "products", "billing", "sms-templates"]


def default_modules():
    return list(DEFAULT_MODULES)


def default_settings_tabs():
    return list(DEFAULT_SETTINGS_TABS)


class Distributor(TimeStampedModel):
    """Optional level above operators (e.g. one person managing several LCOs)."""

    name = models.CharField(max_length=150)
    mobile = models.CharField(max_length=15, blank=True, validators=[validate_indian_mobile])
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Organization(TimeStampedModel):
    """One cable / broadband operator (a tenant)."""

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        DISABLED = "disabled", "Disabled (waiting for platform approval)"
        SUSPENDED = "suspended", "Suspended"

    class OwnerAlertMode(models.TextChoices):
        PER_PAYMENT = "per_payment", "SMS for every payment"
        DAILY_SUMMARY = "daily_summary", "One SMS summary per day"

    distributor = models.ForeignKey(
        Distributor, null=True, blank=True, on_delete=models.PROTECT, related_name="organizations"
    )
    name = models.CharField(max_length=150)
    code = models.SlugField(max_length=20, unique=True, help_text="Short code used in receipt numbers, e.g. CGP01")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    # Set only by the platform admin (app owner). The end date itself is still usable;
    # the subscription stops at midnight IST after it. Empty end date = no expiry.
    subscription_start = models.DateField(null=True, blank=True)
    subscription_end = models.DateField(null=True, blank=True)
    allowed_modules = models.JSONField(default=default_modules, blank=True)
    allowed_settings_tabs = models.JSONField(default=default_settings_tabs, blank=True)
    # Plan limits set by the platform admin. Empty = unlimited.
    max_providers = models.PositiveIntegerField(null=True, blank=True, help_text="Empty = unlimited")
    max_plans = models.PositiveIntegerField(null=True, blank=True, help_text="Empty = unlimited")

    owner_mobile = models.CharField(max_length=15, blank=True, validators=[validate_indian_mobile])
    extra_alert_mobiles = models.CharField(
        max_length=200, blank=True, help_text="Comma-separated mobiles that also get owner alerts"
    )
    sms_display_name = models.CharField(max_length=30, blank=True, help_text="Name shown at the end of SMS")

    # Billing & reminders
    default_due_day = models.PositiveSmallIntegerField(
        default=10, validators=[MinValueValidator(1), MaxValueValidator(28)]
    )
    reminder_days_before = models.PositiveSmallIntegerField(
        default=3, validators=[MinValueValidator(0), MaxValueValidator(15)]
    )
    second_reminder_days_before = models.PositiveSmallIntegerField(
        null=True, blank=True, validators=[MinValueValidator(0), MaxValueValidator(15)],
        help_text="Optional second reminder, e.g. 1 day before or 0 = on the due date",
    )
    # Cable reminders and cable payment SMS are ALWAYS on (operator requirement). Internet is optional.
    internet_reminders_enabled = models.BooleanField(default=False)
    internet_payment_sms_enabled = models.BooleanField(default=False)
    owner_alert_mode = models.CharField(
        max_length=20, choices=OwnerAlertMode.choices, default=OwnerAlertMode.PER_PAYMENT
    )

    # Field staff rules
    tracking_enabled = models.BooleanField(default=True)
    require_gps_for_collection = models.BooleanField(default=True)
    require_checkin_for_collection = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.code})"

    def save(self, *args, **kwargs):
        self.owner_mobile = normalize_mobile(self.owner_mobile)
        self.code = (self.code or "").upper()
        super().save(*args, **kwargs)

    def subscription_state(self, today=None):
        """'active' | 'expired' | 'not_started'. Uses the Indian date, not the server's UTC date."""
        today = today or timezone.localdate()
        if self.subscription_start and today < self.subscription_start:
            return "not_started"
        if self.subscription_end and today > self.subscription_end:
            return "expired"
        return "active"

    def days_left(self, today=None):
        if not self.subscription_end:
            return None
        today = today or timezone.localdate()
        return (self.subscription_end - today).days

    @property
    def display_name(self):
        return (self.sms_display_name or self.name)[:30]

    def alert_mobiles(self):
        numbers = [self.owner_mobile] + [normalize_mobile(m) for m in self.extra_alert_mobiles.split(",")]
        seen, result = set(), []
        for n in numbers:
            if n and n not in seen:
                seen.add(n)
                result.append(n)
        return result
