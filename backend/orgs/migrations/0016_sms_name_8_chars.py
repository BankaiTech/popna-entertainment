"""SMS name now max 8 characters. Longer names already saved become the best short suggestion."""
from django.db import migrations, models


def shorten(apps, schema_editor):
    from orgs.smsname import MAX_SMS_NAME, clean, suggestions

    Organization = apps.get_model("orgs", "Organization")
    for org in Organization.objects.exclude(sms_display_name=""):
        current = clean(org.sms_display_name)
        if len(current) <= MAX_SMS_NAME:
            continue
        options = suggestions(current) or suggestions(org.name)
        org.sms_display_name = options[0] if options else current[:MAX_SMS_NAME]
        org.save(update_fields=["sms_display_name"])


class Migration(migrations.Migration):
    dependencies = [("orgs", "0015_technicians_get_complaints")]
    operations = [
        migrations.RunPython(shorten, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="organization", name="sms_display_name",
            field=models.CharField(blank=True, help_text="Name at the end of every customer SMS, max 8 characters",
                                   max_length=8),
        ),
    ]
