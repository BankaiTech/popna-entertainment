"""
Customer app: login with mobile + box number, see own bills / receipts, raise and track complaints.
Plus the staff Complaints page. The main risk is a customer token reaching staff data or another customer.
"""
from datetime import timedelta
from decimal import Decimal

from django.core.cache import cache
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from billing.services import generate_bills, record_payment
from complaints.models import Complaint
from core.permissions import Roles
from orgs.models import DEFAULT_MODULES

from .helpers import client_for, first_of_this_month, make_customer, make_org, make_plans, make_user


GPS = {"latitude": 12.69, "longitude": 79.98, "accuracy": 12}


def anon():
    return APIClient(SERVER_NAME="localhost")


class PortalBase(TestCase):
    def setUp(self):
        cache.clear()  # throttles
        self.org = make_org("CP1", contact_phone="9876511111", require_checkin_for_collection=False)
        self.owner = make_user("cp_owner", Roles.OWNER, org=self.org)
        self.tech = make_user("cp_tech", Roles.TECHNICIAN, org=self.org)
        self.tech2 = make_user("cp_tech2", Roles.TECHNICIAN, org=self.org)
        self.agent = make_user("cp_agent", Roles.AGENT, org=self.org)
        self.cable, self.net = make_plans(self.org)
        self.ravi = make_customer(self.org, self.cable, mobile="9000000001", name="Ravi", stb_number="832B0051B347",
                                  customer_code="GT-101")
        self.kumar = make_customer(self.org, self.cable, mobile="9000000002", name="Kumar", stb_number="3156397712")
        generate_bills(first_of_this_month(), organization=self.org)
        self.other_org = make_org("CP2")
        other_plan, _ = make_plans(self.other_org)
        self.outsider = make_customer(self.other_org, other_plan, mobile="9000000009", name="Outsider",
                                      stb_number="OUT123")

    def login(self, mobile="9000000001", box="832B0051B347"):
        return anon().post("/api/customer/auth/login", {"mobile": mobile, "box_number": box}, format="json")

    def customer_client(self, **kw):
        r = self.login(**kw)
        self.assertEqual(r.status_code, 200, r.content)
        c = anon()
        c.credentials(HTTP_AUTHORIZATION=f"Bearer {r.json()['access']}")
        return c, r.json()


class CustomerLoginTests(PortalBase):
    def test_login_with_mobile_and_box_number(self):
        c, data = self.customer_client()
        self.assertEqual(data["customer"]["name"], "Ravi")
        self.assertEqual(data["customer"]["operator"]["phone"], "9876511111")
        me = c.get("/api/customer/me").json()
        self.assertEqual(me["current_bill"]["amount_due"], "230.00")
        self.assertEqual(me["monthly_amount"], "230.00")

    def test_box_can_be_any_id_and_mobile_any_format(self):
        for mobile, box in (("+91 90000 00001", "832b0051b347"), ("09000000001", "GT-101")):
            self.assertEqual(self.login(mobile, box).status_code, 200)

    def test_wrong_details_get_one_generic_error(self):
        for mobile, box in (("9000000001", "WRONG"), ("9000000002", "832B0051B347"), ("", ""),
                            ("9000000001", ""), ("9000000009", "OUT12")):
            r = self.login(mobile, box)
            self.assertEqual(r.status_code, 401, (mobile, box))
            self.assertIn("not correct", r.json()["detail"])

    def test_inactive_customer_or_operator_cannot_log_in(self):
        self.ravi.status = "inactive"
        self.ravi.save()
        self.assertEqual(self.login().status_code, 401)
        self.ravi.status = "active"
        self.ravi.save()
        self.org.status = "suspended"
        self.org.save()
        self.assertEqual(self.login().status_code, 401)

    def test_login_is_throttled(self):
        codes = [self.login("9000000001", f"GUESS{i}").status_code for i in range(12)]
        self.assertIn(429, codes)

    def test_refresh_rotates_and_logout_ends_the_session(self):
        _, data = self.customer_client()
        r = anon().post("/api/customer/auth/refresh", {"refresh": data["refresh"]}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        # old refresh token is used up
        self.assertEqual(anon().post("/api/customer/auth/refresh", {"refresh": data["refresh"]},
                                     format="json").status_code, 401)
        new = r.json()["refresh"]
        self.assertEqual(anon().post("/api/customer/auth/logout", {"refresh": new}, format="json").status_code, 204)
        self.assertEqual(anon().post("/api/customer/auth/refresh", {"refresh": new}, format="json").status_code, 401)

    def test_deactivated_customer_is_logged_out(self):
        c, data = self.customer_client()
        self.ravi.status = "inactive"
        self.ravi.save()
        self.assertEqual(c.get("/api/customer/me").status_code, 401)
        self.assertEqual(anon().post("/api/customer/auth/refresh", {"refresh": data["refresh"]},
                                     format="json").status_code, 401)

    def test_expired_operator_subscription_blocks_the_app(self):
        c, _ = self.customer_client()
        today = timezone.localdate()
        self.org.subscription_start = today - timedelta(days=40)
        self.org.subscription_end = today - timedelta(days=1)
        self.org.save()
        r = c.get("/api/customer/me")
        self.assertEqual(r.status_code, 403)
        self.assertIn("not available", r.json()["detail"])


class TokenSeparationTests(PortalBase):
    """A customer token never opens the staff API, and a staff token never opens the customer API."""

    def test_customer_token_refused_by_staff_api(self):
        c, data = self.customer_client()
        for url in ("/api/contacts", "/api/bills", "/api/payments", "/api/complaints", "/api/auth/me",
                    f"/api/organizations/{self.org.id}", "/api/users"):
            self.assertEqual(c.get(url).status_code, 401, url)
        r = c.post("/api/payments", {"customer_id": self.ravi.id, "amount": "230", "method": "cash"}, format="json")
        self.assertEqual(r.status_code, 401)
        # customer refresh token on the staff refresh endpoint
        r = anon().post("/api/auth/refresh", {"refresh": data["refresh"]}, format="json")
        self.assertEqual(r.status_code, 401, r.content)

    def test_staff_token_refused_by_customer_api(self):
        r = anon().post("/api/auth/login", {"username": "cp_owner", "password": "Strong@Pass123"}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        staff = anon()
        staff.credentials(HTTP_AUTHORIZATION=f"Bearer {r.json()['access']}")
        for url in ("/api/customer/me", "/api/customer/bills", "/api/customer/complaints"):
            self.assertEqual(staff.get(url).status_code, 401, url)
        self.assertEqual(anon().post("/api/customer/auth/refresh", {"refresh": r.json()["refresh"]},
                                     format="json").status_code, 401)
        # and no token at all
        self.assertEqual(anon().get("/api/customer/me").status_code, 401)

    def test_forged_token_is_refused(self):
        c = anon()
        c.credentials(HTTP_AUTHORIZATION="Bearer abc.def.ghi")
        self.assertEqual(c.get("/api/customer/me").status_code, 401)


class CustomerDataTests(PortalBase):
    def test_bills_show_own_receipts_only(self):
        record_payment(user=self.owner, customer=self.ravi, amount=Decimal("100"), method="cash")
        record_payment(user=self.owner, customer=self.kumar, amount=Decimal("230"), method="cash")
        c, _ = self.customer_client()
        bills = c.get("/api/customer/bills").json()
        self.assertEqual(len(bills), 1)
        self.assertEqual(bills[0]["status"], "partial")
        self.assertEqual(bills[0]["balance"], "130.00")
        self.assertEqual([p["amount"] for p in bills[0]["payments"]], ["100.00"])
        self.assertTrue(bills[0]["payments"][0]["receipt_no"])

    def test_cancelled_payment_is_not_shown(self):
        p = record_payment(user=self.owner, customer=self.ravi, amount=Decimal("230"), method="cash")
        client_for(self.owner).post(f"/api/payments/{p.id}/cancel", {"reason": "wrong"}, format="json")
        c, _ = self.customer_client()
        self.assertEqual(c.get("/api/customer/bills").json()[0]["payments"], [])

    def test_customer_raises_and_tracks_a_complaint(self):
        c, _ = self.customer_client()
        r = c.post("/api/customer/complaints", {"category": "no_signal", "description": "No channels since morning"},
                   format="json")
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(r.json()["ticket_no"], "C00001")
        self.assertEqual(r.json()["status"], "open")
        cid = r.json()["id"]
        # Owner sees it as raised by the customer and assigns it
        owner = client_for(self.owner)
        row = owner.get(f"/api/complaints/{cid}").json()
        self.assertTrue(row["raised_by_customer"])
        self.assertEqual(row["customer_name"], "Ravi")
        self.assertEqual(owner.post(f"/api/complaints/{cid}/assign", {"user_id": self.tech.id},
                                    format="json").status_code, 200)
        mine = c.get("/api/customer/complaints").json()[0]
        self.assertEqual((mine["status"], mine["technician"]), ("assigned", "Cp_Tech"))
        # Technician fixes it
        r = client_for(self.tech).post(f"/api/complaints/{cid}/resolve", {"note": "Cable joint fixed", **GPS},
                                       format="json")
        self.assertEqual(r.status_code, 200, r.content)
        mine = c.get("/api/customer/complaints").json()[0]
        self.assertEqual((mine["status"], mine["resolution_note"]), ("resolved", "Cable joint fixed"))

    def test_customer_cannot_set_fields_or_spam(self):
        c, _ = self.customer_client()
        r = c.post("/api/customer/complaints", {"category": "box", "status": "resolved", "ticket_no": "X1",
                                                "customer_id": self.kumar.id}, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        comp = Complaint.objects.get(pk=r.json()["id"])
        self.assertEqual((comp.status, comp.customer_id, comp.ticket_no), ("open", self.ravi.id, "C00001"))
        self.assertEqual(c.post("/api/customer/complaints", {"category": "bad"}, format="json").status_code, 400)
        for _ in range(2):
            c.post("/api/customer/complaints", {"category": "cable"}, format="json")
        r = c.post("/api/customer/complaints", {"category": "cable"}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertIn("open complaints", str(r.content))

    def test_customer_sees_and_cancels_only_own_complaints(self):
        c, _ = self.customer_client()
        own = c.post("/api/customer/complaints", {"category": "box"}, format="json").json()
        kumar, _ = self.customer_client(mobile="9000000002", box="3156397712")
        theirs = kumar.post("/api/customer/complaints", {"category": "box"}, format="json").json()
        self.assertEqual([x["id"] for x in c.get("/api/customer/complaints").json()], [own["id"]])
        self.assertEqual(c.post(f"/api/customer/complaints/{theirs['id']}/cancel").status_code, 404)
        r = c.post(f"/api/customer/complaints/{own['id']}/cancel")
        self.assertEqual((r.status_code, r.json()["status"]), (200, "cancelled"))
        self.assertEqual(c.post(f"/api/customer/complaints/{own['id']}/cancel").status_code, 400)


class StaffComplaintTests(PortalBase):
    def raise_(self, customer=None):
        r = client_for(self.owner).post("/api/complaints", {"customer_id": (customer or self.ravi).id,
                                                            "category": "no_internet", "description": "Red light"},
                                        format="json")
        self.assertEqual(r.status_code, 201, r.content)
        return r.json()

    def test_office_flow_and_ticket_numbers(self):
        a, b = self.raise_(), self.raise_(self.kumar)
        self.assertEqual((a["ticket_no"], b["ticket_no"]), ("C00001", "C00002"))
        owner = client_for(self.owner)
        self.assertEqual(owner.get("/api/complaints/summary").json()["open"], 2)
        self.assertEqual(owner.post(f"/api/complaints/{a['id']}/cancel", {"note": ""}, format="json").status_code,
                         400)  # reason needed
        self.assertEqual(owner.post(f"/api/complaints/{a['id']}/cancel", {"note": "Duplicate"},
                                    format="json").status_code, 200)
        self.assertEqual(owner.post(f"/api/complaints/{a['id']}/reopen", {}, format="json").json()["status"], "open")
        row = owner.get(f"/api/complaints/{a['id']}").json()
        self.assertEqual([u["action"] for u in row["updates"]], ["raised", "cancelled", "reopened"])
        self.assertEqual(len(owner.get("/api/complaints?open=1").json()), 2)

    def test_field_staff_see_and_resolve_only_their_own(self):
        a = self.raise_()
        client_for(self.owner).post(f"/api/complaints/{a['id']}/assign", {"user_id": self.tech.id}, format="json")
        self.assertEqual(len(client_for(self.tech).get("/api/complaints").json()), 1)
        self.assertEqual(client_for(self.tech2).get("/api/complaints").json(), [])
        self.assertEqual(client_for(self.tech2).post(f"/api/complaints/{a['id']}/resolve", {"note": "done!"},
                                                     format="json").status_code, 404)
        # field staff cannot raise, assign or cancel
        t = client_for(self.tech)
        self.assertEqual(t.post("/api/complaints", {"customer_id": self.ravi.id, "category": "box"},
                                format="json").status_code, 403)
        self.assertEqual(t.post(f"/api/complaints/{a['id']}/assign", {"user_id": self.tech2.id},
                                format="json").status_code, 403)
        self.assertEqual(t.post(f"/api/complaints/{a['id']}/resolve", {"note": ""}, format="json").status_code, 400)
        self.assertEqual(t.post(f"/api/complaints/{a['id']}/resolve", {"note": "Replaced adapter", **GPS},
                                format="json").status_code, 200)

    def test_tenant_isolation(self):
        a = self.raise_()
        other_owner = make_user("cp2_owner", Roles.OWNER, org=self.other_org)
        oc = client_for(other_owner)
        self.assertEqual(oc.get("/api/complaints").json(), [])
        self.assertEqual(oc.get(f"/api/complaints/{a['id']}").status_code, 404)
        # cannot raise for another operator's customer, or assign another operator's / office staff
        self.assertEqual(oc.post("/api/complaints", {"customer_id": self.ravi.id, "category": "box"},
                                 format="json").status_code, 400)
        outsider_tech = make_user("cp2_tech", Roles.TECHNICIAN, org=self.other_org)
        owner = client_for(self.owner)
        for bad in (outsider_tech.id, self.owner.id):
            self.assertEqual(owner.post(f"/api/complaints/{a['id']}/assign", {"user_id": bad},
                                        format="json").status_code, 400)

    def test_no_edit_or_delete(self):
        a = self.raise_()
        owner = client_for(self.owner)
        self.assertEqual(owner.patch(f"/api/complaints/{a['id']}", {"status": "resolved"},
                                     format="json").status_code, 405)
        self.assertEqual(owner.delete(f"/api/complaints/{a['id']}").status_code, 405)

    def test_complaints_module_is_on_by_default(self):
        self.assertIn("complaints", DEFAULT_MODULES)


class CustomerLoginBoxThrottleTests(PortalBase):
    def test_many_mobiles_against_one_box_are_throttled(self):
        from unittest import mock
        # Each try from a "different IP": only the per-box limit can stop this.
        codes = []
        for i in range(25):
            with mock.patch("portal.views.LoginIpThrottle.allow_request", return_value=True):
                codes.append(self.login(f"90000{i:05d}", "832B0051B347").status_code)
        self.assertIn(429, codes)
