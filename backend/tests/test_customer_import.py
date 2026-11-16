from decimal import Decimal

from django.test import TestCase

from core.models import AuditLog
from core.permissions import Roles
from customers.models import Customer, Plan

from .helpers import client_for, make_customer, make_org, make_plans, make_user


class CustomerImportTests(TestCase):
    def setUp(self):
        self.org = make_org("IMP1")
        self.owner = make_user("imp_owner", Roles.OWNER, org=self.org)
        self.agent = make_user("imp_agent", Roles.AGENT, org=self.org)
        self.cable, self.net = make_plans(self.org)  # GTPL Basic 230, RailWire 40 Mbps 500+18%
        Plan.objects.create(organization=self.org, provider="GTPL", name="Rs 200", category="cable", price=Decimal("200"))
        self.c = client_for(self.owner)

    def post(self, rows, dry_run=False, client=None):
        return (client or self.c).post("/api/contacts/import", {"rows": rows, "dry_run": dry_run}, format="json")

    def test_dry_run_reports_without_saving(self):
        r = self.post([
            {"name": "Murugan", "mobile": "9840012345", "stb_number": "832B0051B347", "monthly_amount": "200"},
            {"name": "No Plan", "monthly_amount": "999"},
        ], dry_run=True)
        self.assertEqual(r.status_code, 200, r.content)
        body = r.json()
        self.assertEqual(body["created"], 1)
        self.assertEqual(len(body["errors"]), 1)
        self.assertIn("999", body["errors"][0]["error"])
        self.assertEqual(Customer.objects.count(), 0)

    def test_import_by_amount_plan_name_and_without_mobile(self):
        r = self.post([
            {"name": "Murugan", "mobile": "9840012345", "stb_number": "832b0051b347", "monthly_amount": "200",
             "area_name": "VIP Nagar", "notes": "Staff: Pugazh", "sms_language": "ta", "customer_code": "12"},
            {"name": "Kesavan", "stb_number": "3155912081", "provider": "GTPL", "plan": "basic"},
            {"name": "Net user", "mobile": "9840012346", "monthly_amount": "590"},  # 500 + 18% GST
        ])
        self.assertEqual(r.json()["created"], 3, r.content)
        m = Customer.objects.get(name="Murugan")
        self.assertEqual((m.plan.name, m.area.name, m.sms_language, m.customer_code), ("Rs 200", "VIP Nagar", "ta", "12"))
        k = Customer.objects.get(name="Kesavan")
        self.assertEqual((k.mobile, k.plan_id), ("", self.cable.id))
        self.assertEqual(Customer.objects.get(name="Net user").plan_id, self.net.id)
        self.assertTrue(AuditLog.objects.filter(action="customers_imported").exists())

    def test_duplicate_stb_skipped_in_file_and_against_existing(self):
        make_customer(self.org, self.cable, stb_number="AAA111")
        r = self.post([
            {"name": "A", "stb_number": "aaa111", "monthly_amount": "230"},
            {"name": "B", "stb_number": "BBB222", "monthly_amount": "230"},
            {"name": "C", "stb_number": "bbb222", "monthly_amount": "230"},
        ])
        body = r.json()
        self.assertEqual(body["created"], 1)
        self.assertEqual([s["row"] for s in body["skipped"]], [1, 3])

    def test_bad_mobile_and_ambiguous_amount(self):
        Plan.objects.create(organization=self.org, provider="Other", name="Also 200", category="cable", price=Decimal("200"))
        body = self.post([
            {"name": "Bad", "mobile": "12345", "plan": "Basic"},
            {"name": "Two", "monthly_amount": "200"},
        ]).json()
        self.assertEqual(body["created"], 0)
        self.assertIn("mobile", body["errors"][0]["error"])
        self.assertIn("2 plans", body["errors"][1]["error"])

    def test_inactive_status_and_tenant_and_roles(self):
        other = make_org("IMP2")
        make_plans(other)
        body = self.post([{"name": "Off", "status": "Inactive", "monthly_amount": "230"}]).json()
        self.assertEqual(body["created"], 1)
        self.assertEqual(Customer.objects.get(name="Off").status, "inactive")
        self.assertFalse(Customer.objects.filter(organization=other).exists())
        self.assertEqual(self.post([{"name": "X", "monthly_amount": "230"}], client=client_for(self.agent)).status_code, 403)
        self.assertEqual(self.c.post("/api/contacts/import", {"rows": []}, format="json").status_code, 400)
