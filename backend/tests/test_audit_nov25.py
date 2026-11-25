"""
Bugs found in the 25 Nov audit (customer app + whole app). Each test failed before its fix.
"""
from datetime import date, timedelta
from decimal import Decimal

from django.core.cache import cache
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from billing.models import Bill
from billing.services import generate_bills, month_start, record_payment
from core.management.commands.run_scheduler import run_due_daily_jobs
from core.permissions import Roles

from .helpers import PASSWORD, client_for, first_of_this_month, make_customer, make_org, make_plans, make_user


def anon():
    return APIClient(SERVER_NAME="localhost")


class MonthlyBillsTests(TestCase):
    """Customers added after the 1st, or a scheduler that was down on the 1st, must still get this month's bill."""

    def setUp(self):
        self.org = make_org("MB1", require_checkin_for_collection=False)
        self.owner = make_user("mb_owner", Roles.OWNER, org=self.org)
        self.cable, _ = make_plans(self.org)

    def test_scheduler_catches_up_after_the_first(self):
        c = make_customer(self.org, self.cable, stb_number="MB-1")
        today = timezone.localdate()
        late = timezone.make_aware(timezone.datetime(today.year, today.month, 1) + timedelta(days=9, hours=23))
        run_due_daily_jobs(now=late)  # scheduler was down on the 1st; runs on the 10th
        self.assertTrue(Bill.objects.filter(customer=c, period=month_start(today)).exists())

    def test_new_customer_gets_this_months_bill(self):
        r = client_for(self.owner).post("/api/contacts", {
            "name": "New", "mobile": "9000000011", "plan_id": self.cable.id, "area": "Main", "stb_number": "MB-2",
        }, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        self.assertTrue(Bill.objects.filter(customer_id=r.json()["id"], period=first_of_this_month()).exists())

    def test_imported_customers_get_this_months_bill(self):
        r = client_for(self.owner).post("/api/contacts/import", {"rows": [
            {"name": "Imp", "stb_number": "MB-3", "monthly_amount": "230"}]}, format="json")
        self.assertEqual(r.json()["created"], 1, r.content)
        self.assertEqual(Bill.objects.filter(customer__stb_number="MB-3", period=first_of_this_month()).count(), 1)

    def test_last_months_paid_bill_is_not_shown_as_this_month(self):
        c = make_customer(self.org, self.cable, stb_number="MB-4")
        last = month_start(first_of_this_month() - timedelta(days=1))
        generate_bills(last, organization=self.org)
        bill = Bill.objects.get(customer=c, period=last)
        record_payment(user=self.owner, customer=c, bill=bill, amount=Decimal("230"), method="cash")
        r = client_for(self.owner).get(f"/api/contacts/{c.id}")
        self.assertEqual(r.json()["payment_status"], "not_paid", "this month is not paid yet")


class CustomerAppBillTests(TestCase):
    def setUp(self):
        cache.clear()
        self.org = make_org("CB1")
        self.cable, _ = make_plans(self.org)
        self.c = make_customer(self.org, self.cable, mobile="9000000021", stb_number="CB-1")

    def test_customer_sees_this_months_bill_even_before_generation(self):
        r = anon().post("/api/customer/auth/login", {"mobile": "9000000021", "box_number": "CB-1"}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        bill = r.json()["customer"]["current_bill"]
        self.assertIsNotNone(bill)
        self.assertEqual(bill["balance"], "230.00")

    def test_complaints_follow_the_operators_module(self):
        self.org.allowed_modules = ["dashboard", "contacts", "collect"]
        self.org.save()
        r = anon().post("/api/customer/auth/login", {"mobile": "9000000021", "box_number": "CB-1"}, format="json")
        self.assertFalse(r.json()["customer"]["complaints_enabled"])
        c = anon()
        c.credentials(HTTP_AUTHORIZATION=f"Bearer {r.json()['access']}")
        self.assertEqual(c.post("/api/customer/complaints", {"category": "box"}, format="json").status_code, 403)


class DeleteCustomerTests(TestCase):
    def test_deleting_a_customer_with_history_is_refused_cleanly(self):
        org = make_org("DC1", require_checkin_for_collection=False)
        owner = make_user("dc_owner", Roles.OWNER, org=org)
        cable, _ = make_plans(org)
        c = make_customer(org, cable, stb_number="DC-1")
        record_payment(user=owner, customer=c, amount=Decimal("230"), method="cash")
        client = client_for(owner)
        client.raise_request_exception = False
        r = client.delete(f"/api/contacts/{c.id}")
        self.assertEqual(r.status_code, 400, r.content[:300])
        self.assertIn("inactive", r.json()["detail"].lower())


class PasswordChangeEndsSessionsTests(TestCase):
    def test_old_refresh_token_stops_working_after_password_reset(self):
        org = make_org("PW1")
        owner = make_user("pw_owner", Roles.OWNER, org=org)
        agent = make_user("pw_agent", Roles.AGENT, org=org)
        r = anon().post("/api/auth/login", {"username": "pw_agent", "password": PASSWORD}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        old_refresh = r.json()["refresh"]
        r = client_for(owner).patch(f"/api/users/{agent.id}", {"password": "New@Pass9876"}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        r = anon().post("/api/auth/refresh", {"refresh": old_refresh}, format="json")
        self.assertEqual(r.status_code, 401, r.content)


class CustomerTokenEverywhereTests(TestCase):
    """A customer token must be refused by every staff endpoint (list, detail, write)."""

    def test_customer_token_refused_on_every_staff_url(self):
        cache.clear()
        org = make_org("CT1")
        cable, _ = make_plans(org)
        make_customer(org, cable, mobile="9000000031", stb_number="CT-1")
        r = anon().post("/api/customer/auth/login", {"mobile": "9000000031", "box_number": "CT-1"}, format="json")
        c = anon()
        c.credentials(HTTP_AUTHORIZATION=f"Bearer {r.json()['access']}")
        urls = ["users", "organizations", "distributors", "signup-requests", "platform-payments", "areas", "plans",
                "products", "contacts", "customers", "bills", "payments", "sms-logs", "suppliers", "stock-items",
                "stock-units", "purchases", "sales", "complaints", "auth/me", "dashboard/stats", "connections/cutoff",
                "my-plan", "tracking/live", "tracking/status", "distributor/summary"]
        for u in urls:
            self.assertEqual(c.get(f"/api/{u}").status_code, 401, u)
            self.assertIn(c.post(f"/api/{u}", {}, format="json").status_code, (401, 405), u)


class DuplicateCustomerTests(TestCase):
    def setUp(self):
        self.org = make_org("DU1")
        self.owner = make_user("du_owner", Roles.OWNER, org=self.org)
        self.cable, _ = make_plans(self.org)

    def test_same_stb_by_hand_is_refused(self):
        c = client_for(self.owner)
        body = {"name": "A", "mobile": "9000000041", "plan_id": self.cable.id, "area": "Main", "stb_number": "DU-1"}
        self.assertEqual(c.post("/api/contacts", body, format="json").status_code, 201)
        r = c.post("/api/contacts", {**body, "name": "B", "stb_number": "du-1"}, format="json")
        self.assertEqual(r.status_code, 400, r.content)
        self.assertIn("already used", str(r.content))

    def test_reupload_without_stb_skips_same_name_and_mobile(self):
        c = client_for(self.owner)
        rows = [{"name": "No Box", "mobile": "9000000042", "monthly_amount": "230"}]
        self.assertEqual(c.post("/api/contacts/import", {"rows": rows}, format="json").json()["created"], 1)
        r = c.post("/api/contacts/import", {"rows": rows}, format="json").json()
        self.assertEqual((r["created"], len(r["skipped"])), (0, 1))


class CancelledPaymentSmsTests(TestCase):
    """A receipt SMS still waiting in the outbox must not go out after the payment is cancelled."""

    def test_pending_receipt_is_dropped_and_cannot_be_retried(self):
        from notifications.models import SmsMessage
        from notifications.services import process_outbox

        org = make_org("SM1", require_checkin_for_collection=False)
        owner = make_user("sm_owner", Roles.OWNER, org=org)
        cable, _ = make_plans(org)
        c = make_customer(org, cable, mobile="9000000051", stb_number="SM-1")
        pay = record_payment(user=owner, customer=c, amount=Decimal("230"), method="cash")
        msg = SmsMessage.objects.get(payment=pay)
        self.assertEqual(msg.status, SmsMessage.Status.PENDING)
        r = client_for(owner).post(f"/api/payments/{pay.id}/cancel", {"reason": "wrong customer"}, format="json")
        self.assertEqual(r.status_code, 200, r.content)

        class Gateway:
            def send(self, m):
                raise AssertionError("must not send")

        process_outbox(gateway=Gateway())
        msg.refresh_from_db()
        self.assertEqual(msg.status, SmsMessage.Status.FAILED)
        self.assertIn("cancelled", msg.last_error)
        r = client_for(owner).post(f"/api/sms-logs/{msg.id}/retry", {}, format="json")
        self.assertEqual(r.status_code, 400, r.content)


class SignupJoinedTests(TestCase):
    def test_creating_the_operator_marks_the_signup_joined(self):
        from orgs.models import SignupRequest

        cache.clear()
        anon().post("/api/signup-requests", {"name": "Velu", "mobile": "9840011122", "business_name": "Velu Cable",
                                             "city": "Tindivanam", "service": "cable"}, format="json")
        pa = make_user("pa1", Roles.PLATFORM_ADMIN)
        r = client_for(pa).post("/api/organizations", {
            "name": "Velu Cable", "code": "VEL01", "owner_mobile": "9840011122", "owner_name": "Velu",
            "owner_username": "velu", "owner_password": PASSWORD}, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(SignupRequest.objects.get().status, SignupRequest.Status.JOINED)


class SmsNameTests(TestCase):
    def test_suggestions_and_8_character_limit(self):
        from notifications.templates import render
        from orgs.smsname import suggestions

        self.assertEqual(suggestions("Sri Murugan Cable Network")[0], "Murugan")
        self.assertEqual(suggestions("முருகன் கேபிள்"), ["முருகன்"])
        self.assertTrue(all(len(s) <= 8 for s in suggestions("Balasubramaniyan Cables Pvt Ltd")))
        org = make_org("SN1", name="Velu Cable Vision")
        owner = make_user("sn_owner", Roles.OWNER, org=org)
        c = client_for(owner)
        data = c.get(f"/api/organizations/{org.id}").json()
        self.assertEqual(data["sms_name"], "Velu")  # nothing chosen yet: best suggestion
        self.assertIn("Velu TV", data["sms_name_suggestions"])
        self.assertEqual(c.patch(f"/api/organizations/{org.id}", {"sms_display_name": "Velu Cable"},
                                 format="json").status_code, 400)
        self.assertEqual(c.patch(f"/api/organizations/{org.id}", {"sms_display_name": "Velu{1}"},
                                 format="json").status_code, 400)
        r = c.patch(f"/api/organizations/{org.id}", {"sms_display_name": "  Velu  TV "}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        org.refresh_from_db()
        self.assertEqual(org.display_name, "Velu TV")
        self.assertTrue(render("receipt", "ta", "Ravi", "250, 25-11-2026", org.display_name).endswith("Velu TV\nPING4SMS"))
