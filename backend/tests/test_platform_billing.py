from datetime import timedelta
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone

from core.models import AuditLog
from core.permissions import Roles
from notifications.models import SmsMessage
from notifications.services import process_outbox
from orgs.billing import NO_BALANCE_ERROR, sms_estimate
from orgs.models import Organization, PlatformPayment

from .helpers import client_for, make_customer, make_org, make_plans, make_user
from .test_payments_sms import FakeGateway


class SmsQuotaTests(TestCase):
    def setUp(self):
        self.org = make_org("QTA")
        self.org.sms_free_per_month = 2
        self.org.save()

    def _msgs(self, n, prefix="m"):
        for i in range(n):
            SmsMessage.objects.create(organization=self.org, kind="due_reminder", to_mobile="9876543210",
                                      body="hi", dedupe_key=f"{prefix}{i}")

    def test_free_then_credits_then_blocked(self):
        self.org.sms_credits = 1
        self.org.save()
        self._msgs(4)
        self.assertEqual(process_outbox(gateway=FakeGateway()), {"sent": 3, "failed": 1})
        billed = list(SmsMessage.objects.order_by("id").values_list("billed_as", "status"))
        self.assertEqual(billed, [("free", "sent"), ("free", "sent"), ("credit", "sent"), ("", "failed")])
        self.assertEqual(SmsMessage.objects.order_by("id").last().last_error, NO_BALANCE_ERROR)
        self.org.refresh_from_db()
        self.assertEqual(self.org.sms_credits, 0)

    def test_failed_send_gives_credit_back(self):
        self.org.sms_free_per_month = 0
        self.org.sms_credits = 1
        self.org.save()
        self._msgs(1)
        process_outbox(gateway=FakeGateway(ok=False))
        self.org.refresh_from_db()
        self.assertEqual(self.org.sms_credits, 1)

    def test_free_sms_reset_each_month(self):
        self._msgs(2, "old")
        process_outbox(gateway=FakeGateway())
        SmsMessage.objects.update(sent_at=timezone.now() - timedelta(days=40))  # last month
        self._msgs(2, "new")
        self.assertEqual(process_outbox(gateway=FakeGateway()), {"sent": 2, "failed": 0})


class EstimateTests(TestCase):
    def test_estimate_follows_customers_and_settings(self):
        org = make_org("EST")
        cable, net = make_plans(org)
        for i in range(3):
            make_customer(org, cable, mobile=f"98765432{i:02d}")
        make_customer(org, cable, mobile="")  # no mobile = no SMS
        make_customer(org, net, mobile="9876500001", sms_opt_in=True)
        org.sms_free_per_month = 5
        org.second_reminder_days_before = 1
        org.save()
        e = sms_estimate(org)
        self.assertEqual((e["cable_customers"], e["receipts"], e["reminders"], e["total"]), (3, 3, 6, 9))
        self.assertEqual((e["extra"], e["extra_cost"]), (4, "1.20"))
        org.internet_payment_sms_enabled = True
        org.internet_reminders_enabled = True
        org.save()
        self.assertEqual(sms_estimate(org)["total"], 12)  # + 1 receipt + 2 reminders for the internet customer


class PlatformPaymentTests(TestCase):
    def setUp(self):
        self.org = make_org("PAY")
        self.org.sms_rate = Decimal("0.25")
        self.org.monthly_fee = Decimal("499")
        self.org.save()
        self.owner = make_user("pay_owner", Roles.OWNER, org=self.org)
        self.agent = make_user("pay_agent", Roles.AGENT, org=self.org)
        self.platform = make_user("pay_platform", Roles.PLATFORM_ADMIN)
        self.other = make_org("PAY2")
        self.other_owner = make_user("pay_owner2", Roles.OWNER, org=self.other)

    def test_my_plan_shows_upi_notes_and_estimate(self):
        r = client_for(self.owner).get("/api/my-plan")
        self.assertEqual(r.status_code, 200, r.content)
        body = r.json()
        self.assertEqual(body["pay"]["sms_note"], f"Sms payment org_{self.org.id}")
        self.assertEqual(body["pay"]["renewal_note"], f"Renewal Payment org_{self.org.id}")
        self.assertEqual(body["pay"]["upi_ids"]["gpay"], "msv31bieber@oksbi")
        self.assertEqual(body["subscription"]["monthly_fee"], "499.00")
        self.assertIn("total", body["estimate"])
        self.assertEqual(client_for(self.agent).get("/api/my-plan").status_code, 403)

    def test_expired_operator_can_still_renew(self):
        self.org.subscription_end = timezone.localdate() - timedelta(days=3)
        self.org.save()
        c = client_for(self.owner)
        self.assertEqual(c.get("/api/contacts").status_code, 403)  # app is locked...
        self.assertEqual(c.get("/api/my-plan").status_code, 200)   # ...but renewing works
        r = c.post("/api/platform-payments", {"kind": "renewal", "quantity": 3, "upi_app": "gpay", "utr": "412345678901"},
                   format="json")
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(r.json()["amount"], "1497.00")

        admin = client_for(self.platform)
        self.assertEqual(admin.get("/api/platform-payments/summary").json(), {"pending": 1})
        pid = r.json()["id"]
        self.assertEqual(admin.post(f"/api/platform-payments/{pid}/approve").status_code, 200)
        self.org.refresh_from_db()
        self.assertEqual(self.org.subscription_state(), "active")
        self.assertGreater(self.org.subscription_end, timezone.localdate() + timedelta(days=80))
        self.assertEqual(admin.post(f"/api/platform-payments/{pid}/approve").status_code, 400)  # only once
        self.assertTrue(AuditLog.objects.filter(action="platform_payment_approved").exists())

    def test_sms_pack_amount_from_server_rate_and_credits_added(self):
        c = client_for(self.owner)
        r = c.post("/api/platform-payments", {"kind": "sms", "quantity": 500, "amount": "1", "utr": "UTR0001"},
                   format="json")
        self.assertEqual(r.json()["amount"], "125.00")  # 500 x 0.25, client amount ignored
        client_for(self.platform).post(f"/api/platform-payments/{r.json()['id']}/approve")
        self.org.refresh_from_db()
        self.assertEqual(self.org.sms_credits, 500)

    def test_reject_duplicate_utr_and_isolation(self):
        c = client_for(self.owner)
        r = c.post("/api/platform-payments", {"kind": "sms", "quantity": 100, "utr": "DUP123456"}, format="json")
        self.assertEqual(c.post("/api/platform-payments", {"kind": "sms", "quantity": 100, "utr": "dup123456"},
                                format="json").status_code, 400)
        self.assertEqual(client_for(self.other_owner).get("/api/platform-payments").json(), [])
        self.assertEqual(client_for(self.owner).post(f"/api/platform-payments/{r.json()['id']}/approve").status_code, 403)
        admin = client_for(self.platform)
        admin.post(f"/api/platform-payments/{r.json()['id']}/reject", {"note": "Not received"}, format="json")
        self.assertEqual(PlatformPayment.objects.get().status, "rejected")
        self.org.refresh_from_db()
        self.assertEqual(self.org.sms_credits, 0)
        # a rejected UTR can be sent again (e.g. typo fixed)
        self.assertEqual(c.post("/api/platform-payments", {"kind": "sms", "quantity": 100, "utr": "DUP123456"},
                                format="json").status_code, 201)

    def test_no_monthly_fee_means_no_renewal_claim_and_owner_cannot_set_rates(self):
        self.org.monthly_fee = None
        self.org.save()
        c = client_for(self.owner)
        self.assertEqual(c.post("/api/platform-payments", {"kind": "renewal", "quantity": 1, "utr": "ABC123456"},
                                format="json").status_code, 400)
        c.patch(f"/api/organizations/{self.org.id}", {"sms_rate": "0.01", "sms_credits": 9999}, format="json")
        self.org.refresh_from_db()
        self.assertEqual((self.org.sms_rate, self.org.sms_credits), (Decimal("0.25"), 0))
        admin = client_for(self.platform)
        r = admin.patch(f"/api/organizations/{self.org.id}",
                        {"sms_rate": "0.40", "sms_free_per_month": 100, "monthly_fee": "299"}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        self.org.refresh_from_db()
        self.assertEqual((self.org.sms_rate, self.org.sms_free_per_month), (Decimal("0.40"), 100))


    def test_paid_without_utr_and_double_tap(self):
        c = client_for(self.owner)
        r1 = c.post("/api/platform-payments", {"kind": "sms", "quantity": 200, "upi_app": "phonepe"}, format="json")
        self.assertEqual(r1.status_code, 201, r1.content)
        self.assertEqual((r1.json()["utr"], r1.json()["amount"]), ("", "50.00"))
        r2 = c.post("/api/platform-payments", {"kind": "sms", "quantity": 200, "upi_app": "phonepe"}, format="json")
        self.assertEqual((r2.status_code, r2.json()["id"]), (200, r1.json()["id"]))  # same claim, not a second one
        self.assertEqual(PlatformPayment.objects.count(), 1)
        rows = client_for(self.platform).get("/api/platform-payments?status=pending").json()
        self.assertEqual(len(rows), 1)
        self.assertIn("T", rows[0]["created_at"])  # date and time for the app owner
        bad = c.post("/api/platform-payments", {"kind": "sms", "quantity": 300, "utr": "12"}, format="json")
        self.assertEqual(bad.status_code, 400)
