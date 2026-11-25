from django.db import models, transaction

from core.models import OrgOwnedModel, TimeStampedModel


class Complaint(OrgOwnedModel):
    """
    A customer's problem (no signal, slow internet...). Raised by the customer in the app or by the office.
    Flow: open -> assigned (to a technician / agent) -> resolved. The office can reopen or cancel.
    """

    class Category(models.TextChoices):
        NO_SIGNAL = "no_signal", "No signal / no channels"
        NO_INTERNET = "no_internet", "Internet not working"
        SLOW_INTERNET = "slow_internet", "Internet slow"
        BOX = "box", "Set-top box / router problem"
        CABLE = "cable", "Cable / wire problem"
        BILLING = "billing", "Bill or payment"
        OTHER = "other", "Other"

    class Status(models.TextChoices):
        OPEN = "open", "Open"
        ASSIGNED = "assigned", "Assigned"
        RESOLVED = "resolved", "Resolved"
        CANCELLED = "cancelled", "Cancelled"

    OPEN_STATES = (Status.OPEN, Status.ASSIGNED)

    ticket_no = models.CharField(max_length=20)
    customer = models.ForeignKey("customers.Customer", on_delete=models.PROTECT, related_name="complaints")
    category = models.CharField(max_length=20, choices=Category.choices, default=Category.OTHER)
    description = models.TextField(blank=True, max_length=500)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.OPEN, db_index=True)
    raised_by_customer = models.BooleanField(default=False)
    created_by = models.ForeignKey("accounts.User", null=True, blank=True, on_delete=models.SET_NULL,
                                   related_name="+")
    assigned_to = models.ForeignKey("accounts.User", null=True, blank=True, on_delete=models.SET_NULL,
                                    related_name="assigned_complaints")
    assigned_at = models.DateTimeField(null=True, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey("accounts.User", null=True, blank=True, on_delete=models.SET_NULL,
                                    related_name="+")
    resolution_note = models.CharField(max_length=300, blank=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [models.UniqueConstraint(fields=["organization", "ticket_no"], name="uniq_ticket_per_org")]

    def __str__(self):
        return f"{self.ticket_no} {self.customer_id} {self.status}"

    @classmethod
    def next_ticket_no(cls, organization):
        """C00001, C00002... per operator. Call inside a transaction."""
        from orgs.models import Organization

        Organization.objects.select_for_update().filter(pk=organization.pk).first()  # one at a time per operator
        last = cls.objects.filter(organization=organization).order_by("-id").values_list("ticket_no", flat=True).first()
        number = int(last[1:]) + 1 if last and last[1:].isdigit() else 1
        return f"C{number:05d}"


class ComplaintUpdate(TimeStampedModel):
    """Timeline entry: who did what and when (raised, assigned, resolved, reopened, cancelled)."""

    class Action(models.TextChoices):
        RAISED = "raised", "Raised"
        ASSIGNED = "assigned", "Assigned"
        RESOLVED = "resolved", "Resolved"
        REOPENED = "reopened", "Reopened"
        CANCELLED = "cancelled", "Cancelled"

    complaint = models.ForeignKey(Complaint, on_delete=models.CASCADE, related_name="updates")
    action = models.CharField(max_length=12, choices=Action.choices)
    note = models.CharField(max_length=300, blank=True)
    by_user = models.ForeignKey("accounts.User", null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    by_customer = models.BooleanField(default=False)

    class Meta:
        ordering = ["created_at", "id"]


@transaction.atomic
def raise_complaint(*, customer, category, description="", user=None, by_customer=False):
    complaint = Complaint.objects.create(
        organization=customer.organization, ticket_no=Complaint.next_ticket_no(customer.organization),
        customer=customer, category=category, description=(description or "").strip()[:500],
        raised_by_customer=by_customer, created_by=user,
    )
    ComplaintUpdate.objects.create(complaint=complaint, action=ComplaintUpdate.Action.RAISED,
                                   by_user=user, by_customer=by_customer)
    return complaint
