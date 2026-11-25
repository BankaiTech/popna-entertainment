from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from core.audit import audit
from core.mixins import OrgScopedViewSet, require_org
from core.permissions import Roles

from .models import Complaint, ComplaintUpdate, raise_complaint
from .serializers import AssignSerializer, ComplaintSerializer, NoteSerializer, RequiredNoteSerializer


class ComplaintViewSet(OrgScopedViewSet):
    """
    Office (owner / manager): sees all, raises for a customer, assigns, resolves, reopens, cancels.
    Field staff (agent / technician): sees only complaints assigned to them and resolves them.
    Complaints are never edited or deleted, only moved along; every step is in the timeline.
    """

    queryset = Complaint.objects.select_related("customer__area", "customer__plan", "assigned_to") \
        .prefetch_related("updates__by_user", "updates__complaint__customer")
    serializer_class = ComplaintSerializer
    read_roles = Roles.TENANT
    write_roles = Roles.TENANT  # each action checks the role itself
    filterset_fields = ["status", "category", "assigned_to", "customer"]
    search_fields = ["ticket_no", "customer__name", "customer__mobile", "customer__stb_number"]
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.user.role in Roles.FIELD:
            qs = qs.filter(assigned_to=self.request.user)
        if self.request.query_params.get("open") == "1":
            qs = qs.filter(status__in=Complaint.OPEN_STATES)
        return qs

    def _office_only(self):
        if self.request.user.role not in Roles.OFFICE:
            raise PermissionDenied("Only the owner or manager can do this.")

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
        return Response(self.get_serializer(Complaint.objects.get(pk=complaint.pk)).data)

    @action(detail=True, methods=["post"])
    def assign(self, request, pk=None):
        self._office_only()
        s = AssignSerializer(data=request.data, context={"request": request})
        s.is_valid(raise_exception=True)
        with transaction.atomic():
            c = Complaint.objects.select_for_update().get(pk=self.get_object().pk)
            if c.status not in Complaint.OPEN_STATES:
                raise ValidationError({"detail": "This complaint is closed. Reopen it first."})
            c.assigned_to = s.validated_data["user_id"]
            c.assigned_at = timezone.now()
            c.status = Complaint.Status.ASSIGNED
            c.save(update_fields=["assigned_to", "assigned_at", "status", "updated_at"])
            return self._step(c, ComplaintUpdate.Action.ASSIGNED,
                              s.validated_data.get("note") or c.assigned_to.display_name)

    @action(detail=True, methods=["post"])
    def resolve(self, request, pk=None):
        s = RequiredNoteSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        with transaction.atomic():
            c = Complaint.objects.select_for_update().get(pk=self.get_object().pk)  # field staff: own only
            if c.status not in Complaint.OPEN_STATES:
                raise ValidationError({"detail": "This complaint is already closed."})
            c.status = Complaint.Status.RESOLVED
            c.resolved_at = timezone.now()
            c.resolved_by = request.user
            c.resolution_note = s.validated_data["note"]
            c.save(update_fields=["status", "resolved_at", "resolved_by", "resolution_note", "updated_at"])
            return self._step(c, ComplaintUpdate.Action.RESOLVED, c.resolution_note)

    @action(detail=True, methods=["post"])
    def reopen(self, request, pk=None):
        self._office_only()
        s = NoteSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        with transaction.atomic():
            c = Complaint.objects.select_for_update().get(pk=self.get_object().pk)
            if c.status in Complaint.OPEN_STATES:
                raise ValidationError({"detail": "This complaint is already open."})
            c.status = Complaint.Status.ASSIGNED if c.assigned_to_id else Complaint.Status.OPEN
            c.resolved_at = None
            c.save(update_fields=["status", "resolved_at", "updated_at"])
            return self._step(c, ComplaintUpdate.Action.REOPENED, s.validated_data.get("note", ""))

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        self._office_only()
        s = RequiredNoteSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        with transaction.atomic():
            c = Complaint.objects.select_for_update().get(pk=self.get_object().pk)
            if c.status not in Complaint.OPEN_STATES:
                raise ValidationError({"detail": "This complaint is already closed."})
            c.status = Complaint.Status.CANCELLED
            c.save(update_fields=["status", "updated_at"])
            return self._step(c, ComplaintUpdate.Action.CANCELLED, s.validated_data["note"])

    @action(detail=False, methods=["get"])
    def summary(self, request):
        org = require_org(request.user)
        qs = self.get_queryset()
        counts = {k: qs.filter(status=k).count() for k, _ in Complaint.Status.choices}
        return Response({"organization": org.id, "counts": counts,
                         "open": counts["open"] + counts["assigned"]})
