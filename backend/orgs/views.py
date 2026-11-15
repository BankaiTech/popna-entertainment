from django.db.models import Count, Q, Sum
from django.utils import timezone
from datetime import timedelta

from rest_framework import mixins, status, viewsets
from rest_framework.permissions import AllowAny
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.decorators import action, api_view, permission_classes
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from billing.models import Bill, Payment
from billing.services import month_start
from core.audit import audit
from core.permissions import ReadWriteRoles, Roles, role_in
from customers.models import Customer

from .models import Distributor, Organization, SignupRequest
from .services import delete_organization, generate_password
from .serializers import (
    PublicSignupSerializer,
    SignupRequestSerializer,
    DistributorOrganizationSerializer,
    DistributorSerializer,
    OrganizationOwnerSerializer,
    OrganizationSerializer,
    OrganizationStatusSerializer,
)


class DistributorViewSet(viewsets.ModelViewSet):
    queryset = Distributor.objects.all()
    serializer_class = DistributorSerializer
    permission_classes = [role_in(Roles.PLATFORM_ADMIN)]
    search_fields = ["name", "mobile"]


class OrganizationViewSet(viewsets.ModelViewSet):
    permission_classes = [ReadWriteRoles]
    read_roles = (Roles.PLATFORM_ADMIN, Roles.DISTRIBUTOR, Roles.OWNER, Roles.MANAGER)
    write_roles = (Roles.PLATFORM_ADMIN, Roles.DISTRIBUTOR, Roles.OWNER)
    search_fields = ["name", "code"]
    filterset_fields = ["status", "distributor"]

    def get_queryset(self):
        user = self.request.user
        qs = Organization.objects.select_related("distributor")
        if user.role == Roles.PLATFORM_ADMIN:
            return qs
        if user.role == Roles.DISTRIBUTOR:
            return qs.filter(distributor=user.distributor)
        return qs.filter(pk=user.organization_id)

    def get_serializer_class(self):
        role = self.request.user.role
        if role in (Roles.OWNER, Roles.MANAGER):
            return OrganizationOwnerSerializer
        if role == Roles.DISTRIBUTOR:
            return DistributorOrganizationSerializer
        return OrganizationSerializer

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == Roles.OWNER:
            raise PermissionDenied("Owners cannot create operators.")
        if user.role == Roles.DISTRIBUTOR:
            # Stays disabled until the app owner sets the subscription and activates it.
            obj = serializer.save(distributor=user.distributor, status=Organization.Status.DISABLED)
        else:
            obj = serializer.save()
        audit(user, "organization_created", obj)

    def perform_update(self, serializer):
        user = self.request.user
        obj = serializer.save()
        audit(user, "organization_updated", obj, fields=",".join(sorted(serializer.validated_data)))

    def destroy(self, request, *args, **kwargs):
        """
        DELETE /api/organizations/{id}?confirm=<CODE> — app owner only, and only for an operator that is
        disabled or suspended. Removes the operator and ALL its data permanently.
        """
        if request.user.role != Roles.PLATFORM_ADMIN:
            raise PermissionDenied("Only the app owner can delete an operator.")
        org = self.get_object()
        if org.status == Organization.Status.ACTIVE:
            raise ValidationError({"detail": "Disable or suspend this operator before deleting it."})
        if (request.query_params.get("confirm") or "").strip().lower() != org.code.lower():
            raise ValidationError({"confirm": f"Type the operator code {org.code} to confirm."})
        counts = delete_organization(org, by_user=request.user)
        return Response({"deleted": True, "rows": counts})

    @action(detail=True, methods=["post"], url_path="reset-owner-password",
            permission_classes=[role_in(Roles.PLATFORM_ADMIN)])
    def reset_owner_password(self, request, pk=None):
        """
        POST {"password": "<optional>"} — sets a new password for the operator's owner login and returns it ONCE.
        Passwords are stored hashed, so the old one can never be shown.
        """
        org = self.get_object()
        from accounts.models import User

        owner = User.objects.filter(organization=org, role=Roles.OWNER).order_by("id").first()
        if owner is None:
            raise ValidationError({"detail": "This operator has no owner login."})
        password = (request.data.get("password") or "").strip() or generate_password()
        try:
            validate_password(password, owner)
        except DjangoValidationError as exc:
            raise ValidationError({"password": list(exc.messages)})
        owner.set_password(password)
        owner.save(update_fields=["password"])
        audit(request.user, "owner_password_reset", org, username=owner.username)
        return Response({"username": owner.username, "password": password})

    @action(detail=True, methods=["patch"], url_path="status", permission_classes=[role_in(Roles.PLATFORM_ADMIN)])
    def set_status(self, request, pk=None):
        """PATCH /api/organizations/{id}/status {"status": "suspended"} — app owner only."""
        org = self.get_object()
        body = OrganizationStatusSerializer(data=request.data)
        body.is_valid(raise_exception=True)
        org.status = body.validated_data["status"]
        org.save(update_fields=["status", "updated_at"])
        audit(request.user, "organization_status", org, status=org.status)
        return Response(OrganizationSerializer(org, context={"request": request}).data)


@api_view(["GET"])
@permission_classes([role_in(Roles.PLATFORM_ADMIN, Roles.DISTRIBUTOR)])
def distributor_summary(request):
    """Per-operator numbers for distributors. No customer personal data is exposed here."""
    user = request.user
    orgs = Organization.objects.all()
    if user.role == Roles.DISTRIBUTOR:
        orgs = orgs.filter(distributor=user.distributor)
    elif request.query_params.get("distributor"):
        orgs = orgs.filter(distributor_id=request.query_params["distributor"])
    period = month_start(timezone.localdate())
    rows = []
    for org in orgs.order_by("name"):
        bills = Bill.objects.filter(organization=org, period=period).exclude(status=Bill.Status.CANCELLED)
        billed = bills.aggregate(total=Sum("amount_due"))["total"] or 0
        collected = (
            Payment.objects.filter(organization=org, status=Payment.Status.VALID, bill__period=period)
            .aggregate(total=Sum("amount"))["total"] or 0
        )
        customers = Customer.objects.filter(organization=org).aggregate(
            active=Count("id", filter=Q(status=Customer.Status.ACTIVE)),
            cable=Count("id", filter=Q(status=Customer.Status.ACTIVE, plan__category="cable")),
            internet=Count("id", filter=Q(status=Customer.Status.ACTIVE, plan__category="internet")),
        )
        rows.append({
            "organization_id": org.id,
            "name": org.name,
            "code": org.code,
            "status": org.status,
            "active_customers": customers["active"],
            "cable_customers": customers["cable"],
            "internet_customers": customers["internet"],
            "billed_this_month": billed,
            "collected_this_month": collected,
            "collection_percent": round(float(collected) * 100 / float(billed), 1) if billed else 0,
        })
    return Response({"period": period.strftime("%Y-%m"), "operators": rows})



class SignupRequestViewSet(
    mixins.CreateModelMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin, mixins.DestroyModelMixin, viewsets.GenericViewSet,
):
    """
    POST   /api/signup-requests        public sign-up form (no login, rate limited)
    GET    /api/signup-requests        app owner only (?status=new)
    PATCH  /api/signup-requests/<id>   app owner: status / notes
    DELETE /api/signup-requests/<id>   app owner
    GET    /api/signup-requests/summary  app owner: {"new": n}
    """

    queryset = SignupRequest.objects.all()
    serializer_class = SignupRequestSerializer

    def get_permissions(self):
        if self.action == "create":
            return [AllowAny()]
        return [role_in(Roles.PLATFORM_ADMIN)()]

    def get_throttles(self):
        if self.action == "create":
            self.throttle_scope = "signup"
            return [ScopedRateThrottle()]
        return []

    def get_queryset(self):
        qs = super().get_queryset()
        wanted = self.request.query_params.get("status")
        if wanted:
            qs = qs.filter(status=wanted)
        return qs

    def create(self, request, *args, **kwargs):
        form = PublicSignupSerializer(data=request.data)
        form.is_valid(raise_exception=True)
        data = dict(form.validated_data)
        if data.pop("website", ""):
            # Bot filled the hidden field: pretend it worked, save nothing.
            return Response({"ok": True}, status=status.HTTP_201_CREATED)
        # Same mobile again within 30 days and not handled yet: refresh that row instead of a duplicate.
        recent = (
            SignupRequest.objects.filter(
                mobile=data["mobile"],
                status__in=[SignupRequest.Status.NEW, SignupRequest.Status.CONTACTED],
                created_at__gte=timezone.now() - timedelta(days=30),
            ).first()
        )
        if recent:
            for field, value in data.items():
                if value not in ("", None):
                    setattr(recent, field, value)
            recent.submit_count += 1
            recent.save()
        else:
            SignupRequest.objects.create(**data)
        # Never echo stored data back to an anonymous caller.
        return Response({"ok": True}, status=status.HTTP_201_CREATED)

    def perform_update(self, serializer):
        before = serializer.instance.status
        obj = serializer.save()
        if obj.status != before:
            audit(self.request.user, "signup_status", obj, before=before, after=obj.status)

    def perform_destroy(self, instance):
        audit(self.request.user, "signup_deleted", instance, business=instance.business_name, mobile=instance.mobile)
        instance.delete()

    @action(detail=False, methods=["get"])
    def summary(self, request):
        return Response({"new": SignupRequest.objects.filter(status=SignupRequest.Status.NEW).count()})
