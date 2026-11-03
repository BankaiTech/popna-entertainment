from django.core.management.base import BaseCommand
from django.utils import timezone

from billing.services import generate_bills, month_start, parse_period


class Command(BaseCommand):
    help = "Create monthly bills for all active customers (safe to run again)."

    def add_arguments(self, parser):
        parser.add_argument("--period", help="YYYY-MM (default: current month)")

    def handle(self, *args, **opts):
        period = parse_period(opts["period"]) if opts.get("period") else month_start(timezone.localdate())
        created = generate_bills(period)
        self.stdout.write(self.style.SUCCESS(f"{period:%Y-%m}: created {created} bills"))
