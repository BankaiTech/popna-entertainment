from django.contrib import admin

from .models import SmsMessage


@admin.register(SmsMessage)
class SmsMessageAdmin(admin.ModelAdmin):
    list_display = ["created_at", "organization", "kind", "to_mobile", "status", "attempts", "sent_at"]
    list_filter = ["organization", "kind", "status"]
    search_fields = ["to_mobile", "dedupe_key"]
