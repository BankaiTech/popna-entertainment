from datetime import date

from django.test import TestCase
from django.test.utils import override_settings

from core.permissions import Roles
from notifications.gateway import HttpGateway
from notifications.models import SmsMessage
from notifications.templates import MAX_VAR_LEN, receipt_body, reminder_body, render

from .helpers import client_for, make_customer, make_org, make_plans, make_user


class TemplateTests(TestCase):
    def test_every_variable_fits_dlt_limit(self):
        for lang in ("en", "ta"):
            for amount in (5, 230, 1180, 99999.5, 1234567):
                self.assertLessEqual(len(receipt_body(lang, amount, "LONGCODE01-000123", 0)), MAX_VAR_LEN)
                self.assertLessEqual(len(receipt_body(lang, amount, "A-1", 1500)), MAX_VAR_LEN)
                self.assertLessEqual(len(reminder_body(lang, amount, date(2026, 11, 10))), MAX_VAR_LEN)

    def test_render_matches_approved_lines(self):
        en = render("en", "Ravi Kumar", "Paid Rs.230", "Sri Cable")
        self.assertEqual(en.split("\n"), ["Dear Customer Ravi Kumar,", "Paid Rs.230",
                                          "Thank you for your continued support.", "Regards,", "Sri Cable", "PING4SMS"])
        long = render("en", "N" * 50, "x", "B" * 50)
        self.assertEqual(long.split("\n")[0], "Dear Customer " + "N" * 30 + ",")

    @override_settings(SMS_TEXT_OVERRIDES={"en": "Hi {name}\\n{body}\\n-{org}", "ta": ""})
    def test_override_text_from_env(self):
        self.assertEqual(render("en", "A", "B", "C"), "Hi A\nB\n-C")

    @override_settings(SMS_HTTP_URL="https://x.test/api?key={api_key}&number={mobile}&sms={message}&templateid={template_id}",
                       SMS_API_KEY="k", SMS_UNICODE_PARAMS="&unicode=1")
    def test_gateway_url_encodes_and_adds_unicode_for_tamil(self):
        calls = []

        class Resp:
            status_code = 200
            text = "OK"

        import notifications.gateway as gw
        orig = gw.requests.get
        gw.requests.get = lambda url, timeout: calls.append(url) or Resp()
        try:
            HttpGateway().send(SmsMessage(to_mobile="9876543210", body="Line1\nரூ.5", template_id="T1"))
            HttpGateway().send(SmsMessage(to_mobile="9876543210", body="Line1\nRs.5", template_id="T2"))
        finally:
            gw.requests.get = orig
        self.assertIn("sms=Line1%0A%E0%AE", calls[0])
        self.assertTrue(calls[0].endswith("&unicode=1"))
        self.assertIn("templateid=T2", calls[1])
        self.assertFalse(calls[1].endswith("&unicode=1"))


class SmsLogApiTests(TestCase):
    def setUp(self):
        self.org = make_org("LOG", sms_display_name="Sri Cable")
        cable, _ = make_plans(self.org)
        self.cust = make_customer(self.org, cable, name="Ravi Kumar")
        self.owner = make_user("owner", Roles.OWNER, self.org)
        for i, st in enumerate(["sent", "failed", "pending"]):
            SmsMessage.objects.create(organization=self.org, kind="due_reminder", customer=self.cust,
                                      recipient_name="Ravi Kumar", to_mobile=self.cust.mobile, body="b",
                                      status=st, dedupe_key=f"k{i}")
        other = make_org("OTH")
        SmsMessage.objects.create(organization=other, kind="due_reminder", to_mobile="9000000000", body="x",
                                  dedupe_key="other")

    def test_list_filters_paging_and_isolation(self):
        c = client_for(self.owner)
        res = c.get("/api/sms-logs").json()
        self.assertEqual(res["count"], 3)
        self.assertEqual(res["results"][0]["customer_name"], "Ravi Kumar")
        self.assertEqual(c.get("/api/sms-logs?status=failed").json()["count"], 1)
        self.assertEqual(c.get("/api/sms-logs?search=ravi").json()["count"], 3)
        self.assertEqual(c.get("/api/sms-logs/summary").json()["today"]["failed"], 1)

    def test_retry_failed_only_and_agents_cannot_see(self):
        c = client_for(self.owner)
        failed = SmsMessage.objects.get(status="failed")
        self.assertEqual(c.post(f"/api/sms-logs/{failed.id}/retry").status_code, 200)
        failed.refresh_from_db()
        self.assertEqual((failed.status, failed.attempts), ("pending", 0))
        sent = SmsMessage.objects.get(status="sent")
        self.assertEqual(c.post(f"/api/sms-logs/{sent.id}/retry").status_code, 400)
        agent = make_user("agent", Roles.AGENT, self.org)
        self.assertEqual(client_for(agent).get("/api/sms-logs").status_code, 403)
