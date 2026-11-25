from django.db.models import Prefetch
from rest_framework import serializers, status
from rest_framework.decorators import api_view, authentication_classes, permission_classes, throttle_classes
from rest_framework.exceptions import AuthenticationFailed, NotFound, PermissionDenied, ValidationError
from rest_framework.permissions import AllowAny, BasePermission
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, SimpleRateThrottle

from core.validators import normalize_mobile

from billing.models import Bill, Payment
from billing.services import current_bill
from complaints.models import Complaint, raise_complaint

from .auth import (SCOPE, CustomerJWTAuthentication, NoAuth, customer_from_refresh, find_customer, issue_tokens,
                   require_service)

MAX_OPEN_COMPLAINTS = 3


def complaints_enabled(org):
    """Complaints only when the operator has the Complaints page; otherwise nobody would see them."""
    return "complaints" in (org.allowed_modules or [])


def require_complaints(customer):
    if not complaints_enabled(customer.organization):
        raise PermissionDenied("Complaints are not available. Please call your cable operator.")


class IsCustomer(BasePermission):
    message = "This page is for customers only."

    def has_permission(self, request, view):
        return getattr(request.user, "role", None) == SCOPE


def customer_view(methods):
    """Decorator stack for every customer endpoint: customer token only, customer principal only."""
    def wrap(fn):
        fn = permission_classes([IsCustomer])(fn)
        fn = authentication_classes([CustomerJWTAuthentication])(fn)
        return api_view(methods)(fn)
    return wrap


# ---------- login ----------

class LoginIpThrottle(AnonRateThrottle):
    scope = "customer_login"  # per IP


class LoginMobileThrottle(SimpleRateThrottle):
    """Per mobile number, so guessing box numbers from many IPs is still slow."""

    scope = "customer_login_mobile"

    def get_cache_key(self, request, view):
        mobile = normalize_mobile(str(request.data.get("mobile") or ""))
        return self.cache_format % {"scope": self.scope, "ident": mobile} if mobile else None


@api_view(["POST"])
@authentication_classes([NoAuth])
@permission_classes([AllowAny])
@throttle_classes([LoginIpThrottle, LoginMobileThrottle])
def login(request):
    customer = find_customer(request.data.get("mobile"), request.data.get("box_number"))
    if customer is None:
        raise AuthenticationFailed("Mobile number or box number is not correct. Check the number on your "
                                   "set-top box or ask your cable operator.")
    return Response({**issue_tokens(customer), "customer": _profile(customer)})


@api_view(["POST"])
@authentication_classes([NoAuth])
@permission_classes([AllowAny])
def refresh(request):
    token, customer = customer_from_refresh(request.data.get("refresh") or "")
    token.blacklist()  # one use only
    return Response(issue_tokens(customer))


@api_view(["POST"])
@authentication_classes([NoAuth])
@permission_classes([AllowAny])
def logout(request):
    try:
        token, _ = customer_from_refresh(request.data.get("refresh") or "")
        token.blacklist()
    except AuthenticationFailed:
        pass
    return Response(status=status.HTTP_204_NO_CONTENT)


# ---------- data ----------

def _profile(customer):
    org = customer.organization
    if customer.is_cable:
        bill = current_bill(customer)  # this month's bill, same as the collector sees (made now if missing)
    else:
        bill = (customer.bills.filter(status__in=[Bill.Status.UNPAID, Bill.Status.PARTIAL]).order_by("-period").first()
                or customer.bills.exclude(status=Bill.Status.CANCELLED).order_by("-period").first())
    return {
        "id": customer.id,
        "name": customer.name,
        "mobile": customer.mobile,
        "area": customer.area.name if customer.area_id else "",
        "stb_number": customer.stb_number,
        "category": customer.plan.category,
        "plan": customer.plan.name,
        "provider": customer.plan.provider,
        "monthly_amount": str(customer.monthly_amount()),
        "valid_until": customer.valid_until,
        "service_status": customer.service_status(bill),
        "current_bill": _bill(bill) if bill else None,
        "complaints_enabled": complaints_enabled(org),
        "operator": {
            "name": org.name,
            "phone": org.contact_phone or org.owner_mobile,
            "upi_id": org.upi_id,
            "upi_payee_name": org.upi_payee_name or org.name,
            "app_language": org.app_language,
        },
    }


def _bill(bill):
    return {
        "id": bill.id, "period": bill.period, "due_date": bill.due_date, "amount_due": str(bill.amount_due),
        "amount_paid": str(bill.amount_paid), "discount": str(bill.discount), "balance": str(bill.balance),
        "status": bill.status,
    }


@customer_view(["GET"])
def me(request):
    customer = request.user.customer
    require_service(customer)
    return Response(_profile(customer))


@customer_view(["GET"])
def bills(request):
    customer = request.user.customer
    require_service(customer)
    rows = (customer.bills.exclude(status=Bill.Status.CANCELLED).order_by("-period")
            .prefetch_related(Prefetch("payments", queryset=Payment.objects.filter(status=Payment.Status.VALID)
                                       .order_by("collected_at"), to_attr="valid_payments"))[:24])
    return Response([
        {**_bill(b), "payments": [
            {"id": p.id, "receipt_no": p.receipt_no, "amount": str(p.amount), "discount": str(p.discount),
             "method": p.method, "collected_at": p.collected_at} for p in b.valid_payments]}
        for b in rows
    ])


class CustomerComplaintSerializer(serializers.ModelSerializer):
    category_label = serializers.CharField(source="get_category_display", read_only=True)
    technician = serializers.SerializerMethodField()
    updates = serializers.SerializerMethodField()

    class Meta:
        model = Complaint
        fields = ["id", "ticket_no", "category", "category_label", "description", "status", "technician",
                  "resolution_note", "created_at", "resolved_at", "updates"]
        read_only_fields = ["ticket_no", "status", "resolution_note", "created_at", "resolved_at"]

    def get_technician(self, obj):
        return obj.assigned_to.display_name if obj.assigned_to and obj.status != "cancelled" else ""

    def get_updates(self, obj):
        return [{"action": u.action, "note": u.note if u.action in ("resolved", "cancelled") else "",
                 "at": u.created_at} for u in obj.updates.all()]

    def validate_category(self, value):
        if value not in Complaint.Category.values:
            raise ValidationError("Choose the problem.")
        return value


@customer_view(["GET", "POST"])
def complaints(request):
    customer = request.user.customer
    require_service(customer)
    if request.method == "POST":
        require_complaints(customer)
        if customer.complaints.filter(status__in=Complaint.OPEN_STATES).count() >= MAX_OPEN_COMPLAINTS:
            raise ValidationError({"detail": "You already have open complaints. Please wait for them to be fixed."})
        s = CustomerComplaintSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        c = raise_complaint(customer=customer, category=s.validated_data["category"],
                            description=s.validated_data.get("description", ""), by_customer=True)
        return Response(CustomerComplaintSerializer(c).data, status=status.HTTP_201_CREATED)
    rows = customer.complaints.select_related("assigned_to").prefetch_related("updates")[:30]
    return Response(CustomerComplaintSerializer(rows, many=True).data)


@customer_view(["POST"])
def cancel_complaint(request, pk):
    """The customer withdraws their own open complaint (e.g. the problem fixed itself)."""
    from complaints.models import ComplaintUpdate

    customer = request.user.customer
    require_service(customer)
    require_complaints(customer)
    complaint = customer.complaints.filter(pk=pk).first()
    if complaint is None:
        raise NotFound("Complaint not found.")
    if complaint.status not in Complaint.OPEN_STATES:
        raise ValidationError({"detail": "This complaint is already closed."})
    complaint.status = Complaint.Status.CANCELLED
    complaint.save(update_fields=["status", "updated_at"])
    ComplaintUpdate.objects.create(complaint=complaint, action=ComplaintUpdate.Action.CANCELLED,
                                   note="Cancelled by customer", by_customer=True)
    return Response(CustomerComplaintSerializer(complaint).data)
