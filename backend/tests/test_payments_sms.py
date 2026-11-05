from datetime import date, timedelta
from decimal import Decimal

from django.test import TestCase, override_settings
from django.utils import timezone

from billing.models import Bill, Payment
from billing.services import generate_bills, generate_internet_renewals
from core.permissions import Roles
from notifications.gateway import SmsResult
from notifications.models import SmsMessage
from notifications.services import process_outbox, queue_due_reminders, queue_owner_daily_summaries
from tracking.models import DutySession, LocationPing

from .helpers import client_for, first_of_this_month, make_customer, make_org, make_plans, make_user

GPS = {"latitude": 12.6919, "longitude": 79.9765, "accuracy": 15}


class PaymentTests(TestCase):
    def setUp(self):
        self.org = make_org("CGP01", extra_alert_mobiles="9876500001")
        self.cable, self.net = make_plans(self.org)
        self.cable_cust = make_customer(self.org, self.cable, name="Ravi")
        self.net_cust = make_customer(self.org, self.net, name="Arun", mobile="9876543212")
        self.agent = make_user("agent", Roles.AGENT, self.org, name="Murugan")
        self.owner = make_user("owner", Roles.OWNER, self.org)
        generate_bills(first_of_this_month(), organization=self.org)

    def _check_in(self):
        return client_for(self.agent).post("/api/tracking/check-in", GPS, format="json")

    def test_agent_must_check_in_and_send_gps(self):
        c = client_for(self.agent)
        res = c.post("/api/payments", {"customer_id": self.cable_cust.id, "amount": "230", **GPS}, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertIn("duty", res.json())
        self._check_in()
        res = c.post("/api/payments", {"customer_id": self.cable_cust.id, "amount": "230"}, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertIn("location", res.json())

    def test_cable_payment_records_proof_and_queues_customer_and_owner_sms(self):
        self._check_in()
        res = client_for(self.agent).post(
            "/api/payments",
            {"customer_id": self.cable_cust.id, "amount": "230", "method": "cash", "latitude": 12.69191234567,
             "longitude": 79.97651234567, "accuracy": 12},
            format="json",
        )
        self.assertEqual(res.status_code, 201, res.content)
        body = res.json()
        self.assertEqual(body["receipt_no"], "CGP01-000001")
        self.assertEqual(body["collected_by_name"], "Murugan")
        bill = Bill.objects.get(customer=self.cable_cust)
        self.assertEqual(bill.status, Bill.Status.PAID)
        msgs = SmsMessage.objects.order_by("id")
        self.assertEqual(sorted(m.to_mobile for m in msgs), ["9876500000", "9876500001", "9876543210"])
        receipt = msgs.get(kind="payment_receipt")
        self.assertIn("Rs.230 received", receipt.body)
        self.assertIn("by Murugan", receipt.body)
        self.assertIn("CGP01-000001", receipt.body)
        self.assertTrue(LocationPing.objects.filter(source="payment").exists())

    def test_internet_payment_sms_is_optional(self):
        self._check_in()
        c = client_for(self.agent)
        c.post("/api/payments", {"customer_id": self.net_cust.id, "amount": "100", **GPS}, format="json")
        self.assertEqual(SmsMessage.objects.count(), 0)
        self.org.internet_payment_sms_enabled = True
        self.org.save()
        c.post("/api/payments", {"customer_id": self.net_cust.id, "amount": "100", **GPS}, format="json")
        self.assertEqual(SmsMessage.objects.filter(kind="payment_receipt").count(), 1)

    def test_daily_summary_mode_replaces_per_payment_owner_sms(self):
        self.org.owner_alert_mode = "daily_summary"
        self.org.save()
        self._check_in()
        client_for(self.agent).post("/api/payments", {"customer_id": self.cable_cust.id, "amount": "230", **GPS},
                                    format="json")
        self.assertEqual(SmsMessage.objects.filter(kind="owner_payment_alert").count(), 0)
        self.assertEqual(queue_owner_daily_summaries(timezone.localdate()), 2)
        self.assertEqual(queue_owner_daily_summaries(timezone.localdate()), 0)  # idempotent

    def test_overpayment_rejected_and_partial_allowed(self):
        self._check_in()
        c = client_for(self.agent)
        res = c.post("/api/payments", {"customer_id": self.cable_cust.id, "amount": "500", **GPS}, format="json")
        self.assertEqual(res.status_code, 400)
        c.post("/api/payments", {"customer_id": self.cable_cust.id, "amount": "100", **GPS}, format="json")
        self.assertEqual(Bill.objects.get(customer=self.cable_cust).status, Bill.Status.PARTIAL)

    def test_owner_cancels_payment_and_bill_reopens(self):
        self._check_in()
        pid = client_for(self.agent).post(
            "/api/payments", {"customer_id": self.cable_cust.id, "amount": "230", **GPS}, format="json"
        ).json()["id"]
        self.assertEqual(client_for(self.agent).post(f"/api/payments/{pid}/cancel", {"reason": "x"}).status_code, 403)
        res = client_for(self.owner).post(f"/api/payments/{pid}/cancel", {"reason": "Wrong customer"}, format="json")
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(Payment.objects.get(pk=pid).status, "cancelled")
        self.assertEqual(Bill.objects.get(customer=self.cable_cust).status, Bill.Status.UNPAID)

    def test_agent_sees_only_own_payments(self):
        other = make_user("agent2", Roles.AGENT, self.org)
        DutySession.objects.create(organization=self.org, user=other)
        client_for(other).post("/api/payments", {"customer_id": self.cable_cust.id, "amount": "50", **GPS},
                               format="json")
        self.assertEqual(client_for(self.agent).get("/api/payments").json(), [])
        self.assertEqual(len(client_for(self.owner).get("/api/payments").json()), 1)


class ReminderTests(TestCase):
    def setUp(self):
        self.org = make_org("REM", reminder_days_before=3)
        self.cable, self.net = make_plans(self.org)
        self.today = date(2026, 11, 2)
        self.cable_cust = make_customer(self.org, self.cable, due_day=5)
        self.net_cust = make_customer(self.org, self.net, mobile="9876543212", due_day=5)
        generate_bills(date(2026, 11, 1), organization=self.org)

    def test_cable_reminder_sent_once_internet_only_when_enabled(self):
        self.assertEqual(queue_due_reminders(self.today), 1)
        self.assertEqual(queue_due_reminders(self.today), 0)  # never twice
        msg = SmsMessage.objects.get(kind="due_reminder")
        self.assertEqual(msg.to_mobile, self.cable_cust.mobile)
        self.assertIn("due on 05-11-2026", msg.body)
        self.org.internet_reminders_enabled = True
        self.org.save()
        self.net_cust.valid_until = date(2026, 11, 5)
        self.net_cust.save()
        self.assertEqual(generate_internet_renewals(self.today), 1)
        self.assertEqual(queue_due_reminders(self.today), 1)

    def test_internet_customer_opt_out_respected_cable_cannot_opt_out(self):
        self.org.internet_reminders_enabled = True
        self.org.save()
        self.net_cust.sms_opt_in = False
        self.net_cust.save()
        self.cable_cust.sms_opt_in = False
        self.cable_cust.save()
        self.assertEqual(queue_due_reminders(self.today), 1)
        self.assertEqual(SmsMessage.objects.get().to_mobile, self.cable_cust.mobile)

    def test_not_due_yet_and_paid_bills_skipped(self):
        self.assertEqual(queue_due_reminders(date(2026, 11, 1)), 0)  # due in 4 days > 3
        Bill.objects.filter(customer=self.cable_cust).update(status=Bill.Status.PAID)
        self.assertEqual(queue_due_reminders(self.today), 0)


class FakeGateway:
    def __init__(self, ok=True):
        self.ok = ok
        self.sent = []

    def send(self, to, text, kind):
        self.sent.append(to)
        return SmsResult(ok=self.ok, provider_ref="ref1", error="" if self.ok else "HTTP 500")


@override_settings(SMS_MAX_ATTEMPTS=2)
class OutboxTests(TestCase):
    def setUp(self):
        self.org = make_org("OUT")

    def _msg(self, key):
        return SmsMessage.objects.create(organization=self.org, kind="due_reminder", to_mobile="9876543210",
                                         body="hi", dedupe_key=key)

    def test_success_marks_sent(self):
        self._msg("a")
        gw = FakeGateway()
        self.assertEqual(process_outbox(gateway=gw), {"sent": 1, "failed": 0})
        self.assertEqual(SmsMessage.objects.get().status, "sent")
        self.assertEqual(process_outbox(gateway=gw), {"sent": 0, "failed": 0})

    def test_failure_retries_then_fails(self):
        m = self._msg("b")
        gw = FakeGateway(ok=False)
        process_outbox(gateway=gw)
        m.refresh_from_db()
        self.assertEqual((m.status, m.attempts), ("pending", 1))
        SmsMessage.objects.filter(pk=m.pk).update(next_attempt_at=timezone.now() - timedelta(seconds=1))
        process_outbox(gateway=gw)
        m.refresh_from_db()
        self.assertEqual((m.status, m.attempts), ("failed", 2))
