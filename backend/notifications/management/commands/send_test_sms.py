from django.core.management.base import BaseCommand, CommandError

from core.validators import normalize_mobile
from notifications.gateway import get_gateway
from notifications.models import SmsMessage
from notifications.templates import receipt_body, render, template_id


class Command(BaseCommand):
    help = "Send one test SMS with the customer template (checks ping4sms + DLT setup). Not saved in the SMS log."

    def add_arguments(self, parser):
        parser.add_argument("mobile")
        parser.add_argument("--lang", choices=["en", "ta"], default="en")
        parser.add_argument("--business", default="LCO Desk", help="Name for the last variable")

    def handle(self, *args, **opts):
        mobile = normalize_mobile(opts["mobile"])
        if len(mobile) != 10:
            raise CommandError("Give a 10-digit mobile number.")
        lang = opts["lang"]
        msg = SmsMessage(
            to_mobile=mobile, language=lang, template_id=template_id(lang),
            body=render(lang, "Test", receipt_body(lang, 1, "TEST-000001", 0), opts["business"]),
        )
        self.stdout.write(f"Template {msg.template_id or '(none set)'}:\n{msg.body}\n")
        result = get_gateway().send(msg)
        if result.ok:
            self.stdout.write(self.style.SUCCESS(f"Sent. Provider response: {result.provider_ref}"))
        else:
            raise CommandError(f"Failed: {result.error}")
