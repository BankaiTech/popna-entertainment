from django.test import TestCase

from billing.models import Bill
from billing.services import generate_bills
from core.permissions import Roles

from .helpers import client_for, first_of_this_month, make_customer, make_org, make_plans, make_user


class CustomerCollectorTests(TestCase):
    """A customer with collectors is seen only by them (and office staff). No collector = all field staff."""

    def setUp(self):
        self.org = make_org("COL1")
        self.owner = make_user("col_owner", Roles.OWNER, org=self.org)
        self.manager = make_user("col_mgr", Roles.MANAGER, org=self.org)
        self.pugazh = make_user("pugazh", Roles.AGENT, org=self.org)
        self.ramach = make_user("ramach", Roles.AGENT, org=self.org)
        self.tech = make_user("col_tech", Roles.TECHNICIAN, org=self.org)
        self.cable, _ = make_plans(self.org)
        self.c_pugazh = make_customer(self.org, self.cable, name="P only", mobile="9000000001", stb_number="A1")
        self.c_pugazh.collectors.set([self.pugazh])
        self.c_both = make_customer(self.org, self.cable, name="Both", mobile="9000000002", stb_number="A2")
        self.c_both.collectors.set([self.pugazh, self.ramach])
        self.c_shared = make_customer(self.org, self.cable, name="Shared", mobile="9000000003", stb_number="A3")
        generate_bills(first_of_this_month(), organization=self.org)

    def names(self, user, url="/api/contacts"):
        r = client_for(user).get(url)
        self.assertEqual(r.status_code, 200, r.content)
        rows = r.json()["results"] if isinstance(r.json(), dict) else r.json()
        return {row.get("name") or row.get("customer_name") for row in rows}

    def test_field_staff_see_only_their_customers_and_shared_ones(self):
        self.assertEqual(self.names(self.pugazh), {"P only", "Both", "Shared"})
        self.assertEqual(self.names(self.ramach), {"Both", "Shared"})
        self.assertEqual(self.names(self.tech), {"Shared"})

    def test_office_staff_see_everyone_and_can_filter(self):
        self.assertEqual(self.names(self.owner), {"P only", "Both", "Shared"})
        self.assertEqual(self.names(self.manager), {"P only", "Both", "Shared"})
        self.assertEqual(self.names(self.owner, f"/api/contacts?collector={self.ramach.id}"), {"Both"})
        self.assertEqual(self.names(self.owner, "/api/contacts?collector=none"), {"Shared"})

    def test_bills_follow_the_same_rule(self):
        self.assertEqual(self.names(self.ramach, "/api/bills"), {"Both", "Shared"})

    def test_agent_cannot_collect_from_another_collectors_customer(self):
        bill = Bill.objects.get(customer=self.c_pugazh)
        r = client_for(self.ramach).post("/api/payments", {
            "customer_id": self.c_pugazh.id, "bill_id": bill.id, "amount": "230", "method": "cash",
            "latitude": 11.1, "longitude": 79.1,
        }, format="json")
        self.assertEqual(r.status_code, 403, r.content)
        self.assertIn("another collector", r.json()["detail"])

    def test_owner_sets_collectors_on_create_and_edit(self):
        c = client_for(self.owner)
        r = c.post("/api/contacts", {
            "name": "New", "mobile": "9000000009", "plan_id": self.cable.id, "area": "Main Road",
            "stb_number": "A9", "collector_ids": [self.pugazh.id, self.ramach.id],
        }, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(sorted(r.json()["collector_ids"]), sorted([self.pugazh.id, self.ramach.id]))
        r = c.patch(f"/api/contacts/{r.json()['id']}", {"collector_ids": []}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.json()["collector_ids"], [])

    def test_only_own_field_staff_can_be_collectors(self):
        other = make_org("COL2")
        outsider = make_user("outsider", Roles.AGENT, org=other)
        c = client_for(self.owner)
        for bad in (outsider.id, self.manager.id):
            r = c.patch(f"/api/contacts/{self.c_shared.id}", {"collector_ids": [bad]}, format="json")
            self.assertEqual(r.status_code, 400, r.content)

    def test_import_with_collector_ids(self):
        r = client_for(self.owner).post("/api/contacts/import", {"rows": [
            {"name": "Imp A", "stb_number": "B1", "monthly_amount": "230", "collector_ids": str(self.pugazh.id)},
            {"name": "Imp B", "stb_number": "B2", "monthly_amount": "230",
             "collector_ids": f"{self.pugazh.id}, {self.ramach.id}"},
            {"name": "Imp C", "stb_number": "B3", "monthly_amount": "230", "collector_ids": ""},
            {"name": "Imp D", "stb_number": "B4", "monthly_amount": "230", "collector_ids": "999"},
        ]}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.json()["created"], 3)
        self.assertEqual(len(r.json()["errors"]), 1)
        self.assertIn("999", r.json()["errors"][0]["error"])
        self.assertEqual(self.names(self.ramach) & {"Imp A", "Imp B", "Imp C"}, {"Imp B", "Imp C"})
