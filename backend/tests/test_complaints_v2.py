"""
Complaints, revamped rules:
- unassigned open complaints: every field staff member (with the Complaints page) sees them and can take one
- assigned: only that person (and the office) sees it
- closing in the field records the phone's location; off duty is refused when the operator requires check-in
"""
from django.test import TestCase

from complaints.models import Complaint
from core.permissions import Roles
from tracking.models import DutySession, LocationPing

from .helpers import client_for, make_customer, make_org, make_plans, make_user

GPS = {"latitude": 12.691234567, "longitude": 79.981234567, "accuracy": 15}


class ComplaintVisibilityTests(TestCase):
    def setUp(self):
        self.org = make_org("CV1", require_checkin_for_collection=False)
        self.owner = make_user("cv_owner", Roles.OWNER, org=self.org)
        self.manager = make_user("cv_mgr", Roles.MANAGER, org=self.org)
        self.t1 = make_user("cv_t1", Roles.TECHNICIAN, org=self.org)
        self.t2 = make_user("cv_t2", Roles.TECHNICIAN, org=self.org)
        self.agent = make_user("cv_agent", Roles.AGENT, org=self.org)  # default menu: no Complaints
        self.agent_c = make_user("cv_agent_c", Roles.AGENT, org=self.org)
        self.agent_c.allowed_modules = ["dashboard", "collect", "complaints"]
        self.agent_c.save()
        cable, _ = make_plans(self.org)
        self.cust = make_customer(self.org, cable, mobile="9000000101", stb_number="CV-1")
        self.owner_c = client_for(self.owner)

    def raise_(self):
        r = self.owner_c.post("/api/complaints", {"customer_id": self.cust.id, "category": "no_signal"}, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        return r.json()["id"]

    def ids(self, user, query=""):
        r = client_for(user).get(f"/api/complaints{query}")
        self.assertEqual(r.status_code, 200, r.content)
        return {row["id"] for row in r.json()}

    def test_unassigned_is_seen_by_every_field_staff_assigned_only_by_one(self):
        a, b = self.raise_(), self.raise_()
        for u in (self.t1, self.t2, self.agent_c):
            self.assertEqual(self.ids(u), {a, b})
        self.owner_c.post(f"/api/complaints/{a}/assign", {"user_id": self.t1.id}, format="json")
        self.assertEqual(self.ids(self.t1), {a, b})
        self.assertEqual(self.ids(self.t2), {b})
        self.assertEqual(self.ids(self.agent_c), {b})
        self.assertEqual(self.ids(self.t1, "?mine=1"), {a})
        self.assertEqual(self.ids(self.t1, "?unassigned=1"), {b})
        self.assertEqual(client_for(self.t2).get(f"/api/complaints/{a}").status_code, 404)
        # back to everyone
        r = self.owner_c.post(f"/api/complaints/{a}/assign", {"user_id": None}, format="json")
        self.assertEqual((r.status_code, r.json()["status"]), (200, "open"))
        self.assertEqual(self.ids(self.t2), {a, b})
        self.assertEqual(self.ids(self.owner), {a, b})
        self.assertEqual(self.ids(self.manager), {a, b})

    def test_staff_without_the_complaints_page_get_nothing(self):
        self.raise_()
        self.assertEqual(client_for(self.agent).get("/api/complaints").status_code, 403)
        r = self.owner_c.post(f"/api/complaints/{self.raise_()}/assign", {"user_id": self.agent.id}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertIn("Complaints page", str(r.content))

    def test_take_first_one_wins(self):
        a = self.raise_()
        r = client_for(self.t1).post(f"/api/complaints/{a}/take", {}, format="json")
        self.assertEqual((r.status_code, r.json()["assigned_to"]), (200, self.t1.id))
        self.assertEqual(client_for(self.t2).post(f"/api/complaints/{a}/take", {}, format="json").status_code, 404)
        self.assertEqual(self.ids(self.t2), set())
        self.assertEqual(self.owner_c.post(f"/api/complaints/{a}/take", {}, format="json").status_code, 403)
        actions = [u["action"] for u in self.owner_c.get(f"/api/complaints/{a}").json()["updates"]]
        self.assertEqual(actions, ["raised", "taken"])

    def test_close_records_location_and_owner(self):
        a = self.raise_()
        t1 = client_for(self.t1)
        r = t1.post(f"/api/complaints/{a}/resolve", {"note": "Fixed the joint"}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertIn("location", r.json())
        r = t1.post(f"/api/complaints/{a}/resolve", {"note": "Fixed the joint", "latitude": 12.7}, format="json")
        self.assertEqual(r.status_code, 400)
        r = t1.post(f"/api/complaints/{a}/resolve", {"note": "Fixed", "latitude": 200, "longitude": 79.9},
                    format="json")
        self.assertEqual(r.status_code, 400)
        r = t1.post(f"/api/complaints/{a}/resolve", {"note": "Fixed the joint", **GPS}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        body = r.json()
        self.assertEqual((body["status"], body["assigned_to"], body["resolved_by_name"]),
                         ("resolved", self.t1.id, self.t1.display_name))
        self.assertEqual((body["resolved_latitude"], body["resolved_longitude"]), ("12.691235", "79.981235"))
        # t2 can no longer see it (it became t1's)
        self.assertEqual(self.ids(self.t2), set())

    def test_cannot_close_someone_elses(self):
        a = self.raise_()
        self.owner_c.post(f"/api/complaints/{a}/assign", {"user_id": self.t1.id}, format="json")
        r = client_for(self.t2).post(f"/api/complaints/{a}/resolve", {"note": "Fixed it", **GPS}, format="json")
        self.assertEqual(r.status_code, 404)

    def test_office_can_close_without_location(self):
        a = self.raise_()
        r = self.owner_c.post(f"/api/complaints/{a}/resolve", {"note": "Fixed on phone call"}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        self.assertIsNone(r.json()["resolved_latitude"])

    def test_reopen_clears_the_location(self):
        a = self.raise_()
        client_for(self.t1).post(f"/api/complaints/{a}/resolve", {"note": "Fixed the joint", **GPS}, format="json")
        r = self.owner_c.post(f"/api/complaints/{a}/reopen", {}, format="json")
        self.assertEqual((r.json()["status"], r.json()["resolved_latitude"]), ("assigned", None))

    def test_summary_counts_follow_visibility(self):
        a, _b = self.raise_(), self.raise_()
        self.owner_c.post(f"/api/complaints/{a}/assign", {"user_id": self.t1.id}, format="json")
        self.assertEqual(client_for(self.t1).get("/api/complaints/summary").json(),
                         {"unassigned": 1, "mine_open": 1, "mine_closed": 0})
        self.assertEqual(self.owner_c.get("/api/complaints/summary").json()["open"], 2)


class ComplaintDutyTests(TestCase):
    def test_off_duty_close_refused_when_check_in_required_and_ping_saved_on_duty(self):
        org = make_org("CD1", require_checkin_for_collection=True)
        owner = make_user("cd_owner", Roles.OWNER, org=org)
        tech = make_user("cd_tech", Roles.TECHNICIAN, org=org)
        cable, _ = make_plans(org)
        cust = make_customer(org, cable, mobile="9000000102", stb_number="CD-1")
        cid = client_for(owner).post("/api/complaints", {"customer_id": cust.id, "category": "box"},
                                     format="json").json()["id"]
        t = client_for(tech)
        r = t.post(f"/api/complaints/{cid}/resolve", {"note": "Replaced box", **GPS}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertIn("duty", r.json())
        DutySession.objects.create(organization=org, user=tech)
        r = t.post(f"/api/complaints/{cid}/resolve", {"note": "Replaced box", **GPS}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        self.assertTrue(LocationPing.objects.filter(user=tech, source="complaint").exists())
        self.assertEqual(Complaint.objects.get(pk=cid).status, "resolved")


class BodyShapeTests(TestCase):
    """A JSON list or bare string used to crash views with a 500."""

    def test_non_object_json_is_a_400(self):
        org = make_org("BS1")
        owner = make_user("bs_owner", Roles.OWNER, org=org)
        c = client_for(owner)
        for body in ("[1, 2]", '"text"', "3"):
            for url in ("/api/customers", "/api/complaints", "/api/payments", "/api/auth/logout"):
                r = c.post(url, body, content_type="application/json")
                self.assertEqual(r.status_code, 400, (url, body, r.content[:200]))
        r = c.post("/api/customer/auth/login", "[1]", content_type="application/json")
        self.assertEqual(r.status_code, 400)


class FieldStaffDataTests(TestCase):
    def test_customer_list_needs_customers_or_collect_page(self):
        org = make_org("FS1")
        cable, _ = make_plans(org)
        make_customer(org, cable, mobile="9000000301", stb_number="FS-1")
        tech = make_user("fs_tech", Roles.TECHNICIAN, org=org)  # default: dashboard, complaints, duty
        agent = make_user("fs_agent", Roles.AGENT, org=org)  # default: contacts, collect
        collector = make_user("fs_col", Roles.AGENT, org=org)
        collector.allowed_modules = ["dashboard", "collect"]
        collector.save()
        self.assertEqual(client_for(tech).get("/api/customers").status_code, 403)
        self.assertEqual(client_for(tech).get("/api/contacts").status_code, 403)
        self.assertEqual(len(client_for(agent).get("/api/customers").json()), 1)
        self.assertEqual(len(client_for(collector).get("/api/customers").json()), 1)

    def test_owner_login_only_for_platform(self):
        org = make_org("FS2")
        make_user("fs2_owner", Roles.OWNER, org=org)
        agent = make_user("fs2_agent", Roles.AGENT, org=org)
        row = client_for(agent).get("/api/organizations").json()[0]
        self.assertIsNone(row.get("owner_login"))
        admin = make_user("fs2_pa", Roles.PLATFORM_ADMIN)
        rows = client_for(admin).get("/api/organizations").json()
        self.assertEqual([r["owner_login"] for r in rows if r["id"] == org.id], ["fs2_owner"])


class DuplicatePaymentTests(TestCase):
    def test_double_tap_on_a_part_payment_saves_once(self):
        from billing.models import Payment
        from billing.services import generate_bills

        from .helpers import first_of_this_month

        org = make_org("DP1", require_checkin_for_collection=False, require_gps_for_collection=False)
        owner = make_user("dp_owner", Roles.OWNER, org=org)
        cable, _ = make_plans(org)
        cust = make_customer(org, cable, mobile="9000000401", stb_number="DP-1")
        generate_bills(first_of_this_month(), organization=org)
        c = client_for(owner)
        body = {"customer_id": cust.id, "amount": "50", "method": "cash"}
        self.assertEqual(c.post("/api/payments", body, format="json").status_code, 201)
        r = c.post("/api/payments", body, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertIn("just saved", str(r.content))
        # a different amount is a different payment
        self.assertEqual(c.post("/api/payments", {**body, "amount": "60"}, format="json").status_code, 201)
        self.assertEqual(Payment.objects.filter(customer=cust).count(), 2)
