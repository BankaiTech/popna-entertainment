from django.contrib import admin

from .models import Area, Customer, Plan, Provider


@admin.register(Area)
class AreaAdmin(admin.ModelAdmin):
    list_display = ["name", "organization"]
    list_filter = ["organization"]


@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):
    list_display = ["provider", "name", "category", "price", "gst_rate", "organization", "is_active"]
    list_filter = ["organization", "category", "provider"]


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ["name", "mobile", "plan", "area", "status", "organization"]
    list_filter = ["organization", "status", "plan__category"]
    search_fields = ["name", "mobile", "customer_code"]


@admin.register(Provider)
class ProviderAdmin(admin.ModelAdmin):
    list_display = ["name", "category", "cutoff_day", "organization", "is_active"]
    list_filter = ["organization", "category"]
