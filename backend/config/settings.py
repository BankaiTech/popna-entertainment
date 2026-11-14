"""LCO Desk backend settings. All secrets come from environment variables (.env)."""
import os
from datetime import timedelta
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# Tiny .env loader (no extra dependency). Real environment variables win.
_env_file = BASE_DIR / ".env"
if _env_file.exists():
    for _line in _env_file.read_text().splitlines():
        _line = _line.strip()
        if not _line or _line.startswith("#") or "=" not in _line:
            continue
        _k, _v = _line.split("=", 1)
        os.environ.setdefault(_k.strip(), _v.strip().strip('"').strip("'"))


def env(name, default=None):
    return os.environ.get(name, default)


def env_bool(name, default=False):
    value = os.environ.get(name)
    if value is None:
        return default
    return value.strip().lower() in ("1", "true", "yes", "on")


def env_list(name, default=""):
    return [x.strip() for x in os.environ.get(name, default).split(",") if x.strip()]


DEBUG = env_bool("DJANGO_DEBUG", False)
SECRET_KEY = env("DJANGO_SECRET_KEY")
if not SECRET_KEY:
    if DEBUG:
        SECRET_KEY = "dev-only-insecure-key-do-not-use-in-production"
    else:
        raise RuntimeError("DJANGO_SECRET_KEY must be set when DJANGO_DEBUG is false")

ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1")
CSRF_TRUSTED_ORIGINS = env_list("DJANGO_CSRF_TRUSTED_ORIGINS", "")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework_simplejwt.token_blacklist",
    "django_filters",
    "corsheaders",
    "core",
    "orgs",
    "accounts",
    "customers",
    "billing",
    "notifications",
    "tracking",
    "inventory",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ]
        },
    }
]

if env("POSTGRES_DB"):
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": env("POSTGRES_DB"),
            "USER": env("POSTGRES_USER", "lcodesk"),
            "PASSWORD": env("POSTGRES_PASSWORD", ""),
            "HOST": env("POSTGRES_HOST", "db"),
            "PORT": env("POSTGRES_PORT", "5432"),
            "CONN_MAX_AGE": 60,
            # Encrypted connection to the database (e.g. AWS RDS). verify-full also checks the server certificate.
            "OPTIONS": {
                k: v for k, v in {
                    "sslmode": env("POSTGRES_SSLMODE", "prefer"),
                    "sslrootcert": env("POSTGRES_SSLROOTCERT", ""),
                    "connect_timeout": 10,
                }.items() if v
            },
        }
    }
else:
    # Local development / tests only.
    DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": BASE_DIR / "db.sqlite3"}}

AUTH_USER_MODEL = "accounts.User"
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 8}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Kolkata"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedStaticFilesStorage"},
}
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ["rest_framework_simplejwt.authentication.JWTAuthentication"],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
    # The existing React frontend expects plain JSON arrays, so pagination is off for now.
    "DEFAULT_PAGINATION_CLASS": None,
    "DEFAULT_THROTTLE_RATES": {"login": "10/min", "ping": "60/min"},
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=int(env("JWT_ACCESS_MINUTES", "30"))),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=int(env("JWT_REFRESH_DAYS", "7"))),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
}

CORS_ALLOWED_ORIGINS = env_list("CORS_ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")

if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_HSTS_SECONDS = int(env("SECURE_HSTS_SECONDS", "0"))

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "root": {"handlers": ["console"], "level": env("LOG_LEVEL", "INFO")},
}

# ── SMS (ping4sms or any HTTP gateway) ──────────────────────────────────────
# SMS_BACKEND=console prints SMS to the log (safe for development).
# SMS_BACKEND=http sends through SMS_HTTP_URL (copy the API URL from your ping4sms panel).
SMS_BACKEND = env("SMS_BACKEND", "console")
SMS_HTTP_URL = env("SMS_HTTP_URL", "")
SMS_HTTP_METHOD = env("SMS_HTTP_METHOD", "GET").upper()
SMS_API_KEY = env("SMS_API_KEY", "")
SMS_SENDER_ID = env("SMS_SENDER_ID", "")
SMS_ROUTE = env("SMS_ROUTE", "")
SMS_DLT_ENTITY_ID = env("SMS_DLT_ENTITY_ID", "")
SMS_MOBILE_PREFIX = env("SMS_MOBILE_PREFIX", "")  # e.g. "91" if the gateway needs country code
SMS_SUCCESS_KEYWORD = env("SMS_SUCCESS_KEYWORD", "")  # optional text that must appear in a success response
SMS_MAX_ATTEMPTS = int(env("SMS_MAX_ATTEMPTS", "5"))
# Approved DLT templates for customer SMS (English and Tamil). Only customers ever get SMS.
SMS_TEMPLATE_IDS = {
    "en": env("SMS_TPL_CUSTOMER_EN", "1607100000000376221"),
    "ta": env("SMS_TPL_CUSTOMER_TA", "1607100000000376222"),
}
# Extra URL text added for Tamil (Unicode) SMS, as your gateway needs it, e.g. "&unicode=1".
SMS_UNICODE_PARAMS = env("SMS_UNICODE_PARAMS", "")
# Optional: exact template wording if yours differs. Use {name} {body} {org} and \n for new lines.
SMS_TEXT_OVERRIDES = {
    "en": env("SMS_TEXT_CUSTOMER_EN", ""),
    "ta": env("SMS_TEXT_CUSTOMER_TA", ""),
}

# ── Scheduler (python manage.py run_scheduler) ──────────────────────────────
SCHEDULE_DUE_REMINDERS_AT = env("SCHEDULE_DUE_REMINDERS_AT", "09:00")
SCHEDULE_GENERATE_BILLS_AT = env("SCHEDULE_GENERATE_BILLS_AT", "06:00")
SCHEDULE_PURGE_LOCATIONS_AT = env("SCHEDULE_PURGE_LOCATIONS_AT", "03:00")
BILL_GENERATION_DAY = int(env("BILL_GENERATION_DAY", "1"))

# ── Tracking ────────────────────────────────────────────────────────────────
LOCATION_RETENTION_DAYS = int(env("LOCATION_RETENTION_DAYS", "90"))
MIN_PING_INTERVAL_SECONDS = int(env("MIN_PING_INTERVAL_SECONDS", "30"))
