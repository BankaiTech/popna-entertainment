from django.contrib import admin

from .models import DutySession, LocationPing


@admin.register(DutySession)
class DutySessionAdmin(admin.ModelAdmin):
    list_display = ["user", "organization", "started_at", "ended_at"]
    list_filter = ["organization"]


@admin.register(LocationPing)
class LocationPingAdmin(admin.ModelAdmin):
    list_display = ["user", "organization", "latitude", "longitude", "source", "recorded_at"]
    list_filter = ["organization", "source"]
