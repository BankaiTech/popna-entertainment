"""
One long-running process instead of cron/Celery/Redis (cheapest setup):
  - every 30s: send pending SMS
  - daily jobs at the times in settings, each at most once per day (JobRun table)
"""
import logging
import time as systime
from datetime import datetime

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import IntegrityError, close_old_connections, transaction
from django.utils import timezone

from billing.services import generate_bills, month_start
from core.models import JobRun
from notifications.services import process_outbox, queue_due_reminders, queue_owner_daily_summaries

log = logging.getLogger("scheduler")


def _purge_locations():
    from django.core.management import call_command

    call_command("purge_old_locations")
    return "ok"


def daily_jobs():
    return [
        ("generate_bills", settings.SCHEDULE_GENERATE_BILLS_AT,
         lambda today: today.day == settings.BILL_GENERATION_DAY,
         lambda today: generate_bills(month_start(today))),
        ("due_reminders", settings.SCHEDULE_DUE_REMINDERS_AT, None, lambda today: queue_due_reminders(today)),
        ("owner_summary", settings.SCHEDULE_OWNER_SUMMARY_AT, None,
         lambda today: queue_owner_daily_summaries(today)),
        ("purge_locations", settings.SCHEDULE_PURGE_LOCATIONS_AT, None, lambda today: _purge_locations()),
    ]


def run_due_daily_jobs(now=None):
    now = now or timezone.localtime()
    today = now.date()
    ran = []
    for name, at, condition, func in daily_jobs():
        due_time = datetime.strptime(at, "%H:%M").time()
        if now.time() < due_time or (condition and not condition(today)):
            continue
        try:
            with transaction.atomic():
                job = JobRun.objects.create(name=name, run_date=today)
        except IntegrityError:
            continue  # already ran today
        try:
            result = func(today)
            job.result = {"result": str(result)}
        except Exception as exc:  # keep the scheduler alive; the error is visible in admin
            log.exception("job %s failed", name)
            job.result = {"error": str(exc)[:500]}
        job.finished_at = timezone.now()
        job.save(update_fields=["result", "finished_at"])
        ran.append(name)
    return ran


class Command(BaseCommand):
    help = "Run the background scheduler (SMS sending + daily jobs)."

    def add_arguments(self, parser):
        parser.add_argument("--once", action="store_true", help="Run one cycle and exit (for testing)")
        parser.add_argument("--interval", type=int, default=30)

    def handle(self, *args, **opts):
        log.info("scheduler started")
        while True:
            close_old_connections()
            try:
                ran = run_due_daily_jobs()
                if ran:
                    log.info("daily jobs ran: %s", ran)
                result = process_outbox()
                if result["sent"] or result["failed"]:
                    log.info("sms outbox: %s", result)
            except Exception:
                log.exception("scheduler cycle failed")
            if opts["once"]:
                break
            systime.sleep(opts["interval"])
