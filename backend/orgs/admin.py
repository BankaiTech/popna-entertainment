from django.contrib import admin

from .models import Distributor, Organization, SignupRequest


@admin.register(Distributor)
class DistributorAdmin(admin.ModelAdmin):
    list_display = ["name", "mobile", "is_active"]
    search_fields = ["name", "mobile"]


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ["name", "code", "status", "distributor", "owner_mobile", "subscription_end"]
    list_filter = ["status", "distributor"]
    search_fields = ["name", "code", "owner_mobile"]


@admin.register(SignupRequest)
class SignupRequestAdmin(admin.ModelAdmin):
    list_display = ["business_name", "name", "mobile", "city", "service", "status", "created_at"]
    list_filter = ["status", "service"]
    search_fields = ["business_name", "name", "mobile", "city"]
