from django.db.models import Prefetch
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from billing.models import Bill, Payment
from billing.services import month_start
from core.audit import audit
from core.mixins import OrgScopedViewSet
from core.permissions import Roles

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
        period = month_start(timezone.localdate())
        return super().get_queryset().prefetch_related(
            Prefetch("bills", queryset=Bill.objects.filter(period=period), to_attr="current_bills"),
            Prefetch(
                "payments",
                queryset=Payment.objects.filter(bill__period=period, status=Payment.Status.VALID)
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
