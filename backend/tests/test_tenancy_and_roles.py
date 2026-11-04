from django.test import TestCase
from rest_framework.test import APIClient

from core.permissions import Roles
from orgs.models import Distributor

from .helpers import PASSWORD, client_for, make_customer, make_org, make_plans, make_user


class TenantIsolationTests(TestCase):
    def setUp(self):
        self.org_a = make_org("AAA")
        self.org_b = make_org("BBB")
        cable_a, _ = make_plans(self.org_a)
        cable_b, _ = make_plans(self.org_b)
        self.cust_a = make_customer(self.org_a, cable_a, name="Alice A")
        self.cust_b = make_customer(self.org_b, cable_b, name="Bob B", mobile="9876543211")
        self.owner_a = make_user("owner_a", Roles.OWNER, self.org_a)
        self.plan_b = cable_b

    def test_owner_sees_only_own_customers(self):
        res = client_for(self.owner_a).get("/api/contacts")
        self.assertEqual(res.status_code, 200)
        self.assertEqual([c["name"] for c in res.json()], ["Alice A"])

    def test_cannot_read_other_operator_customer_by_id(self):
        res = client_for(self.owner_a).get(f"/api/contacts/{self.cust_b.id}")
        self.assertEqual(res.status_code, 404)

    def test_organization_header_is_ignored(self):
        c = client_for(self.owner_a)
        res = c.get("/api/contacts", HTTP_X_ORGANIZATION_ID=str(self.org_b.id))
        self.assertEqual([x["name"] for x in res.json()], ["Alice A"])

    def test_cannot_attach_other_operators_plan(self):
        res = client_for(self.owner_a).post(
            "/api/contacts", {"name": "X", "mobile": "9876543299", "plan_id": self.plan_b.id}, format="json"
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("plan_id", res.json())

    def test_frontend_style_payload_creates_customer(self):
        res = client_for(self.owner_a).post("/api/contacts", {
            "name": "New Person", "mobile": "+91 98765 11111", "connection_type": "GTPL", "package": "Basic",
            "status": "Active", "address": {"line1": "1 Main St", "city": "Chengalpattu"}, "area_name": "Bazaar",
        }, format="json")
        self.assertEqual(res.status_code, 201, res.content)
        body = res.json()
        self.assertEqual(body["mobile"], "9876511111")
        self.assertEqual(body["status"], "Active")
        self.assertEqual(body["connection_type"], "GTPL")
        self.assertEqual(body["area"], "Bazaar")
        self.assertEqual(body["address"]["city"], "Chengalpattu")


class RoleTests(TestCase):
    def setUp(self):
        self.org = make_org("ORG1")
        self.cable, _ = make_plans(self.org)
        self.cust = make_customer(self.org, self.cable)
        self.agent = make_user("agent", Roles.AGENT, self.org)
        self.owner = make_user("owner", Roles.OWNER, self.org)

    def test_agent_can_read_but_not_edit_customers(self):
        c = client_for(self.agent)
        self.assertEqual(c.get("/api/contacts").status_code, 200)
        self.assertEqual(c.patch(f"/api/contacts/{self.cust.id}", {"name": "Z"}, format="json").status_code, 403)
        self.assertEqual(c.delete(f"/api/contacts/{self.cust.id}").status_code, 403)

    def test_owner_cannot_create_another_owner(self):
        res = client_for(self.owner).post(
            "/api/users", {"username": "o2", "password": PASSWORD, "role": "owner"}, format="json"
        )
        self.assertEqual(res.status_code, 400)

    def test_owner_creates_agent_in_own_org(self):
        other = make_org("OTHER")
        res = client_for(self.owner).post("/api/users", {
            "username": "agent2", "password": PASSWORD, "role": "agent", "organization": other.id
        }, format="json")
        self.assertEqual(res.status_code, 201, res.content)
        self.assertEqual(res.json()["organization"], self.org.id)  # forced to owner's org

    def test_login_and_me_maps_roles_for_frontend(self):
        c = APIClient()
        tokens = c.post("/api/auth/login", {"username": "agent", "password": PASSWORD}, format="json").json()
        c.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        me = c.get("/api/auth/me").json()
        self.assertEqual(me["role"], "employee")
        self.assertEqual(me["lco_role"], "agent")
        self.assertEqual(me["organization_id"], str(self.org.id))
        self.assertIn("payments", me["allowed_modules"])

    def test_suspended_operator_is_blocked(self):
        self.org.status = "suspended"
        self.org.save()
        self.assertEqual(client_for(self.owner).get("/api/contacts").status_code, 403)


class DistributorTests(TestCase):
    def test_distributor_sees_only_own_operators(self):
        d1 = Distributor.objects.create(name="D1")
        d2 = Distributor.objects.create(name="D2")
        make_org("MINE", distributor=d1)
        make_org("THEIRS", distributor=d2)
        user = make_user("dist", Roles.DISTRIBUTOR, distributor=d1)
        c = client_for(user)
        codes = [o["code"] for o in c.get("/api/organizations").json()]
        self.assertEqual(codes, ["MINE"])
        summary = c.get("/api/distributor/summary").json()
        self.assertEqual([r["code"] for r in summary["operators"]], ["MINE"])
        # Distributors never get customer-level data
        self.assertEqual(c.get("/api/contacts").status_code, 403)

    def test_distributor_creates_operator_under_itself(self):
        d1 = Distributor.objects.create(name="D1")
        d2 = Distributor.objects.create(name="D2")
        user = make_user("dist", Roles.DISTRIBUTOR, distributor=d1)
        res = client_for(user).post("/api/organizations", {"name": "New LCO", "code": "new01", "distributor": d2.id},
                                    format="json")
        self.assertEqual(res.status_code, 201, res.content)
        self.assertEqual(res.json()["distributor"], d1.id)
        self.assertEqual(res.json()["code"], "NEW01")
