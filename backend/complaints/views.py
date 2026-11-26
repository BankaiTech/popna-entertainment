from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from core.audit import audit
from core.mixins import OrgScopedViewSet, require_org
from core.modules import has_module
from core.permissions import Roles

from .models import Complaint, ComplaintUpdate, raise_complaint
from .serializers import (AssignSerializer, ComplaintSerializer, NoteSerializer, RequiredNoteSerializer,
                          ResolveSerializer)


class ComplaintViewSet(OrgScopedViewSet):
    """
    Office (owner / manager): sees all, raises for a customer, assigns / unassigns, resolves, reopens, cancels.
    Field staff (agent / technician, with the Complaints page):
      - see complaints assigned to them, plus every OPEN complaint nobody is assigned to;
      - can take an unassigned one, and close one (location of the phone is recorded).
    Complaints are never edited or deleted, only moved along; every step is in the timeline.
    """

    queryset = Complaint.objects.select_related("customer__area", "customer__plan", "assigned_to", "resolved_by") \
        .prefetch_related("updates__by_user", "updates__complaint__customer")
    serializer_class = ComplaintSerializer
    read_roles = Roles.TENANT
    write_roles = Roles.TENANT  # each action checks the role itself
    filterset_fields = ["status", "category", "assigned_to", "customer"]
    search_fields = ["ticket_no", "customer__name", "customer__mobile", "customer__stb_number"]
    http_method_names = ["get", "post", "head", "options"]

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        # Field staff without the Complaints page get nothing here (the menu is not just hidden).
        if request.user.role in Roles.FIELD and not has_module(request.user, "complaints"):
            raise PermissionDenied("You do not have the Complaints page. Ask your owner.")

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.role in Roles.FIELD:
            qs = qs.filter(Q(assigned_to=user) | Q(assigned_to__isnull=True, status=Complaint.Status.OPEN))
        params = self.request.query_params
        if params.get("open") == "1":
            qs = qs.filter(status__in=Complaint.OPEN_STATES)
        if params.get("mine") == "1":
            qs = qs.filter(assigned_to=user)
        if params.get("unassigned") == "1":
            qs = qs.filter(assigned_to__isnull=True, status=Complaint.Status.OPEN)
        return qs

    def _office_only(self):
        if self.request.user.role not in Roles.OFFICE:
            raise PermissionDenied("Only the owner or manager can do this.")

    def _locked(self):
        """The complaint (within what this user may see), locked for the rest of the request."""
        return Complaint.objects.select_for_update().get(pk=self.get_object().pk)

    def create(self, request, *args, **kwargs):
        self._office_only()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        complaint = raise_complaint(customer=data["customer"], category=data.get("category", "other"),
                                    description=data.get("description", ""), user=request.user)
        audit(request.user, "complaint_raised", complaint)
        return Response(self.get_serializer(complaint).data, status=status.HTTP_201_CREATED)

    def _step(self, complaint, action_, note=""):
        ComplaintUpdate.objects.create(complaint=complaint, action=action_, note=note, by_user=self.request.user)
        audit(self.request.user, f"complaint_{action_}", complaint, note=note)
        return Response(self.get_serializer(self.get_queryset().model.objects.get(pk=complaint.pk)).data)

    @action(detail=True, methods=["post"])
    def assign(self, request, pk=None):
        """Office: give it to one field staff member ({"user_id": id}), or back to everyone ({"user_id": null})."""
        self._office_only()
        s = AssignSerializer(data=request.data, context={"request": request})
        s.is_valid(raise_exception=True)
        person = s.validated_data["user_id"]
        with transaction.atomic():
            c = self._locked()
            if c.status not in Complaint.OPEN_STATES:
                raise ValidationError({"detail": "This complaint is closed. Reopen it first."})
            c.assigned_to = person
            c.assigned_at = timezone.now() if person else None
            c.status = Complaint.Status.ASSIGNED if person else Complaint.Status.OPEN
            c.save(update_fields=["assigned_to", "assigned_at", "status", "updated_at"])
            if person is None:
                return self._step(c, ComplaintUpdate.Action.UNASSIGNED, s.validated_data.get("note", ""))
            return self._step(c, ComplaintUpdate.Action.ASSIGNED, s.validated_data.get("note") or person.display_name)

    @action(detail=True, methods=["post"])
    def take(self, request, pk=None):
        """Field staff: "I will go" - takes an open complaint nobody has. First one wins."""
        if request.user.role not in Roles.FIELD:
            raise PermissionDenied("Use Assign to give it to someone.")
        with transaction.atomic():
            c = self._locked()
            if c.status != Complaint.Status.OPEN or c.assigned_to_id:
                raise ValidationError({"detail": "Someone else has already taken this complaint."})
            c.assigned_to, c.assigned_at, c.status = request.user, timezone.now(), Complaint.Status.ASSIGNED
            c.save(update_fields=["assigned_to", "assigned_at", "status", "updated_at"])
            return self._step(c, ComplaintUpdate.Action.TAKEN, request.user.display_name)

    @action(detail=True, methods=["post"])
    def resolve(self, request, pk=None):
        """Close it with what was done. Field staff must send the phone's location (shown on a map)."""
        self.get_object()  # 404 first for a complaint this person cannot see
        s = ResolveSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        data, user = s.validated_data, request.user
        field = user.role in Roles.FIELD
        lat, lng = data.get("latitude"), data.get("longitude")
        if field and (lat is None or lng is None):
            raise ValidationError({"location": "Turn on location (GPS) to close the complaint."})
        org = require_org(user)
        session = None
        if field and org.tracking_enabled:
            from tracking.models import DutySession

            session = DutySession.objects.filter(user=user, ended_at__isnull=True).first()
            if org.require_checkin_for_collection and session is None:
                raise ValidationError({"duty": "Check in for duty before closing complaints."})
        with transaction.atomic():
            c = self._locked()  # field staff: only their own or an unassigned open one
            if c.status not in Complaint.OPEN_STATES:
                raise ValidationError({"detail": "This complaint is already closed."})
            if field and c.assigned_to_id not in (None, user.id):
                raise PermissionDenied("This complaint is assigned to someone else.")
            if c.assigned_to_id is None:
                c.assigned_to, c.assigned_at = user, timezone.now()  # whoever fixed it owns it
            c.status = Complaint.Status.RESOLVED
            c.resolved_at = timezone.now()
            c.resolved_by = user
            c.resolution_note = data["note"]
            c.resolved_latitude, c.resolved_longitude = lat, lng
            c.resolved_accuracy_m = data.get("accuracy")
            c.save(update_fields=["status", "resolved_at", "resolved_by", "resolution_note", "assigned_to",
                                  "assigned_at", "resolved_latitude", "resolved_longitude", "resolved_accuracy_m",
                                  "updated_at"])
            if session is not None and lat is not None:
                from tracking.models import LocationPing

                LocationPing.objects.create(organization=org, user=user, session=session, latitude=lat,
                                            longitude=lng, accuracy_m=data.get("accuracy"),
                                            source=LocationPing.Source.COMPLAINT)
            return self._step(c, ComplaintUpdate.Action.RESOLVED, c.resolution_note)

    @action(detail=True, methods=["post"])
    def reopen(self, request, pk=None):
        self._office_only()
        s = NoteSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        with transaction.atomic():
            c = self._locked()
            if c.status in Complaint.OPEN_STATES:
                raise ValidationError({"detail": "This complaint is already open."})
            c.status = Complaint.Status.ASSIGNED if c.assigned_to_id else Complaint.Status.OPEN
            c.resolved_at = None
            c.resolved_latitude = c.resolved_longitude = c.resolved_accuracy_m = None
            c.save(update_fields=["status", "resolved_at", "resolved_latitude", "resolved_longitude",
                                  "resolved_accuracy_m", "updated_at"])
            return self._step(c, ComplaintUpdate.Action.REOPENED, s.validated_data.get("note", ""))

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        self._office_only()
        s = RequiredNoteSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        with transaction.atomic():
            c = self._locked()
            if c.status not in Complaint.OPEN_STATES:
                raise ValidationError({"detail": "This complaint is already closed."})
            c.status = Complaint.Status.CANCELLED
            c.save(update_fields=["status", "updated_at"])
            return self._step(c, ComplaintUpdate.Action.CANCELLED, s.validated_data["note"])

    @action(detail=False, methods=["get"])
    def summary(self, request):
        """Counts for the tabs (what this person can see)."""
        require_org(request.user)
        base = super().get_queryset()
        user = request.user
        if user.role in Roles.FIELD:
            mine = base.filter(assigned_to=user)
            return Response({
                "unassigned": base.filter(assigned_to__isnull=True, status=Complaint.Status.OPEN).count(),
                "mine_open": mine.filter(status__in=Complaint.OPEN_STATES).count(),
                "mine_closed": mine.exclude(status__in=Complaint.OPEN_STATES).count(),
            })
        counts = {k: base.filter(status=k).count() for k, _ in Complaint.Status.choices}
        return Response({"counts": counts, "open": counts["open"] + counts["assigned"],
                         "unassigned": counts["open"]})
