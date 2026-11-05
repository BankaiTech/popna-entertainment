from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.decorators import action
from rest_framework.response import Response

from core.mixins import require_org
from core.modules import has_module
from core.permissions import ReadWriteRoles, Roles, role_in

from .models import Bill, Payment
from .serializers import BillSerializer, CancelPaymentSerializer, PaymentSerializer
from .services import cancel_payment, generate_bills, month_start, parse_period, record_payment


class BillViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = BillSerializer
    permission_classes = [ReadWriteRoles]
    read_roles = (Roles.OWNER, Roles.MANAGER, Roles.AGENT)
    write_roles = Roles.OFFICE
    filterset_fields = {"status": ["exact", "in"], "customer": ["exact"], "customer__area": ["exact"],
                        "customer__plan__category": ["exact"], "due_date": ["gte", "lte"]}
    search_fields = ["customer__name", "customer__mobile", "customer__customer_code"]

    def get_queryset(self):
        org = require_org(self.request.user)
        qs = Bill.objects.filter(organization=org).select_related("customer__plan")
        period = self.request.query_params.get("period")
        if period:
            qs = qs.filter(period=parse_period(period))
        return qs

    @action(detail=False, methods=["post"])
    def generate(self, request):
        """POST /api/bills/generate {"period": "2026-11"} — creates missing bills for the month."""
        org = require_org(request.user)
        period = parse_period(request.data.get("period")) if request.data.get("period") else month_start(
            timezone.localdate()
        )
        created = generate_bills(period, organization=org)
        return Response({"period": period.strftime("%Y-%m"), "created": created})


class PaymentViewSet(mixins.CreateModelMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin,
                     viewsets.GenericViewSet):
    """Payments are never edited or deleted — only cancelled by the owner, with a reason."""

    serializer_class = PaymentSerializer
    permission_classes = [ReadWriteRoles]
    read_roles = (Roles.OWNER, Roles.MANAGER, Roles.AGENT)
    write_roles = (Roles.OWNER, Roles.MANAGER, Roles.AGENT)
    filterset_fields = {"method": ["exact"], "status": ["exact"], "collected_by": ["exact"],
                        "customer": ["exact"], "collected_at": ["date", "date__gte", "date__lte"]}
    search_fields = ["receipt_no", "customer__name", "customer__mobile"]

    def get_queryset(self):
        user = self.request.user
        org = require_org(user)
        qs = Payment.objects.filter(organization=org).select_related("customer", "bill", "collected_by")
        if user.role == Roles.AGENT:
            qs = qs.filter(collected_by=user)  # agents only see their own collections
        return qs

    def create(self, request, *args, **kwargs):
        if request.user.role in Roles.FIELD and not has_module(request.user, "collect"):
            raise PermissionDenied("You don't have access to collections. Ask the owner.")
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        payment = record_payment(
            user=request.user,
            customer=data["customer"],
            bill=data.get("bill"),
            amount=data["amount"],
            method=data.get("method", Payment.Method.CASH),
            latitude=data.get("latitude"),
            longitude=data.get("longitude"),
            accuracy=data.get("location_accuracy_m"),
            note=data.get("note", ""),
            discount=data.get("discount", 0),
        )
        return Response(self.get_serializer(payment).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], permission_classes=[role_in(Roles.OWNER)])
    def cancel(self, request, pk=None):
        payment = self.get_object()
        body = CancelPaymentSerializer(data=request.data)
        body.is_valid(raise_exception=True)
        payment = cancel_payment(user=request.user, payment=payment, reason=body.validated_data["reason"])
        return Response(self.get_serializer(payment).data)
