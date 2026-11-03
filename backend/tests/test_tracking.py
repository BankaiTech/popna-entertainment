from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from core.permissions import Roles
from tracking.models import LocationPing

from .helpers import client_for, make_org, make_user

GPS = {"latitude": 12.6919, "longitude": 79.9765, "accuracy": 20}


class TrackingTests(TestCase):
    def setUp(self):
        self.org = make_org("TRK")
        self.agent = make_user("agent", Roles.AGENT, self.org, name="Selvi")
        self.owner = make_user("owner", Roles.OWNER, self.org)

    def test_no_location_recorded_when_off_duty(self):
        res = client_for(self.agent).post("/api/tracking/ping", GPS, format="json")
        self.assertEqual(res.status_code, 409)
        self.assertEqual(LocationPing.objects.count(), 0)

    def test_duty_flow_and_live_map(self):
        c = client_for(self.agent)
        self.assertEqual(c.post("/api/tracking/check-in", GPS, format="json").status_code, 201)
        self.assertEqual(c.post("/api/tracking/check-in", GPS, format="json").status_code, 200)  # idempotent
        # A ping right after check-in is ignored (too soon), a later one is stored.
        self.assertEqual(c.post("/api/tracking/ping", GPS, format="json").status_code, 200)
        LocationPing.objects.update(recorded_at=timezone.now() - timedelta(minutes=3))
        self.assertEqual(c.post("/api/tracking/ping", {**GPS, "latitude": 12.7}, format="json").status_code, 201)
        live = client_for(self.owner).get("/api/tracking/live").json()["agents"]
        self.assertEqual(len(live), 1)
        self.assertEqual(live[0]["name"], "Selvi")
        self.assertAlmostEqual(live[0]["latitude"], 12.7)
        route = client_for(self.owner).get(f"/api/tracking/route?user_id={self.agent.id}").json()
        self.assertEqual(len(route["points"]), 2)
        self.assertEqual(c.post("/api/tracking/check-out", GPS, format="json").status_code, 200)
        self.assertEqual(client_for(self.owner).get("/api/tracking/live").json()["agents"], [])

    def test_agents_cannot_view_live_map_and_owner_cannot_check_in(self):
        self.assertEqual(client_for(self.agent).get("/api/tracking/live").status_code, 403)
        self.assertEqual(client_for(self.owner).post("/api/tracking/check-in", GPS, format="json").status_code, 403)

    def test_invalid_coordinates_rejected(self):
        res = client_for(self.agent).post("/api/tracking/check-in", {"latitude": 200, "longitude": 1}, format="json")
        self.assertEqual(res.status_code, 400)

    def test_tracking_disabled(self):
        self.org.tracking_enabled = False
        self.org.save()
        self.assertEqual(client_for(self.agent).post("/api/tracking/check-in", GPS, format="json").status_code, 403)
