"""
Customer login (cable / internet subscriber) with mobile + box number. Completely separate from staff logins:
- customer tokens carry `scope=customer` and a `customer_id`, never a user id, so the staff API refuses them;
- staff tokens carry no `customer_id`, so the customer API refuses them;
- a customer can only ever reach their own connection.
"""
from datetime import timedelta

from django.conf import settings
from django.db.models import Q
from rest_framework.authentication import BaseAuthentication, get_authorization_header
from rest_framework.exceptions import AuthenticationFailed, PermissionDenied
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken

from core.validators import normalize_mobile
from customers.models import Customer

SCOPE = "customer"


class CustomerPrincipal:
    """request.user for customer requests. Has no staff role, so every staff permission check says no."""

    is_authenticated = True
    is_anonymous = False
    is_staff = False
    is_superuser = False
    role = SCOPE

    def __init__(self, customer):
        self.customer = customer
        self.organization = customer.organization
        self.pk = self.id = f"c{customer.pk}"  # throttles key on this; never a real user id

    def __str__(self):
        return f"customer:{self.customer.pk}"


def find_customer(mobile, box):
    """Active customer whose mobile AND box / STB / customer ID match. None if no single match."""
    mobile = normalize_mobile(str(mobile or ""))
    if len(mobile) == 11 and mobile.startswith("0"):  # 09840012345
        mobile = mobile[1:]
    box = str(box or "").strip()
    if len(mobile) != 10 or len(box) < 3:
        return None
    matches = list(
        Customer.objects.select_related("organization")
        .filter(mobile=mobile, status=Customer.Status.ACTIVE, organization__status="active")
        .filter(Q(stb_number__iexact=box) | Q(box_number__iexact=box) | Q(customer_code__iexact=box)
                | Q(can_caf_id__iexact=box))[:2]
    )
    return matches[0] if len(matches) == 1 else None


def issue_tokens(customer):
    refresh = RefreshToken()
    refresh.set_exp(lifetime=timedelta(days=settings.CUSTOMER_REFRESH_DAYS))
    refresh["scope"] = SCOPE
    refresh["customer_id"] = customer.pk
    access = refresh.access_token
    return {"access": str(access), "refresh": str(refresh)}


def customer_from_refresh(raw):
    try:
        token = RefreshToken(raw)  # checks signature, expiry and the blacklist
    except TokenError:
        raise AuthenticationFailed("Please log in again.")
    if token.get("scope") != SCOPE or not token.get("customer_id"):
        raise AuthenticationFailed("Please log in again.")
    customer = active_customer(token["customer_id"])
    return token, customer


def active_customer(customer_id):
    customer = Customer.objects.select_related("organization", "plan", "area").filter(pk=customer_id).first()
    if customer is None or customer.status != Customer.Status.ACTIVE or customer.organization.status != "active":
        raise AuthenticationFailed("This connection is not active. Contact your cable operator.")
    return customer


class NoAuth(BaseAuthentication):
    """For login / refresh / logout: ignores any Authorization header, but bad details still answer 401."""

    def authenticate(self, request):
        return None

    def authenticate_header(self, request):
        return 'Bearer realm="customer"'


class CustomerJWTAuthentication(BaseAuthentication):
    keyword = b"bearer"

    def authenticate(self, request):
        header = get_authorization_header(request).split()
        if not header or header[0].lower() != self.keyword:
            return None
        if len(header) != 2:
            raise AuthenticationFailed("Please log in again.")
        try:
            token = AccessToken(header[1].decode())
        except (TokenError, UnicodeError):
            raise AuthenticationFailed("Please log in again.", code="token_not_valid")
        if token.get("scope") != SCOPE or not token.get("customer_id"):
            raise AuthenticationFailed("This page is for customers only.")
        return CustomerPrincipal(active_customer(token["customer_id"])), token

    def authenticate_header(self, request):
        return 'Bearer realm="customer"'


def require_service(customer):
    """The operator's LCO Desk subscription must be running for the customer app to work."""
    if customer.organization.subscription_state() != "active":
        raise PermissionDenied("This service is not available now. Contact your cable operator.")
