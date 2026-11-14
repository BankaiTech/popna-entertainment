"""SMS now go only to customers: drop queued owner alerts/summaries, link old rows to their customer."""
from django.db import migrations

OWNER_KINDS = ["owner_payment_alert", "owner_daily_summary"]


def forwards(apps, schema_editor):
    SmsMessage = apps.get_model("notifications", "SmsMessage")
    SmsMessage.objects.filter(kind__in=OWNER_KINDS, status__in=["pending", "sending"]).delete()
    for msg in SmsMessage.objects.filter(customer__isnull=True).exclude(kind__in=OWNER_KINDS).select_related(
        "payment__customer", "bill__customer"
    ):
        customer = (msg.payment.customer if msg.payment_id else None) or (msg.bill.customer if msg.bill_id else None)
        if customer:
            msg.customer = customer
            msg.recipient_name = customer.name
            msg.save(update_fields=["customer", "recipient_name"])


class Migration(migrations.Migration):
    dependencies = [
        ("notifications", "0002_smsmessage_customer_smsmessage_language_and_more"),
        ("billing", "0001_initial"),
    ]
    operations = [migrations.RunPython(forwards, migrations.RunPython.noop)]
