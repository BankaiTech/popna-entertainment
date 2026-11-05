from decimal import Decimal

from rest_framework import serializers

from core.mixins import OrgScopedPKField
from customers.models import Customer

from .models import Bill, Payment


class BillSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source="customer.name", read_only=True)
    customer_mobile = serializers.CharField(source="customer.mobile", read_only=True)
    category = serializers.CharField(source="customer.plan.category", read_only=True)
    balance = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    period = serializers.SerializerMethodField()

    class Meta:
        model = Bill
        fields = [
            "id", "customer", "customer_name", "customer_mobile", "category", "period", "amount_due",
            "amount_paid", "discount", "balance", "due_date", "status",
        ]

    def get_period(self, obj):
        return obj.period.strftime("%Y-%m")


class PaymentSerializer(serializers.ModelSerializer):
    customer_id = OrgScopedPKField(source="customer", queryset=Customer.objects.all())
    bill_id = OrgScopedPKField(source="bill", queryset=Bill.objects.all(), required=False, allow_null=True)
    accuracy = serializers.FloatField(source="location_accuracy_m", required=False, allow_null=True)
    customer_name = serializers.CharField(source="customer.name", read_only=True)
    collected_by_name = serializers.CharField(source="collected_by.display_name", read_only=True)
    collected_by_username = serializers.CharField(source="collected_by.username", read_only=True)
    period = serializers.SerializerMethodField()
    latitude = serializers.DecimalField(
        max_digits=9, decimal_places=6, required=False, allow_null=True, min_value=Decimal("-90"),
        max_value=Decimal("90"),
    )
    longitude = serializers.DecimalField(
        max_digits=9, decimal_places=6, required=False, allow_null=True, min_value=Decimal("-180"),
        max_value=Decimal("180"),
    )

    class Meta:
        model = Payment
        fields = [
            "id", "receipt_no", "customer_id", "customer_name", "bill_id", "period", "amount", "discount", "method",
            "collected_by", "collected_by_name", "collected_by_username", "collected_at", "latitude",
            "longitude", "accuracy", "note", "status", "cancel_reason", "cancelled_at",
        ]
        read_only_fields = [
            "receipt_no", "collected_by", "collected_at", "status", "cancel_reason", "cancelled_at",
        ]

    def to_internal_value(self, data):
        # GPS often returns 10+ decimals; store 6 (about 10 cm).
        data = data.copy() if hasattr(data, "copy") else dict(data)
        for key in ("latitude", "longitude"):
            if data.get(key) not in (None, ""):
                try:
                    data[key] = str(round(float(data[key]), 6))
                except (TypeError, ValueError):
                    pass
        return super().to_internal_value(data)

    def get_period(self, obj):
        return obj.bill.period.strftime("%Y-%m")


class CancelPaymentSerializer(serializers.Serializer):
    reason = serializers.CharField(max_length=200)
