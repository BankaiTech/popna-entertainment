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
            "status": "Active", "address": {"line1": "1 Main St", "city": "Chengalpattu"}, "area": "Bazaar",
            "stb_number": "STB-NEW-1", "notes": "Near temple", "customer_code": "C-77",
        }, format="json")
        self.assertEqual(res.status_code, 201, res.content)
        body = res.json()
        self.assertEqual(body["mobile"], "9876511111")
        self.assertEqual(body["status"], "Active")
        self.assertEqual(body["connection_type"], "GTPL")
        self.assertEqual(body["area"], "Bazaar")
        self.assertEqual(body["address"]["city"], "Chengalpattu")
        self.assertEqual((body["stb_number"], body["notes"], body["customer_code"]), ("STB-NEW-1", "Near temple", "C-77"))

    def test_area_and_cable_device_id_required_from_the_form(self):
        c = client_for(self.owner_a)
        base = {"name": "P", "connection_type": "GTPL", "package": "Basic", "status": "Active"}
        r = c.post("/api/contacts", {**base, "stb_number": "X1"}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertIn("area", r.json())
        r = c.post("/api/contacts", {**base, "area": "Bazaar"}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertIn("stb_number", r.json())
        r = c.post("/api/contacts", {**base, "area": "Bazaar", "stb_number": "X1"}, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        # Editing other fields keeps the area and device ID; blanking the device ID is refused.
        cid = r.json()["id"]
        self.assertEqual(c.patch(f"/api/contacts/{cid}", {"name": "P2"}, format="json").status_code, 200)
        self.assertEqual(c.patch(f"/api/contacts/{cid}", {"stb_number": ""}, format="json").status_code, 400)
        self.assertEqual(c.get("/api/contacts", {"area": r.json()["area_id"]}).json()[0]["name"], "P2")


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
        self.assertIn("collect", me["allowed_modules"])

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


class AppLanguageTests(TestCase):
    def test_operator_language_flows_to_owner_and_staff_and_user_can_change_own(self):
        admin = make_user("lang_admin", Roles.PLATFORM_ADMIN)
        r = client_for(admin).post("/api/organizations", {
            "name": "Tamil Cable", "code": "TAMIL01", "app_language": "ta",
            "owner_username": "tamil_owner", "owner_password": "Strong#Pass123",
        }, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        from accounts.models import User

        owner = User.objects.get(username="tamil_owner")
        me = client_for(owner).get("/api/auth/me").json()
        self.assertEqual(me["language"], "ta")
        # New staff start in the operator's language unless one is picked.
        r = client_for(owner).post("/api/users", {"username": "tamil_agent", "password": "Strong#Pass123",
                                                  "role": Roles.AGENT}, format="json")
        self.assertEqual((r.status_code, r.json()["language"]), (201, "ta"), r.content)
        r = client_for(owner).post("/api/users", {"username": "hindi_agent", "password": "Strong#Pass123",
                                                  "role": Roles.AGENT, "language": "hi"}, format="json")
        self.assertEqual(r.json()["language"], "hi")
        # Anyone can change their own app language; it is used at the next login.
        c = client_for(owner)
        self.assertEqual(c.patch("/api/auth/me", {"language": "en"}, format="json").json()["language"], "en")
        self.assertEqual(c.patch("/api/auth/me", {"language": "xx"}, format="json").status_code, 400)


class ProviderCutoffTests(TestCase):
    def setUp(self):
        from customers.models import Plan, Provider

        self.org = make_org("CUT")
        self.owner = make_user("cut_owner", Roles.OWNER, self.org)
        self.c = client_for(self.owner)
        self.gtpl = Provider.objects.create(organization=self.org, name="GTPL", category="cable", cutoff_day=10)
        self.plan = Plan.objects.create(organization=self.org, provider="GTPL", name="Basic", category="cable",
                                        price="230")

    def test_cable_provider_needs_cutoff_date(self):
        r = self.c.post("/api/products", {"name": "TCCL", "product_type": "cable"}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertIn("cutoff_date", r.json())
        r = self.c.post("/api/products", {"name": "RailWire", "product_type": "internet"}, format="json")
        self.assertEqual(r.status_code, 201, r.content)

    def test_changing_cutoff_moves_open_bills_and_rename_keeps_plans(self):
        from datetime import date

        from billing.models import Bill
        from billing.services import due_date_for, month_start
        from customers.models import Plan
        from django.utils import timezone

        cust = make_customer(self.org, self.plan)
        period = month_start(timezone.localdate())
        bill = Bill.objects.create(organization=self.org, customer=cust, period=period, amount_due="230",
                                   due_date=due_date_for(cust, period))
        self.assertEqual(bill.due_date.day, 10)
        r = self.c.patch(f"/api/products/{self.gtpl.id}", {"cutoff_date": 15, "name": "GTPL Digital"}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        bill.refresh_from_db()
        self.assertEqual(bill.due_date, date(period.year, period.month, 15))
        self.assertEqual(Plan.objects.get(pk=self.plan.pk).provider, "GTPL Digital")


class OperatorPhoneTests(TestCase):
    def test_owner_mobile_from_app_owner_shows_as_business_phone(self):
        admin = make_user("phone_admin", Roles.PLATFORM_ADMIN)
        r = client_for(admin).post("/api/organizations", {
            "name": "Phone Cable", "code": "PHONE1", "owner_mobile": "9876501234",
            "owner_username": "phone_owner", "owner_password": "Strong#Pass123",
        }, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(r.json()["contact_phone"], "9876501234")
        org_id = r.json()["id"]
        from accounts.models import User

        owner = User.objects.get(username="phone_owner")
        self.assertEqual(client_for(owner).get(f"/api/organizations/{org_id}").json()["contact_phone"], "9876501234")
