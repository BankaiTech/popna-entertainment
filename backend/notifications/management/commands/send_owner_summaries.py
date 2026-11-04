from datetime import date

from django.core.management.base import BaseCommand

from notifications.services import queue_owner_daily_summaries


class Command(BaseCommand):
    help = "Queue the daily collection summary SMS for owners who chose daily_summary mode."

    def add_arguments(self, parser):
        parser.add_argument("--date", help="YYYY-MM-DD (default: today)")

    def handle(self, *args, **opts):
        day = date.fromisoformat(opts["date"]) if opts.get("date") else None
        self.stdout.write(f"queued {queue_owner_daily_summaries(day)} summaries")
