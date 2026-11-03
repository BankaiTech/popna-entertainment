from django.core.management.base import BaseCommand, CommandError

from core.validators import normalize_mobile
from notifications.gateway import get_gateway
from notifications.templates import render


class Command(BaseCommand):
    help = "Send one test SMS using the payment_receipt template (checks ping4sms + DLT setup)."

    def add_arguments(self, parser):
        parser.add_argument("mobile")

    def handle(self, *args, **opts):
        mobile = normalize_mobile(opts["mobile"])
        if len(mobile) != 10:
            raise CommandError("Give a 10-digit mobile number.")
        text = render("payment_receipt", {
            "name": "Test", "amount": "1", "service": "Cable TV", "period": "Nov 2026", "date": "01-11-2026",
            "time": "10:00 AM", "agent": "Test", "receipt": "TEST-000001", "balance": "0", "org": "LCO Desk",
        })
        result = get_gateway().send(mobile, text, "payment_receipt")
        if result.ok:
            self.stdout.write(self.style.SUCCESS(f"Sent. Provider response: {result.provider_ref}"))
        else:
            raise CommandError(f"Failed: {result.error}")
