from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from accounts.models import User
from billing.services import generate_bills, month_start
from customers.models import Area, Customer, Plan
from orgs.models import Distributor, Organization

PASSWORD = "Demo@12345"


class Command(BaseCommand):
    help = "Create demo data for local testing (DEBUG only)."

    @transaction.atomic
    def handle(self, *args, **opts):
        if not settings.DEBUG:
            raise CommandError("seed_demo only runs with DJANGO_DEBUG=true")
        if Organization.objects.filter(code="DEMO01").exists():
            self.stdout.write("Demo data already exists.")
            return
        dist = Distributor.objects.create(name="Demo Distributor", mobile="9000000001")
        org = Organization.objects.create(
            name="Demo Cable & Net", code="DEMO01", distributor=dist, owner_mobile="9000000002",
            sms_display_name="Demo Cable",
        )
        users = [
            ("platform", User.Role.PLATFORM_ADMIN, None, None, True),
            ("distributor", User.Role.DISTRIBUTOR, None, dist, False),
            ("owner", User.Role.OWNER, org, None, False),
            ("manager", User.Role.MANAGER, org, None, False),
            ("agent1", User.Role.AGENT, org, None, False),
            ("tech1", User.Role.TECHNICIAN, org, None, False),
        ]
        for username, role, o, d, su in users:
            u = User(username=username, name=username.title(), role=role, organization=o, distributor=d,
                     is_staff=su, is_superuser=su)
            u.set_password(PASSWORD)
            u.save()
        area = Area.objects.create(organization=org, name="Main Road")
        cable = Plan.objects.create(organization=org, provider="GTPL", name="Basic Pack", category="cable",
                                    price=230)
        net = Plan.objects.create(organization=org, provider="RailWire", name="40 Mbps", category="internet",
                                  price=500, gst_rate=18)
        Customer.objects.create(organization=org, name="Ravi Kumar", mobile="9000000101", plan=cable, area=area)
        Customer.objects.create(organization=org, name="Lakshmi S", mobile="9000000102", plan=cable, area=area,
                                due_day=5)
        Customer.objects.create(organization=org, name="Arun Prakash", mobile="9000000103", plan=net, area=area)
        from django.utils import timezone

        bills = generate_bills(month_start(timezone.localdate()), organization=org)
        self.stdout.write(self.style.SUCCESS(
            f"Demo ready: 1 operator, 3 customers, {bills} bills. "
            f"Logins: platform / distributor / owner / manager / agent1 / tech1 — password {PASSWORD}"
        ))
