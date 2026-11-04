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

    def send(self, to, text, kind):
        log.info("[SMS console] to=%s kind=%s text=%s", to, kind, text)
        return SmsResult(ok=True, provider_ref="console")


class HttpGateway:
    """
    Works with ping4sms (and most Indian HTTP SMS APIs). Copy the API URL from your
    ping4sms panel into SMS_HTTP_URL and replace the values with these placeholders:
      {api_key} {sender} {mobile} {message} {template_id} {entity_id} {route}
    The URL is never logged because it contains your API key.
    """

    def send(self, to, text, kind):
        if not settings.SMS_HTTP_URL:
            return SmsResult(ok=False, error="SMS_HTTP_URL is not configured")
        values = {
            "api_key": settings.SMS_API_KEY,
            "sender": settings.SMS_SENDER_ID,
            "mobile": f"{settings.SMS_MOBILE_PREFIX}{to}",
            "message": text,
            "template_id": settings.SMS_TEMPLATE_IDS.get(kind, ""),
            "entity_id": settings.SMS_DLT_ENTITY_ID,
            "route": settings.SMS_ROUTE,
        }
        url = settings.SMS_HTTP_URL.format(**{k: quote(str(v), safe="") for k, v in values.items()})
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
