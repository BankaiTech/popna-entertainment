from django.test import TestCase

from core.permissions import Roles
from tracking.models import DutySession

from .helpers import PASSWORD, client_for, make_customer, make_org, make_plans, make_user

GPS = {"latitude": 12.69, "longitude": 79.97}
ORG_MODULES = ["dashboard", "contacts", "collect", "duty", "live-map", "cutoff", "users", "settings"]


class StaffModuleTests(TestCase):
    def setUp(self):
        self.org = make_org("MOD", allowed_modules=ORG_MODULES)
        self.cable, _ = make_plans(self.org)
        self.cust = make_customer(self.org, self.cable)
        self.owner = make_user("owner", Roles.OWNER, self.org)

    def test_owner_picks_modules_for_an_agent(self):
        res = client_for(self.owner).post("/api/users", {
            "username": "a1", "password": PASSWORD, "role": "agent", "allowed_modules": ["contacts", "duty"],
        }, format="json")
        self.assertEqual(res.status_code, 201, res.content)
        self.assertEqual(res.json()["allowed_modules"], ["contacts", "duty"])
        agent = self.owner.organization.users.get(username="a1")
        me = client_for(agent).get("/api/auth/me").json()
        self.assertEqual(me["allowed_modules"], ["contacts", "duty"])

    def test_defaults_and_office_only_and_org_ceiling(self):
        agent = make_user("a2", Roles.AGENT, self.org)
        self.assertEqual(client_for(agent).get("/api/auth/me").json()["allowed_modules"],
                         ["dashboard", "contacts", "collect", "duty"])
        agent.allowed_modules = ["collect", "live-map", "settings", "pos"]
        agent.save()
        self.assertEqual(client_for(agent).get("/api/auth/me").json()["allowed_modules"], ["collect"])

    def test_server_blocks_collect_and_duty_without_the_module(self):
        agent = make_user("a3", Roles.AGENT, self.org, allowed_modules=["contacts"])
        DutySession.objects.create(organization=self.org, user=agent)
        c = client_for(agent)
        self.assertEqual(c.post("/api/payments", {"customer_id": self.cust.id, "amount": "10", **GPS},
                                format="json").status_code, 403)
        self.assertEqual(c.post("/api/tracking/ping", GPS, format="json").status_code, 403)
        agent.allowed_modules = ["contacts", "collect", "duty"]
        agent.save()
        self.assertEqual(c.post("/api/payments", {"customer_id": self.cust.id, "amount": "10", **GPS},
                                format="json").status_code, 201)
