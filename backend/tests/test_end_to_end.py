"""
The whole life of an operator, through the same HTTP calls the app makes:
sign-up form -> platform admin creates the operator -> owner sets up providers, plans and staff ->
customers (form + import) -> monthly bills -> collection by owner and agent -> SMS -> reminders ->
cut-off list -> cancel -> stock / purchase / sale -> Plan & SMS -> subscription ends -> renewal.
"""
from datetime import timedelta
from decimal import Decimal

from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from billing.models import Bill
from billing.services import generate_bills, month_start
from core.permissions import Roles
from notifications.models import SmsMessage
from notifications.services import queue_due_reminders
from orgs.models import Organization, SignupRequest

from .helpers import make_user

PW = "Strong@Pass123"


def login(username, password=PW):
    c = APIClient(SERVER_NAME="localhost")
    r = c.post("/api/auth/login", {"username": username, "password": password}, format="json")
    assert r.status_code == 200, r.content
    c.credentials(HTTP_AUTHORIZATION=f"Bearer {r.json()['access']}")
    return c, r.json()


@override_settings(SMS_ONLY_LANGUAGE="ta")
class OperatorLifecycleTests(TestCase):
    def ok(self, r, code=200):
        self.assertEqual(r.status_code, code, r.content[:500])
        return r.json() if r.content else None

    def test_full_operator_lifecycle(self):
        today = timezone.localdate()
        anon = APIClient(SERVER_NAME="localhost")

        # 1. Public sign-up form
        self.ok(anon.post("/api/signup-requests", {
            "name": "Murugan", "mobile": "9876543210", "business_name": "Murugan Cable", "city": "Chengalpattu",
            "service": "both", "language": "ta"}, format="json"), 201)
        self.assertEqual(SignupRequest.objects.count(), 1)

        # 2. Platform admin sees it and creates the operator with an owner login
        admin = make_user("platform1", Roles.PLATFORM_ADMIN)
        admin.set_password(PW)
        admin.save()
        pa, _ = login("platform1")
        self.assertEqual(len(self.ok(pa.get("/api/signup-requests"))), 1)
        org = self.ok(pa.post("/api/organizations", {
            "name": "Murugan Cable", "code": "MUR01", "owner_mobile": "9876543210", "app_language": "ta",
            "owner_name": "Murugan", "owner_username": "murugan", "owner_password": PW,
            "subscription_start": str(today), "subscription_end": str(today + timedelta(days=30)),
        }, format="json"), 201)
        org_id = org["id"]
        self.assertEqual(Organization.objects.get(id=org_id).contact_phone, "9876543210")

        # 3. Owner logs in (Tamil), sets up a provider with cut-off, a plan and staff
        ow, tokens = login("murugan")
        me = self.ok(ow.get("/api/auth/me"))
        self.assertEqual(me.get("language") or me.get("app_language") or "ta", "ta")
        self.ok(ow.post("/api/products", {"name": "GTPL HATHWAY LIMITED", "product_type": "cable", "cutoff_date": 15},
                        format="json"), 201)
        plan = self.ok(ow.post("/api/plans", {"provider": "GTPL HATHWAY LIMITED", "name": "TAMIL POWER",
                                              "category": "cable", "price": "250", "gst_rate": "0"}, format="json"), 201)
        agent = self.ok(ow.post("/api/users", {"username": "pugazh", "name": "Pugazh", "password": PW,
                                               "role": Roles.AGENT}, format="json"), 201)
        self.ok(ow.post("/api/users", {"username": "tech9", "name": "Tech", "password": PW,
                                       "role": Roles.TECHNICIAN}, format="json"), 201)

        # 4. Customers: one by hand (assigned to the agent), two by import (one shared, one free)
        c1 = self.ok(ow.post("/api/contacts", {
            "name": "Raj", "mobile": "9000011111", "plan_id": plan["id"], "area": "Main Road",
            "stb_number": "832B0051B347", "collector_ids": [agent["id"]]}, format="json"), 201)
        rep = self.ok(ow.post("/api/contacts/import", {"rows": [
            {"name": "Kumar", "mobile": "9000022222", "stb_number": "3156397712", "provider": "GTPL HATHWAY LIMITED",
             "plan": "TAMIL POWER", "area": "Main Road", "collector_ids": ""},
            {"name": "Free Home", "stb_number": "FREE01", "monthly_amount": "250", "area": "Main Road"},
        ]}, format="json"))
        self.assertEqual(rep["created"], 2, rep)
        contacts = {c["name"]: c for c in self.ok(ow.get("/api/contacts"))}
        free = contacts["Free Home"]
        self.ok(ow.patch(f"/api/contacts/{free['id']}", {"permanent_discount": 100}, format="json"))

        # 5. Monthly bills (scheduler) use the provider's cut-off date
        generate_bills(month_start(today))
        bill = Bill.objects.get(customer_id=c1["id"])
        self.assertEqual(bill.due_date.day, 15)
        self.assertEqual(Bill.objects.get(customer_id=free["id"]).status, Bill.Status.UNPAID)

        # 6. Reminders: 3 days before the cut-off, Tamil SMS for paying customers only
        queue_due_reminders(today=bill.due_date - timedelta(days=3))
        reminders = SmsMessage.objects.filter(kind=SmsMessage.Kind.DUE_REMINDER)
        self.assertEqual(set(reminders.values_list("customer__name", flat=True)), {"Raj", "Kumar"})
        self.assertTrue(all("கேபிள் கட்டணம்" in m.body for m in reminders))

        # 7. Agent: sees only own + shared customers, checks in, collects with GPS
        ag, _ = login("pugazh")
        seen = {c["name"] for c in self.ok(ag.get("/api/contacts"))}
        self.assertEqual(seen, {"Raj", "Kumar", "Free Home"})
        gps = {"latitude": 12.69, "longitude": 79.98}
        self.ok(ag.post("/api/tracking/check-in", gps, format="json"), 201)
        pay = self.ok(ag.post("/api/payments", {"customer_id": c1["id"], "amount": "250", "method": "cash", **gps},
                              format="json"), 201)
        receipt = SmsMessage.objects.filter(kind=SmsMessage.Kind.PAYMENT_RECEIPT, customer_id=c1["id"]).get()
        self.assertTrue(receipt.body.startswith("கேபிள் சந்தா ₹250, "))
        # Paying again for a paid month is refused
        self.assertEqual(ag.post("/api/payments", {"customer_id": c1["id"], "amount": "10", "method": "cash", **gps},
                                 format="json").status_code, 400)
        # Free customer: Mark paid (₹0), no SMS
        self.ok(ag.post("/api/payments", {"customer_id": free["id"], "amount": "0", "method": "cash", **gps},
                        format="json"), 201)
        self.assertFalse(SmsMessage.objects.filter(kind=SmsMessage.Kind.PAYMENT_RECEIPT,
                                                   customer_id=free["id"]).exists())
        self.ok(ag.post("/api/tracking/check-out", gps, format="json"))

        # 8. Owner: partial payment for Kumar, dashboard, cut-off list after the due date
        self.ok(ow.post("/api/payments", {"customer_id": contacts["Kumar"]["id"], "amount": "100", "method": "upi"},
                        format="json"), 201)
        stats = self.ok(ow.get("/api/dashboard/stats"))
        self.assertTrue(stats)
        cut = self.ok(ow.get("/api/connections/cutoff"))
        self.assertIn("count", cut)

        # 9. Owner cancels the agent's payment with a reason -> bill unpaid again
        self.ok(ow.post(f"/api/payments/{pay['id']}/cancel", {"reason": "Wrong customer"}, format="json"))
        self.assertEqual(Bill.objects.get(customer_id=c1["id"]).status, Bill.Status.UNPAID)
        history = self.ok(ow.get(f"/api/payments?customer={c1['id']}"))
        self.assertEqual(history[0]["status"], "cancelled")

        # 10. Stock: supplier, item, purchase with serials, sale to a customer
        sup = self.ok(ow.post("/api/suppliers", {"name": "GTPL Store"}, format="json"), 201)
        item = self.ok(ow.post("/api/stock-items", {"name": "HD Set-top box", "track_serials": True,
                                                    "sale_price": "1500", "gst_rate": "18"}, format="json"), 201)
        self.ok(ow.post("/api/purchases", {"supplier_id": sup["id"], "lines": [
            {"item_id": item["id"], "quantity": 2, "unit_price": "1000", "serials": ["SER1", "SER2"]}]},
            format="json"), 201)
        sale = self.ok(ow.post("/api/sales", {"customer_id": c1["id"], "payment_method": "cash", "lines": [
            {"item_id": item["id"], "quantity": 1, "unit_price": "1500", "serials": ["SER1"]}]}, format="json"), 201)
        self.assertTrue(sale["invoice_no"])

        # 11. Plan & SMS page; operator claims an SMS pack paid by UPI; platform approves
        plan_page = self.ok(ow.get("/api/my-plan"))
        self.assertEqual(plan_page["subscription"]["state"], "active")
        claim = self.ok(ow.post("/api/platform-payments", {"kind": "sms", "quantity": 1000, "utr": "123456789012"},
                                format="json"), 201)
        self.ok(pa.post(f"/api/platform-payments/{claim['id']}/approve", {}, format="json"))
        self.assertEqual(Organization.objects.get(id=org_id).sms_credits, 1000)

        # 12. Subscription ends -> staff are blocked, the owner can still open Plan & SMS to renew
        Organization.objects.filter(id=org_id).update(subscription_start=today - timedelta(days=31),
                                                      subscription_end=today - timedelta(days=1))
        self.assertEqual(ow.get("/api/contacts").status_code, 403)
        self.assertEqual(ag.get("/api/contacts").status_code, 403)
        self.ok(ow.get("/api/my-plan"))
        self.ok(pa.patch(f"/api/organizations/{org_id}", {"renew_months": 1}, format="json"))
        self.ok(ow.get("/api/contacts"))

        # 13. Logout invalidates the refresh token
        self.assertEqual(ow.post("/api/auth/logout", {"refresh": tokens["refresh"]}, format="json").status_code, 204)
        self.assertEqual(anon.post("/api/auth/refresh", {"refresh": tokens["refresh"]}, format="json").status_code,
                         401)
