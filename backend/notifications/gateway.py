import logging
from dataclasses import dataclass
from urllib.parse import quote

import requests
from django.conf import settings

log = logging.getLogger(__name__)


@dataclass
class SmsResult:
    ok: bool
    provider_ref: str = ""
    error: str = ""


class ConsoleGateway:
    """Development: prints SMS to the log instead of sending."""

    def send(self, msg):
        log.info("[SMS console] to=%s lang=%s template=%s text=%s", msg.to_mobile, msg.language, msg.template_id,
                 msg.body)
        return SmsResult(ok=True, provider_ref="console")


class HttpGateway:
    """
    Works with ping4sms (and most Indian HTTP SMS APIs). Copy the API URL from your
    ping4sms panel into SMS_HTTP_URL and replace the values with these placeholders:
      {api_key} {sender} {mobile} {message} {template_id} {entity_id} {route}
    ping4sms example:
      https://site.ping4sms.com/api/smsapi?key={api_key}&route={route}&sender={sender}&number={mobile}&sms={message}&templateid={template_id}
    The URL is never logged because it contains your API key.
    """

    def send(self, msg):
        if not settings.SMS_HTTP_URL:
            return SmsResult(ok=False, error="SMS_HTTP_URL is not configured")
        values = {
            "api_key": settings.SMS_API_KEY,
            "sender": settings.SMS_SENDER_ID,
            "mobile": f"{settings.SMS_MOBILE_PREFIX}{msg.to_mobile}",
            "message": msg.body,
            "template_id": msg.template_id,
            "entity_id": settings.SMS_DLT_ENTITY_ID,
            "route": settings.SMS_ROUTE,
        }
        url = settings.SMS_HTTP_URL.format(**{k: quote(str(v), safe="") for k, v in values.items()})
        if not msg.body.isascii() and settings.SMS_UNICODE_PARAMS:
            url += settings.SMS_UNICODE_PARAMS  # Tamil text: tell the gateway to send as Unicode
        try:
            if settings.SMS_HTTP_METHOD == "POST":
                resp = requests.post(url, timeout=15)
            else:
                resp = requests.get(url, timeout=15)
        except requests.RequestException as exc:
            return SmsResult(ok=False, error=f"network error: {exc.__class__.__name__}")
        body = resp.text[:500]
        keyword = settings.SMS_SUCCESS_KEYWORD.lower()
        ok = resp.status_code == 200 and (not keyword or keyword in body.lower())
        if not ok:
            return SmsResult(ok=False, error=f"HTTP {resp.status_code}: {body}")
        return SmsResult(ok=True, provider_ref=body[:100])


def get_gateway():
    return HttpGateway() if settings.SMS_BACKEND == "http" else ConsoleGateway()
