"""
Two separate kinds of login:
- LCO Desk app logins (platform admin, distributor, owner, staff): JWT, never Django admin.
- Server admin logins (Django is_staff / is_superuser, made with `createsuperuser`): Django admin page only.
So a stolen app password never opens the raw database editor, and the database-editor password never
works in the app.
"""
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer, TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken

SERVER_ADMIN_MESSAGE = "This is a server admin account. Use your LCO Desk login for the app."


CUSTOMER_TOKEN_MESSAGE = "Please log in again."


def _is_customer_token(token):
    """Customer-app tokens (portal app) carry scope=customer and no user id. Never valid for staff."""
    return token.get("scope") is not None or token.get("customer_id") is not None


class AppJWTAuthentication(JWTAuthentication):
    def get_user(self, validated_token):
        if _is_customer_token(validated_token):
            raise AuthenticationFailed(CUSTOMER_TOKEN_MESSAGE, code="token_not_valid")
        user = super().get_user(validated_token)
        if user.is_staff or user.is_superuser:
            raise AuthenticationFailed(SERVER_ADMIN_MESSAGE, code="server_admin")
        return user


class AppLoginSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        if self.user.is_staff or self.user.is_superuser:
            raise AuthenticationFailed(SERVER_ADMIN_MESSAGE, code="server_admin")
        return data


class StaffRefreshSerializer(TokenRefreshSerializer):
    """Staff token refresh. A customer refresh token is refused here (it has its own refresh endpoint)."""

    def validate(self, attrs):
        try:
            token = RefreshToken(attrs["refresh"])
        except Exception:
            token = None  # let the parent give its normal error
        if token is not None and (_is_customer_token(token) or not token.get("user_id")):
            raise AuthenticationFailed(CUSTOMER_TOKEN_MESSAGE, code="token_not_valid")
        return super().validate(attrs)


def end_all_sessions(user):
    """Password changed or login switched off: every refresh token this person holds stops working.
    (Access tokens die within JWT_ACCESS_MINUTES; deactivated users are refused at once anyway.)"""
    from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken

    for token in OutstandingToken.objects.filter(user=user, blacklistedtoken__isnull=True):
        BlacklistedToken.objects.get_or_create(token=token)
