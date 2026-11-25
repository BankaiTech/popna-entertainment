from datetime import timedelta

from django.db.models import Prefetch
from django.utils import timezone
from decimal import Decimal, InvalidOperation

from django.conf import settings
from django.db import transaction
from rest_framework import status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError

from billing.models import Bill, Payment
from billing.services import (ensure_this_months_bill, generate_bills, month_start, refresh_due_dates,
                              reprice_open_bills)
from core.audit import audit
from core.mixins import OrgScopedViewSet, require_org
from core.permissions import Roles, role_in

from accounts.models import User

from .models import Area, Customer, Plan, Provider, visible_customer_ids
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

    def perform_update(self, serializer):
        old_name, old_cutoff = serializer.instance.name, serializer.instance.cutoff_day
        with transaction.atomic():
            provider = serializer.save()
            # Plans point to their provider by name: keep them linked after a rename.
            if provider.name != old_name:
                Plan.objects.filter(organization=provider.organization, provider__iexact=old_name).update(
                    provider=provider.name)
            if provider.category == "cable" and provider.cutoff_day != old_cutoff:
                refresh_due_dates(provider)

    def perform_destroy(self, instance):
        if Plan.objects.filter(organization=instance.organization, provider__iexact=instance.name).exists():
            raise ValidationError({"detail": "Plans use this provider. Mark it inactive instead."})
        instance.delete()


class PlanViewSet(OrgScopedViewSet):
    queryset = Plan.objects.all()
    serializer_class = PlanSerializer
    filterset_fields = ["category", "provider", "is_active"]
    search_fields = ["provider", "name"]
    MAX_BULK = 30

    @action(detail=False, methods=["post"], url_path="bulk")
    def bulk(self, request):
        """
        Add several plans of one provider in one go: {"provider": "GTPL", "plans": [{name, price, gst_rate}, ...]}.
        All or nothing: if one row is wrong (or the plan limit is reached), nothing is saved and the answer
        names the row.
        """
        rows = request.data.get("plans")
        provider = request.data.get("provider")
        if not isinstance(rows, list) or not rows:
            raise ValidationError({"plans": "Add at least one plan."})
        if len(rows) > self.MAX_BULK:
            raise ValidationError({"plans": f"Add up to {self.MAX_BULK} plans at a time."})
        created = []
        with transaction.atomic():
            for number, row in enumerate(rows, start=1):
                if not isinstance(row, dict):
                    raise ValidationError({"plans": f"Plan {number}: wrong format."})
                serializer = self.get_serializer(data={**row, "provider": provider or row.get("provider")})
                if not serializer.is_valid():
                    errors = serializer.errors
                    detail = errors.get("detail") or errors.get("non_field_errors") or next(iter(errors.values()))
                    text = detail[0] if isinstance(detail, list) else detail
                    name = row.get("name") or row.get("plan_name") or ""
                    raise ValidationError({"detail": f"Plan {number} ({name}): {text}", "row": number})
                self.perform_create(serializer)
                created.append(serializer.data)
        return Response(created, status=status.HTTP_201_CREATED)

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
        qs = super().get_queryset()
        visible = visible_customer_ids(self.request.user, self.request.user.organization)
        if visible is not None:
            qs = qs.filter(id__in=visible)
        # ?collector=<user id> or ?collector=none (customers shared by all field staff)
        collector = self.request.query_params.get("collector")
        if collector == "none":
            qs = qs.filter(collectors__isnull=True)
        elif collector and collector.isdigit():
            qs = qs.filter(collectors__id=int(collector))
        return qs.prefetch_related(
            "collectors",
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
        ensure_this_months_bill(serializer.instance)
        audit(self.request.user, "customer_created", serializer.instance)

    def perform_update(self, serializer):
        before = serializer.instance
        old_plan, old_discount, old_status = before.plan_id, before.permanent_discount, before.status
        with transaction.atomic():
            customer = serializer.save()
            if customer.status != old_status:
                ensure_this_months_bill(customer)  # switched back on: bill this month
            # New plan or permanent discount: this month's unpaid bill must ask for the new amount.
            if customer.plan_id != old_plan or customer.permanent_discount != old_discount:
                reprice_open_bills(customer)
        # The answer must show the bill as it is now, not the copy loaded before saving.
        for attr in ("current_bills", "current_payments"):
            customer.__dict__.pop(attr, None)

    IMPORT_MAX_ROWS = 3000
    IMPORT_FIELDS = (
        "customer_code", "name", "mobile", "stb_number", "box_number", "can_caf_id", "area_name",
        "address_line1", "address_line2", "city", "pincode", "notes", "sms_language", "status",
    )

    @staticmethod
    def _collector_ids(raw, staff_ids):
        """'7' / '7, 8' / 7 / [7, 8] -> ([7, 8], None). Empty = nobody assigned (all field staff see it)."""
        if raw in (None, ""):
            return [], None
        parts = raw if isinstance(raw, list) else str(raw).replace(";", ",").replace("/", ",").split(",")
        ids = []
        for part in parts:
            text = str(part).strip()
            if text.endswith(".0"):  # Excel stores 7 as 7.0
                text = text[:-2]
            if not text:
                continue
            if not text.isdigit():
                return None, f"Collector ID '{text}' is not a number."
            if int(text) not in staff_ids:
                return None, f"Collector ID {text} is not an active agent or technician of your business."
            if int(text) not in ids:
                ids.append(int(text))
        return ids, None

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
        staff_ids = set(User.objects.filter(organization=org, role__in=Roles.FIELD, is_active=True)
                        .values_list("id", flat=True))

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
            # The amount a customer pays = price incl. GST; the price before GST is accepted too.
            match = [p for p in pool if p.price_with_gst == amount] or [p for p in pool if p.price == amount]
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
            collector_ids, problem = self._collector_ids(row.get("collector_ids"), staff_ids)
            if problem:
                errors.append({"row": number, "name": name, "error": problem})
                continue
            data = {k: row[k] for k in self.IMPORT_FIELDS if row.get(k) not in (None, "")}
            data["plan_id"] = plan.id
            data["collector_ids"] = collector_ids
            serializer = CustomerSerializer(data=data, context={"request": request, "bulk_import": True})
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
            if timezone.localdate().day >= settings.BILL_GENERATION_DAY:
                generate_bills(month_start(timezone.localdate()), organization=org)  # bill the new customers now
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
