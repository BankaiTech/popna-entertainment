"""PayU: second online gateway. The salt never leaves the server; only PayU's own answer approves a payment."""
import hashlib
from unittest import mock

from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from core.permissions import Roles
from orgs.models import Organization, PlatformPayment
from orgs import payu

from .helpers import client_for, make_org, make_user

KEYS = dict(PAYU_KEY="testkey", PAYU_SALT="testsalt", PAYU_ENV="test",
            PAYU_APP_RETURN_URL="https://lcodesk.in/admin/settings?tab=plan")


class FakeResp:
    def __init__(self, code, body):
        self.status_code, self._body = code, body

    def json(self):
        return self._body


def signed_response(fields, status="success", salt="testsalt"):
    """What PayU posts back: our fields + status + reverse hash."""
    f = {k: fields[k] for k in ("key", "txnid", "amount", "productinfo", "firstname", "email", "udf1")}
    f.update(status=status, mihpayid="403993715531234567")
    seq = [salt, status, "", "", "", "", "", "", "", "", "", f["udf1"], f["email"], f["firstname"],
           f["productinfo"], f["amount"], f["txnid"], f["key"]]
    f["hash"] = hashlib.sha512("|".join(seq).encode()).hexdigest()
    return f


class PayUTests(TestCase):
    def setUp(self):
        self.org = make_org("PU1", contact_phone="9876500011")
        self.owner = make_user("pu_owner", Roles.OWNER, org=self.org)
        self.keys = override_settings(**KEYS, PAYU_SANDBOX_ORG_IDS={self.org.id})
        self.keys.enable()
        self.addCleanup(self.keys.disable)

    def checkout(self, quantity=1000):
        r = client_for(self.owner).post("/api/platform-payments/checkout",
                                        {"kind": "sms", "quantity": quantity, "gateway": "payu"}, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        return r.json()

    def verify_says(self, txnid, status="success", amt=None, udf1=None):
        detail = {"status": status, "amt": amt, "mihpayid": "4039937155", "udf1": udf1 or str(self.org.id)}
        return mock.patch("orgs.payu.requests.post", return_value=FakeResp(200, {
            "status": 1, "msg": "1 out of 1 Transactions Fetched Successfully", "transaction_details": {txnid: detail}}))

    def test_checkout_form_is_signed_on_the_server_and_hides_the_salt(self):
        data = self.checkout()
        self.assertEqual(data["action"], "https://test.payu.in/_payment")
        f = data["fields"]
        self.assertNotIn("testsalt", str(data))
        self.assertEqual(f["amount"], data["amount"] if "." in data["amount"] else f"{data['amount']}.00")
        self.assertEqual(f["hash"], payu.request_hash(f))
        self.assertEqual(f["udf1"], str(self.org.id))
        p = PlatformPayment.objects.get(gateway_order_id=f["txnid"])
        self.assertEqual((p.gateway, p.status), ("payu", "created"))

    def test_return_with_real_payment_approves_and_goes_back_to_plan_page(self):
        f = self.checkout()["fields"]
        with self.verify_says(f["txnid"], amt=f["amount"]):
            r = APIClient().post("/api/payments/payu/return", signed_response(f))
        self.assertEqual(r.status_code, 303)
        self.assertEqual(r["Location"], f"https://lcodesk.in/admin/settings?tab=plan&order_id={f['txnid']}")
        self.assertEqual(PlatformPayment.objects.get(gateway_order_id=f["txnid"]).status, "approved")
        self.assertEqual(Organization.objects.get(pk=self.org.pk).sms_credits, 1000)

    def test_forged_success_post_is_ignored(self):
        f = self.checkout()["fields"]
        forged = signed_response(f, salt="wrong-salt")
        with mock.patch("orgs.payu.requests.post") as post:
            r = APIClient().post("/api/payments/payu/return", forged)
            post.assert_not_called()  # bad signature: we don't even ask PayU
        self.assertEqual(r.status_code, 303)
        self.assertEqual(PlatformPayment.objects.get(gateway_order_id=f["txnid"]).status, "created")

    def test_signed_success_but_payu_says_failed_or_wrong_amount(self):
        f = self.checkout()["fields"]
        with self.verify_says(f["txnid"], amt="1.00"):  # paid ₹1 instead of the price
            APIClient().post("/api/payments/payu/webhook", signed_response(f))
        self.assertEqual(PlatformPayment.objects.get(gateway_order_id=f["txnid"]).status, "created")
        with self.verify_says(f["txnid"], status="failure", amt=f["amount"]):
            APIClient().post("/api/payments/payu/webhook", signed_response(f, status="failure"))
        self.assertEqual(PlatformPayment.objects.get(gateway_order_id=f["txnid"]).status, "rejected")
        self.assertEqual(Organization.objects.get(pk=self.org.pk).sms_credits, 0)

    def test_paid_once_even_if_return_webhook_and_verify_all_arrive(self):
        f = self.checkout()["fields"]
        with self.verify_says(f["txnid"], amt=f["amount"]):
            APIClient().post("/api/payments/payu/return", signed_response(f))
            APIClient().post("/api/payments/payu/webhook", signed_response(f))
            r = client_for(self.owner).post("/api/platform-payments/verify", {"order_id": f["txnid"]}, format="json")
        self.assertEqual(r.json()["status"], "approved")
        self.assertEqual(Organization.objects.get(pk=self.org.pk).sms_credits, 1000)

    def test_other_operator_cannot_verify_my_order(self):
        f = self.checkout()["fields"]
        other = make_user("pu_other", Roles.OWNER, org=make_org("PU2"))
        r = client_for(other).post("/api/platform-payments/verify", {"order_id": f["txnid"]}, format="json")
        self.assertEqual(r.status_code, 400)

    def test_not_offered_when_off(self):
        with override_settings(PAYU_SANDBOX_ORG_IDS=set()):  # test keys, not a test operator
            r = client_for(self.owner).post("/api/platform-payments/checkout",
                                            {"kind": "sms", "quantity": 1000, "gateway": "payu"}, format="json")
            self.assertEqual(r.status_code, 400)
            self.assertNotIn("payu", client_for(self.owner).get("/api/my-plan").json()["pay"]["gateways"])
        self.assertIn("payu", client_for(self.owner).get("/api/my-plan").json()["pay"]["gateways"])
        r = client_for(self.owner).post("/api/platform-payments/checkout",
                                        {"kind": "sms", "quantity": 1000, "gateway": "stripe"}, format="json")
        self.assertEqual(r.status_code, 400)

    def test_return_redirect_never_uses_a_url_from_the_request(self):
        r = APIClient().post("/api/payments/payu/return", {"txnid": "https://evil.example/x", "status": "success"})
        self.assertEqual(r["Location"], "https://lcodesk.in/admin/settings?tab=plan")


class ReconcileTests(TestCase):
    """Paid, but the webhook was lost and the operator closed the browser: the scheduler still finds it."""

    def setUp(self):
        self.org = make_org("RC1", contact_phone="9876500012")
        self.owner = make_user("rc_owner", Roles.OWNER, org=self.org)
        self.keys = override_settings(**KEYS, PAYU_SANDBOX_ORG_IDS={self.org.id})
        self.keys.enable()
        self.addCleanup(self.keys.disable)

    def test_lost_webhook_is_picked_up_and_old_orders_close(self):
        from datetime import timedelta

        from django.utils import timezone

        from orgs.billing import reconcile_online_payments

        r = client_for(self.owner).post("/api/platform-payments/checkout",
                                        {"kind": "sms", "quantity": 500, "gateway": "payu"}, format="json")
        f = r.json()["fields"]
        PlatformPayment.objects.update(created_at=timezone.now() - timedelta(minutes=10))
        ok = {"status": 1, "transaction_details": {f["txnid"]: {"status": "success", "amt": f["amount"],
                                                                "udf1": str(self.org.id)}}}
        with mock.patch("orgs.payu.requests.post", return_value=FakeResp(200, ok)):
            self.assertEqual(reconcile_online_payments()["approved"], 1)
            self.assertEqual(reconcile_online_payments()["checked"], 0)  # nothing left to check
        self.assertEqual(Organization.objects.get(pk=self.org.pk).sms_credits, 500)

        r = client_for(self.owner).post("/api/platform-payments/checkout",
                                        {"kind": "sms", "quantity": 500, "gateway": "payu"}, format="json")
        txn = r.json()["fields"]["txnid"]
        PlatformPayment.objects.filter(gateway_order_id=txn).update(created_at=timezone.now() - timedelta(days=4))
        pending = {"status": 1, "transaction_details": {txn: {"status": "pending", "amt": "150.00"}}}
        with mock.patch("orgs.payu.requests.post", return_value=FakeResp(200, pending)):
            reconcile_online_payments()
        self.assertEqual(PlatformPayment.objects.get(gateway_order_id=txn).status, "rejected")

    def test_zero_rate_cannot_start_an_online_order(self):
        self.org.sms_rate = 0
        self.org.save()
        r = client_for(self.owner).post("/api/platform-payments/checkout",
                                        {"kind": "sms", "quantity": 500, "gateway": "payu"}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertFalse(PlatformPayment.objects.exists())
