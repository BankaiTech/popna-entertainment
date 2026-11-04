from django.db.models import Count, Q, Sum
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from billing.models import Bill, Payment
from billing.services import month_start
from core.audit import audit
from core.permissions import ReadWriteRoles, Roles, role_in
from customers.models import Customer

from .models import Distributor, Organization
from .serializers import (
    DistributorOrganizationSerializer,
    DistributorSerializer,
    OrganizationOwnerSerializer,
    OrganizationSerializer,
    OrganizationStatusSerializer,
)


class DistributorViewSet(viewsets.ModelViewSet):
    queryset = Distributor.objects.all()
    serializer_class = DistributorSerializer
    permission_classes = [role_in(Roles.PLATFORM_ADMIN)]
    search_fields = ["name", "mobile"]


class OrganizationViewSet(viewsets.ModelViewSet):
    permission_classes = [ReadWriteRoles]
    read_roles = (Roles.PLATFORM_ADMIN, Roles.DISTRIBUTOR, Roles.OWNER, Roles.MANAGER)
    write_roles = (Roles.PLATFORM_ADMIN, Roles.DISTRIBUTOR, Roles.OWNER)
    search_fields = ["name", "code"]
    filterset_fields = ["status", "distributor"]

    def get_queryset(self):
        user = self.request.user
        qs = Organization.objects.select_related("distributor")
        if user.role == Roles.PLATFORM_ADMIN:
            return qs
        if user.role == Roles.DISTRIBUTOR:
            return qs.filter(distributor=user.distributor)
        return qs.filter(pk=user.organization_id)

    def get_serializer_class(self):
        role = self.request.user.role
        if role in (Roles.OWNER, Roles.MANAGER):
            return OrganizationOwnerSerializer
        if role == Roles.DISTRIBUTOR:
            return DistributorOrganizationSerializer
        return OrganizationSerializer

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == Roles.OWNER:
            raise PermissionDenied("Owners cannot create operators.")
        if user.role == Roles.DISTRIBUTOR:
            # Stays disabled until the app owner sets the subscription and activates it.
            obj = serializer.save(distributor=user.distributor, status=Organization.Status.DISABLED)
        else:
            obj = serializer.save()
        audit(user, "organization_created", obj)

    def perform_update(self, serializer):
        user = self.request.user
        obj = serializer.save()
        audit(user, "organization_updated", obj, fields=",".join(sorted(serializer.validated_data)))

    def perform_destroy(self, instance):
        raise PermissionDenied("Operators are never deleted. Set status to 'suspended' instead.")

    @action(detail=True, methods=["patch"], url_path="status", permission_classes=[role_in(Roles.PLATFORM_ADMIN)])
    def set_status(self, request, pk=None):
        """PATCH /api/organizations/{id}/status {"status": "suspended"} — app owner only."""
        org = self.get_object()
        body = OrganizationStatusSerializer(data=request.data)
        body.is_valid(raise_exception=True)
        org.status = body.validated_data["status"]
        org.save(update_fields=["status", "updated_at"])
        audit(request.user, "organization_status", org, status=org.status)
        return Response(OrganizationSerializer(org, context={"request": request}).data)


@api_view(["GET"])
@permission_classes([role_in(Roles.PLATFORM_ADMIN, Roles.DISTRIBUTOR)])
def distributor_summary(request):
    """Per-operator numbers for distributors. No customer personal data is exposed here."""
    user = request.user
    orgs = Organization.objects.all()
    if user.role == Roles.DISTRIBUTOR:
        orgs = orgs.filter(distributor=user.distributor)
    elif request.query_params.get("distributor"):
        orgs = orgs.filter(distributor_id=request.query_params["distributor"])
    period = month_start(timezone.localdate())
    rows = []
    for org in orgs.order_by("name"):
        bills = Bill.objects.filter(organization=org, period=period).exclude(status=Bill.Status.CANCELLED)
        billed = bills.aggregate(total=Sum("amount_due"))["total"] or 0
        collected = (
            Payment.objects.filter(organization=org, status=Payment.Status.VALID, bill__period=period)
            .aggregate(total=Sum("amount"))["total"] or 0
        )
        customers = Customer.objects.filter(organization=org).aggregate(
            active=Count("id", filter=Q(status=Customer.Status.ACTIVE)),
            cable=Count("id", filter=Q(status=Customer.Status.ACTIVE, plan__category="cable")),
            internet=Count("id", filter=Q(status=Customer.Status.ACTIVE, plan__category="internet")),
        )
        rows.append({
            "organization_id": org.id,
            "name": org.name,
            "code": org.code,
            "status": org.status,
            "active_customers": customers["active"],
            "cable_customers": customers["cable"],
            "internet_customers": customers["internet"],
            "billed_this_month": billed,
            "collected_this_month": collected,
            "collection_percent": round(float(collected) * 100 / float(billed), 1) if billed else 0,
        })
    return Response({"period": period.strftime("%Y-%m"), "operators": rows})
