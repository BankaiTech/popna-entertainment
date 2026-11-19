"""Cashfree online payments: Cashfree's API is faked; nothing leaves the machine."""
import base64
import hashlib
import hmac
import json
from decimal import Decimal
from unittest import mock

from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from core.permissions import Roles
from orgs import cashfree
from orgs.models import PlatformPayment

from .helpers import client_for, make_org, make_user

KEYS = dict(CASHFREE_APP_ID="TEST_APP", CASHFREE_SECRET_KEY="TEST_SECRET", CASHFREE_ENV="sandbox")


class FakeResp:
    def __init__(self, status, data):
        self.status_code = status
        self._data = data
        self.content = json.dumps(data).encode()

    def json(self):
        return self._data


def signed(body: dict, secret="TEST_SECRET", ts="1700000000"):
    raw = json.dumps(body).encode()
    sig = base64.b64encode(hmac.new(secret.encode(), ts.encode() + raw, hashlib.sha256).digest()).decode()
    return raw, {"HTTP_X_WEBHOOK_TIMESTAMP": ts, "HTTP_X_WEBHOOK_SIGNATURE": sig}


class CashfreeTests(TestCase):
    def setUp(self):
        self.org = make_org("CFO", sms_rate=Decimal("0.30"), monthly_fee=Decimal("500.00"), sms_credits=0)
        keys = override_settings(**KEYS, CASHFREE_SANDBOX_ORG_IDS={self.org.id})
        keys.enable()
        self.addCleanup(keys.disable)
        self.owner = make_user("cf_owner", Roles.OWNER, org=self.org, mobile="9876543210")
        self.other = make_org("CFX")
        self.other_owner = make_user("cf_owner2", Roles.OWNER, org=self.other, mobile="9876543211")

    def checkout(self, kind="sms", quantity=100):
        with mock.patch("orgs.cashfree.requests.post",
                        return_value=FakeResp(200, {"payment_session_id": "session_abc", "order_status": "ACTIVE"})
                        ) as post:
            r = client_for(self.owner).post("/api/platform-payments/checkout", {"kind": kind, "quantity": quantity},
                                            format="json")
        return r, post

    def order(self, status, amount):
        return mock.patch("orgs.cashfree.requests.get", return_value=FakeResp(200, {
            "order_status": status, "order_amount": amount}))

    def test_checkout_amount_from_server_and_no_secret_to_browser(self):
        r, post = self.checkout(quantity=100)
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(r.json()["payment_session_id"], "session_abc")
        self.assertNotIn("TEST_SECRET", r.content.decode())
        sent = post.call_args.kwargs["json"]
        self.assertEqual(sent["order_amount"], 30.0)  # 100 x 0.30, worked out here
        self.assertEqual(sent["customer_details"]["customer_phone"], "9876543210")
        self.assertEqual(post.call_args.kwargs["headers"]["x-client-secret"], "TEST_SECRET")
        self.assertIn("sandbox.cashfree.com", post.call_args.args[0])
        p = PlatformPayment.objects.get()
        self.assertEqual((p.status, p.gateway, p.amount), ("created", "cashfree", Decimal("30.00")))

    def test_uses_business_mobile_when_user_has_none(self):
        self.owner.mobile = ""
        self.owner.save()
        _, post = self.checkout()
        self.assertEqual(post.call_args.kwargs["json"]["customer_details"]["customer_phone"], "9876500000")

    def test_not_shown_as_waiting_for_check(self):
        self.checkout()
        admin = client_for(make_user("cf_admin", Roles.PLATFORM_ADMIN))
        self.assertEqual(admin.get("/api/platform-payments/summary").json()["pending"], 0)

    def test_verify_paid_adds_sms_once(self):
        r, _ = self.checkout(quantity=100)
        order_id = r.json()["order_id"]
        with self.order("PAID", 30.00):
            for _ in range(2):  # return page + retry: credits added only once
                v = client_for(self.owner).post("/api/platform-payments/verify", {"order_id": order_id}, format="json")
        self.assertEqual(v.json()["status"], "approved")
        self.org.refresh_from_db()
        self.assertEqual(self.org.sms_credits, 100)

    def test_wrong_amount_or_unpaid_is_not_approved(self):
        r, _ = self.checkout(quantity=100)
        order_id = r.json()["order_id"]
        for status, amount in (("PAID", 1.00), ("ACTIVE", 30.00)):
            with self.order(status, amount):
                v = client_for(self.owner).post("/api/platform-payments/verify", {"order_id": order_id}, format="json")
            self.assertEqual(v.json()["status"], "created")
        self.org.refresh_from_db()
        self.assertEqual(self.org.sms_credits, 0)

    def test_expired_order_marked_rejected(self):
        r, _ = self.checkout()
        with self.order("EXPIRED", 30.00):
            v = client_for(self.owner).post("/api/platform-payments/verify", {"order_id": r.json()["order_id"]},
                                            format="json")
        self.assertEqual(v.json()["status"], "rejected")

    def test_other_operator_cannot_verify(self):
        r, _ = self.checkout()
        v = client_for(self.other_owner).post("/api/platform-payments/verify", {"order_id": r.json()["order_id"]},
                                              format="json")
        self.assertEqual(v.status_code, 400)

    def test_renewal_extends_plan(self):
        r, post = self.checkout(kind="renewal", quantity=3)
        self.assertEqual(post.call_args.kwargs["json"]["order_amount"], 1500.0)
        with self.order("PAID", 1500.00):
            client_for(self.owner).post("/api/platform-payments/verify", {"order_id": r.json()["order_id"]},
                                        format="json")
        self.org.refresh_from_db()
        self.assertIsNotNone(self.org.subscription_end)

    def test_webhook_signature_checked_then_order_fetched(self):
        r, _ = self.checkout(quantity=100)
        body = {"type": "PAYMENT_SUCCESS_WEBHOOK", "data": {"order": {"order_id": r.json()["order_id"]}}}
        raw, headers = signed(body, secret="WRONG")
        bad = APIClient().post("/api/payments/cashfree/webhook", raw, content_type="application/json", **headers)
        self.assertEqual(bad.status_code, 400)
        raw, headers = signed(body)
        with self.order("PAID", 30.00):
            ok = APIClient().post("/api/payments/cashfree/webhook", raw, content_type="application/json", **headers)
        self.assertEqual(ok.status_code, 200)
        self.org.refresh_from_db()
        self.assertEqual(self.org.sms_credits, 100)

    def test_cashfree_down_deletes_order_and_says_so(self):
        with mock.patch("orgs.cashfree.requests.post", return_value=FakeResp(401, {"message": "authentication Failed"})):
            r = client_for(self.owner).post("/api/platform-payments/checkout", {"kind": "sms", "quantity": 10},
                                            format="json")
        self.assertEqual(r.status_code, 400)
        self.assertIn("authentication Failed", r.content.decode())
        self.assertFalse(PlatformPayment.objects.exists())

    def test_my_plan_tells_frontend_online_is_on(self):
        pay = client_for(self.owner).get("/api/my-plan").json()["pay"]
        self.assertEqual((pay["online"], pay["online_mode"]), (True, "sandbox"))


@override_settings(**KEYS)
class SandboxOnlyForTestOperatorsTests(TestCase):
    def test_real_operator_never_sees_sandbox(self):
        org = make_org("CFR", sms_rate=Decimal("0.30"))
        owner = make_user("cf_real", Roles.OWNER, org=org, mobile="9876543212")
        self.assertFalse(client_for(owner).get("/api/my-plan").json()["pay"]["online"])
        with mock.patch("orgs.cashfree.requests.post") as post:
            r = client_for(owner).post("/api/platform-payments/checkout", {"kind": "sms", "quantity": 10}, format="json")
        self.assertEqual(r.status_code, 400)
        post.assert_not_called()

    @override_settings(CASHFREE_ENV="production")
    def test_production_is_for_everyone(self):
        org = make_org("CFP")
        owner = make_user("cf_prod", Roles.OWNER, org=org)
        self.assertTrue(client_for(owner).get("/api/my-plan").json()["pay"]["online"])


class CashfreeOffTests(TestCase):
    def test_no_keys_no_online_button(self):
        org = make_org("CFN")
        owner = make_user("cf_off", Roles.OWNER, org=org)
        self.assertFalse(client_for(owner).get("/api/my-plan").json()["pay"]["online"])
        r = client_for(owner).post("/api/platform-payments/checkout", {"kind": "sms", "quantity": 10}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertFalse(cashfree.enabled())
