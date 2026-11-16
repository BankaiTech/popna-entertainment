from datetime import timedelta

from django.db.models import Prefetch
from django.utils import timezone
from decimal import Decimal, InvalidOperation

from django.db import transaction
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError

from billing.models import Bill, Payment
from billing.services import month_start
from core.audit import audit
from core.mixins import OrgScopedViewSet, require_org
from core.permissions import Roles, role_in

from .models import Area, Customer, Plan, Provider
from .serializers import AreaSerializer, CustomerSerializer, PlanSerializer, ProviderSerializer


class AreaViewSet(OrgScopedViewSet):
    queryset = Area.objects.all()
    serializer_class = AreaSerializer
    search_fields = ["name"]


class ProviderViewSet(OrgScopedViewSet):
    """Mounted at /api/products — the React app's name for providers (GTPL, RailWire...)."""

    queryset = Provider.objects.all()
    serializer_class = ProviderSerializer
    filterset_fields = ["category", "is_active"]
    search_fields = ["name"]

    def perform_destroy(self, instance):
        if Plan.objects.filter(organization=instance.organization, provider__iexact=instance.name).exists():
            raise ValidationError({"detail": "Plans use this provider. Mark it inactive instead."})
        instance.delete()


class PlanViewSet(OrgScopedViewSet):
    queryset = Plan.objects.all()
    serializer_class = PlanSerializer
    filterset_fields = ["category", "provider", "is_active"]
    search_fields = ["provider", "name"]

    def perform_destroy(self, instance):
        if instance.customers.exists():
            raise ValidationError({"detail": "Customers use this plan. Mark it inactive instead."})
        instance.delete()


class CustomerViewSet(OrgScopedViewSet):
    """Mounted at /api/contacts (what the React app calls) and /api/customers."""

    queryset = Customer.objects.select_related("plan", "area")
    serializer_class = CustomerSerializer
    filterset_fields = {"status": ["exact"], "area": ["exact"], "plan": ["exact"], "plan__category": ["exact"]}
    search_fields = ["name", "mobile", "customer_code", "box_number", "stb_number", "can_caf_id"]
    ordering_fields = ["name", "created_at"]

    def get_queryset(self):
        # Latest bill per customer = its current bill (cable: this month; internet: current renewal).
        since = timezone.localdate() - timedelta(days=70)
        return super().get_queryset().prefetch_related(
            Prefetch("bills", queryset=Bill.objects.filter(period__gte=since).exclude(status="cancelled")
                     .order_by("-period"), to_attr="current_bills"),
            Prefetch(
                "payments",
                queryset=Payment.objects.filter(bill__period__gte=since, status=Payment.Status.VALID)
                .select_related("collected_by")
                .order_by("-collected_at"),
                to_attr="current_payments",
            ),
        )

    def perform_create(self, serializer):
        super().perform_create(serializer)
        audit(self.request.user, "customer_created", serializer.instance)

    IMPORT_MAX_ROWS = 3000
    IMPORT_FIELDS = (
        "customer_code", "name", "mobile", "stb_number", "box_number", "can_caf_id", "area_name",
        "address_line1", "address_line2", "city", "pincode", "notes", "sms_language", "status",
    )

    @action(detail=False, methods=["post"], url_path="import")
    def import_rows(self, request):
        """
        POST /api/contacts/import   {"rows": [...], "dry_run": true|false}
        Each row: name, mobile (optional), stb_number, provider + plan, or monthly_amount
        (finds the one active plan with that price), area_name, address_line1, notes, status, sms_language.
        Rows with problems are reported and skipped; the others are created.
        A customer whose STB / box number is already in the system is skipped, so re-uploading is safe.
        """
        org = require_org(request.user)
        rows = request.data.get("rows")
        dry_run = bool(request.data.get("dry_run"))
        if not isinstance(rows, list) or not rows:
            raise ValidationError({"rows": "Send a non-empty list of rows."})
        if len(rows) > self.IMPORT_MAX_ROWS:
            raise ValidationError({"rows": f"At most {self.IMPORT_MAX_ROWS} rows per upload."})

        plans = list(Plan.objects.filter(organization=org, is_active=True))
        existing_devices = {
            v.strip().upper()
            for v in Customer.objects.filter(organization=org).values_list("stb_number", flat=True)
            if v and v.strip()
        }
        seen_devices: set[str] = set()
        created, skipped, errors = 0, [], []

        def find_plan(row):
            provider = str(row.get("provider") or "").strip().lower()
            name = str(row.get("plan") or "").strip().lower()
            pool = [p for p in plans if not provider or p.provider.lower() == provider]
            if name:
                match = [p for p in pool if p.name.lower() == name]
                return (match[0], None) if match else (None, f"No active plan named '{row.get('plan')}'.")
            raw = str(row.get("monthly_amount") or "").replace("₹", "").replace(",", "").strip()
            if not raw:
                return None, "Give a plan or a monthly amount."
            try:
                amount = Decimal(raw)
            except InvalidOperation:
                return None, f"Monthly amount '{raw}' is not a number."
            match = [p for p in pool if p.final_price.quantize(Decimal("0.01")) == amount or p.price == amount]
            if len(match) == 1:
                return match[0], None
            if not match:
                return None, f"No active plan costs Rs.{amount}. Add one in Settings > Providers & Plans."
            return None, f"{len(match)} plans cost Rs.{amount}. Add the Plan column for this row."

        for number, row in enumerate(rows, start=1):
            if not isinstance(row, dict):
                errors.append({"row": number, "name": "", "error": "Row is not an object."})
                continue
            name = str(row.get("name") or "").strip()
            device = str(row.get("stb_number") or "").strip().upper()
            if device and (device in existing_devices or device in seen_devices):
                skipped.append({"row": number, "name": name, "reason": f"STB {device} is already added."})
                continue
            plan, problem = find_plan(row)
            if problem:
                errors.append({"row": number, "name": name, "error": problem})
                continue
            data = {k: row[k] for k in self.IMPORT_FIELDS if row.get(k) not in (None, "")}
            data["plan_id"] = plan.id
            serializer = CustomerSerializer(data=data, context={"request": request})
            if not serializer.is_valid():
                msg = "; ".join(f"{field}: {' '.join(map(str, errs))}" for field, errs in serializer.errors.items())
                errors.append({"row": number, "name": name, "error": msg})
                continue
            if device:
                seen_devices.add(device)
            if not dry_run:
                with transaction.atomic():
                    serializer.save(organization=org)
            created += 1

        if not dry_run and created:
            audit(request.user, "customers_imported", org, created=created, skipped=len(skipped), errors=len(errors))
        return Response({"dry_run": dry_run, "created": created, "skipped": skipped, "errors": errors})

    def perform_destroy(self, instance):
        if self.request.user.role != Roles.OWNER:
            raise PermissionDenied("Only the owner can delete customers.")
        if instance.bills.exists():
            raise ValidationError({"detail": "This customer has bills. Mark them Inactive instead."})
        audit(self.request.user, "customer_deleted", instance, name=instance.name)
        instance.delete()


@api_view(["GET"])
@permission_classes([role_in(*Roles.OFFICE)])
def cutoff_list(request):
    """
    GET /api/connections/cutoff — who should be switched off in the provider's portal today.
    Cable: unpaid after this month's cut-off date. Internet: plan expired.
    """
    org = require_org(request.user)
    today = timezone.localdate()
    rows = []
    cable_bills = (
        Bill.objects.filter(organization=org, period=month_start(today), due_date__lt=today,
                            status__in=[Bill.Status.UNPAID, Bill.Status.PARTIAL],
                            customer__status=Customer.Status.ACTIVE, customer__plan__category="cable")
        .select_related("customer__plan", "customer__area")
    )
    for b in cable_bills:
        c = b.customer
        rows.append({"customer_id": c.id, "name": c.name, "mobile": c.mobile, "provider": c.plan.provider,
                     "category": "cable", "area": c.area.name if c.area else None, "box_number": c.box_number,
                     "since": b.due_date, "balance": str(b.balance)})
    expired = Customer.objects.filter(
        organization=org, status=Customer.Status.ACTIVE, plan__category="internet", valid_until__lt=today
    ).select_related("plan", "area")
    for c in expired:
        rows.append({"customer_id": c.id, "name": c.name, "mobile": c.mobile, "provider": c.plan.provider,
                     "category": "internet", "area": c.area.name if c.area else None, "box_number": c.box_number,
                     "since": c.valid_until, "balance": None})
    return Response({"date": today, "count": len(rows), "customers": rows})
