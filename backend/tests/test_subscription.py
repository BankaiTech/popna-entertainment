from datetime import date, timedelta
from unittest import mock

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import User
from core.permissions import Roles
from customers.models import Provider
from orgs.models import Distributor

from .helpers import PASSWORD, client_for, make_org, make_user


class SubscriptionTests(TestCase):
    def setUp(self):
        self.today = timezone.localdate()
        self.org = make_org("SUB", subscription_start=self.today - timedelta(days=10),
                            subscription_end=self.today)
        self.owner = make_user("owner", Roles.OWNER, self.org)
        self.agent = make_user("agent", Roles.AGENT, self.org)

    def test_last_day_is_still_usable(self):
        self.assertEqual(client_for(self.owner).get("/api/contacts").status_code, 200)

    def test_expired_blocks_every_operator_api_with_clear_code(self):
        self.org.subscription_end = self.today - timedelta(days=1)
        self.org.save()
        for user in (self.owner, self.agent):
            res = client_for(user).get("/api/contacts")
            self.assertEqual(res.status_code, 403)
            self.assertEqual(res.json()["code"], "subscription_expired")
            self.assertIn("ended on", res.json()["detail"])
        res = client_for(self.agent).post("/api/tracking/check-in", {"latitude": 1, "longitude": 1}, format="json")
        self.assertEqual(res.status_code, 403)

    def test_me_reports_state_so_the_app_can_show_the_screen(self):
        self.org.subscription_end = self.today - timedelta(days=1)
        self.org.save()
        c = APIClient()
        tokens = c.post("/api/auth/login", {"username": "owner", "password": PASSWORD}, format="json").json()
        c.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        me = c.get("/api/auth/me").json()
        self.assertEqual(me["subscription"]["state"], "expired")

    def test_not_started_yet(self):
        self.org.subscription_start = self.today + timedelta(days=2)
        self.org.subscription_end = self.today + timedelta(days=30)
        self.org.save()
        res = client_for(self.owner).get("/api/contacts")
        self.assertEqual(res.json()["code"], "subscription_not_started")

    def test_uses_indian_date_not_utc(self):
        # 11:30 PM UTC on the end date is already the next day in India.
        self.org.subscription_end = date(2026, 11, 4)
        self.org.save()
        with mock.patch("django.utils.timezone.localdate", return_value=date(2026, 11, 5)):
            self.assertEqual(self.org.subscription_state(), "expired")


class PlatformControlTests(TestCase):
    def setUp(self):
        self.admin = make_user("platform", Roles.PLATFORM_ADMIN)
        self.c = client_for(self.admin)

    def test_create_operator_with_owner_login_limits_and_modules(self):
        res = self.c.post("/api/organizations", {
            "name": "Sri Cable", "code": "sri01", "subscription_start": "2026-11-01",
            "subscription_end": "2027-10-31", "max_providers": 2, "max_plans": 3,
            "allowed_modules": ["dashboard", "contacts", "payments"],
            "owner_name": "Murugan", "owner_username": "sricable", "owner_password": "Strong@Pass123",
        }, format="json")
        self.assertEqual(res.status_code, 201, res.content)
        self.assertNotIn("owner_password", res.json())
        owner = User.objects.get(username="sricable")
        self.assertEqual((owner.role, owner.organization.code), ("owner", "SRI01"))
        self.assertTrue(owner.check_password("Strong@Pass123"))

    def test_end_before_start_rejected(self):
        res = self.c.post("/api/organizations", {"name": "X", "code": "x1", "subscription_start": "2026-11-10",
                                                 "subscription_end": "2026-11-01"}, format="json")
        self.assertEqual(res.status_code, 400)

    def test_renew_extends_from_end_or_today(self):
        today = timezone.localdate()
        org = make_org("REN", subscription_end=today - timedelta(days=40))
        res = self.c.patch(f"/api/organizations/{org.id}", {"renew_months": 1}, format="json")
        self.assertEqual(res.status_code, 200, res.content)
        org.refresh_from_db()
        self.assertGreaterEqual(org.subscription_end, today + timedelta(days=27))
        self.assertEqual(res.json()["subscription_state"], "active")

    def test_status_endpoint(self):
        org = make_org("STA")
        res = self.c.patch(f"/api/organizations/{org.id}/status", {"status": "suspended"}, format="json")
        self.assertEqual((res.status_code, res.json()["status"]), (200, "suspended"))

    def test_owner_and_distributor_cannot_change_subscription_or_limits(self):
        d = Distributor.objects.create(name="D")
        org = make_org("OWN", distributor=d, subscription_end=date(2026, 12, 31), max_plans=2)
        owner = make_user("o", Roles.OWNER, org)
        dist = make_user("d", Roles.DISTRIBUTOR, distributor=d)
        for user in (owner, dist):
            client_for(user).patch(f"/api/organizations/{org.id}", {
                "subscription_end": "2030-01-01", "max_plans": 999, "allowed_modules": ["pos"], "status": "active",
            }, format="json")
        org.refresh_from_db()
        self.assertEqual((org.subscription_end, org.max_plans), (date(2026, 12, 31), 2))
        self.assertEqual(client_for(owner).patch(f"/api/organizations/{org.id}/status", {"status": "active"},
                                                 format="json").status_code, 403)

    def test_distributor_created_operator_waits_for_approval(self):
        d = Distributor.objects.create(name="D")
        dist = make_user("d", Roles.DISTRIBUTOR, distributor=d)
        res = client_for(dist).post("/api/organizations", {"name": "New", "code": "new9",
                                                           "subscription_end": "2099-01-01"}, format="json")
        self.assertEqual(res.status_code, 201, res.content)
        self.assertEqual((res.json()["status"], res.json()["subscription_end"]), ("disabled", None))


class LimitTests(TestCase):
    def setUp(self):
        self.org = make_org("LIM", max_providers=1, max_plans=1)
        self.c = client_for(make_user("owner", Roles.OWNER, self.org))

    def test_provider_limit(self):
        self.assertEqual(self.c.post("/api/products", {"name": "GTPL", "product_type": "cable"},
                                     format="json").status_code, 201)
        res = self.c.post("/api/products", {"name": "BSNL", "product_type": "internet"}, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertIn("up to 1 providers", str(res.json()))

    def test_plan_limit_and_usage_counts(self):
        Provider.objects.create(organization=self.org, name="GTPL", category="cable")
        self.assertEqual(self.c.post("/api/plans", {"provider": "GTPL", "name": "Basic", "price": "230"},
                                     format="json").status_code, 201)
        res = self.c.post("/api/plans", {"provider": "GTPL", "name": "Gold", "price": "330"}, format="json")
        self.assertEqual(res.status_code, 400)
        org = self.c.get(f"/api/organizations/{self.org.id}").json()
        self.assertEqual((org["providers_used"], org["plans_used"], org["max_plans"]), (1, 1, 1))

    def test_unlimited_when_empty(self):
        self.org.max_providers = None
        self.org.save()
        for name in ("A", "B", "C"):
            self.assertEqual(self.c.post("/api/products", {"name": name, "product_type": "cable"},
                                         format="json").status_code, 201)
