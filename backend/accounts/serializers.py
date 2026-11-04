from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from core.permissions import Roles

from .models import User

# What the existing React frontend understands.
FRONTEND_ROLE = {
    Roles.PLATFORM_ADMIN: "superadmin",
    Roles.DISTRIBUTOR: "superadmin",  # reuses the super-admin screens, limited to own operators
    Roles.OWNER: "admin",
    Roles.MANAGER: "admin",
    Roles.AGENT: "employee",
    Roles.TECHNICIAN: "employee",
}
ALL_SA_PERMISSIONS = [
    "sa_dashboard", "sa_organizations_view", "sa_organizations_add", "sa_organizations_edit",
    "sa_organizations_inactive", "sa_signup_requests", "sa_users",
]
DISTRIBUTOR_SA_PERMISSIONS = ["sa_dashboard", "sa_organizations_view", "sa_organizations_add"]
STAFF_MODULES = {
    Roles.AGENT: ["dashboard", "contacts", "payments"],
    Roles.TECHNICIAN: ["dashboard", "complaints"],
}


class MeSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    lco_role = serializers.CharField(source="role")
    name = serializers.CharField(source="display_name")
    organization_id = serializers.SerializerMethodField()
    organization_name = serializers.CharField(source="organization.name", default=None)
    allowed_modules = serializers.SerializerMethodField()
    super_admin_role = serializers.SerializerMethodField()
    sa_permissions = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    subscription = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id", "name", "username", "mobile", "role", "lco_role", "status", "organization_id",
            "organization_name", "distributor_id", "allowed_modules", "super_admin_role", "sa_permissions",
            "subscription",
        ]

    def get_subscription(self, obj):
        """The app checks this when the dashboard opens. The server also blocks every API call."""
        org = obj.organization
        if org is None:
            return None
        return {
            "state": org.subscription_state(),
            "start": org.subscription_start,
            "end": org.subscription_end,
            "days_left": org.days_left(),
            "organization_status": org.status,
        }

    def get_role(self, obj):
        return FRONTEND_ROLE.get(obj.role, "employee")

    def get_status(self, obj):
        return "active" if obj.is_active else "inactive"

    def get_organization_id(self, obj):
        return str(obj.organization_id) if obj.organization_id else None

    def get_allowed_modules(self, obj):
        if obj.role in STAFF_MODULES:
            return STAFF_MODULES[obj.role]
        if obj.role in (Roles.OWNER, Roles.MANAGER) and obj.organization:
            modules = list(obj.organization.allowed_modules)
            if obj.role == Roles.MANAGER:
                modules = [m for m in modules if m not in ("users", "settings")]
            return modules
        return None

    def get_super_admin_role(self, obj):
        return {Roles.PLATFORM_ADMIN: "super_admin", Roles.DISTRIBUTOR: "manager"}.get(obj.role)

    def get_sa_permissions(self, obj):
        if obj.role == Roles.PLATFORM_ADMIN:
            return ALL_SA_PERMISSIONS
        if obj.role == Roles.DISTRIBUTOR:
            return DISTRIBUTOR_SA_PERMISSIONS
        return None


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, min_length=8)
    status = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id", "username", "name", "mobile", "email", "role", "is_active", "status",
            "organization", "distributor", "password", "date_joined", "last_login",
        ]
        read_only_fields = ["date_joined", "last_login"]

    def get_status(self, obj):
        return "active" if obj.is_active else "inactive"

    def validate_password(self, value):
        validate_password(value)
        return value

    def validate(self, attrs):
        request = self.context["request"]
        actor = request.user
        role = attrs.get("role", getattr(self.instance, "role", None))
        if actor.role == Roles.OWNER:
            if self.instance is not None and self.instance.role == Roles.OWNER:
                raise serializers.ValidationError({"detail": "Owner accounts are managed by LCO Desk support."})
            if role not in (Roles.MANAGER, Roles.AGENT, Roles.TECHNICIAN):
                raise serializers.ValidationError({"role": "Owners can create managers, agents and technicians only."})
            attrs["organization"] = actor.organization
            attrs["distributor"] = None
        if self.instance is None and not attrs.get("password"):
            raise serializers.ValidationError({"password": "Password is required for new users."})
        candidate = User(**{k: v for k, v in attrs.items() if k != "password"})
        if self.instance is not None:
            for field in ("organization", "distributor"):
                if field not in attrs:
                    setattr(candidate, field, getattr(self.instance, field))
        candidate.role = role
        candidate.clean()
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        for key, value in validated_data.items():
            setattr(instance, key, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance
