from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ["username", "name", "role", "organization", "distributor", "is_active"]
    list_filter = ["role", "is_active", "organization"]
    search_fields = ["username", "name", "mobile"]
    fieldsets = BaseUserAdmin.fieldsets + (
        ("LCO Desk", {"fields": ("name", "mobile", "role", "organization", "distributor")}),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ("LCO Desk", {"fields": ("name", "mobile", "role", "organization", "distributor")}),
    )
