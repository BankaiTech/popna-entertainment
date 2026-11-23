from django.db import migrations


class Migration(migrations.Migration):
    """
    Kept empty on purpose. An earlier draft marked ₹0 bills (free connections) paid automatically;
    the operator wants to mark them paid by hand each month, so nothing changes here.
    """

    dependencies = [("billing", "0002_collection_rules")]
    operations = []
