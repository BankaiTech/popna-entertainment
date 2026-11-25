from django.utils import timezone
from rest_framework import serializers

from accounts.models import User
from core.mixins import OrgScopedPKField, require_org
from core.permissions import Roles
from core.validators import normalize_mobile

from .models import Area, Customer, Plan, Provider


def check_limit(org, kind):
    """Enforce the provider / plan limits the app owner set for this operator."""
    limit = org.max_providers if kind == "providers" else org.max_plans
    if limit is None:
        return
    model = Provider if kind == "providers" else Plan
    label = "service connection types" if kind == "providers" else "connection products"
    if model.objects.filter(organization=org).count() >= limit:
        raise serializers.ValidationError({
            "detail": f"Your subscription allows up to {limit} {label}. Contact LCO Desk to increase it.",
            "code": f"limit_{kind}",
        })


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


class ProviderSerializer(serializers.ModelSerializer):
    """Field names match the React app's `Product` type."""

    organization_id = serializers.CharField(read_only=True)
    product_type = serializers.ChoiceField(source="category", choices=["cable", "internet"])
    cutoff_date = serializers.IntegerField(source="cutoff_day", required=False, allow_null=True, min_value=1,
                                           max_value=28)

    class Meta:
        model = Provider
        fields = ["id", "organization_id", "name", "product_type", "is_active", "description", "cutoff_date",
                  "cutoff_days", "created_at"]

    def validate(self, attrs):
        if self.instance is None:
            check_limit(require_org(self.context["request"].user), "providers")
        category = attrs.get("category", getattr(self.instance, "category", None))
        cutoff = attrs["cutoff_day"] if "cutoff_day" in attrs else getattr(self.instance, "cutoff_day", None)
        # Each cable provider has its own cut-off date: bills, reminders and the cut-off list use it.
        if category == "cable" and not cutoff:
            raise serializers.ValidationError({"cutoff_date": "Set the cut-off date (1-28) for this cable provider."})
        return attrs

    def validate_name(self, value):
        org = require_org(self.context["request"].user)
        qs = Provider.objects.filter(organization=org, name__iexact=value.strip())
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("A provider with this name already exists.")
        return value.strip()


class PlanSerializer(serializers.ModelSerializer):
    final_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    price_with_gst = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    plan_name = serializers.CharField(source="name", read_only=True)  # frontend field name

    class Meta:
        model = Plan
        fields = [
            "id", "provider", "name", "plan_name", "category", "price", "gst_rate", "price_with_gst", "final_price",
            "installation_amount", "description", "is_active", "created_at",
        ]
        extra_kwargs = {"category": {"required": False}}

    def to_internal_value(self, data):
        data = data.copy() if hasattr(data, "copy") else dict(data)
        if data.get("plan_name") and not data.get("name"):
            data["name"] = data["plan_name"]  # React app sends planName
        return super().to_internal_value(data)

    def validate(self, attrs):
        org = require_org(self.context["request"].user)
        provider = attrs.get("provider", getattr(self.instance, "provider", None))
        name = attrs.get("name", getattr(self.instance, "name", None))
        # The provider decides cable vs internet, so a plan can never be in the wrong category.
        known = Provider.objects.filter(organization=org, name__iexact=provider).first() if provider else None
        if self.instance is None:
            check_limit(org, "plans")
        if known:
            attrs["provider"] = known.name
            attrs["category"] = known.category
        elif self.instance is None:
            if not attrs.get("category"):
                raise serializers.ValidationError({"provider": "Unknown provider. Add it under Products first."})
            check_limit(org, "providers")
            Provider.objects.create(organization=org, name=provider, category=attrs["category"])
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
    service_status = serializers.SerializerMethodField()
    due_date = serializers.SerializerMethodField()
    # Field staff who collect from this customer. Empty list = every agent / technician sees it.
    collector_ids = OrgScopedPKField(
        source="collectors", many=True, required=False,
        queryset=User.objects.filter(role__in=Roles.FIELD, is_active=True),
    )
    collector_names = serializers.SerializerMethodField()

    class Meta:
        model = Customer
        fields = [
            "id", "organization_id", "customer_code", "name", "mobile", "email", "plan_id", "connection_type",
            "package", "category", "area_id", "area", "area_name", "status", "due_day", "permanent_discount",
            "monthly_amount", "sms_opt_in", "sms_language", "box_number", "stb_number", "can_caf_id", "address",
            "address_line1", "address_line2", "city", "state", "pincode", "notes", "created_at",
            "payment_status", "balance_amount", "collected_amount", "payment_method", "payment_updated_at",
            "collected_by_username", "service_status", "valid_until", "due_date",
            "collector_ids", "collector_names",
        ]
        read_only_fields = ["valid_until"]
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
        # The app sends the area as typed text: same as area_name (found or created by name).
        if isinstance(data.get("area"), str) and "area_name" not in data and "area_id" not in data:
            data["area_name"] = data.pop("area")
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
        plan = attrs.get("plan", getattr(self.instance, "plan", None))
        bulk = self.context.get("bulk_import", False)  # CSV import keeps its own, lighter rules
        if not bulk:
            # Area is needed to list and filter customers by area.
            has_area = attrs.get("area") or str(attrs.get("area_name", "")).strip()
            if self.instance is None and not has_area:
                raise serializers.ValidationError({"area": "Area is required."})
            # Cable customers must have their device (STB) ID: the provider portal needs it.
            stb = attrs.get("stb_number", getattr(self.instance, "stb_number", ""))
            if plan is not None and plan.category == "cable" and not str(stb or "").strip():
                raise serializers.ValidationError({"stb_number": "Device ID is required for cable customers."})
        # The same STB / box on two customers would mix up bills (and the customer app login).
        new_stb = str(attrs.get("stb_number") or "").strip()
        if new_stb and new_stb.upper() != str(getattr(self.instance, "stb_number", "") or "").strip().upper():
            org = require_org(self.context["request"].user)
            others = Customer.objects.filter(organization=org, stb_number__iexact=new_stb)
            if self.instance is not None:
                others = others.exclude(pk=self.instance.pk)
            if others.exists():
                raise serializers.ValidationError({"stb_number": "This Device ID is already used by another customer."})
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

    def get_collector_names(self, obj):
        return [u.display_name for u in obj.collectors.all()]

    def get_monthly_amount(self, obj):
        return str(obj.monthly_amount())

    def get_address(self, obj):
        return {
            "line1": obj.address_line1, "line2": obj.address_line2, "city": obj.city,
            "state": obj.state, "country": "India", "pincode": obj.pincode,
        }

    def _bill(self, obj):
        bills = getattr(obj, "current_bills", None)
        if bills is None:
            # Not prefetched (the answer to a create / edit): read it, or the app would show a paid
            # customer as unpaid right after saving.
            bills = list(obj.bills.exclude(status="cancelled").order_by("-period")[:1])
            obj.current_bills = bills
        bill = bills[0] if bills else None
        # Cable: only THIS month's bill is current. Last month's paid bill must not make this month look paid.
        if bill is not None and obj.is_cable and bill.period < timezone.localdate().replace(day=1):
            return None
        return bill

    def _last_payment(self, obj):
        bill = self._bill(obj)
        payments = getattr(obj, "current_payments", None)
        if payments is None:
            payments = list(obj.payments.filter(status="valid").select_related("collected_by")
                            .order_by("-collected_at")[:5]) if bill else []
            obj.current_payments = payments
        payments = [p for p in payments if bill and p.bill_id == bill.id]
        return payments[0] if payments else None

    def get_service_status(self, obj):
        return obj.service_status(self._bill(obj))

    def get_due_date(self, obj):
        """Cable: this month's cut-off date. Internet: plan expiry."""
        bill = self._bill(obj)
        if obj.is_cable:
            return bill.due_date.isoformat() if bill else None
        return obj.valid_until.isoformat() if obj.valid_until else None

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
