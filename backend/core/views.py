from django.db.models import Count, Q, Sum
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from billing.models import Bill, Payment
from billing.services import month_start
from customers.models import Customer

from .mixins import require_org
from .permissions import Roles, role_in


@api_view(["GET"])
@permission_classes([AllowAny])
def health(request):
    return Response({"status": "ok"})


@api_view(["GET"])
@permission_classes([role_in(*Roles.OFFICE)])
def dashboard_stats(request):
    org = require_org(request.user)
    today = timezone.localdate()
    period = month_start(today)
    customers = Customer.objects.filter(organization=org)
    counts = customers.aggregate(
        total=Count("id"),
        active=Count("id", filter=Q(status=Customer.Status.ACTIVE)),
        inactive=Count("id", filter=Q(status=Customer.Status.INACTIVE)),
        new_this_month=Count("id", filter=Q(created_at__date__gte=period)),
    )
    by_provider = list(
        customers.values("plan__provider", "plan__category")
        .annotate(
            active=Count("id", filter=Q(status=Customer.Status.ACTIVE)),
            inactive=Count("id", filter=Q(status=Customer.Status.INACTIVE)),
        )
        .order_by("plan__category", "plan__provider")
    )
    bills = Bill.objects.filter(organization=org, period=period).exclude(status=Bill.Status.CANCELLED)
    bill_totals = bills.aggregate(
        billed=Sum("amount_due"), paid=Sum("amount_paid"),
        unpaid_count=Count("id", filter=Q(status__in=[Bill.Status.UNPAID, Bill.Status.PARTIAL])),
    )
    valid = Payment.objects.filter(organization=org, status=Payment.Status.VALID)
    today_totals = valid.filter(collected_at__date=today).aggregate(
        total=Sum("amount"), count=Count("id"),
        cash=Sum("amount", filter=Q(method=Payment.Method.CASH)),
        upi=Sum("amount", filter=Q(method=Payment.Method.UPI)),
    )
    by_agent = list(
        valid.filter(collected_at__date=today)
        .values("collected_by__id", "collected_by__username", "collected_by__name")
        .annotate(total=Sum("amount"), count=Count("id"))
        .order_by("-total")
    )
    billed = bill_totals["billed"] or 0
    paid = bill_totals["paid"] or 0
    return Response({
        "period": period.strftime("%Y-%m"),
        "customers": counts,
        "by_provider": [
            {"provider": r["plan__provider"], "category": r["plan__category"],
             "active": r["active"], "inactive": r["inactive"]}
            for r in by_provider
        ],
        "this_month": {
            "billed": billed, "collected": paid, "pending_bills": bill_totals["unpaid_count"],
            "collection_percent": round(float(paid) * 100 / float(billed), 1) if billed else 0,
        },
        "today": {k: (v or 0) for k, v in today_totals.items()},
        "today_by_agent": by_agent,
    })
