from django.core.cache import cache
from unittest import mock

from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework.throttling import ScopedRateThrottle

from core.models import AuditLog
from core.permissions import Roles
from orgs.models import SignupRequest

from .helpers import client_for, make_org, make_user

FORM = {
    "name": "Murugan",
    "mobile": "+91 98400 12345",
    "business_name": "Sri Murugan Cable",
    "city": "Madurai",
    "service": "both",
    "customer_count": "500_2000",
    "language": "ta",
}


class SignupRequestTests(TestCase):
    def setUp(self):
        cache.clear()  # throttle counters live in the cache
        self.public = APIClient()
        self.platform = make_user("platform", Roles.PLATFORM_ADMIN)
        self.org = make_org("DEMO1")
        self.owner = make_user("owner1", Roles.OWNER, org=self.org)

    def test_public_form_saves_and_echoes_nothing(self):
        r = self.public.post("/api/signup-requests", FORM, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(r.json(), {"ok": True})
        s = SignupRequest.objects.get()
        self.assertEqual(s.mobile, "9840012345")
        self.assertEqual(s.status, "new")
        self.assertEqual(s.language, "ta")

    def test_validation(self):
        r = self.public.post("/api/signup-requests", {**FORM, "mobile": "12345"}, format="json")
        self.assertEqual(r.status_code, 400)
        r = self.public.post("/api/signup-requests", {**FORM, "city": " "}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertEqual(SignupRequest.objects.count(), 0)

    def test_honeypot_saves_nothing(self):
        r = self.public.post("/api/signup-requests", {**FORM, "website": "http://spam"}, format="json")
        self.assertEqual(r.status_code, 201)
        self.assertEqual(SignupRequest.objects.count(), 0)

    def test_same_mobile_updates_instead_of_duplicate(self):
        self.public.post("/api/signup-requests", FORM, format="json")
        self.public.post("/api/signup-requests", {**FORM, "city": "Theni"}, format="json")
        s = SignupRequest.objects.get()
        self.assertEqual(s.submit_count, 2)
        self.assertEqual(s.city, "Theni")

    @mock.patch.object(ScopedRateThrottle, "THROTTLE_RATES", {"signup": "2/hour"})
    def test_rate_limited(self):
        codes = [
            self.public.post("/api/signup-requests", {**FORM, "mobile": f"98400000{i:02d}"}, format="json").status_code
            for i in range(3)
        ]
        self.assertEqual(codes, [201, 201, 429])

    def test_only_platform_admin_can_read_and_update(self):
        self.public.post("/api/signup-requests", FORM, format="json")
        s = SignupRequest.objects.get()
        self.assertIn(self.public.get("/api/signup-requests").status_code, (401, 403))
        self.assertEqual(client_for(self.owner).get("/api/signup-requests").status_code, 403)

        admin = client_for(self.platform)
        rows = admin.get("/api/signup-requests").json()
        self.assertEqual(rows[0]["business_name"], "Sri Murugan Cable")
        self.assertEqual(admin.get("/api/signup-requests/summary").json(), {"new": 1})

        r = admin.patch(f"/api/signup-requests/{s.id}", {"status": "contacted", "notes": "Call Monday", "mobile": "9000000000"}, format="json")
        self.assertEqual(r.status_code, 200)
        s.refresh_from_db()
        self.assertEqual((s.status, s.notes, s.mobile), ("contacted", "Call Monday", "9840012345"))
        self.assertTrue(AuditLog.objects.filter(action="signup_status").exists())
        self.assertEqual(admin.get("/api/signup-requests?status=new").json(), [])

        self.assertEqual(admin.delete(f"/api/signup-requests/{s.id}").status_code, 204)
        self.assertEqual(SignupRequest.objects.count(), 0)
