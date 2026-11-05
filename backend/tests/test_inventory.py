from django.test import TestCase

from core.permissions import Roles
from inventory.models import StockItem, StockUnit, Supplier

from .helpers import client_for, make_customer, make_org, make_plans, make_user


class InventoryTests(TestCase):
    def setUp(self):
        self.org = make_org("INV")
        self.owner = make_user("owner", Roles.OWNER, self.org)
        self.c = client_for(self.owner)
        self.sup = Supplier.objects.create(organization=self.org, name="GTPL Distributor")
        self.stb = StockItem.objects.create(organization=self.org, name="GTPL HD STB", category="stb",
                                            barcode="8901234567890", track_serials=True, sale_price=1200, gst_rate=18)
        self.wire = StockItem.objects.create(organization=self.org, name="RG6 Cable", category="cable", unit="m",
                                             sale_price=12, gst_rate=18)

    def purchase(self, serials, wire_qty=100):
        return self.c.post("/api/purchases", {"supplier_id": self.sup.id, "bill_no": "B-1", "lines": [
            {"item_id": self.stb.id, "unit_price": "1000", "serials": serials},
            {"item_id": self.wire.id, "unit_price": "8", "quantity": wire_qty},
        ]}, format="json")

    def test_purchase_by_scanning_serials(self):
        res = self.purchase(["SN001", "SN002", "SN003"])
        self.assertEqual(res.status_code, 201, res.content)
        body = res.json()
        self.assertEqual(body["lines"][0]["serials"], ["SN001", "SN002", "SN003"])
        self.assertEqual(body["grand_total"], "4484.00")  # (3000 + 800) * 1.18
        items = {i["name"]: i for i in self.c.get("/api/stock-items").json()}
        self.assertEqual((items["GTPL HD STB"]["on_hand"], items["RG6 Cable"]["on_hand"]), ("3.00", "100.00"))

    def test_duplicate_serials_blocked_in_scan_and_in_stock(self):
        self.assertEqual(self.purchase(["SN1", "SN1"]).status_code, 400)
        self.purchase(["SN9"])
        res = self.purchase(["SN9"])
        self.assertEqual(res.status_code, 400)
        self.assertIn("Already in your stock", str(res.json()))

    def test_barcode_lookup_and_unique(self):
        found = self.c.get("/api/stock-items?barcode=8901234567890").json()
        self.assertEqual([i["name"] for i in found], ["GTPL HD STB"])
        res = self.c.post("/api/stock-items", {"name": "Copy", "barcode": "8901234567890", "sale_price": 1,
                                               "purchase_price": 1}, format="json")
        self.assertEqual(res.status_code, 400)

    def test_sale_by_serial_marks_sold_and_links_customer(self):
        self.purchase(["SN001", "SN002"])
        cable, _ = make_plans(self.org)
        cust = make_customer(self.org, cable)
        unit = self.c.get("/api/stock-units?serial=SN001").json()[0]
        self.assertEqual((unit["status"], unit["item_name"], unit["sale_price"]), ("in_stock", "GTPL HD STB", "1200.00"))
        res = self.c.post("/api/sales", {"customer_id": cust.id, "payment_method": "upi", "lines": [
            {"item_id": self.stb.id, "unit_price": "1200", "serials": ["SN001"]},
            {"item_id": self.wire.id, "unit_price": "12", "quantity": 20},
        ]}, format="json")
        self.assertEqual(res.status_code, 201, res.content)
        body = res.json()
        self.assertEqual(body["invoice_no"], "INV/S/00001")
        self.assertEqual((body["cgst"], body["sgst"], body["grand_total"]), ("129.60", "129.60", "1699.20"))
        sold = StockUnit.objects.get(serial="SN001")
        self.assertEqual((sold.status, sold.customer_id), ("sold", cust.id))
        again = self.c.post("/api/sales", {"lines": [{"item_id": self.stb.id, "unit_price": "1200",
                                                      "serials": ["SN001"]}]}, format="json")
        self.assertEqual(again.status_code, 400)

    def test_cannot_sell_more_than_stock(self):
        self.purchase(["A1"], wire_qty=10)
        res = self.c.post("/api/sales", {"lines": [{"item_id": self.wire.id, "unit_price": "12", "quantity": 11}]},
                          format="json")
        self.assertEqual(res.status_code, 400)
        self.assertIn("only 10 in stock", str(res.json()))

    def test_unknown_serial_and_other_operator_isolated(self):
        other = make_org("OTH")
        other_item = StockItem.objects.create(organization=other, name="X", track_serials=True)
        res = self.c.post("/api/sales", {"lines": [{"item_id": other_item.id, "unit_price": "1", "serials": ["Z"]}]},
                          format="json")
        self.assertEqual(res.status_code, 400)
        res = self.c.post("/api/sales", {"lines": [{"item_id": self.stb.id, "unit_price": "1", "serials": ["NOPE"]}]},
                          format="json")
        self.assertIn("not in stock", str(res.json()))

    def test_agents_cannot_buy_or_sell(self):
        agent = make_user("agent", Roles.AGENT, self.org)
        self.assertEqual(client_for(agent).post("/api/purchases", {}, format="json").status_code, 403)
        self.assertEqual(client_for(agent).get("/api/stock-units?serial=x").status_code, 200)
