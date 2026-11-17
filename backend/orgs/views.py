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
from core.mixins import require_org_member
from core.permissions import ReadWriteRoles, Roles, role_in
from customers.models import Customer

from .models import Distributor, Organization, PlatformPayment, SignupRequest
from . import billing as platform_billing
from .services import delete_organization, generate_password
from .serializers import (
    PlatformPaymentClaimSerializer,
    PlatformPaymentSerializer,
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



@api_view(["GET"])
@permission_classes([role_in(Roles.OWNER, Roles.MANAGER)])
def my_plan(request):
    """
    GET /api/my-plan  - everything the operator's "Plan & SMS" settings page shows, in one call:
    subscription, monthly fee, SMS used this month, a live monthly SMS estimate, where to pay, recent payments.
    Works even after the subscription has ended (so the owner can renew).
    """
    org = require_org_member(request.user)
    payments = PlatformPayment.objects.filter(organization=org).select_related("created_by")[:20]
    return Response({
        "organization_id": org.id,
        "organization_name": org.name,
        "subscription": {
            "start": org.subscription_start,
            "end": org.subscription_end,
            "state": org.subscription_state(),
            "days_left": org.days_left(),
            "monthly_fee": str(platform_billing.money(org.monthly_fee)) if org.monthly_fee is not None else None,
        },
        "sms": platform_billing.sms_usage(org),
        "estimate": platform_billing.sms_estimate(org),
        "pay": platform_billing.payment_info(org),
        "payments": PlatformPaymentSerializer(payments, many=True).data,
    })


class PlatformPaymentViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    """
    POST /api/platform-payments                 operator (owner/manager): "I paid" + UTR, amount worked out here
    GET  /api/platform-payments                 operator: own; app owner: all (?status=pending)
    POST /api/platform-payments/<id>/approve    app owner: adds SMS credits / extends the subscription
    POST /api/platform-payments/<id>/reject     app owner: {"note": "..."}
    GET  /api/platform-payments/summary         app owner: {"pending": n}
    """

    serializer_class = PlatformPaymentSerializer

    def get_permissions(self):
        if self.action in ("approve", "reject", "summary"):
            return [role_in(Roles.PLATFORM_ADMIN)()]
        return [role_in(Roles.PLATFORM_ADMIN, Roles.OWNER, Roles.MANAGER)()]

    def get_queryset(self):
        user = self.request.user
        qs = PlatformPayment.objects.select_related("organization", "created_by")
        if user.role != Roles.PLATFORM_ADMIN:
            qs = qs.filter(organization=require_org_member(user))
        wanted = self.request.query_params.get("status")
        return qs.filter(status=wanted) if wanted else qs

    def create(self, request):
        org = require_org_member(request.user)
        form = PlatformPaymentClaimSerializer(data=request.data)
        form.is_valid(raise_exception=True)
        data = form.validated_data
        if data["kind"] == PlatformPayment.Kind.SMS:
            rate = org.sms_rate
        else:
            if not org.monthly_fee:
                raise ValidationError({"kind": "Your monthly fee is not set yet. Contact LCO Desk."})
            rate = org.monthly_fee
        payment = PlatformPayment.objects.create(
            organization=org, kind=data["kind"], quantity=data["quantity"], rate=rate,
            amount=platform_billing.money(rate * data["quantity"]), upi_app=data.get("upi_app", ""),
            utr=data["utr"], created_by=request.user,
        )
        audit(request.user, "platform_payment_claimed", payment, kind=payment.kind, amount=str(payment.amount))
        return Response(PlatformPaymentSerializer(payment).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        payment = self.get_object()
        if payment.status != PlatformPayment.Status.PENDING:
            raise ValidationError({"status": "This payment was already checked."})
        payment = platform_billing.approve_payment(payment, request.user)
        audit(request.user, "platform_payment_approved", payment, kind=payment.kind, amount=str(payment.amount),
              organization=payment.organization.code)
        return Response(PlatformPaymentSerializer(payment).data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        payment = self.get_object()
        if payment.status != PlatformPayment.Status.PENDING:
            raise ValidationError({"status": "This payment was already checked."})
        payment.status = PlatformPayment.Status.REJECTED
        payment.admin_note = str(request.data.get("note", ""))[:300]
        payment.decided_by = request.user
        payment.decided_at = timezone.now()
        payment.save()
        audit(request.user, "platform_payment_rejected", payment, note=payment.admin_note)
        return Response(PlatformPaymentSerializer(payment).data)

    @action(detail=False, methods=["get"])
    def summary(self, request):
        return Response({"pending": PlatformPayment.objects.filter(status=PlatformPayment.Status.PENDING).count()})
