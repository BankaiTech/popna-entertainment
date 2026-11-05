"""Existing operators keep working after the upgrade: give them the new collection modules."""
from django.db import migrations

NEW_IF_PAYMENTS = ["collect", "duty", "live-map"]
NEW_IF_CONTACTS = ["cutoff"]


def add_modules(apps, schema_editor):
    Organization = apps.get_model("orgs", "Organization")
    for org in Organization.objects.all():
        modules = list(org.allowed_modules or [])
        extra = []
        if "payments" in modules:
            extra += NEW_IF_PAYMENTS
        if "contacts" in modules:
            extra += NEW_IF_CONTACTS
        merged = modules + [m for m in extra if m not in modules]
        if merged != modules:
            org.allowed_modules = merged
            org.save(update_fields=["allowed_modules"])


class Migration(migrations.Migration):
    dependencies = [("orgs", "0003_collection_rules")]
    operations = [migrations.RunPython(add_modules, migrations.RunPython.noop)]
