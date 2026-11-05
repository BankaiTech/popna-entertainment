"""
Stock for cable / broadband operators: set-top boxes, ONUs, routers, cable, accessories.
Serial-tracked items (STB, ONU, router) get one StockUnit per scanned serial.
Every quantity change is a StockMovement, so stock on hand is always explainable.
"""
from decimal import ROUND_HALF_UP, Decimal

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone

from core.models import OrgOwnedModel

TWO = Decimal("0.01")


def money(v):
    return Decimal(v).quantize(TWO, ROUND_HALF_UP)


class Supplier(OrgOwnedModel):
    name = models.CharField(max_length=150)
    mobile = models.CharField(max_length=15, blank=True)
    gstin = models.CharField(max_length=15, blank=True)
    address = models.TextField(blank=True)

    class Meta:
        ordering = ["name"]
        constraints = [models.UniqueConstraint(fields=["organization", "name"], name="uniq_supplier_per_org")]

    def __str__(self):
        return self.name


class StockItem(OrgOwnedModel):
    class Category(models.TextChoices):
        STB = "stb", "Set-top box"
        ONU = "onu", "ONU / modem"
        ROUTER = "router", "Router"
        CABLE = "cable", "Cable / wire"
        ACCESSORY = "accessory", "Accessory"
        OTHER = "other", "Other"

    class Unit(models.TextChoices):
        PCS = "pcs", "Pieces"
        METRE = "m", "Metres"
        ROLL = "roll", "Rolls"

    name = models.CharField(max_length=150)
    category = models.CharField(max_length=20, choices=Category.choices, default=Category.OTHER)
    brand = models.CharField(max_length=60, blank=True)
    barcode = models.CharField(max_length=64, blank=True, help_text="Product barcode (same for every piece)")
    hsn_code = models.CharField(max_length=10, blank=True)
    unit = models.CharField(max_length=10, choices=Unit.choices, default=Unit.PCS)
    track_serials = models.BooleanField(default=False, help_text="Scan a serial number for every piece")
    purchase_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    sale_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    gst_rate = models.DecimalField(max_digits=5, decimal_places=2, default=18,
                                   validators=[MinValueValidator(0), MaxValueValidator(28)])
    low_stock_level = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(fields=["organization", "name"], name="uniq_stockitem_name_per_org"),
            models.UniqueConstraint(fields=["organization", "barcode"], condition=~models.Q(barcode=""),
                                    name="uniq_stockitem_barcode_per_org"),
        ]

    def __str__(self):
        return self.name


class Purchase(OrgOwnedModel):
    supplier = models.ForeignKey(Supplier, on_delete=models.PROTECT, related_name="purchases")
    bill_no = models.CharField(max_length=40, blank=True)
    bill_date = models.DateField(default=timezone.localdate)
    taxable_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    gst_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    grand_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    note = models.CharField(max_length=200, blank=True)
    created_by = models.ForeignKey("accounts.User", on_delete=models.PROTECT, related_name="+")

    class Meta:
        ordering = ["-bill_date", "-id"]


class Sale(OrgOwnedModel):
    class Method(models.TextChoices):
        CASH = "cash", "Cash"
        UPI = "upi", "UPI"
        CREDIT = "credit", "Credit (pay later)"

    invoice_no = models.CharField(max_length=40)
    sale_date = models.DateField(default=timezone.localdate)
    customer = models.ForeignKey("customers.Customer", null=True, blank=True, on_delete=models.PROTECT,
                                 related_name="sales")
    customer_name = models.CharField(max_length=150, blank=True)
    customer_mobile = models.CharField(max_length=15, blank=True)
    payment_method = models.CharField(max_length=10, choices=Method.choices, default=Method.CASH)
    taxable_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    gst_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    grand_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    note = models.CharField(max_length=200, blank=True)
    created_by = models.ForeignKey("accounts.User", on_delete=models.PROTECT, related_name="+")

    class Meta:
        ordering = ["-sale_date", "-id"]
        constraints = [models.UniqueConstraint(fields=["organization", "invoice_no"], name="uniq_invoice_per_org")]


class DocLine(models.Model):
    """One line on a purchase or a sale."""

    purchase = models.ForeignKey(Purchase, null=True, blank=True, on_delete=models.CASCADE, related_name="lines")
    sale = models.ForeignKey(Sale, null=True, blank=True, on_delete=models.CASCADE, related_name="lines")
    item = models.ForeignKey(StockItem, on_delete=models.PROTECT, related_name="+")
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    gst_rate = models.DecimalField(max_digits=5, decimal_places=2)
    taxable = models.DecimalField(max_digits=12, decimal_places=2)
    gst_amount = models.DecimalField(max_digits=12, decimal_places=2)
    total = models.DecimalField(max_digits=12, decimal_places=2)


class StockUnit(OrgOwnedModel):
    """One physical serial-numbered piece (STB / ONU / router)."""

    class Status(models.TextChoices):
        IN_STOCK = "in_stock", "In stock"
        SOLD = "sold", "Sold / installed"
        FAULTY = "faulty", "Faulty"
        RETURNED = "returned", "Returned to supplier"

    item = models.ForeignKey(StockItem, on_delete=models.PROTECT, related_name="units")
    serial = models.CharField(max_length=64)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.IN_STOCK)
    purchase_line = models.ForeignKey(DocLine, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    sale_line = models.ForeignKey(DocLine, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    customer = models.ForeignKey("customers.Customer", null=True, blank=True, on_delete=models.SET_NULL,
                                 related_name="stock_units")

    class Meta:
        ordering = ["serial"]
        constraints = [models.UniqueConstraint(fields=["organization", "serial"], name="uniq_serial_per_org")]

    def __str__(self):
        return self.serial


class StockMovement(OrgOwnedModel):
    class Kind(models.TextChoices):
        PURCHASE = "purchase", "Purchase"
        SALE = "sale", "Sale"
        ADJUST = "adjust", "Adjustment"

    item = models.ForeignKey(StockItem, on_delete=models.PROTECT, related_name="movements")
    quantity = models.DecimalField(max_digits=10, decimal_places=2, help_text="+ in, - out")
    kind = models.CharField(max_length=10, choices=Kind.choices)
    line = models.ForeignKey(DocLine, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    note = models.CharField(max_length=200, blank=True)
    created_by = models.ForeignKey("accounts.User", on_delete=models.PROTECT, related_name="+")

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["organization", "item"])]


class DocCounter(models.Model):
    """Per-operator invoice numbers (kept separate so settings saves never reset them)."""

    organization = models.ForeignKey("orgs.Organization", on_delete=models.CASCADE)
    kind = models.CharField(max_length=10)
    last_number = models.PositiveIntegerField(default=0)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["organization", "kind"], name="uniq_counter")]
