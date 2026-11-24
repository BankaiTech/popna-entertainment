"""
Two separate kinds of login:
- LCO Desk app logins (platform admin, distributor, owner, staff): JWT, never Django admin.
- Server admin logins (Django is_staff / is_superuser, made with `createsuperuser`): Django admin page only.
So a stolen app password never opens the raw database editor, and the database-editor password never
works in the app.
"""
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

SERVER_ADMIN_MESSAGE = "This is a server admin account. Use your LCO Desk login for the app."


class AppJWTAuthentication(JWTAuthentication):
    def get_user(self, validated_token):
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
