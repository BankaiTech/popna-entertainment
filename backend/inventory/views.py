from rest_framework import mixins, status, viewsets
from rest_framework.response import Response

from core.mixins import OrgScopedViewSet, require_org
from core.permissions import ReadWriteRoles, Roles

from .models import Purchase, Sale, StockItem, StockUnit, Supplier
from .serializers import (
    PurchaseInSerializer, PurchaseSerializer, SaleInSerializer, SaleSerializer, StockItemSerializer,
    StockUnitSerializer, SupplierSerializer, with_on_hand,
)
from .services import create_purchase, create_sale


class SupplierViewSet(OrgScopedViewSet):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    read_roles = Roles.OFFICE
    search_fields = ["name", "mobile"]


class StockItemViewSet(OrgScopedViewSet):
    """GET /api/stock-items?barcode=890... finds the item for a scanned product barcode."""

    queryset = StockItem.objects.all()
    serializer_class = StockItemSerializer
    filterset_fields = ["category", "track_serials", "is_active", "barcode"]
    search_fields = ["name", "brand", "barcode"]

    def get_queryset(self):
        return with_on_hand(super().get_queryset())

    def perform_destroy(self, instance):
        from rest_framework.exceptions import ValidationError

        if instance.movements.exists():
            raise ValidationError({"detail": "This item has stock history. Mark it inactive instead."})
        instance.delete()


class StockUnitViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.UpdateModelMixin,
                       viewsets.GenericViewSet):
    """GET /api/stock-units?serial=ABC123 — what is this box, and is it still in stock? PATCH status=faulty."""

    serializer_class = StockUnitSerializer
    permission_classes = [ReadWriteRoles]
    read_roles = Roles.TENANT
    write_roles = Roles.OFFICE
    filterset_fields = ["item", "status", "serial", "customer"]
    search_fields = ["serial"]

    def get_queryset(self):
        return StockUnit.objects.filter(organization=require_org(self.request.user)).select_related("item", "customer")


class _DocViewSet(mixins.CreateModelMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    permission_classes = [ReadWriteRoles]
    read_roles = Roles.OFFICE
    write_roles = Roles.OFFICE


class PurchaseViewSet(_DocViewSet):
    serializer_class = PurchaseSerializer
    search_fields = ["bill_no", "supplier__name"]
    filterset_fields = {"bill_date": ["gte", "lte"], "supplier": ["exact"]}

    def get_queryset(self):
        return (Purchase.objects.filter(organization=require_org(self.request.user))
                .select_related("supplier").prefetch_related("lines__item"))

    def create(self, request, *args, **kwargs):
        body = PurchaseInSerializer(data=request.data, context={"request": request})
        body.is_valid(raise_exception=True)
        purchase = create_purchase(user=request.user, org=require_org(request.user), **body.validated_data)
        return Response(PurchaseSerializer(purchase).data, status=status.HTTP_201_CREATED)


class SaleViewSet(_DocViewSet):
    serializer_class = SaleSerializer
    search_fields = ["invoice_no", "customer_name", "customer_mobile"]
    filterset_fields = {"sale_date": ["gte", "lte"], "customer": ["exact"], "payment_method": ["exact"]}

    def get_queryset(self):
        return Sale.objects.filter(organization=require_org(self.request.user)).prefetch_related("lines__item")

    def create(self, request, *args, **kwargs):
        body = SaleInSerializer(data=request.data, context={"request": request})
        body.is_valid(raise_exception=True)
        sale = create_sale(user=request.user, org=require_org(request.user), **body.validated_data)
        return Response(SaleSerializer(sale).data, status=status.HTTP_201_CREATED)
