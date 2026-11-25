from django.db import migrations, models


class Migration(migrations.Migration):
    """SMS name can now be up to 11 characters (was 8). Existing names stay as they are."""

    dependencies = [("orgs", "0017_payu_gateway")]
    operations = [
        migrations.AlterField(
            model_name="organization", name="sms_display_name",
            field=models.CharField(blank=True, help_text="Name at the end of every customer SMS, max 11 characters",
                                   max_length=11),
        ),
    ]
