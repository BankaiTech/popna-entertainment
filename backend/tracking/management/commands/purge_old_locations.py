from datetime import timedelta

from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone

from tracking.models import LocationPing


class Command(BaseCommand):
    help = "Delete location pings older than LOCATION_RETENTION_DAYS (privacy: keep only what you need)."

    def add_arguments(self, parser):
        parser.add_argument("--days", type=int, default=None)

    def handle(self, *args, **opts):
        days = opts["days"] or settings.LOCATION_RETENTION_DAYS
        cutoff = timezone.now() - timedelta(days=days)
        deleted, _ = LocationPing.objects.filter(recorded_at__lt=cutoff).delete()
        self.stdout.write(f"deleted {deleted} pings older than {days} days")
