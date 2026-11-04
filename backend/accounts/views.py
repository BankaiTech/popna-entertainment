from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from core.audit import audit
from core.permissions import ReadWriteRoles, Roles

from .models import User
from .serializers import MeSerializer, UserSerializer


class LoginView(TokenObtainPairView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"


class RefreshView(TokenRefreshView):
    permission_classes = [AllowAny]


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout_view(request):
    token = request.data.get("refresh")
    if token:
        try:
            RefreshToken(token).blacklist()
        except TokenError:
            pass
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me_view(request):
    return Response(MeSerializer(request.user).data)


class UserViewSet(viewsets.ModelViewSet):
    """Platform admin: all users. Owner: own staff. Manager: read-only list of own staff."""

    serializer_class = UserSerializer
    permission_classes = [ReadWriteRoles]
    read_roles = (Roles.PLATFORM_ADMIN, Roles.OWNER, Roles.MANAGER)
    write_roles = (Roles.PLATFORM_ADMIN, Roles.OWNER)
    filterset_fields = ["role", "is_active", "organization"]
    search_fields = ["username", "name", "mobile"]

    def get_queryset(self):
        user = self.request.user
        qs = User.objects.select_related("organization").order_by("username")
        if user.role == Roles.PLATFORM_ADMIN:
            return qs
        return qs.filter(organization=user.organization).exclude(role=Roles.PLATFORM_ADMIN)

    def perform_create(self, serializer):
        try:
            obj = serializer.save()
        except DjangoValidationError as exc:
            raise ValidationError(exc.message_dict)
        audit(self.request.user, "user_created", obj, role=obj.role)

    def perform_destroy(self, instance):
        # Never hard-delete staff: their payments must keep pointing at them.
        if instance == self.request.user:
            raise ValidationError({"detail": "You cannot deactivate yourself."})
        if self.request.user.role == Roles.OWNER and instance.role not in Roles.TENANT[1:]:
            raise ValidationError({"detail": "Owners can deactivate managers, agents and technicians only."})
        instance.is_active = False
        instance.save(update_fields=["is_active"])
        audit(self.request.user, "user_deactivated", instance)
