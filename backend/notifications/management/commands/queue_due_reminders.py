from datetime import date

from django.core.management.base import BaseCommand

from notifications.services import queue_due_reminders


class Command(BaseCommand):
    help = "Queue due-date reminder SMS (cable always, internet if enabled)."

    def add_arguments(self, parser):
        parser.add_argument("--date", help="Pretend today is YYYY-MM-DD (for testing)")

    def handle(self, *args, **opts):
        today = date.fromisoformat(opts["date"]) if opts.get("date") else None
        self.stdout.write(f"queued {queue_due_reminders(today)} reminders")
