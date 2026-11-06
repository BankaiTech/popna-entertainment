from django.core.management.base import BaseCommand
from django.db import connection


class Command(BaseCommand):
    help = "Show the database version, whether the connection is encrypted, and how many tables exist."

    def handle(self, *args, **opts):
        with connection.cursor() as cur:
            cur.execute("select version()")
            self.stdout.write(f"Database: {cur.fetchone()[0].split(',')[0]}")
            cur.execute("select ssl, version, cipher from pg_stat_ssl where pid = pg_backend_pid()")
            ssl, tls, cipher = cur.fetchone()
            if ssl:
                self.stdout.write(self.style.SUCCESS(f"Encrypted (SSL): YES ({tls}, {cipher})"))
            else:
                self.stdout.write(self.style.ERROR("Encrypted (SSL): NO  <-- set POSTGRES_SSLMODE=verify-full"))
            cur.execute("select count(*) from information_schema.tables where table_schema = 'public'")
            self.stdout.write(f"Tables created: {cur.fetchone()[0]}")
