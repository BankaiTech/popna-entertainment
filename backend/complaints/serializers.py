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
    updates = ComplaintUpdateSerializer(many=True, read_only=True)

    class Meta:
        model = Complaint
        fields = [
            "id", "ticket_no", "customer_id", "customer_name", "customer_mobile", "customer_area", "customer_stb",
            "customer_address", "plan_name", "category", "category_label", "description", "status",
            "raised_by_customer", "assigned_to", "assigned_to_name", "assigned_at", "resolved_at",
            "resolution_note", "created_at", "updates",
        ]
        read_only_fields = ["ticket_no", "status", "raised_by_customer", "assigned_to", "assigned_at",
                            "resolved_at", "resolution_note", "created_at"]

    def get_customer_area(self, obj):
        return obj.customer.area.name if obj.customer.area_id else ""

    def get_assigned_to_name(self, obj):
        return obj.assigned_to.display_name if obj.assigned_to else ""


class AssignSerializer(serializers.Serializer):
    """Assign to field staff (agent / technician) of the same operator."""

    user_id = OrgScopedPKField(queryset=User.objects.filter(role__in=Roles.FIELD, is_active=True))
    note = serializers.CharField(required=False, allow_blank=True, max_length=300)


class NoteSerializer(serializers.Serializer):
    note = serializers.CharField(required=False, allow_blank=True, max_length=300)


class RequiredNoteSerializer(serializers.Serializer):
    note = serializers.CharField(min_length=3, max_length=300)
