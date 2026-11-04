from datetime import date

from django.test import TestCase

from billing.models import Bill
from billing.services import generate_bills
from core.permissions import Roles
from customers.models import Plan, Provider

from .helpers import client_for, make_customer, make_org, make_user


class ProviderTests(TestCase):
    def setUp(self):
        self.org = make_org("PRV")
        self.owner = make_user("owner", Roles.OWNER, self.org)
        self.c = client_for(self.owner)

    def test_products_endpoint_uses_frontend_field_names(self):
        res = self.c.post("/api/products", {"name": "GTPL", "product_type": "cable", "cutoff_date": 7,
                                            "is_active": True}, format="json")
        self.assertEqual(res.status_code, 201, res.content)
        body = res.json()
        self.assertEqual((body["product_type"], body["cutoff_date"]), ("cable", 7))
        dup = self.c.post("/api/products", {"name": "gtpl", "product_type": "cable"}, format="json")
        self.assertEqual(dup.status_code, 400)

    def test_plan_category_comes_from_provider(self):
        Provider.objects.create(organization=self.org, name="RailWire", category="internet")
        res = self.c.post("/api/plans", {"provider": "railwire", "plan_name": "40 Mbps", "price": "500",
                                         "category": "cable"}, format="json")
        self.assertEqual(res.status_code, 201, res.content)
        self.assertEqual((res.json()["category"], res.json()["provider"]), ("internet", "RailWire"))

    def test_unknown_provider_without_category_rejected(self):
        res = self.c.post("/api/plans", {"provider": "Nope", "name": "X", "price": "100"}, format="json")
        self.assertEqual(res.status_code, 400)

    def test_cannot_delete_provider_in_use(self):
        p = Provider.objects.create(organization=self.org, name="GTPL", category="cable")
        Plan.objects.create(organization=self.org, provider="GTPL", name="Basic", category="cable", price=230)
        self.assertEqual(self.c.delete(f"/api/products/{p.id}").status_code, 400)

    def test_cable_due_day_falls_back_to_provider_cutoff(self):
        Provider.objects.create(organization=self.org, name="GTPL", category="cable", cutoff_day=7)
        plan = Plan.objects.create(organization=self.org, provider="GTPL", name="Basic", category="cable",
                                   price=230)
        make_customer(self.org, plan)
        make_customer(self.org, plan, mobile="9876543299", due_day=3)
        generate_bills(date(2026, 12, 1), organization=self.org)
        self.assertEqual(sorted(b.due_date.day for b in Bill.objects.all()), [3, 7])

    def test_other_operator_cannot_see_providers(self):
        other = make_org("OTH")
        Provider.objects.create(organization=other, name="BSNL", category="internet")
        self.assertEqual(self.c.get("/api/products").json(), [])
