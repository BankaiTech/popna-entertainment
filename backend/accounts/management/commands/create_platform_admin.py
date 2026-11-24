"""
Make an LCO Desk platform admin (the app's Super Admin screens). This is NOT a Django admin account:
it cannot open the server admin page. For that, use `createsuperuser` with a different username.

    docker compose exec web python manage.py create_platform_admin <username> --name "Your Name"
"""
import getpass

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError

from accounts.models import User
from core.permissions import Roles


class Command(BaseCommand):
    help = "Create (or reset the password of) an LCO Desk platform admin login for the app."

    def add_arguments(self, parser):
        parser.add_argument("username")
        parser.add_argument("--name", default="")

    def handle(self, username, name, **options):
        user = User.objects.filter(username=username).first()
        if user and (user.is_staff or user.is_superuser):
            raise CommandError(f"'{username}' is a server admin (Django admin) account. Pick another username.")
        if user and user.role != Roles.PLATFORM_ADMIN:
            raise CommandError(f"'{username}' already exists as {user.role}. Pick another username.")
        password = getpass.getpass("Password: ")
        if password != getpass.getpass("Password again: "):
            raise CommandError("Passwords do not match.")
        try:
            validate_password(password, user)
        except ValidationError as e:
            raise CommandError(" ".join(e.messages))
        user = user or User(username=username, role=Roles.PLATFORM_ADMIN)
        user.name = name or user.name or username
        user.is_staff = user.is_superuser = False
        user.is_active = True
        user.set_password(password)
        user.save()
        self.stdout.write(self.style.SUCCESS(f"Platform admin '{username}' is ready. Sign in at the LCO Desk app."))
