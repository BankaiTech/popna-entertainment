from rest_framework import serializers, viewsets

from core.mixins import require_org
from core.permissions import ReadWriteRoles, Roles

from .models import SmsMessage


class SmsLogSerializer(serializers.ModelSerializer):
    mobile = serializers.CharField(source="to_mobile")
    message = serializers.CharField(source="body")

    class Meta:
        model = SmsMessage
        fields = ["id", "kind", "mobile", "message", "status", "attempts", "sent_at", "created_at", "last_error"]


class SmsLogViewSet(viewsets.ReadOnlyModelViewSet):
    """GET /api/sms-logs — proof for the owner when a customer says 'I never got the SMS'."""

    serializer_class = SmsLogSerializer
    permission_classes = [ReadWriteRoles]
    read_roles = Roles.OFFICE
    write_roles = ()
    filterset_fields = ["kind", "status"]
    search_fields = ["to_mobile"]

    def get_queryset(self):
        return SmsMessage.objects.filter(organization=require_org(self.request.user))
