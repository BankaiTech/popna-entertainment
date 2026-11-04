from rest_framework import serializers, viewsets
from rest_framework.exceptions import PermissionDenied

from .permissions import ReadWriteRoles, Roles


def require_org(user):
    org = getattr(user, "organization", None)
    if org is None or user.role not in Roles.TENANT:
        raise PermissionDenied("This endpoint is only for operator accounts.")
    if org.status != "active":
        raise PermissionDenied("This operator account is suspended. Contact LCO Desk support.")
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
