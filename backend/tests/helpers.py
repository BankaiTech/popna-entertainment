from datetime import date
from decimal import Decimal

from rest_framework.test import APIClient

from accounts.models import User
from customers.models import Area, Customer, Plan
from orgs.models import Distributor, Organization

PASSWORD = "Strong@Pass123"


def make_org(code="ORG1", distributor=None, **kw):
    defaults = dict(name=f"Operator {code}", code=code, owner_mobile="9876500000", distributor=distributor)
    defaults.update(kw)
    return Organization.objects.create(**defaults)


def make_user(username, role, org=None, distributor=None, **kw):
    kw.setdefault("name", username.title())
    u = User(username=username, role=role, organization=org, distributor=distributor, **kw)
    u.set_password(PASSWORD)
    u.save()
    return u


def make_plans(org):
    cable = Plan.objects.create(organization=org, provider="GTPL", name="Basic", category="cable", price=Decimal("230"))
    net = Plan.objects.create(organization=org, provider="RailWire", name="40 Mbps", category="internet",
                              price=Decimal("500"), gst_rate=Decimal("18"))
    return cable, net


def make_customer(org, plan, mobile="9876543210", name="Ravi", **kw):
    area = kw.pop("area", None) or Area.objects.get_or_create(organization=org, name="Main Road")[0]
    return Customer.objects.create(organization=org, plan=plan, mobile=mobile, name=name, area=area, **kw)


def client_for(user):
    c = APIClient()
    c.force_authenticate(user)
    return c


def first_of_this_month():
    from django.utils import timezone

    t = timezone.localdate()
    return date(t.year, t.month, 1)
