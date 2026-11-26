from django.db import migrations, models


class Migration(migrations.Migration):
    """SMS name can now be up to 12 characters (was 11). Existing names stay as they are."""

    dependencies = [("orgs", "0018_sms_name_11_chars")]
    operations = [
        migrations.AlterField(
            model_name="organization", name="sms_display_name",
            field=models.CharField(blank=True, help_text="Name at the end of every customer SMS, max 12 characters",
                                   max_length=12),
        ),
    ]
