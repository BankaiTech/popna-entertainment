from django.conf import settings
from django.db import models
from django.db.models import Q
from django.utils import timezone

from core.models import OrgOwnedModel


class DutySession(OrgOwnedModel):
    """Working hours. Location is only collected between check-in and check-out."""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="duty_sessions")
    started_at = models.DateTimeField(default=timezone.now)
    ended_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-started_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["user"], condition=Q(ended_at__isnull=True), name="one_open_duty_per_user"
            )
        ]

    def __str__(self):
        return f"{self.user} {self.started_at:%d-%m %H:%M}"


class LocationPing(OrgOwnedModel):
    class Source(models.TextChoices):
        PING = "ping", "Periodic ping"
        CHECK_IN = "check_in", "Check-in"
        CHECK_OUT = "check_out", "Check-out"
        PAYMENT = "payment", "Payment collected"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="location_pings")
    session = models.ForeignKey(DutySession, on_delete=models.CASCADE, related_name="pings")
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    accuracy_m = models.FloatField(null=True, blank=True)
    source = models.CharField(max_length=20, choices=Source.choices, default=Source.PING)
    recorded_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["recorded_at"]
        indexes = [models.Index(fields=["organization", "user", "-recorded_at"])]
