from datetime import date, datetime, time, timedelta

from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from core.audit import audit
from core.mixins import require_org
from core.permissions import ReadWriteRoles, Roles

from .models import SmsMessage


class SmsLogSerializer(serializers.ModelSerializer):
    mobile = serializers.CharField(source="to_mobile")
    message = serializers.CharField(source="body")
    customer_name = serializers.SerializerMethodField()

    class Meta:
        model = SmsMessage
        fields = ["id", "kind", "customer", "customer_name", "mobile", "language", "template_id", "message",
                  "status", "attempts", "sent_at", "created_at", "last_error"]

    def get_customer_name(self, obj):
        return obj.customer.name if obj.customer_id else obj.recipient_name


class SmsPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 200


def _parse_day(value, name):
    try:
        return date.fromisoformat(value)
    except (TypeError, ValueError):
        raise ValidationError({name: "Use YYYY-MM-DD."})


class SmsLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET /api/sms-logs?status=failed&kind=due_reminder&language=ta&from=2026-11-01&to=2026-11-30&search=ravi
    Every SMS sent to customers — proof when a customer says "I never got the SMS".
    """

    serializer_class = SmsLogSerializer
    pagination_class = SmsPagination
    permission_classes = [ReadWriteRoles]
    read_roles = Roles.OFFICE
    write_roles = (Roles.OWNER, Roles.MANAGER)

    def get_queryset(self):
        p = self.request.query_params
        qs = SmsMessage.objects.filter(organization=require_org(self.request.user)).select_related("customer")
        for field in ("status", "kind", "language"):
            if p.get(field):
                qs = qs.filter(**{field: p[field]})
        tz = timezone.get_current_timezone()
        if p.get("from"):
            qs = qs.filter(created_at__gte=datetime.combine(_parse_day(p["from"], "from"), time.min, tz))
        if p.get("to"):
            qs = qs.filter(created_at__lt=datetime.combine(_parse_day(p["to"], "to") + timedelta(days=1), time.min, tz))
        if p.get("search"):
            term = p["search"].strip()
            qs = qs.filter(Q(to_mobile__icontains=term) | Q(recipient_name__icontains=term)
                           | Q(customer__name__icontains=term))
        if p.get("customer"):
            qs = qs.filter(customer_id=p["customer"])
        return qs.order_by("-created_at", "-id")

    @action(detail=False, methods=["get"])
    def summary(self, request):
        """Counts for the header: today and this month."""
        org = require_org(request.user)
        today = timezone.localdate()
        base = SmsMessage.objects.filter(organization=org)

        def counts(qs):
            rows = dict(qs.values_list("status").annotate(n=Count("id")))
            return {s: rows.get(s, 0) for s in ("sent", "pending", "sending", "failed")}

        month_start = today.replace(day=1)
        return Response({
            "today": counts(base.filter(created_at__date=today)),
            "this_month": counts(base.filter(created_at__date__gte=month_start)),
        })

    @action(detail=True, methods=["post"])
    def retry(self, request, pk=None):
        """Send a failed SMS again (owner / manager)."""
        msg = self.get_object()
        if msg.status != SmsMessage.Status.FAILED:
            raise ValidationError({"detail": "Only failed SMS can be sent again."})
        msg.status = SmsMessage.Status.PENDING
        msg.attempts = 0
        msg.next_attempt_at = timezone.now()
        msg.last_error = ""
        msg.save(update_fields=["status", "attempts", "next_attempt_at", "last_error", "updated_at"])
        audit(request.user, "sms_retry", msg)
        return Response(SmsLogSerializer(msg).data, status=status.HTTP_200_OK)
