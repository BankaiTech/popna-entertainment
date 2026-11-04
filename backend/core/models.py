from django.conf import settings
from django.db import models


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class OrgOwnedModel(TimeStampedModel):
    """Every tenant table carries its organization. Views filter on it — never trust the client."""

    organization = models.ForeignKey("orgs.Organization", on_delete=models.PROTECT, related_name="+")

    class Meta:
        abstract = True


class AuditLog(models.Model):
    organization = models.ForeignKey("orgs.Organization", null=True, blank=True, on_delete=models.SET_NULL)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    action = models.CharField(max_length=50)
    entity = models.CharField(max_length=50)
    entity_id = models.CharField(max_length=50, blank=True)
    details = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["organization", "-created_at"])]

    def __str__(self):
        return f"{self.action} {self.entity}#{self.entity_id}"


class JobRun(models.Model):
    """Makes daily scheduled jobs idempotent: one row per (job, day)."""

    name = models.CharField(max_length=50)
    run_date = models.DateField()
    started_at = models.DateTimeField(auto_now_add=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    result = models.JSONField(default=dict, blank=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["name", "run_date"], name="uniq_job_per_day")]

    def __str__(self):
        return f"{self.name} {self.run_date}"
