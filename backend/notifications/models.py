from django.db import models
from django.utils import timezone

from core.models import OrgOwnedModel


class SmsMessage(OrgOwnedModel):
    """Outbox: every SMS is saved first, then sent by the scheduler (with retries)."""

    class Kind(models.TextChoices):
        PAYMENT_RECEIPT = "payment_receipt", "Payment receipt (customer)"
        OWNER_PAYMENT_ALERT = "owner_payment_alert", "Payment alert (owner)"
        DUE_REMINDER = "due_reminder", "Due reminder (customer)"
        OWNER_DAILY_SUMMARY = "owner_daily_summary", "Daily summary (owner)"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        SENDING = "sending", "Sending"
        SENT = "sent", "Sent"
        FAILED = "failed", "Failed"

    kind = models.CharField(max_length=30, choices=Kind.choices)
    to_mobile = models.CharField(max_length=15)
    body = models.TextField()
    dedupe_key = models.CharField(max_length=150, unique=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    attempts = models.PositiveSmallIntegerField(default=0)
    next_attempt_at = models.DateTimeField(default=timezone.now)
    claimed_at = models.DateTimeField(null=True, blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    provider_ref = models.CharField(max_length=100, blank=True)
    last_error = models.TextField(blank=True)
    payment = models.ForeignKey("billing.Payment", null=True, blank=True, on_delete=models.SET_NULL)
    bill = models.ForeignKey("billing.Bill", null=True, blank=True, on_delete=models.SET_NULL)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "next_attempt_at"]),
            models.Index(fields=["organization", "-created_at"]),
        ]

    def __str__(self):
        return f"{self.kind} -> {self.to_mobile} [{self.status}]"
