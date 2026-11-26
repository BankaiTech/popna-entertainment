from decimal import Decimal

from rest_framework import serializers

from accounts.models import User
from core.mixins import OrgScopedPKField
from core.permissions import Roles
from customers.models import Customer

from .models import Complaint, ComplaintUpdate


class ComplaintUpdateSerializer(serializers.ModelSerializer):
    by = serializers.SerializerMethodField()

    class Meta:
        model = ComplaintUpdate
        fields = ["action", "note", "by", "by_customer", "created_at"]

    def get_by(self, obj):
        if obj.by_customer:
            return obj.complaint.customer.name
        return obj.by_user.display_name if obj.by_user else ""


class ComplaintSerializer(serializers.ModelSerializer):
    """Staff view. Creating one = the office raises it for a customer."""

    customer_id = OrgScopedPKField(source="customer", queryset=Customer.objects.all())
    customer_name = serializers.CharField(source="customer.name", read_only=True)
    customer_mobile = serializers.CharField(source="customer.mobile", read_only=True)
    customer_area = serializers.SerializerMethodField()
    customer_stb = serializers.CharField(source="customer.stb_number", read_only=True)
    customer_address = serializers.CharField(source="customer.address_line1", read_only=True)
    plan_name = serializers.CharField(source="customer.plan.name", read_only=True)
    category_label = serializers.CharField(source="get_category_display", read_only=True)
    assigned_to_name = serializers.SerializerMethodField()
    resolved_by_name = serializers.SerializerMethodField()
    updates = ComplaintUpdateSerializer(many=True, read_only=True)

    class Meta:
        model = Complaint
        fields = [
            "id", "ticket_no", "customer_id", "customer_name", "customer_mobile", "customer_area", "customer_stb",
            "customer_address", "plan_name", "category", "category_label", "description", "status",
            "raised_by_customer", "assigned_to", "assigned_to_name", "assigned_at", "resolved_at",
            "resolved_by_name", "resolution_note", "resolved_latitude", "resolved_longitude", "resolved_accuracy_m",
            "created_at", "updates",
        ]
        read_only_fields = ["ticket_no", "status", "raised_by_customer", "assigned_to", "assigned_at",
                            "resolved_at", "resolution_note", "resolved_latitude", "resolved_longitude",
                            "resolved_accuracy_m", "created_at"]

    def get_customer_area(self, obj):
        return obj.customer.area.name if obj.customer.area_id else ""

    def get_assigned_to_name(self, obj):
        return obj.assigned_to.display_name if obj.assigned_to else ""

    def get_resolved_by_name(self, obj):
        return obj.resolved_by.display_name if obj.resolved_by else ""


class AssignSerializer(serializers.Serializer):
    """Assign to one field staff member (agent / technician) of the same operator, or null = unassign."""

    user_id = OrgScopedPKField(queryset=User.objects.filter(role__in=Roles.FIELD, is_active=True), allow_null=True)
    note = serializers.CharField(required=False, allow_blank=True, max_length=300)

    def validate_user_id(self, user):
        from core.modules import has_module

        if user is not None and not has_module(user, "complaints"):
            raise serializers.ValidationError(
                "This person cannot open the Complaints page. Give it to them in Staff first.")
        return user


class NoteSerializer(serializers.Serializer):
    note = serializers.CharField(required=False, allow_blank=True, max_length=300)


class RequiredNoteSerializer(serializers.Serializer):
    note = serializers.CharField(min_length=3, max_length=300)


class ResolveSerializer(RequiredNoteSerializer):
    """What was done, and where (GPS of the phone when it was closed)."""

    latitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True,
                                        min_value=Decimal("-90"), max_value=Decimal("90"))
    longitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True,
                                         min_value=Decimal("-180"), max_value=Decimal("180"))
    accuracy = serializers.FloatField(required=False, allow_null=True, min_value=0, max_value=100000)

    def to_internal_value(self, data):
        # Phones send 10+ decimals; keep 6 (about 10 cm).
        data = data.copy() if hasattr(data, "copy") else dict(data)
        for key in ("latitude", "longitude"):
            if data.get(key) not in (None, ""):
                try:
                    data[key] = str(round(float(data[key]), 6))
                except (TypeError, ValueError, OverflowError):
                    pass
        return super().to_internal_value(data)

    def validate(self, attrs):
        if (attrs.get("latitude") is None) != (attrs.get("longitude") is None):
            raise serializers.ValidationError({"location": "Location is incomplete. Try again."})
        return attrs
