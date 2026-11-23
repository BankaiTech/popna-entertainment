from datetime import timedelta
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone

from billing.models import Bill
from billing.services import current_bill, generate_bills, generate_internet_renewals, record_payment
from core.permissions import Roles
from notifications.models import SmsMessage

from .helpers import client_for, first_of_this_month, make_customer, make_org, make_plans, make_user


class PermanentDiscountTests(TestCase):
    """Permanent discount (%) must change what the customer is asked to pay, including this month."""

    def setUp(self):
        self.org = make_org("PD1", require_checkin_for_collection=False)
        self.owner = make_user("pd_owner", Roles.OWNER, org=self.org)
        self.cable, self.net = make_plans(self.org)

    def contact(self, customer):
        r = client_for(self.owner).get(f"/api/contacts/{customer.id}")
        self.assertEqual(r.status_code, 200, r.content)
        return r.json()

    def test_discount_change_reprices_this_months_unpaid_bill(self):
        c = make_customer(self.org, self.cable, stb_number="S1")
        generate_bills(first_of_this_month(), organization=self.org)
        r = client_for(self.owner).patch(f"/api/contacts/{c.id}", {"permanent_discount": 10}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.json()["balance_amount"], "207.00")
        self.assertEqual(Bill.objects.get(customer=c).amount_due, Decimal("207.00"))

    def test_free_connection_stays_unpaid_until_marked_paid(self):
        c = make_customer(self.org, self.cable, stb_number="S2", permanent_discount=100)
        generate_bills(first_of_this_month(), organization=self.org)
        bill = Bill.objects.get(customer=c)
        self.assertEqual((bill.amount_due, bill.status), (Decimal("0.00"), Bill.Status.UNPAID))
        self.assertEqual(self.contact(c)["payment_status"], "not_paid")
        # No "pay ₹0" reminder SMS.
        from notifications.services import queue_due_reminders
        queue_due_reminders(today=bill.due_date - timedelta(days=self.org.reminder_days_before))
        self.assertFalse(SmsMessage.objects.filter(customer=c).exists())
        # Mark paid = a ₹0 payment. No receipt SMS for ₹0.
        r = client_for(self.owner).post("/api/payments", {"customer_id": c.id, "amount": "0", "method": "cash"},
                                        format="json")
        self.assertEqual(r.status_code, 201, r.content)
        bill.refresh_from_db()
        self.assertEqual(bill.status, Bill.Status.PAID)
        self.assertFalse(SmsMessage.objects.filter(customer=c).exists())
        self.assertEqual(self.contact(c)["payment_status"], "paid")
        # Cancelling the mark puts it back to unpaid.
        pay_id = r.json()["id"]
        r = client_for(self.owner).post(f"/api/payments/{pay_id}/cancel", {"reason": "marked by mistake"},
                                        format="json")
        self.assertEqual(r.status_code, 200, r.content)
        bill.refresh_from_db()
        self.assertEqual(bill.status, Bill.Status.UNPAID)

    def test_free_connection_rejects_an_amount(self):
        c = make_customer(self.org, self.cable, stb_number="S2b", permanent_discount=100)
        r = client_for(self.owner).post("/api/payments", {"customer_id": c.id, "amount": "10", "method": "cash"},
                                        format="json")
        self.assertEqual(r.status_code, 400, r.content)
        self.assertIn("free connection", str(r.content))

    def test_making_an_unpaid_customer_free_keeps_it_unpaid(self):
        c = make_customer(self.org, self.cable, stb_number="S3")
        generate_bills(first_of_this_month(), organization=self.org)
        client_for(self.owner).patch(f"/api/contacts/{c.id}", {"permanent_discount": 100}, format="json")
        bill = Bill.objects.get(customer=c)
        self.assertEqual((bill.amount_due, bill.status), (Decimal("0.00"), Bill.Status.UNPAID))

    def test_zero_amount_on_a_normal_bill_is_refused(self):
        c = make_customer(self.org, self.cable, stb_number="S3b")
        r = client_for(self.owner).post("/api/payments", {"customer_id": c.id, "amount": "0", "method": "cash"},
                                        format="json")
        self.assertEqual(r.status_code, 400, r.content)
        self.assertIn("Enter an amount", str(r.content))

    def test_partial_payment_then_discount_marks_paid(self):
        c = make_customer(self.org, self.cable, stb_number="S4")
        record_payment(user=self.owner, customer=c, amount=Decimal("207"), method="cash")
        self.assertEqual(current_bill(c).status, Bill.Status.PARTIAL)
        client_for(self.owner).patch(f"/api/contacts/{c.id}", {"permanent_discount": 10}, format="json")
        self.assertEqual(current_bill(c).status, Bill.Status.PAID)

    def test_paid_bill_is_not_changed_by_a_later_discount(self):
        c = make_customer(self.org, self.cable, stb_number="S5")
        record_payment(user=self.owner, customer=c, amount=Decimal("230"), method="cash")
        client_for(self.owner).patch(f"/api/contacts/{c.id}", {"permanent_discount": 10}, format="json")
        bill = current_bill(c)
        self.assertEqual((bill.amount_due, bill.status), (Decimal("230.00"), Bill.Status.PAID))

    def test_collect_on_paid_bill_gives_clear_error(self):
        c = make_customer(self.org, self.cable, stb_number="S6")
        record_payment(user=self.owner, customer=c, amount=Decimal("230"), method="cash")
        r = client_for(self.owner).post("/api/payments", {"customer_id": c.id, "amount": "10", "method": "cash"},
                                        format="json")
        self.assertEqual(r.status_code, 400, r.content)
        self.assertIn("Nothing is due", str(r.content))

    def test_edit_answer_keeps_paid_status(self):
        c = make_customer(self.org, self.cable, stb_number="S7")
        record_payment(user=self.owner, customer=c, amount=Decimal("230"), method="cash")
        r = client_for(self.owner).patch(f"/api/contacts/{c.id}", {"notes": "gate 2"}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.json()["payment_status"], "paid")
        self.assertEqual(r.json()["balance_amount"], "0.00")

    def test_free_internet_renews_when_marked_paid(self):
        today = timezone.localdate()
        c = make_customer(self.org, self.net, stb_number="N1", permanent_discount=100,
                          valid_until=today + timedelta(days=1))
        generate_internet_renewals(today=today, organization=self.org)
        c.refresh_from_db()
        self.assertEqual(c.valid_until, today + timedelta(days=1))  # not renewed on its own
        record_payment(user=self.owner, customer=c, amount=Decimal("0"), method="cash")
        c.refresh_from_db()
        self.assertEqual(c.valid_until, today + timedelta(days=31))
