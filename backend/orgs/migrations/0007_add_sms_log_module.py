"""Existing operators get the new SMS Log page."""
from django.db import migrations


def add_module(apps, schema_editor):
    Organization = apps.get_model("orgs", "Organization")
    for org in Organization.objects.all():
        modules = list(org.allowed_modules or [])
        if "settings" in modules and "sms-log" not in modules:
            org.allowed_modules = modules + ["sms-log"]
            org.save(update_fields=["allowed_modules"])


class Migration(migrations.Migration):
    dependencies = [("orgs", "0006_organization_sms_language")]
    operations = [migrations.RunPython(add_module, migrations.RunPython.noop)]
