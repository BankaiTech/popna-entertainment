from django.core.management.base import BaseCommand

from notifications.services import process_outbox


class Command(BaseCommand):
    help = "Send pending SMS from the outbox."

    def add_arguments(self, parser):
        parser.add_argument("--limit", type=int, default=100)

    def handle(self, *args, **opts):
        self.stdout.write(str(process_outbox(limit=opts["limit"])))
