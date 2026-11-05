from decimal import Decimal

from django.db.models import Count, DecimalField, OuterRef, Q, Subquery, Sum, Value
from django.db.models.functions import Coalesce
from rest_framework import serializers

from core.mixins import OrgScopedPKField, require_org
from customers.models import Customer

from .models import DocLine, Purchase, Sale, StockItem, StockMovement, StockUnit, Supplier


def with_on_hand(qs):
    total = (StockMovement.objects.filter(item=OuterRef("pk")).values("item")
             .annotate(q=Sum("quantity")).values("q"))
    return qs.annotate(
        moved=Coalesce(Subquery(total, output_field=DecimalField()), Value(Decimal(0)), output_field=DecimalField()),
        units_in_stock=Count("units", filter=Q(units__status="in_stock")),
    )


class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = ["id", "name", "mobile", "gstin", "address", "created_at"]


class StockItemSerializer(serializers.ModelSerializer):
    on_hand = serializers.SerializerMethodField()
    low_stock = serializers.SerializerMethodField()

    class Meta:
        model = StockItem
        fields = ["id", "name", "category", "brand", "barcode", "hsn_code", "unit", "track_serials",
                  "purchase_price", "sale_price", "gst_rate", "low_stock_level", "is_active", "on_hand", "low_stock"]

    def get_on_hand(self, obj):
        # Serial items: pieces actually in stock (faulty / returned don't count). Others: movement total.
        value = getattr(obj, "units_in_stock", 0) if obj.track_serials else getattr(obj, "moved", 0)
        return f"{Decimal(value):.2f}"

    def get_low_stock(self, obj):
        return obj.low_stock_level > 0 and Decimal(self.get_on_hand(obj)) <= obj.low_stock_level

    def validate(self, attrs):
        org = require_org(self.context["request"].user)
        barcode = attrs.get("barcode", "").strip() if "barcode" in attrs else None
        if barcode:
            attrs["barcode"] = barcode
            qs = StockItem.objects.filter(organization=org, barcode=barcode)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError({"barcode": "Another item already has this barcode."})
        if self.instance and "track_serials" in attrs and attrs["track_serials"] != self.instance.track_serials \
                and self.instance.movements.exists():
            raise serializers.ValidationError({"track_serials": "Can't change this after stock was added."})
        return attrs


class StockUnitSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source="item.name", read_only=True)
    sale_price = serializers.DecimalField(source="item.sale_price", max_digits=10, decimal_places=2, read_only=True)
    gst_rate = serializers.DecimalField(source="item.gst_rate", max_digits=5, decimal_places=2, read_only=True)
    customer_name = serializers.CharField(source="customer.name", read_only=True, default=None)

    class Meta:
        model = StockUnit
        fields = ["id", "serial", "status", "item", "item_name", "sale_price", "gst_rate", "customer", "customer_name",
                  "created_at"]
        read_only_fields = ["serial", "item", "customer", "created_at"]

    def validate_status(self, value):
        if self.instance and self.instance.status == StockUnit.Status.SOLD:
            raise serializers.ValidationError("Sold pieces can't be changed here.")
        if value == StockUnit.Status.SOLD:
            raise serializers.ValidationError("Use Sales to sell a piece.")
        return value


class LineInSerializer(serializers.Serializer):
    item_id = OrgScopedPKField(source="item", queryset=StockItem.objects.all())
    quantity = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, default=Decimal(1))
    unit_price = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal(0))
    gst_rate = serializers.DecimalField(max_digits=5, decimal_places=2, min_value=Decimal(0), max_value=Decimal(28),
                                        required=False)
    serials = serializers.ListField(child=serializers.CharField(max_length=64), required=False, default=list,
                                    max_length=500)


class LineOutSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source="item.name")
    hsn_code = serializers.CharField(source="item.hsn_code")
    serials = serializers.SerializerMethodField()

    class Meta:
        model = DocLine
        fields = ["id", "item", "item_name", "hsn_code", "quantity", "unit_price", "gst_rate", "taxable",
                  "gst_amount", "total", "serials"]

    def get_serials(self, obj):
        field = "purchase_line" if obj.purchase_id else "sale_line"
        return list(StockUnit.objects.filter(**{field: obj}).values_list("serial", flat=True))


class PurchaseSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)
    lines = LineOutSerializer(many=True, read_only=True)

    class Meta:
        model = Purchase
        fields = ["id", "supplier", "supplier_name", "bill_no", "bill_date", "taxable_total", "gst_total",
                  "grand_total", "note", "created_at", "lines"]


class PurchaseInSerializer(serializers.Serializer):
    supplier_id = OrgScopedPKField(source="supplier", queryset=Supplier.objects.all())
    bill_no = serializers.CharField(max_length=40, required=False, allow_blank=True, default="")
    bill_date = serializers.DateField(required=False)
    note = serializers.CharField(max_length=200, required=False, allow_blank=True, default="")
    lines = LineInSerializer(many=True)


class SaleSerializer(serializers.ModelSerializer):
    lines = LineOutSerializer(many=True, read_only=True)
    cgst = serializers.SerializerMethodField()
    sgst = serializers.SerializerMethodField()

    class Meta:
        model = Sale
        fields = ["id", "invoice_no", "sale_date", "customer", "customer_name", "customer_mobile", "payment_method",
                  "taxable_total", "gst_total", "cgst", "sgst", "grand_total", "note", "created_at", "lines"]

    # Within Tamil Nadu GST splits equally into CGST + SGST.
    def get_cgst(self, obj):
        return str((obj.gst_total / 2).quantize(Decimal("0.01")))

    def get_sgst(self, obj):
        return str((obj.gst_total - obj.gst_total / 2).quantize(Decimal("0.01")))


class SaleInSerializer(serializers.Serializer):
    customer_id = OrgScopedPKField(source="customer", queryset=Customer.objects.all(), required=False, allow_null=True)
    customer_name = serializers.CharField(max_length=150, required=False, allow_blank=True, default="")
    customer_mobile = serializers.CharField(max_length=15, required=False, allow_blank=True, default="")
    payment_method = serializers.ChoiceField(choices=Sale.Method.choices, default=Sale.Method.CASH)
    sale_date = serializers.DateField(required=False)
    note = serializers.CharField(max_length=200, required=False, allow_blank=True, default="")
    lines = LineInSerializer(many=True)
