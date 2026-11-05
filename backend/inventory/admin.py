from django.contrib import admin

from .models import Purchase, Sale, StockItem, StockUnit, Supplier


@admin.register(StockItem)
class StockItemAdmin(admin.ModelAdmin):
    list_display = ["name", "category", "barcode", "track_serials", "sale_price", "organization"]
    list_filter = ["organization", "category"]
    search_fields = ["name", "barcode"]


@admin.register(StockUnit)
class StockUnitAdmin(admin.ModelAdmin):
    list_display = ["serial", "item", "status", "customer", "organization"]
    list_filter = ["organization", "status"]
    search_fields = ["serial"]


admin.site.register(Supplier)
admin.site.register(Purchase)
admin.site.register(Sale)
