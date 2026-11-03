from rest_framework.permissions import SAFE_METHODS, BasePermission


class Roles:
    PLATFORM_ADMIN = "platform_admin"
    DISTRIBUTOR = "distributor"
    OWNER = "owner"
    MANAGER = "manager"
    AGENT = "agent"
    TECHNICIAN = "technician"

    TENANT = (OWNER, MANAGER, AGENT, TECHNICIAN)
    OFFICE = (OWNER, MANAGER)
    FIELD = (AGENT, TECHNICIAN)


def role_in(*roles):
    """Permission class factory: allow only users whose role is in `roles`."""

    class _RoleIn(BasePermission):
        message = "Your role is not allowed to do this."

        def has_permission(self, request, view):
            user = request.user
            return bool(user and user.is_authenticated and user.role in roles)

    _RoleIn.__name__ = "RoleIn_" + "_".join(roles)
    return _RoleIn


class ReadWriteRoles(BasePermission):
    """Uses view.read_roles for GET/HEAD/OPTIONS and view.write_roles for everything else."""

    message = "Your role is not allowed to do this."

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        roles = getattr(view, "read_roles", ()) if request.method in SAFE_METHODS else getattr(view, "write_roles", ())
        return user.role in roles
