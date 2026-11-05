from datetime import datetime
from zoneinfo import ZoneInfo

from django.test import TestCase, override_settings

from billing.models import Bill
from core.management.commands.run_scheduler import run_due_daily_jobs
from core.models import JobRun
from core.permissions import Roles
from tracking.models import DutySession

from .helpers import client_for, make_customer, make_org, make_plans, make_user

IST = ZoneInfo("Asia/Kolkata")
GPS = {"latitude": 12.69, "longitude": 79.97}


@override_settings(BILL_GENERATION_DAY=1)
class SchedulerTests(TestCase):
    def setUp(self):
        self.org = make_org("SCH")
        cable, _ = make_plans(self.org)
        make_customer(self.org, cable)

    def test_daily_jobs_run_once_per_day_after_their_time(self):
        early = datetime(2026, 11, 1, 2, 0, tzinfo=IST)
        self.assertEqual(run_due_daily_jobs(early), [])
        later = datetime(2026, 11, 1, 9, 30, tzinfo=IST)
        self.assertEqual(run_due_daily_jobs(later), ["generate_bills", "internet_renewals", "due_reminders", "purge_locations"])
        self.assertEqual(run_due_daily_jobs(later), [])
        self.assertEqual(Bill.objects.count(), 1)
        self.assertEqual(JobRun.objects.filter(name="generate_bills").count(), 1)

    def test_bills_not_generated_on_other_days(self):
        run_due_daily_jobs(datetime(2026, 11, 2, 9, 30, tzinfo=IST))
        self.assertEqual(Bill.objects.count(), 0)


class ReceiptRegressionTests(TestCase):
    def test_saving_operator_settings_never_resets_receipt_numbers(self):
        org = make_org("RCP")
        cable, _ = make_plans(org)
        cust = make_customer(org, cable)
        agent = make_user("agent", Roles.AGENT, org)
        owner = make_user("owner", Roles.OWNER, org)
        DutySession.objects.create(organization=org, user=agent)
        stale_org = type(org).objects.get(pk=org.pk)  # loaded before the payment
        c = client_for(agent)
        r1 = c.post("/api/payments", {"customer_id": cust.id, "amount": "10", **GPS}, format="json").json()
        stale_org.reminder_days_before = 5
        stale_org.save()
        client_for(owner).patch(f"/api/organizations/{org.id}", {"reminder_days_before": 4}, format="json")
        r2 = c.post("/api/payments", {"customer_id": cust.id, "amount": "10", **GPS}, format="json").json()
        self.assertEqual((r1["receipt_no"], r2["receipt_no"]), ("RCP-000001", "RCP-000002"))
