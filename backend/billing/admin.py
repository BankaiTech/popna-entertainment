from django.contrib import admin

from .models import Bill, Payment


@admin.register(Bill)
class BillAdmin(admin.ModelAdmin):
    list_display = ["customer", "period", "amount_due", "amount_paid", "due_date", "status", "organization"]
    list_filter = ["organization", "status", "period"]
    search_fields = ["customer__name", "customer__mobile"]


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ["receipt_no", "customer", "amount", "method", "collected_by", "collected_at", "status"]
    list_filter = ["organization", "method", "status"]
    search_fields = ["receipt_no", "customer__name"]

    def has_delete_permission(self, request, obj=None):
        return False  # cancel via the API with a reason instead
