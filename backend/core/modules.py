"""
Which menu modules a user can use. The org's list (set by the app owner) is the ceiling;
for field staff the owner picks a subset per person.
"""
from core.permissions import Roles

# Defaults when the owner hasn't picked modules for a staff member yet.
STAFF_DEFAULT_MODULES = {
    Roles.AGENT: ["dashboard", "contacts", "collect", "duty"],
    Roles.TECHNICIAN: ["dashboard", "complaints", "duty"],
}
# Never given to field staff, even if ticked.
OFFICE_ONLY_MODULES = {"users", "settings", "live-map", "cutoff", "audit-trail"}


def effective_modules(user):
    org = user.organization
    if org is None:
        return None
    org_modules = list(org.allowed_modules or [])
    if user.role == Roles.OWNER:
        return org_modules
    if user.role == Roles.MANAGER:
        return [m for m in org_modules if m not in ("users", "settings")]
    if user.role in Roles.FIELD:
        picked = user.allowed_modules if user.allowed_modules is not None else STAFF_DEFAULT_MODULES[user.role]
        return [m for m in picked if m in org_modules and m not in OFFICE_ONLY_MODULES]
    return []


def has_module(user, key):
    modules = effective_modules(user)
    return modules is not None and key in modules
