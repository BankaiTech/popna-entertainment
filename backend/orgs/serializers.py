import calendar
from datetime import date

from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from core.permissions import Roles

from .models import Distributor, Organization

OWNER_EDITABLE = [
    "owner_mobile", "extra_alert_mobiles", "sms_display_name", "default_due_day", "reminder_days_before",
    "second_reminder_days_before",
    "internet_reminders_enabled", "internet_payment_sms_enabled", "owner_alert_mode", "tracking_enabled",
    "require_gps_for_collection", "require_checkin_for_collection",
]
# Only the platform admin (app owner) may change these.
PLATFORM_CONTROLLED = [
    "status", "distributor", "subscription_start", "subscription_end", "allowed_modules",
    "allowed_settings_tabs", "max_providers", "max_plans",
]
COMPUTED = ["industry_type", "subscription_state", "days_left", "providers_used", "plans_used"]


def add_months(d, months):
    month = d.month - 1 + months
    year = d.year + month // 12
    month = month % 12 + 1
    return date(year, month, min(d.day, calendar.monthrange(year, month)[1]))


class DistributorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Distributor
        fields = ["id", "name", "mobile", "is_active", "created_at"]


class OrgComputedMixin(serializers.Serializer):
    # LCO Desk v1 serves cable TV / broadband operators only; the React app uses this to pick its layout.
    industry_type = serializers.SerializerMethodField()
    subscription_state = serializers.SerializerMethodField()
    days_left = serializers.SerializerMethodField()
    providers_used = serializers.SerializerMethodField()
    plans_used = serializers.SerializerMethodField()

    def get_industry_type(self, obj):
        return "isp-cable"

    def get_subscription_state(self, obj):
        return obj.subscription_state()

    def get_days_left(self, obj):
        return obj.days_left()

    def get_providers_used(self, obj):
        from customers.models import Provider

        return Provider.objects.filter(organization=obj).count()

    def get_plans_used(self, obj):
        from customers.models import Plan

        return Plan.objects.filter(organization=obj).count()


class OrganizationSerializer(OrgComputedMixin, serializers.ModelSerializer):
    """Platform admin (app owner): full control, can create the owner login and renew."""

    owner_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    owner_username = serializers.CharField(write_only=True, required=False)
    owner_password = serializers.CharField(write_only=True, required=False, min_length=8)
    renew_months = serializers.IntegerField(write_only=True, required=False, min_value=1, max_value=36)

    class Meta:
        model = Organization
        fields = [
            "id", "name", "code", *PLATFORM_CONTROLLED, *OWNER_EDITABLE, *COMPUTED, "created_at",
            "owner_name", "owner_username", "owner_password", "renew_months",
        ]

    def validate(self, attrs):
        start = attrs.get("subscription_start", getattr(self.instance, "subscription_start", None))
        end = attrs.get("subscription_end", getattr(self.instance, "subscription_end", None))
        if start and end and end < start:
            raise serializers.ValidationError({"subscription_end": "End date must be after the start date."})
        if self.instance is None and attrs.get("owner_username"):
            from accounts.models import User

            if User.objects.filter(username__iexact=attrs["owner_username"]).exists():
                raise serializers.ValidationError({"owner_username": "This username is already taken."})
            if not attrs.get("owner_password"):
                raise serializers.ValidationError({"owner_password": "Set a password for the owner login."})
            validate_password(attrs["owner_password"])
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        from accounts.models import User

        owner_name = validated_data.pop("owner_name", "")
        owner_username = validated_data.pop("owner_username", None)
        owner_password = validated_data.pop("owner_password", None)
        validated_data.pop("renew_months", None)
        org = super().create(validated_data)
        if owner_username:
            user = User(username=owner_username, name=owner_name, role=Roles.OWNER, organization=org,
                        mobile=org.owner_mobile)
            user.set_password(owner_password)
            user.save()
        return org

    def update(self, instance, validated_data):
        for key in ("owner_name", "owner_username", "owner_password"):
            validated_data.pop(key, None)
        months = validated_data.pop("renew_months", None)
        if months:
            # Renew from the current end date, or from today if it has already ended.
            today = timezone.localdate()
            base = instance.subscription_end if instance.subscription_end and instance.subscription_end >= today \
                else today
            validated_data["subscription_end"] = add_months(base, months)
            if not instance.subscription_start:
                validated_data["subscription_start"] = today
        return super().update(instance, validated_data)


class DistributorOrganizationSerializer(OrgComputedMixin, serializers.ModelSerializer):
    """Distributors can add and view their operators, but never change subscriptions, limits or modules."""

    class Meta:
        model = Organization
        fields = ["id", "name", "code", *PLATFORM_CONTROLLED, *OWNER_EDITABLE, *COMPUTED, "created_at"]
        read_only_fields = PLATFORM_CONTROLLED


class OrganizationOwnerSerializer(OrgComputedMixin, serializers.ModelSerializer):
    """Owners can change their own settings, not their status, subscription, limits or modules."""

    class Meta:
        model = Organization
        fields = ["id", "name", "code", *PLATFORM_CONTROLLED, *OWNER_EDITABLE, *COMPUTED]
        read_only_fields = ["name", "code", *PLATFORM_CONTROLLED]


class OrganizationStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Organization.Status.choices)
