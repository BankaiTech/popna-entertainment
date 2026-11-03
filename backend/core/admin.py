from django.contrib import admin

from .models import AuditLog, JobRun


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ["created_at", "organization", "user", "action", "entity", "entity_id"]
    list_filter = ["action", "organization"]
    readonly_fields = [f.name for f in AuditLog._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(JobRun)
class JobRunAdmin(admin.ModelAdmin):
    list_display = ["name", "run_date", "started_at", "finished_at", "result"]
    list_filter = ["name"]
