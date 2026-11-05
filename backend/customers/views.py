from datetime import timedelta

from django.db.models import Prefetch
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError

from billing.models import Bill, Payment
from billing.services import month_start
from core.audit import audit
from core.mixins import OrgScopedViewSet, require_org
from core.permissions import Roles, role_in

from .models import Area, Customer, Plan, Provider
from .serializers import AreaSerializer, CustomerSerializer, PlanSerializer, ProviderSerializer


class AreaViewSet(OrgScopedViewSet):
    queryset = Area.objects.all()
    serializer_class = AreaSerializer
    search_fields = ["name"]


class ProviderViewSet(OrgScopedViewSet):
    """Mounted at /api/products — the React app's name for providers (GTPL, RailWire...)."""

    queryset = Provider.objects.all()
    serializer_class = ProviderSerializer
    filterset_fields = ["category", "is_active"]
    search_fields = ["name"]

    def perform_destroy(self, instance):
        if Plan.objects.filter(organization=instance.organization, provider__iexact=instance.name).exists():
            raise ValidationError({"detail": "Plans use this provider. Mark it inactive instead."})
        instance.delete()


class PlanViewSet(OrgScopedViewSet):
    queryset = Plan.objects.all()
    serializer_class = PlanSerializer
    filterset_fields = ["category", "provider", "is_active"]
    search_fields = ["provider", "name"]

    def perform_destroy(self, instance):
        if instance.customers.exists():
            raise ValidationError({"detail": "Customers use this plan. Mark it inactive instead."})
        instance.delete()


class CustomerViewSet(OrgScopedViewSet):
    """Mounted at /api/contacts (what the React app calls) and /api/customers."""

    queryset = Customer.objects.select_related("plan", "area")
    serializer_class = CustomerSerializer
    filterset_fields = {"status": ["exact"], "area": ["exact"], "plan": ["exact"], "plan__category": ["exact"]}
    search_fields = ["name", "mobile", "customer_code", "box_number", "stb_number", "can_caf_id"]
    ordering_fields = ["name", "created_at"]

    def get_queryset(self):
        # Latest bill per customer = its current bill (cable: this month; internet: current renewal).
        since = timezone.localdate() - timedelta(days=70)
        return super().get_queryset().prefetch_related(
            Prefetch("bills", queryset=Bill.objects.filter(period__gte=since).exclude(status="cancelled")
                     .order_by("-period"), to_attr="current_bills"),
            Prefetch(
                "payments",
                queryset=Payment.objects.filter(bill__period__gte=since, status=Payment.Status.VALID)
                .select_related("collected_by")
                .order_by("-collected_at"),
                to_attr="current_payments",
            ),
        )

    def perform_create(self, serializer):
        super().perform_create(serializer)
        audit(self.request.user, "customer_created", serializer.instance)

    def perform_destroy(self, instance):
        if self.request.user.role != Roles.OWNER:
            raise PermissionDenied("Only the owner can delete customers.")
        if instance.bills.exists():
            raise ValidationError({"detail": "This customer has bills. Mark them Inactive instead."})
        audit(self.request.user, "customer_deleted", instance, name=instance.name)
        instance.delete()


@api_view(["GET"])
@permission_classes([role_in(*Roles.OFFICE)])
def cutoff_list(request):
    """
    GET /api/connections/cutoff — who should be switched off in the provider's portal today.
    Cable: unpaid after this month's cut-off date. Internet: plan expired.
    """
    org = require_org(request.user)
    today = timezone.localdate()
    rows = []
    cable_bills = (
        Bill.objects.filter(organization=org, period=month_start(today), due_date__lt=today,
                            status__in=[Bill.Status.UNPAID, Bill.Status.PARTIAL],
                            customer__status=Customer.Status.ACTIVE, customer__plan__category="cable")
        .select_related("customer__plan", "customer__area")
    )
    for b in cable_bills:
        c = b.customer
        rows.append({"customer_id": c.id, "name": c.name, "mobile": c.mobile, "provider": c.plan.provider,
                     "category": "cable", "area": c.area.name if c.area else None, "box_number": c.box_number,
                     "since": b.due_date, "balance": str(b.balance)})
    expired = Customer.objects.filter(
        organization=org, status=Customer.Status.ACTIVE, plan__category="internet", valid_until__lt=today
    ).select_related("plan", "area")
    for c in expired:
        rows.append({"customer_id": c.id, "name": c.name, "mobile": c.mobile, "provider": c.plan.provider,
                     "category": "internet", "area": c.area.name if c.area else None, "box_number": c.box_number,
                     "since": c.valid_until, "balance": None})
    return Response({"date": today, "count": len(rows), "customers": rows})
