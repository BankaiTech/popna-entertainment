from decimal import Decimal

from django.db import IntegrityError, transaction
from django.db.models import F, Sum
from rest_framework.exceptions import ValidationError

from core.audit import audit

from .models import DocCounter, DocLine, Purchase, Sale, StockItem, StockMovement, StockUnit, money


def on_hand(item):
    return item.movements.aggregate(q=Sum("quantity"))["q"] or Decimal(0)


def _next_number(org, kind):
    try:
        with transaction.atomic():
            DocCounter.objects.get_or_create(organization=org, kind=kind)
    except IntegrityError:
        pass
    counter = DocCounter.objects.select_for_update().get(organization=org, kind=kind)
    DocCounter.objects.filter(pk=counter.pk).update(last_number=F("last_number") + 1)
    return counter.last_number + 1


def _clean_serials(raw):
    serials = [str(s).strip() for s in (raw or []) if str(s).strip()]
    dupes = sorted({s for s in serials if serials.count(s) > 1})
    if dupes:
        raise ValidationError({"serials": f"Scanned twice: {', '.join(dupes[:10])}"})
    return serials


def _line_amounts(qty, price, rate):
    taxable = money(Decimal(qty) * Decimal(price))
    gst = money(taxable * Decimal(rate) / 100)
    return taxable, gst, taxable + gst


def _prepare_lines(org, lines):
    """Validate items/quantities/serials and work out the amounts. Totals are never taken from the client."""
    if not lines:
        raise ValidationError({"lines": "Add at least one item."})
    prepared, all_serials = [], []
    for i, line in enumerate(lines, start=1):
        item = line["item"]
        if item.organization_id != org.id:
            raise ValidationError({"lines": f"Line {i}: unknown item."})
        serials = _clean_serials(line.get("serials"))
        if item.track_serials:
            if not serials:
                raise ValidationError({"lines": f"Line {i} ({item.name}): scan the serial numbers."})
            qty = Decimal(len(serials))
        else:
            if serials:
                raise ValidationError({"lines": f"Line {i} ({item.name}) does not use serial numbers."})
            qty = Decimal(line["quantity"])
            if qty <= 0:
                raise ValidationError({"lines": f"Line {i} ({item.name}): quantity must be more than 0."})
        price = Decimal(line.get("unit_price", 0))
        rate = Decimal(line.get("gst_rate", item.gst_rate))
        taxable, gst, total = _line_amounts(qty, price, rate)
        prepared.append(dict(item=item, quantity=qty, unit_price=price, gst_rate=rate, taxable=taxable,
                             gst_amount=gst, total=total, serials=serials))
        all_serials += serials
    dupes = sorted({s for s in all_serials if all_serials.count(s) > 1})
    if dupes:
        raise ValidationError({"serials": f"Scanned twice: {', '.join(dupes[:10])}"})
    return prepared


def _totals(doc, prepared):
    doc.taxable_total = sum((p["taxable"] for p in prepared), Decimal(0))
    doc.gst_total = sum((p["gst_amount"] for p in prepared), Decimal(0))
    doc.grand_total = doc.taxable_total + doc.gst_total


@transaction.atomic
def create_purchase(*, user, org, supplier, bill_no="", bill_date=None, note="", lines):
    prepared = _prepare_lines(org, lines)
    serials = [s for p in prepared for s in p["serials"]]
    existing = list(StockUnit.objects.filter(organization=org, serial__in=serials).values_list("serial", flat=True))
    if existing:
        raise ValidationError({"serials": f"Already in your stock: {', '.join(sorted(existing)[:10])}"})
    purchase = Purchase(organization=org, supplier=supplier, bill_no=bill_no, note=note, created_by=user)
    if bill_date:
        purchase.bill_date = bill_date
    _totals(purchase, prepared)
    purchase.save()
    for p in prepared:
        line = DocLine.objects.create(purchase=purchase, item=p["item"], quantity=p["quantity"],
                                      unit_price=p["unit_price"], gst_rate=p["gst_rate"], taxable=p["taxable"],
                                      gst_amount=p["gst_amount"], total=p["total"])
        StockMovement.objects.create(organization=org, item=p["item"], quantity=p["quantity"],
                                     kind=StockMovement.Kind.PURCHASE, line=line, created_by=user)
        StockUnit.objects.bulk_create([
            StockUnit(organization=org, item=p["item"], serial=s, purchase_line=line) for s in p["serials"]
        ])
        if p["unit_price"] and p["item"].purchase_price != p["unit_price"]:
            StockItem.objects.filter(pk=p["item"].pk).update(purchase_price=p["unit_price"])
    audit(user, "purchase_created", purchase, total=purchase.grand_total, bill=bill_no)
    return purchase


@transaction.atomic
def create_sale(*, user, org, customer=None, customer_name="", customer_mobile="", payment_method="cash",
                sale_date=None, note="", lines):
    prepared = _prepare_lines(org, lines)
    # Lock the items so two sales can't sell the same last piece.
    StockItem.objects.select_for_update().filter(pk__in=[p["item"].pk for p in prepared]).count()
    for p in prepared:
        item = p["item"]
        if item.track_serials:
            units = list(StockUnit.objects.select_for_update().filter(organization=org, item=item,
                                                                      serial__in=p["serials"]))
            found = {u.serial: u for u in units}
            missing = [s for s in p["serials"] if s not in found]
            if missing:
                raise ValidationError({"serials": f"{item.name}: not in stock: {', '.join(missing[:10])}"})
            gone = [u.serial for u in units if u.status != StockUnit.Status.IN_STOCK]
            if gone:
                raise ValidationError({"serials": f"{item.name}: already sold or not available: {', '.join(gone[:10])}"})
            p["units"] = units
        elif on_hand(item) < p["quantity"]:
            raise ValidationError({"lines": f"{item.name}: only {on_hand(item).normalize():f} in stock."})
    if customer is not None:
        customer_name = customer_name or customer.name
        customer_mobile = customer_mobile or customer.mobile
    sale = Sale(organization=org, customer=customer, customer_name=customer_name, customer_mobile=customer_mobile,
                payment_method=payment_method, note=note, created_by=user,
                invoice_no=f"{org.code}/S/{_next_number(org, 'sale'):05d}")
    if sale_date:
        sale.sale_date = sale_date
    _totals(sale, prepared)
    sale.save()
    for p in prepared:
        line = DocLine.objects.create(sale=sale, item=p["item"], quantity=p["quantity"], unit_price=p["unit_price"],
                                      gst_rate=p["gst_rate"], taxable=p["taxable"], gst_amount=p["gst_amount"],
                                      total=p["total"])
        StockMovement.objects.create(organization=org, item=p["item"], quantity=-p["quantity"],
                                     kind=StockMovement.Kind.SALE, line=line, created_by=user)
        for unit in p.get("units", []):
            unit.status = StockUnit.Status.SOLD
            unit.sale_line = line
            unit.customer = customer
            unit.save(update_fields=["status", "sale_line", "customer", "updated_at"])
    audit(user, "sale_created", sale, invoice=sale.invoice_no, total=sale.grand_total)
    return sale
