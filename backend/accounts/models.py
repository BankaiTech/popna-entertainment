from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
from django.db import models

from core.permissions import Roles
from core.validators import normalize_mobile, validate_indian_mobile


class User(AbstractUser):
    class Role(models.TextChoices):
        PLATFORM_ADMIN = Roles.PLATFORM_ADMIN, "Platform admin"
        DISTRIBUTOR = Roles.DISTRIBUTOR, "Distributor"
        OWNER = Roles.OWNER, "Operator owner"
        MANAGER = Roles.MANAGER, "Manager"
        AGENT = Roles.AGENT, "Collection agent"
        TECHNICIAN = Roles.TECHNICIAN, "Technician"

    name = models.CharField(max_length=150, blank=True)
    mobile = models.CharField(max_length=15, blank=True, validators=[validate_indian_mobile])
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.AGENT)
    organization = models.ForeignKey(
        "orgs.Organization", null=True, blank=True, on_delete=models.PROTECT, related_name="users"
    )
    distributor = models.ForeignKey(
        "orgs.Distributor", null=True, blank=True, on_delete=models.PROTECT, related_name="users"
    )

    def clean(self):
        super().clean()
        if self.role in Roles.TENANT and not self.organization_id:
            raise ValidationError({"organization": "Operator staff must belong to an organization."})
        if self.role == Roles.DISTRIBUTOR and not self.distributor_id:
            raise ValidationError({"distributor": "Distributor users must be linked to a distributor."})
        if self.role in (Roles.PLATFORM_ADMIN, Roles.DISTRIBUTOR) and self.organization_id:
            raise ValidationError({"organization": "Platform/distributor users cannot belong to an operator."})

    def save(self, *args, **kwargs):
        self.mobile = normalize_mobile(self.mobile)
        if self.is_superuser and not self.organization_id and not self.distributor_id:
            self.role = Roles.PLATFORM_ADMIN
        super().save(*args, **kwargs)

    @property
    def display_name(self):
        return self.name or self.get_full_name() or self.username
