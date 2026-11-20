from django.db import migrations
from django.db.models import F


def copy_owner_mobile(apps, schema_editor):
    """Operators added by the app owner: the owner mobile typed there becomes Business Profile > Phone."""
    Organization = apps.get_model("orgs", "Organization")
    Organization.objects.filter(contact_phone="").exclude(owner_mobile="").update(contact_phone=F("owner_mobile"))


class Migration(migrations.Migration):
    dependencies = [("orgs", "0012_app_language")]
    operations = [migrations.RunPython(copy_owner_mobile, migrations.RunPython.noop)]
