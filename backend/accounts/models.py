from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
from django.db import models

from core.permissions import Roles
from core.validators import APP_LANGUAGES, normalize_mobile, validate_indian_mobile


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
    # Field staff only: menu modules the owner gave this person. Empty (null) = role defaults.
    allowed_modules = models.JSONField(null=True, blank=True)
    # App language this person sees after login. Empty = the operator's language.
    language = models.CharField(max_length=5, blank=True, choices=APP_LANGUAGES)

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
        # A Django superuser is a server-admin account only (see accounts/authentication.py); it is no longer
        # turned into an LCO Desk platform admin. App platform admins: `manage.py create_platform_admin`.
        super().save(*args, **kwargs)

    @property
    def is_server_admin(self):
        """Django admin account (is_staff / is_superuser). It cannot sign in to the LCO Desk app."""
        return bool(self.is_staff or self.is_superuser)

    @property
    def display_name(self):
        return self.name or self.get_full_name() or self.username
