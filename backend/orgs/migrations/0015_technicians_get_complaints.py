"""Technicians added from the Users page before 25 Nov got a menu without Complaints. Give it to them."""
from django.db import migrations


def add_module(apps, schema_editor):
    User = apps.get_model("accounts", "User")
    for user in User.objects.filter(role="technician").exclude(allowed_modules=None):
        modules = list(user.allowed_modules or [])
        if modules and "complaints" not in modules:
            user.allowed_modules = modules + ["complaints"]
            user.save(update_fields=["allowed_modules"])


class Migration(migrations.Migration):
    dependencies = [("orgs", "0014_add_complaints_module")]
    operations = [migrations.RunPython(add_module, migrations.RunPython.noop)]
