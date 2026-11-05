from datetime import date, timedelta
from unittest import mock

from django.test import TestCase
from django.utils import timezone

from billing.models import Bill
from billing.services import generate_bills, generate_internet_renewals
from core.permissions import Roles
from customers.models import Provider
from notifications.models import SmsMessage
from notifications.services import queue_due_reminders
from tracking.models import DutySession

from .helpers import client_for, make_customer, make_org, make_plans, make_user

GPS = {"latitude": 12.69, "longitude": 79.97}


class InternetValidityTests(TestCase):
    def setUp(self):
        self.today = timezone.localdate()
        self.org = make_org("NET")
        _, self.net = make_plans(self.org)  # RailWire 500 + 18% GST = 590
        Provider.objects.create(organization=self.org, name="RailWire", category="internet", cutoff_days=30)
        self.cust = make_customer(self.org, self.net)
        self.owner = make_user("owner", Roles.OWNER, self.org)
        self.c = client_for(self.owner)

    def pay(self, amount="590", **extra):
        return self.c.post("/api/payments", {"customer_id": self.cust.id, "amount": amount, **extra}, format="json")

    def test_first_payment_starts_30_days_from_today(self):
        self.assertEqual(self.pay().status_code, 201)
        self.cust.refresh_from_db()
        self.assertEqual(self.cust.valid_until, self.today + timedelta(days=30))

    def test_paying_in_advance_extends_from_old_expiry(self):
        self.cust.valid_until = self.today + timedelta(days=2)
        self.cust.save()
        self.pay()
        self.cust.refresh_from_db()
        self.assertEqual(self.cust.valid_until, self.today + timedelta(days=32))

    def test_expired_customer_renews_from_today_not_old_date(self):
        self.cust.valid_until = self.today - timedelta(days=10)
        self.cust.save()
        self.pay()
        self.cust.refresh_from_db()
        self.assertEqual(self.cust.valid_until, self.today + timedelta(days=30))

    def test_partial_payment_does_not_renew_and_cancel_reverts(self):
        old = self.today + timedelta(days=1)
        self.cust.valid_until = old
        self.cust.save()
        self.pay("100")
        self.cust.refresh_from_db()
        self.assertEqual(self.cust.valid_until, old)
        pid = self.pay("490").json()["id"]
        self.cust.refresh_from_db()
        self.assertEqual(self.cust.valid_until, old + timedelta(days=30))
        self.c.post(f"/api/payments/{pid}/cancel", {"reason": "mistake"}, format="json")
        self.cust.refresh_from_db()
        self.assertEqual(self.cust.valid_until, old)

    def test_renewal_bill_created_only_near_expiry(self):
        self.cust.valid_until = self.today + timedelta(days=10)
        self.cust.save()
        self.assertEqual(generate_internet_renewals(self.today), 0)
        self.cust.valid_until = self.today + timedelta(days=2)
        self.cust.save()
        self.assertEqual(generate_internet_renewals(self.today), 1)
        self.assertEqual(generate_internet_renewals(self.today), 0)
        bill = Bill.objects.get(customer=self.cust)
        self.assertEqual((bill.period, bill.due_date), (self.cust.valid_until, self.cust.valid_until))

    def test_status_and_cutoff_list(self):
        self.cust.valid_until = self.today - timedelta(days=1)
        self.cust.save()
        row = self.c.get(f"/api/contacts/{self.cust.id}").json()
        self.assertEqual(row["service_status"], "expired")
        cut = self.c.get("/api/connections/cutoff").json()
        self.assertEqual([r["category"] for r in cut["customers"]], ["internet"])


class CableCutoffTests(TestCase):
    def setUp(self):
        self.org = make_org("CAB")
        self.cable, _ = make_plans(self.org)
        Provider.objects.create(organization=self.org, name="GTPL", category="cable", cutoff_day=10)
        self.cust = make_customer(self.org, self.cable)
        self.owner = make_user("owner", Roles.OWNER, self.org)

    def test_fixed_cutoff_day_not_30_days(self):
        generate_bills(date(2026, 11, 1), organization=self.org)
        generate_bills(date(2026, 12, 1), organization=self.org)
        self.assertEqual(sorted(b.due_date for b in Bill.objects.all()), [date(2026, 11, 10), date(2026, 12, 10)])

    def test_status_due_then_cut_off(self):
        generate_bills(date(2026, 11, 1), organization=self.org)
        bill = Bill.objects.get()
        self.assertEqual(self.cust.service_status(bill, today=date(2026, 11, 10)), "due")
        self.assertEqual(self.cust.service_status(bill, today=date(2026, 11, 11)), "cut_off")
        bill.status = "paid"
        self.assertEqual(self.cust.service_status(bill, today=date(2026, 11, 11)), "active")


class DiscountTests(TestCase):
    def setUp(self):
        self.org = make_org("DIS")
        self.cable, _ = make_plans(self.org)
        self.cust = make_customer(self.org, self.cable)
        self.owner = make_user("owner", Roles.OWNER, self.org)
        self.agent = make_user("agent", Roles.AGENT, self.org)
        DutySession.objects.create(organization=self.org, user=self.agent)

    def test_owner_discount_closes_bill_agent_cannot_discount(self):
        res = client_for(self.agent).post("/api/payments", {"customer_id": self.cust.id, "amount": "200",
                                                            "discount": "30", **GPS}, format="json")
        self.assertEqual(res.status_code, 400)
        res = client_for(self.owner).post("/api/payments", {"customer_id": self.cust.id, "amount": "200",
                                                            "discount": "30"}, format="json")
        self.assertEqual(res.status_code, 201, res.content)
        bill = Bill.objects.get()
        self.assertEqual((bill.status, bill.balance), ("paid", 0))


class TwoStageReminderTests(TestCase):
    def test_reminder_3_days_before_and_on_1_day_before(self):
        org = make_org("TWO", reminder_days_before=3, second_reminder_days_before=1)
        cable, _ = make_plans(org)
        make_customer(org, cable, due_day=10)
        generate_bills(date(2026, 11, 1), organization=org)
        sent = [queue_due_reminders(date(2026, 11, d)) for d in (6, 7, 8, 9, 10)]
        self.assertEqual(sent, [0, 1, 0, 1, 0])
        self.assertEqual(SmsMessage.objects.filter(kind="due_reminder").count(), 2)
        self.assertIn("Please pay in advance", SmsMessage.objects.first().body)
