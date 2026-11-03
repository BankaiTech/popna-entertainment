from datetime import date, datetime, time, timedelta

from django.conf import settings
from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle

from accounts.models import User
from billing.models import Payment
from core.audit import audit
from core.mixins import require_org
from core.permissions import Roles, role_in

from .models import DutySession, LocationPing
from .serializers import PointSerializer

FIELD = role_in(*Roles.FIELD)
OFFICE = role_in(*Roles.OFFICE)


class PingThrottle(ScopedRateThrottle):
    scope = "ping"

    def get_cache_key(self, request, view):
        return f"throttle_ping_{request.user.pk}"


def _point(request):
    s = PointSerializer(data=request.data)
    s.is_valid(raise_exception=True)
    return s.coords()


def _tracking_org(user):
    org = require_org(user)
    if not org.tracking_enabled:
        raise PermissionDenied("Location tracking is turned off for this operator.")
    return org


def _session_json(session):
    return {
        "id": session.id,
        "started_at": session.started_at,
        "ended_at": session.ended_at,
        "on_duty": session.ended_at is None,
    }


@api_view(["GET"])
@permission_classes([FIELD])
def duty_status(request):
    session = DutySession.objects.filter(user=request.user, ended_at__isnull=True).first()
    return Response({"on_duty": session is not None, "session": _session_json(session) if session else None,
                     "ping_every_seconds": 120})


@api_view(["POST"])
@permission_classes([FIELD])
def check_in(request):
    org = _tracking_org(request.user)
    lat, lng, acc = _point(request)
    existing = DutySession.objects.filter(user=request.user, ended_at__isnull=True).first()
    if existing:
        return Response(_session_json(existing))
    try:
        with transaction.atomic():
            session = DutySession.objects.create(organization=org, user=request.user)
            LocationPing.objects.create(organization=org, user=request.user, session=session, latitude=lat,
                                        longitude=lng, accuracy_m=acc, source=LocationPing.Source.CHECK_IN)
    except IntegrityError:  # double tap: another request opened it first
        session = DutySession.objects.get(user=request.user, ended_at__isnull=True)
    audit(request.user, "duty_check_in", session)
    return Response(_session_json(session), status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([FIELD])
def check_out(request):
    org = _tracking_org(request.user)
    lat, lng, acc = _point(request)
    session = DutySession.objects.filter(user=request.user, ended_at__isnull=True).first()
    if not session:
        raise ValidationError({"duty": "You are not checked in."})
    LocationPing.objects.create(organization=org, user=request.user, session=session, latitude=lat,
                                longitude=lng, accuracy_m=acc, source=LocationPing.Source.CHECK_OUT)
    session.ended_at = timezone.now()
    session.save(update_fields=["ended_at", "updated_at"])
    audit(request.user, "duty_check_out", session)
    return Response(_session_json(session))


@api_view(["POST"])
@permission_classes([FIELD])
@throttle_classes([PingThrottle])
def ping(request):
    org = _tracking_org(request.user)
    lat, lng, acc = _point(request)
    session = DutySession.objects.filter(user=request.user, ended_at__isnull=True).first()
    if not session:
        return Response({"detail": "Not on duty. Location is not recorded."}, status=status.HTTP_409_CONFLICT)
    last = LocationPing.objects.filter(session=session).order_by("-recorded_at").first()
    min_gap = timedelta(seconds=settings.MIN_PING_INTERVAL_SECONDS)
    if last and timezone.now() - last.recorded_at < min_gap:
        return Response({"detail": "ignored (too soon)"}, status=status.HTTP_200_OK)
    LocationPing.objects.create(organization=org, user=request.user, session=session, latitude=lat,
                                longitude=lng, accuracy_m=acc)
    return Response({"detail": "ok"}, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@permission_classes([OFFICE])
def live(request):
    """Owner/manager live map: every agent currently on duty, with last known position."""
    org = _tracking_org(request.user)
    now = timezone.now()
    rows = []
    sessions = DutySession.objects.filter(organization=org, ended_at__isnull=True).select_related("user")
    for s in sessions:
        last = LocationPing.objects.filter(session=s).order_by("-recorded_at").first()
        rows.append({
            "user_id": s.user_id,
            "name": s.user.display_name,
            "role": s.user.role,
            "on_duty_since": s.started_at,
            "latitude": float(last.latitude) if last else None,
            "longitude": float(last.longitude) if last else None,
            "accuracy_m": last.accuracy_m if last else None,
            "last_seen": last.recorded_at if last else None,
            "minutes_since_last_seen": int((now - last.recorded_at).total_seconds() // 60) if last else None,
            "last_source": last.source if last else None,
        })
    return Response({"agents": rows, "server_time": now})


@api_view(["GET"])
@permission_classes([OFFICE])
def route(request):
    """GET /api/tracking/route?user_id=5&date=2026-11-02 — path + collections for one agent's day."""
    org = _tracking_org(request.user)
    try:
        user = User.objects.get(pk=request.query_params.get("user_id"), organization=org)
    except (User.DoesNotExist, ValueError, TypeError):
        raise NotFound("Staff member not found.")
    try:
        day = date.fromisoformat(request.query_params.get("date") or timezone.localdate().isoformat())
    except ValueError:
        raise ValidationError({"date": "Use YYYY-MM-DD."})
    tz = timezone.get_current_timezone()
    start = timezone.make_aware(datetime.combine(day, time.min), tz)
    end = start + timedelta(days=1)
    pings = LocationPing.objects.filter(organization=org, user=user, recorded_at__gte=start, recorded_at__lt=end)
    payments = Payment.objects.filter(organization=org, collected_by=user, collected_at__gte=start,
                                      collected_at__lt=end).select_related("customer")
    return Response({
        "user": {"id": user.id, "name": user.display_name},
        "date": day.isoformat(),
        "points": [
            {"lat": float(p.latitude), "lng": float(p.longitude), "at": p.recorded_at, "source": p.source,
             "accuracy_m": p.accuracy_m}
            for p in pings
        ],
        "collections": [
            {"receipt_no": p.receipt_no, "customer": p.customer.name, "amount": str(p.amount),
             "method": p.method, "at": p.collected_at, "status": p.status,
             "lat": float(p.latitude) if p.latitude is not None else None,
             "lng": float(p.longitude) if p.longitude is not None else None}
            for p in payments
        ],
    })
