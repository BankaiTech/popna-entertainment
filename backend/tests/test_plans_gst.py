from decimal import Decimal

from django.test import TestCase

from billing.models import Bill
from billing.services import generate_bills
from core.permissions import Roles
from customers.models import Plan, Provider

from .helpers import client_for, first_of_this_month, make_customer, make_org, make_user


class PlanGstAndBulkTests(TestCase):
    def setUp(self):
        self.org = make_org("PG1", max_plans=5)
        self.owner = make_user("pg_owner", Roles.OWNER, org=self.org)
        Provider.objects.create(organization=self.org, name="GTPL HATHWAY LIMITED", category="cable", cutoff_day=10)
        self.c = client_for(self.owner)

    def test_price_with_gst_is_stored_and_billed(self):
        r = self.c.post("/api/plans", {"provider": "GTPL HATHWAY LIMITED", "name": "HD", "price": "230",
                                       "gst_rate": "18"}, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(r.json()["price_with_gst"], "271.40")
        plan = Plan.objects.get(id=r.json()["id"])
        self.assertEqual(plan.price_with_gst, Decimal("271.40"))
        cust = make_customer(self.org, plan, stb_number="G1")
        generate_bills(first_of_this_month(), organization=self.org)
        self.assertEqual(Bill.objects.get(customer=cust).amount_due, Decimal("271.40"))
        # Zero GST: same as the price. Editing the GST updates the stored amount.
        r = self.c.patch(f"/api/plans/{plan.id}", {"gst_rate": "0"}, format="json")
        self.assertEqual(r.json()["price_with_gst"], "230.00")
        plan.refresh_from_db()
        self.assertEqual(plan.price_with_gst, Decimal("230.00"))

    def test_bulk_add_creates_all(self):
        r = self.c.post("/api/plans/bulk", {"provider": "GTPL HATHWAY LIMITED", "plans": [
            {"name": "TAMIL FTA", "price": "150", "gst_rate": "0"},
            {"name": "PRIME", "price": "200", "gst_rate": "0"},
            {"name": "ROYAL HD", "price": "254.24", "gst_rate": "18"},
        ]}, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual([p["price_with_gst"] for p in r.json()], ["150.00", "200.00", "300.00"])
        self.assertEqual(Plan.objects.filter(organization=self.org).count(), 3)

    def test_bulk_add_is_all_or_nothing(self):
        r = self.c.post("/api/plans/bulk", {"provider": "GTPL HATHWAY LIMITED", "plans": [
            {"name": "A", "price": "100"}, {"name": "A", "price": "120"}]}, format="json")
        self.assertEqual(r.status_code, 400, r.content)
        self.assertIn("Plan 2", r.json()["detail"])
        self.assertEqual(Plan.objects.filter(organization=self.org).count(), 0)

    def test_bulk_add_respects_plan_limit(self):
        rows = [{"name": f"P{i}", "price": "100"} for i in range(6)]
        r = self.c.post("/api/plans/bulk", {"provider": "GTPL HATHWAY LIMITED", "plans": rows}, format="json")
        self.assertEqual(r.status_code, 400, r.content)
        self.assertIn("Plan 6", r.json()["detail"])
        self.assertEqual(Plan.objects.filter(organization=self.org).count(), 0)

    def test_agent_cannot_bulk_add(self):
        agent = make_user("pg_agent", Roles.AGENT, org=self.org)
        r = client_for(agent).post("/api/plans/bulk", {"provider": "GTPL HATHWAY LIMITED",
                                                       "plans": [{"name": "X", "price": "1"}]}, format="json")
        self.assertEqual(r.status_code, 403)

    def test_import_matches_the_amount_incl_gst(self):
        Plan.objects.create(organization=self.org, provider="GTPL HATHWAY LIMITED", name="HD", category="cable",
                            price=Decimal("254.24"), gst_rate=Decimal("18"))
        r = self.c.post("/api/contacts/import", {"rows": [
            {"name": "Ravi", "stb_number": "IMP1", "monthly_amount": "300", "area": "Main"}]}, format="json")
        self.assertEqual(r.json()["created"], 1, r.content)
