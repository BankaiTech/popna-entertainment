import logging
import secrets
import string

from django.apps import apps
from django.db import transaction
from django.db.models.deletion import ProtectedError

log = logging.getLogger(__name__)

# Children before parents, so PROTECT links never block the delete.
DELETE_ORDER = [
    "notifications.SmsMessage",
    "tracking.LocationPing",
    "tracking.DutySession",
    "inventory.StockUnit",
    "inventory.StockMovement",
    "inventory.Sale",        # its lines go with it
    "inventory.Purchase",    # its lines go with it
    "inventory.StockItem",
    "inventory.Supplier",
    "inventory.DocCounter",
    "billing.Payment",
    "billing.Bill",
    "customers.Customer",
    "customers.Plan",
    "customers.Provider",
    "customers.Area",
]


def _org_models():
    """Every model with an `organization` foreign key (catches tables added later)."""
    for model in apps.get_models():
        field = next((f for f in model._meta.get_fields() if f.name == "organization"), None)
        if field is not None and field.is_relation and field.related_model.__name__ == "Organization":
            yield model


@transaction.atomic
def delete_organization(org, *, by_user):
    """
    Permanently remove an operator and ALL its data (customers, bills, payments, SMS, stock, staff logins).
    Only called for inactive operators after typed confirmation. Returns row counts per table.
    """
    from accounts.models import User
    from core.models import AuditLog

    counts = {}
    code, name = org.code, org.name
    # Free staff/user references held by other rows first.
    for label in DELETE_ORDER:
        model = apps.get_model(label)
        n, _ = model.objects.filter(organization=org).delete()
        if n:
            counts[label] = n
    # Any other operator table not listed above (retry until nothing protected is left).
    remaining = [m for m in _org_models() if m._meta.label not in DELETE_ORDER
                 and m not in (User, AuditLog) and m._meta.label != "orgs.Organization"]
    for _ in range(len(remaining) + 1):
        blocked = []
        for model in remaining:
            try:
                with transaction.atomic():
                    n, _ = model.objects.filter(organization=org).delete()
                if n:
                    counts[model._meta.label] = counts.get(model._meta.label, 0) + n
            except ProtectedError:
                blocked.append(model)
        if not blocked:
            break
        remaining = blocked
    n, _ = AuditLog.objects.filter(organization=org).delete()
    counts["core.AuditLog"] = n
    n, _ = User.objects.filter(organization=org).delete()
    counts["accounts.User"] = n
    org.delete()
    # Kept after the delete (no operator link) so there is a record of who removed what.
    AuditLog.objects.create(user=by_user, action="organization_deleted", entity="Organization", entity_id=code,
                            details={"code": code, "name": name, "rows": {k: str(v) for k, v in counts.items()}})
    log.warning("Operator %s (%s) deleted by %s: %s", code, name, by_user.username, counts)
    return counts


def generate_password(length=12):
    alphabet = string.ascii_letters + string.digits
    while True:
        pwd = "".join(secrets.choice(alphabet) for _ in range(length))
        if any(c.isdigit() for c in pwd) and any(c.isupper() for c in pwd) and any(c.islower() for c in pwd):
            return pwd
