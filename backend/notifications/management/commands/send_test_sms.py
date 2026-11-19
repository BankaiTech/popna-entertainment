from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from core.validators import normalize_mobile
from notifications.gateway import get_gateway
from notifications.models import SmsMessage
from notifications.templates import receipt_body, reminder_body, render, template_id


class Command(BaseCommand):
    help = "Send one test SMS with a customer template (checks ping4sms + DLT setup). Not saved in the SMS log."

    def add_arguments(self, parser):
        parser.add_argument("mobile")
        parser.add_argument("--lang", choices=["en", "ta"], default="en")
        parser.add_argument("--kind", choices=["receipt", "reminder"], default="receipt")
        parser.add_argument("--business", default="LCO Desk", help="Name for the last variable")

    def handle(self, *args, **opts):
        mobile = normalize_mobile(opts["mobile"])
        if len(mobile) != 10:
            raise CommandError("Give a 10-digit mobile number.")
        lang, kind = opts["lang"], opts["kind"]
        today = timezone.localdate()
        body = (receipt_body(lang, 1, "TEST-000001", 0, today) if kind == "receipt"
                else reminder_body(lang, 1, today))
        msg = SmsMessage(
            to_mobile=mobile, language=lang, template_id=template_id(kind, lang),
            body=render(kind, lang, "Test", body, opts["business"]),
        )
        self.stdout.write(f"Template {msg.template_id or '(none set)'}:\n{msg.body}\n")
        result = get_gateway().send(msg)
        if result.ok:
            self.stdout.write(self.style.SUCCESS(f"Sent. Provider response: {result.provider_ref}"))
        else:
            raise CommandError(f"Failed: {result.error}")
