from rest_framework import serializers

from .models import Distributor, Organization

OWNER_EDITABLE = [
    "owner_mobile", "extra_alert_mobiles", "sms_display_name", "default_due_day", "reminder_days_before",
    "internet_reminders_enabled", "internet_payment_sms_enabled", "owner_alert_mode", "tracking_enabled",
    "require_gps_for_collection", "require_checkin_for_collection",
]


class DistributorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Distributor
        fields = ["id", "name", "mobile", "is_active", "created_at"]


class IndustryMixin(serializers.Serializer):
    # LCO Desk v1 serves cable TV / broadband operators only; the React app uses this to pick its layout.
    industry_type = serializers.SerializerMethodField()

    def get_industry_type(self, obj):
        return "isp-cable"


class OrganizationSerializer(IndustryMixin, serializers.ModelSerializer):
    """Full control — platform admin (and distributors for their own operators)."""

    class Meta:
        model = Organization
        fields = [
            "id", "name", "code", "status", "distributor", "subscription_end", "allowed_modules",
            "industry_type", *OWNER_EDITABLE, "created_at",
        ]


class OrganizationOwnerSerializer(IndustryMixin, serializers.ModelSerializer):
    """Owners can change their own settings, not their status, plan or distributor."""

    class Meta:
        model = Organization
        fields = [
            "id", "name", "code", "status", "subscription_end", "allowed_modules", "industry_type", *OWNER_EDITABLE,
        ]
        read_only_fields = ["name", "code", "status", "subscription_end", "allowed_modules"]
