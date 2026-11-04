from .models import AuditLog


def audit(user, action, obj, **details):
    """Record who did what. Never store secrets or full card/bank data in details."""
    org = getattr(obj, "organization", None) or getattr(user, "organization", None)
    AuditLog.objects.create(
        organization=org,
        user=user if getattr(user, "is_authenticated", False) else None,
        action=action,
        entity=obj.__class__.__name__,
        entity_id=str(getattr(obj, "pk", "") or ""),
        details={k: str(v) for k, v in details.items()},
    )
