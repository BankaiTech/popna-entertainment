"""Existing operators, and technicians with a custom menu, get the new Complaints page."""
from django.db import migrations

TENANT_ROLES = ("technician",)  # agents collect money; the owner can tick Complaints for them


def add_module(apps, schema_editor):
    Organization = apps.get_model("orgs", "Organization")
    User = apps.get_model("accounts", "User")
    for org in Organization.objects.all():
        modules = list(org.allowed_modules or [])
        if modules and "complaints" not in modules:
            org.allowed_modules = modules + ["complaints"]
            org.save(update_fields=["allowed_modules"])
    for user in User.objects.filter(role__in=TENANT_ROLES).exclude(allowed_modules=None):
        modules = list(user.allowed_modules or [])
        if modules and "complaints" not in modules:
            user.allowed_modules = modules + ["complaints"]
            user.save(update_fields=["allowed_modules"])


class Migration(migrations.Migration):
    dependencies = [("orgs", "0013_contact_phone_from_owner_mobile"), ("accounts", "0003_app_language")]
    operations = [migrations.RunPython(add_module, migrations.RunPython.noop)]
