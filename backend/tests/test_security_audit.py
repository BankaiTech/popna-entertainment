"""
Security audit (Nov 2026): one operator must never read or change another operator's data, and nobody
may give themselves more power or money than their role allows. Each check here is a real attack path.
"""
from decimal import Decimal

from django.test import TestCase, override_settings

from billing.models import Bill
from billing.services import generate_bills, record_payment
from core.permissions import Roles
from customers.models import Area, Provider
from inventory.models import StockItem, StockUnit, Supplier
from notifications.models import SmsMessage
from orgs.models import Organization, PlatformPayment

from .helpers import client_for, first_of_this_month, make_customer, make_org, make_plans, make_user

ALLOWED_CROSS = {404, 403, 400}


class CrossTenantTests(TestCase):
    """Every operator-level endpoint, called by operator A with operator B's ids."""

    @classmethod
    def setUpTestData(cls):
        cls.a = make_org("SECA", require_checkin_for_collection=False)
        cls.b = make_org("SECB", require_checkin_for_collection=False)
        cls.a_owner = make_user("a_owner", Roles.OWNER, org=cls.a)
        cls.a_mgr = make_user("a_mgr", Roles.MANAGER, org=cls.a)
        cls.a_agent = make_user("a_agent", Roles.AGENT, org=cls.a)
        cls.a_tech = make_user("a_tech", Roles.TECHNICIAN, org=cls.a)
        cls.b_owner = make_user("b_owner", Roles.OWNER, org=cls.b)
        cls.b_agent = make_user("b_agent", Roles.AGENT, org=cls.b)
        cable_b, _ = make_plans(cls.b)
        cls.b_plan = cable_b
        cls.b_provider = Provider.objects.create(organization=cls.b, name="B Provider", category="cable", cutoff_day=10)
        cls.b_area = Area.objects.create(organization=cls.b, name="B Street")
        cls.b_cust = make_customer(cls.b, cable_b, stb_number="BSTB1")
        generate_bills(first_of_this_month(), organization=cls.b)
        cls.b_bill = Bill.objects.get(customer=cls.b_cust)
        cls.b_pay = record_payment(user=cls.b_owner, customer=cls.b_cust, amount=Decimal("100"), method="cash")
        cls.b_supplier = Supplier.objects.create(organization=cls.b, name="B Supplier")
        cls.b_item = StockItem.objects.create(organization=cls.b, name="B STB")
        cls.b_unit = StockUnit.objects.create(organization=cls.b, item=cls.b_item, serial="BSER1")
        cls.b_sms = SmsMessage.objects.create(organization=cls.b, customer=cls.b_cust, kind="payment_receipt",
                                              to_mobile="9000000001", body="x")
        cls.b_pp = PlatformPayment.objects.create(organization=cls.b, kind="sms", quantity=100, rate=Decimal("0.3"),
                                                  amount=Decimal("30"))

    def b_urls(self):
        return {
            "contacts": f"/api/contacts/{self.b_cust.id}",
            "customers": f"/api/customers/{self.b_cust.id}",
            "plans": f"/api/plans/{self.b_plan.id}",
            "products": f"/api/products/{self.b_provider.id}",
            "areas": f"/api/areas/{self.b_area.id}",
            "bills": f"/api/bills/{self.b_bill.id}",
            "payments": f"/api/payments/{self.b_pay.id}",
            "suppliers": f"/api/suppliers/{self.b_supplier.id}",
            "stock-items": f"/api/stock-items/{self.b_item.id}",
            "stock-units": f"/api/stock-units/{self.b_unit.id}",
            "sms-logs": f"/api/sms-logs/{self.b_sms.id}",
            "users": f"/api/users/{self.b_agent.id}",
            "organizations": f"/api/organizations/{self.b.id}",
            "platform-payments": f"/api/platform-payments/{self.b_pp.id}",
        }

    def test_no_role_of_operator_a_can_read_change_or_delete_b(self):
        for user in (self.a_owner, self.a_mgr, self.a_agent, self.a_tech):
            c = client_for(user)
            for name, url in self.b_urls().items():
                for method in ("get", "patch", "put", "delete"):
                    r = getattr(c, method)(url, {"name": "pwned", "notes": "pwned"}, format="json")
                    self.assertIn(r.status_code, ALLOWED_CROSS | {405},
                                  f"{user.username} {method.upper()} {name}: {r.status_code} {r.content[:200]}")
        self.b_cust.refresh_from_db()
        self.assertNotEqual(self.b_cust.notes, "pwned")
        self.assertTrue(Organization.objects.filter(id=self.b.id, name__icontains="SECB").exists()
                        or Organization.objects.get(id=self.b.id).name != "pwned")

    def test_lists_never_contain_operator_b(self):
        lists = ["contacts", "plans", "products", "areas", "bills", "payments", "suppliers", "stock-items",
                 "stock-units", "sms-logs", "users", "purchases", "sales", "organizations", "platform-payments"]
        markers = {"BSTB1", "B Supplier", "B STB", "BSER1", "b_agent", "SECB", "B Street"}
        for user in (self.a_owner, self.a_mgr, self.a_agent, self.a_tech):
            c = client_for(user)
            for name in lists:
                r = c.get(f"/api/{name}")
                if r.status_code != 200:
                    continue
                body = r.content.decode()
                for m in markers:
                    self.assertNotIn(m, body, f"{user.username} sees {m} in /api/{name}")
            for url in ("/api/connections/cutoff", "/api/dashboard/stats", "/api/tracking/live", "/api/my-plan"):
                r = c.get(url)
                if r.status_code == 200:
                    for m in markers:
                        self.assertNotIn(m, r.content.decode(), f"{user.username} sees {m} in {url}")

    def test_cannot_use_operator_b_ids_inside_a_request(self):
        c = client_for(self.a_owner)
        cable_a, _ = make_plans(self.a)
        a_cust = make_customer(self.a, cable_a, stb_number="ASTB1")
        attempts = [
            ("/api/payments", {"customer_id": self.b_cust.id, "amount": "10", "method": "cash"}),
            ("/api/payments", {"customer_id": a_cust.id, "bill_id": self.b_bill.id, "amount": "10", "method": "cash"}),
            ("/api/contacts", {"name": "X", "mobile": "9000000099", "plan_id": self.b_plan.id, "stb_number": "Q1",
                               "area": "Main"}),
            ("/api/contacts", {"name": "X", "mobile": "9000000098", "plan_id": cable_a.id, "stb_number": "Q2",
                               "area": "Main", "collector_ids": [self.b_agent.id]}),
            ("/api/purchases", {"supplier_id": self.b_supplier.id, "lines": [{"item_id": self.b_item.id,
                                                                               "quantity": 1, "unit_price": 1}]}),
            ("/api/sales", {"customer_id": self.b_cust.id, "lines": []}),
        ]
        for url, data in attempts:
            r = c.post(url, data, format="json")
            self.assertIn(r.status_code, ALLOWED_CROSS, f"POST {url} {data}: {r.status_code} {r.content[:200]}")
        r = c.patch(f"/api/contacts/{a_cust.id}", {"plan_id": self.b_plan.id}, format="json")
        self.assertIn(r.status_code, ALLOWED_CROSS, r.content)

    def test_header_cannot_switch_operator(self):
        r = client_for(self.a_owner).get("/api/contacts", HTTP_X_ORGANIZATION_ID=str(self.b.id))
        self.assertNotIn("BSTB1", r.content.decode())


class RoleEscalationTests(TestCase):
    """Nobody gets more power or money than their role allows."""

    def setUp(self):
        self.org = make_org("ESC1")
        self.owner = make_user("esc_owner", Roles.OWNER, org=self.org)
        self.mgr = make_user("esc_mgr", Roles.MANAGER, org=self.org)
        self.agent = make_user("esc_agent", Roles.AGENT, org=self.org)

    def test_owner_cannot_raise_own_plan_limits_or_credits(self):
        before = Organization.objects.get(id=self.org.id)
        payload = {"sms_credits": 999999, "sms_rate": "0.01", "monthly_fee": "1", "subscription_end": "2099-01-01",
                   "status": "active", "max_providers": 999, "max_plans": 999, "sms_free_per_month": 99999,
                   "allowed_modules": ["dashboard", "contacts", "collect", "sales", "users", "settings"],
                   "name": "Renamed", "code": "HACK1"}
        r = client_for(self.owner).patch(f"/api/organizations/{self.org.id}", payload, format="json")
        self.assertIn(r.status_code, (200, 400), r.content)
        after = Organization.objects.get(id=self.org.id)
        for f in ("sms_credits", "sms_rate", "monthly_fee", "subscription_end", "max_providers", "max_plans",
                  "sms_free_per_month", "allowed_modules", "name", "code"):
            self.assertEqual(getattr(after, f), getattr(before, f), f"owner changed {f}")

    def test_owner_cannot_create_owner_or_platform_admin(self):
        for role in (Roles.OWNER, Roles.PLATFORM_ADMIN, Roles.DISTRIBUTOR):
            r = client_for(self.owner).post("/api/users", {"username": f"x_{role}", "name": "X",
                                                           "password": "Strong@12345", "role": role}, format="json")
            self.assertEqual(r.status_code, 400, f"{role}: {r.content}")

    def test_owner_cannot_move_staff_to_another_operator(self):
        other = make_org("ESC2")
        r = client_for(self.owner).patch(f"/api/users/{self.agent.id}", {"organization": other.id}, format="json")
        self.agent.refresh_from_db()
        self.assertEqual(self.agent.organization_id, self.org.id, r.content)

    def test_manager_and_agent_cannot_manage_users(self):
        for user in (self.mgr, self.agent):
            r = client_for(user).post("/api/users", {"username": "sneaky", "name": "S", "password": "Strong@12345",
                                                     "role": Roles.MANAGER}, format="json")
            self.assertIn(r.status_code, (403,), f"{user.username}: {r.content}")
            r = client_for(user).patch(f"/api/users/{self.owner.id}", {"password": "Owned@12345"}, format="json")
            self.assertIn(r.status_code, (403, 404), f"{user.username}: {r.content}")

    def test_staff_cannot_change_own_role_or_modules_via_me(self):
        r = client_for(self.agent).patch("/api/auth/me", {"role": Roles.OWNER, "allowed_modules": ["users"],
                                                          "language": "ta"}, format="json")
        self.agent.refresh_from_db()
        self.assertEqual(self.agent.role, Roles.AGENT, r.content)

    def test_agent_cannot_change_customers_settings_or_cancel_payments(self):
        cable, _ = make_plans(self.org)
        cust = make_customer(self.org, cable, stb_number="E1")
        pay = record_payment(user=self.owner, customer=cust, amount=Decimal("10"), method="cash")
        c = client_for(self.agent)
        self.assertEqual(c.patch(f"/api/contacts/{cust.id}", {"notes": "x"}, format="json").status_code, 403)
        self.assertEqual(c.delete(f"/api/contacts/{cust.id}").status_code, 403)
        self.assertEqual(c.post(f"/api/payments/{pay.id}/cancel", {"reason": "nope"}, format="json").status_code,
                         403)
        self.assertEqual(c.patch(f"/api/organizations/{self.org.id}", {"upi_id": "x@y"}, format="json").status_code,
                         403)
        self.assertEqual(c.post("/api/plans", {"name": "P", "price": "1"}, format="json").status_code, 403)

    def test_manager_cannot_cancel_payments(self):
        cable, _ = make_plans(self.org)
        cust = make_customer(self.org, cable, stb_number="E2")
        pay = record_payment(user=self.owner, customer=cust, amount=Decimal("10"), method="cash")
        r = client_for(self.mgr).post(f"/api/payments/{pay.id}/cancel", {"reason": "nope"}, format="json")
        self.assertEqual(r.status_code, 403, r.content)

    def test_agent_cannot_give_discount(self):
        cable, _ = make_plans(self.org)
        cust = make_customer(self.org, cable, stb_number="E3")
        self.org.require_checkin_for_collection = False
        self.org.save()
        r = client_for(self.agent).post("/api/payments", {"customer_id": cust.id, "amount": "100", "discount": "130",
                                                          "method": "cash", "latitude": 12.1, "longitude": 79.1},
                                        format="json")
        self.assertIn(r.status_code, (400, 403), r.content)

    def test_negative_or_huge_amounts_refused(self):
        cable, _ = make_plans(self.org)
        cust = make_customer(self.org, cable, stb_number="E4")
        c = client_for(self.owner)
        for amount in ("-50", "999999"):
            r = c.post("/api/payments", {"customer_id": cust.id, "amount": amount, "method": "cash"}, format="json")
            self.assertEqual(r.status_code, 400, f"{amount}: {r.content}")

    def test_operator_cannot_approve_own_platform_payment(self):
        pp = PlatformPayment.objects.create(organization=self.org, kind="sms", quantity=1000, rate=Decimal("0.3"),
                                            amount=Decimal("300"))
        for action in ("approve", "reject"):
            r = client_for(self.owner).post(f"/api/platform-payments/{pp.id}/{action}", {}, format="json")
            self.assertIn(r.status_code, (403, 404, 405), f"{action}: {r.content}")
        self.org.refresh_from_db()
        self.assertEqual(self.org.sms_credits, 0)


class PublicEndpointTests(TestCase):
    def test_anonymous_gets_nothing(self):
        from rest_framework.test import APIClient
        c = APIClient(SERVER_NAME="localhost")
        for url in ("/api/contacts", "/api/payments", "/api/users", "/api/organizations", "/api/dashboard/stats",
                    "/api/signup-requests", "/api/platform-payments", "/api/auth/me", "/api/tracking/live",
                    "/api/sms-logs", "/api/my-plan"):
            self.assertEqual(c.get(url).status_code, 401, url)

    def test_webhook_rejects_unsigned_calls(self):
        from rest_framework.test import APIClient
        org = make_org("WH1")
        pp = PlatformPayment.objects.create(organization=org, kind="sms", quantity=1000, rate=Decimal("0.3"),
                                            amount=Decimal("300"), gateway="cashfree", gateway_order_id="ORD1",
                                            status="created")
        r = APIClient(SERVER_NAME="localhost").post(
            "/api/payments/cashfree/webhook", {"data": {"order": {"order_id": "ORD1"}}, "type": "PAYMENT_SUCCESS_WEBHOOK"},
            format="json", HTTP_X_WEBHOOK_SIGNATURE="forged", HTTP_X_WEBHOOK_TIMESTAMP="1")
        self.assertEqual(r.status_code, 400)
        pp.refresh_from_db()
        self.assertEqual(pp.status, "created")

    def test_login_is_throttled_even_with_spoofed_forwarded_for(self):
        from django.conf import settings
        from django.core.cache import cache
        from rest_framework.settings import api_settings
        from rest_framework.test import APIClient
        from rest_framework.throttling import ScopedRateThrottle
        rf = {**settings.REST_FRAMEWORK, "DEFAULT_THROTTLE_RATES": {
            **settings.REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"], "login": "3/min"}}
        self.enterContext(override_settings(REST_FRAMEWORK=rf))
        api_settings.reload()
        ScopedRateThrottle.THROTTLE_RATES = api_settings.DEFAULT_THROTTLE_RATES
        self.addCleanup(api_settings.reload)
        cache.clear()
        codes = []
        for i in range(6):
            r = APIClient(SERVER_NAME="localhost").post(
                "/api/auth/login", {"username": "nobody", "password": "x"}, format="json",
                HTTP_X_FORWARDED_FOR=f"10.0.0.{i}, 203.0.113.9")
            codes.append(r.status_code)
        self.assertIn(429, codes, codes)


class DistributorScopeTests(TestCase):
    """A distributor manages only their own operators."""

    def test_distributor_sees_only_own_operators(self):
        from orgs.models import Distributor
        d1 = Distributor.objects.create(name="D1")
        d2 = Distributor.objects.create(name="D2")
        mine = make_org("DMINE")
        mine.distributor = d1
        mine.save()
        theirs = make_org("DTHEIRS")
        theirs.distributor = d2
        theirs.save()
        dist_user = make_user("dist1", Roles.DISTRIBUTOR, org=None)
        dist_user.distributor = d1
        dist_user.save()
        c = client_for(dist_user)
        body = c.get("/api/organizations").content.decode()
        self.assertIn("DMINE", body)
        self.assertNotIn("DTHEIRS", body)
        for method in ("get", "patch"):
            r = getattr(c, method)(f"/api/organizations/{theirs.id}", {"name": "x"}, format="json")
            self.assertIn(r.status_code, (403, 404), r.content)
        theirs_owner = make_user("dtheirs_owner", Roles.OWNER, org=theirs)
        r = c.patch(f"/api/users/{theirs_owner.id}", {"password": "Owned@12345"}, format="json")
        self.assertIn(r.status_code, (403, 404), r.content)
