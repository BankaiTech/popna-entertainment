from unittest import mock

from django.test import TestCase, override_settings

from notifications.gateway import HttpGateway, read_ping4sms_reply
from notifications.models import SmsMessage
from notifications.services import process_outbox
from orgs.models import Organization

from .helpers import make_org

PING_URL = ("https://site.ping4sms.com/api/smsapi?key={api_key}&route={route}&sender={sender}"
            "&number={mobile}&sms={message}&templateid={template_id}")


class FakeResp:
    def __init__(self, text, status=200):
        self.text, self.status_code = text, status


@override_settings(SMS_HTTP_URL=PING_URL, SMS_API_KEY="testkey", SMS_SENDER_ID="PINGSM", SMS_ROUTE="2")
class Ping4SmsTests(TestCase):
    def test_reply_codes(self):
        self.assertEqual(read_ping4sms_reply("4587123\n").provider_ref, "4587123")
        r = read_ping4sms_reply("108")
        self.assertFalse(r.ok)
        self.assertIn("Low credits", r.error)
        self.assertFalse(read_ping4sms_reply("<html>error</html>").ok)

    def test_url_is_encoded_and_sent(self):
        org = make_org("GW1")
        msg = SmsMessage(organization=org, kind="payment_receipt", to_mobile="9876543210",
                         body="Dear Customer Ravi,\nPaid Rs.230", template_id="1607100000000376221")
        with mock.patch("notifications.gateway.requests.get", return_value=FakeResp("998877")) as get:
            result = HttpGateway().send(msg)
        self.assertTrue(result.ok)
        url = get.call_args[0][0]
        self.assertIn("key=testkey&route=2&sender=PINGSM&number=9876543210", url)
        self.assertIn("sms=Dear%20Customer%20Ravi%2C%0APaid%20Rs.230", url)
        self.assertIn("templateid=1607100000000376221", url)

    @override_settings(SMS_BACKEND="http")
    def test_error_code_is_failed_and_paid_credit_returned(self):
        org = make_org("GW2")
        Organization.objects.filter(pk=org.pk).update(sms_free_per_month=0, sms_credits=1)
        SmsMessage.objects.create(organization=org, kind="due_reminder", to_mobile="9876543210", body="hi",
                                  dedupe_key="x1", template_id="1607100000000376221")
        with mock.patch("notifications.gateway.requests.get", return_value=FakeResp("110")):
            self.assertEqual(process_outbox()["sent"], 0)  # not sent; retried later, failed after SMS_MAX_ATTEMPTS
        m = SmsMessage.objects.get()
        self.assertNotEqual(m.status, SmsMessage.Status.SENT)
        self.assertIn("ping4sms 110", m.last_error)
        self.assertEqual(Organization.objects.get(pk=org.pk).sms_credits, 1)
