from rest_framework import serializers, status, viewsets
from rest_framework.exceptions import APIException, PermissionDenied

from .permissions import ReadWriteRoles, Roles


class SubscriptionInactive(APIException):
    """403 with a machine-readable code so the app can show the 'subscription ended' screen."""

    status_code = status.HTTP_403_FORBIDDEN
    default_code = "subscription_inactive"

    def __init__(self, org, state):
        end = org.subscription_end.strftime("%d-%m-%Y") if org.subscription_end else ""
        start = org.subscription_start.strftime("%d-%m-%Y") if org.subscription_start else ""
        message = (
            f"Your LCO Desk subscription ended on {end}. Contact LCO Desk to renew."
            if state == "expired"
            else f"Your LCO Desk subscription starts on {start}."
        )
        super().__init__({
            "detail": message,
            "code": f"subscription_{state}",
            "subscription_start": org.subscription_start,
            "subscription_end": org.subscription_end,
        })


def require_org(user):
    """Every operator endpoint goes through here: right role, active account, valid subscription."""
    org = getattr(user, "organization", None)
    if org is None or user.role not in Roles.TENANT:
        raise PermissionDenied("This endpoint is only for operator accounts.")
    if org.status != "active":
        raise PermissionDenied("This operator account is not active. Contact LCO Desk support.")
    state = org.subscription_state()
    if state != "active":
        raise SubscriptionInactive(org, state)
    return org


class OrgScopedViewSet(viewsets.ModelViewSet):
    """
    Tenant isolation lives here. The organization ALWAYS comes from the logged-in user,
    never from a header or request body (the frontend's X-Organization-Id is ignored).
    """

    permission_classes = [ReadWriteRoles]
    read_roles = Roles.TENANT
    write_roles = Roles.OFFICE

    def get_queryset(self):
        org = require_org(self.request.user)
        return super().get_queryset().filter(organization=org)

    def perform_create(self, serializer):
        serializer.save(organization=require_org(self.request.user))


class OrgScopedPKField(serializers.PrimaryKeyRelatedField):
    """A foreign key field that only accepts objects from the caller's own organization."""

    def get_queryset(self):
        request = self.context.get("request")
        qs = super().get_queryset()
        if request is None:
            return qs.none()
        return qs.filter(organization=require_org(request.user))
