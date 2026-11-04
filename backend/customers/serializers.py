from rest_framework import serializers

from core.mixins import OrgScopedPKField, require_org
from core.validators import normalize_mobile

from .models import Area, Customer, Plan


class AreaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Area
        fields = ["id", "name", "created_at"]

    def validate_name(self, value):
        org = require_org(self.context["request"].user)
        qs = Area.objects.filter(organization=org, name__iexact=value.strip())
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("An area with this name already exists.")
        return value.strip()


class PlanSerializer(serializers.ModelSerializer):
    final_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    plan_name = serializers.CharField(source="name", read_only=True)  # frontend field name

    class Meta:
        model = Plan
        fields = [
            "id", "provider", "name", "plan_name", "category", "price", "gst_rate", "final_price",
            "installation_amount", "description", "is_active", "created_at",
        ]

    def validate(self, attrs):
        org = require_org(self.context["request"].user)
        provider = attrs.get("provider", getattr(self.instance, "provider", None))
        name = attrs.get("name", getattr(self.instance, "name", None))
        qs = Plan.objects.filter(organization=org, provider__iexact=provider, name__iexact=name)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("This provider already has a plan with this name.")
        return attrs


class CustomerSerializer(serializers.ModelSerializer):
    """
    Field names match the existing React app (`/contacts`): connection_type, package,
    status 'Active'/'Inactive', nested address, payment_status for the current month.
    """

    plan_id = OrgScopedPKField(source="plan", queryset=Plan.objects.all(), required=False)
    area_id = OrgScopedPKField(source="area", queryset=Area.objects.all(), required=False, allow_null=True)
    area_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    connection_type = serializers.CharField(source="plan.provider", read_only=True)
    package = serializers.CharField(source="plan.name", read_only=True)
    category = serializers.CharField(source="plan.category", read_only=True)
    area = serializers.CharField(source="area.name", read_only=True, default=None)
    monthly_amount = serializers.SerializerMethodField()
    address = serializers.SerializerMethodField()
    organization_id = serializers.CharField(read_only=True)
    payment_status = serializers.SerializerMethodField()
    balance_amount = serializers.SerializerMethodField()
    collected_amount = serializers.SerializerMethodField()
    payment_method = serializers.SerializerMethodField()
    payment_updated_at = serializers.SerializerMethodField()
    collected_by_username = serializers.SerializerMethodField()

    class Meta:
        model = Customer
        fields = [
            "id", "organization_id", "customer_code", "name", "mobile", "email", "plan_id", "connection_type",
            "package", "category", "area_id", "area", "area_name", "status", "due_day", "permanent_discount",
            "monthly_amount", "sms_opt_in", "box_number", "stb_number", "can_caf_id", "address",
            "address_line1", "address_line2", "city", "state", "pincode", "notes", "created_at",
            "payment_status", "balance_amount", "collected_amount", "payment_method", "payment_updated_at",
            "collected_by_username",
        ]
        extra_kwargs = {
            "address_line1": {"write_only": True}, "address_line2": {"write_only": True},
            "city": {"write_only": True}, "state": {"write_only": True}, "pincode": {"write_only": True},
        }

    # ── input compatibility with the React app ──
    def to_internal_value(self, data):
        data = data.copy() if hasattr(data, "copy") else dict(data)
        address = data.pop("address", None)
        if isinstance(address, dict):
            data.setdefault("address_line1", address.get("line1", ""))
            data.setdefault("address_line2", address.get("line2", ""))
            data.setdefault("city", address.get("city", ""))
            data.setdefault("state", address.get("state", "") or "Tamil Nadu")
            data.setdefault("pincode", address.get("pincode", "") or "")
        if isinstance(data.get("status"), str):
            data["status"] = data["status"].lower()
        if "mobile" in data:
            data["mobile"] = normalize_mobile(str(data["mobile"]))
        if not data.get("plan_id") and data.get("connection_type") and data.get("package"):
            org = require_org(self.context["request"].user)
            plan = Plan.objects.filter(
                organization=org, provider__iexact=data["connection_type"], name__iexact=data["package"]
            ).first()
            if plan is None:
                raise serializers.ValidationError({"package": "No plan found for this provider and package."})
            data["plan_id"] = plan.id
        return super().to_internal_value(data)

    def validate(self, attrs):
        if self.instance is None and "plan" not in attrs:
            raise serializers.ValidationError({"plan_id": "Choose a plan (or send connection_type + package)."})
        area_name = attrs.pop("area_name", "").strip()
        if area_name and "area" not in attrs:
            org = require_org(self.context["request"].user)
            area = Area.objects.filter(organization=org, name__iexact=area_name).first()
            attrs["area"] = area or Area.objects.create(organization=org, name=area_name)
        return attrs

    # ── output ──
    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["status"] = "Active" if instance.status == Customer.Status.ACTIVE else "Inactive"
        return data

    def get_monthly_amount(self, obj):
        return str(obj.monthly_amount())

    def get_address(self, obj):
        return {
            "line1": obj.address_line1, "line2": obj.address_line2, "city": obj.city,
            "state": obj.state, "country": "India", "pincode": obj.pincode,
        }

    def _bill(self, obj):
        bills = getattr(obj, "current_bills", None)
        return bills[0] if bills else None

    def _last_payment(self, obj):
        payments = getattr(obj, "current_payments", None)
        return payments[0] if payments else None

    def get_payment_status(self, obj):
        bill = self._bill(obj)
        return "paid" if bill and bill.status == "paid" else "not_paid"

    def get_balance_amount(self, obj):
        bill = self._bill(obj)
        return str(bill.balance) if bill else str(obj.monthly_amount())

    def get_collected_amount(self, obj):
        bill = self._bill(obj)
        return str(bill.amount_paid) if bill else "0.00"

    def get_payment_method(self, obj):
        p = self._last_payment(obj)
        return p.method if p else None

    def get_payment_updated_at(self, obj):
        p = self._last_payment(obj)
        return p.collected_at.isoformat() if p else None

    def get_collected_by_username(self, obj):
        p = self._last_payment(obj)
        return p.collected_by.username if p else None
