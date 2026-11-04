from django.contrib import admin

from .models import Distributor, Organization


@admin.register(Distributor)
class DistributorAdmin(admin.ModelAdmin):
    list_display = ["name", "mobile", "is_active"]
    search_fields = ["name", "mobile"]


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ["name", "code", "status", "distributor", "owner_mobile", "subscription_end"]
    list_filter = ["status", "distributor"]
    search_fields = ["name", "code", "owner_mobile"]
