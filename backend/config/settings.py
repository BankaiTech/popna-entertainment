"""LCO Desk backend settings. All secrets come from environment variables (.env)."""
import os
from datetime import timedelta
from decimal import Decimal
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
# Path of the Django admin, e.g. "ops-7f3k9q/". Empty in production = admin switched off.
ADMIN_URL = env("DJANGO_ADMIN_URL", "admin/" if DEBUG else "").strip().lstrip("/")
if ADMIN_URL and not ADMIN_URL.endswith("/"):
    ADMIN_URL += "/"
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
    "complaints",
    "portal",
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
    "DEFAULT_AUTHENTICATION_CLASSES": ["accounts.authentication.AppJWTAuthentication"],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    # JSON must be an object; form posts are for the payment gateways' return pages and file uploads.
    "DEFAULT_PARSER_CLASSES": [
        "core.parsers.ObjectJSONParser",
        "rest_framework.parsers.FormParser",
        "rest_framework.parsers.MultiPartParser",
    ],
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
    # The existing React frontend expects plain JSON arrays, so pagination is off for now.
    "DEFAULT_PAGINATION_CLASS": None,
    "DEFAULT_THROTTLE_RATES": {"login": "10/min", "ping": "60/min", "signup": env("SIGNUP_RATE", "5/hour"),
                               "customer_login": "10/min", "customer_login_mobile": "20/hour"},
    # Caddy sits in front of Django and adds the real client IP as the last X-Forwarded-For entry.
    "NUM_PROXIES": int(env("DRF_NUM_PROXIES", "1")),
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=int(env("JWT_ACCESS_MINUTES", "30"))),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=int(env("JWT_REFRESH_DAYS", "7"))),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
}

# Customer app (mobile + box number) stays logged in for this many days, then asks again.
CUSTOMER_REFRESH_DAYS = int(env("CUSTOMER_REFRESH_DAYS", "30"))

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
# Cashfree Payment Gateway (operators pay LCO Desk online). Empty App ID = online payment button hidden.
CASHFREE_APP_ID = env("CASHFREE_APP_ID", "")
CASHFREE_SECRET_KEY = env("CASHFREE_SECRET_KEY", "")
CASHFREE_ENV = env("CASHFREE_ENV", "sandbox")  # sandbox | production
CASHFREE_API_VERSION = env("CASHFREE_API_VERSION", "2025-01-01")
CASHFREE_RETURN_URL = env("CASHFREE_RETURN_URL", "https://lcodesk.in/admin/settings?tab=plan")
CASHFREE_NOTIFY_URL = env("CASHFREE_NOTIFY_URL", "https://api.lcodesk.in/api/payments/cashfree/webhook")
# Sandbox = fake money. Only these organization ids see "Pay online" in sandbox (test operators), so real
# operators can never get SMS for a test payment. Ignored in production.
CASHFREE_SANDBOX_ORG_IDS = {int(x) for x in env_list("CASHFREE_SANDBOX_ORG_IDS", "") if x.strip().isdigit()}

# PayU (second online gateway). Empty key or salt = PayU button hidden. Salt stays on the server only.
PAYU_KEY = env("PAYU_KEY", "")
PAYU_SALT = env("PAYU_SALT", "")
PAYU_ENV = env("PAYU_ENV", "test")  # test | production
# PayU posts the result to our API (checked there), which then sends the operator back to this page.
PAYU_RETURN_URL = env("PAYU_RETURN_URL", "https://api.lcodesk.in/api/payments/payu/return")
PAYU_APP_RETURN_URL = env("PAYU_APP_RETURN_URL", "https://lcodesk.in/admin/settings?tab=plan")
PAYU_FALLBACK_EMAIL = env("PAYU_FALLBACK_EMAIL", "payments@lcodesk.in")  # PayU needs an email; used if none
PAYU_SANDBOX_ORG_IDS = {int(x) for x in env_list("PAYU_SANDBOX_ORG_IDS", "") if x.strip().isdigit()}

# Where operators pay LCO Desk (SMS packs, renewals). The app opens the chosen UPI app with this ID.
# Renewal offer prices (months: total Rs) for every operator with no special monthly fee.
# .env format: RENEWAL_OFFER_PRICES=1:375,3:1085,6:2075,12:4050
RENEWAL_OFFER_PRICES = {
    int(m): Decimal(p) for m, p in
    (pair.split(":") for pair in env_list("RENEWAL_OFFER_PRICES", "1:375,3:1085,6:2075,12:4050") if ":" in pair)
}

PLATFORM_UPI_PAYEE_NAME = env("PLATFORM_UPI_PAYEE_NAME", "LCO Desk")
PLATFORM_UPI_IDS = {
    "gpay": env("PLATFORM_UPI_GPAY", "msv31bieber@oksbi"),
    "phonepe": env("PLATFORM_UPI_PHONEPE", "8072787387@ybl"),
    "paytm": env("PLATFORM_UPI_PAYTM", "8072787387@ptyes"),
    "bhim": env("PLATFORM_UPI_BHIM", "vicky2135@upi"),
}

# DLT template id for each (message type, language). Change in .env when the vendor approves a new one.
# (SMS_TPL_CUSTOMER_EN / _TA are the older names, still read as a fallback.)
SMS_TEMPLATE_IDS = {
    ("receipt", "en"): env("SMS_TPL_RECEIPT_EN", env("SMS_TPL_CUSTOMER_EN", "1607100000000376221")),
    ("reminder", "en"): env("SMS_TPL_REMINDER_EN", env("SMS_TPL_CUSTOMER_EN", "1607100000000376221")),
    ("receipt", "ta"): env("SMS_TPL_RECEIPT_TA", "1677100000000399500"),
    ("reminder", "ta"): env("SMS_TPL_REMINDER_TA", "1677100000000399495"),
}
# Extra URL text added for Tamil (Unicode) SMS, as your gateway needs it, e.g. "&unicode=1".
SMS_UNICODE_PARAMS = env("SMS_UNICODE_PARAMS", "")
# Optional: exact template wording if a new template keeps the same 3 variables.
# Use {name} {body} {org} and \n for new lines. Empty = the text in notifications/templates.py.
SMS_TEXT_OVERRIDES = {
    ("receipt", "en"): env("SMS_TEXT_RECEIPT_EN", env("SMS_TEXT_CUSTOMER_EN", "")),
    ("reminder", "en"): env("SMS_TEXT_REMINDER_EN", env("SMS_TEXT_CUSTOMER_EN", "")),
    ("receipt", "ta"): env("SMS_TEXT_RECEIPT_TA", ""),
    ("reminder", "ta"): env("SMS_TEXT_REMINDER_TA", ""),
}
# Internet customers' SMS (receipts and reminders) are switched off for everyone until there is an
# approved template for them. Cable SMS are not affected.
SMS_INTERNET_ENABLED = env_bool("SMS_INTERNET_ENABLED", False)
# All customer SMS go in this language for now (the app no longer asks per customer / per operator).
# Empty = use the customer's / operator's choice again.
SMS_ONLY_LANGUAGE = env("SMS_ONLY_LANGUAGE", "ta")

# ── Scheduler (python manage.py run_scheduler) ──────────────────────────────
SCHEDULE_DUE_REMINDERS_AT = env("SCHEDULE_DUE_REMINDERS_AT", "09:00")
SCHEDULE_GENERATE_BILLS_AT = env("SCHEDULE_GENERATE_BILLS_AT", "06:00")
SCHEDULE_PURGE_LOCATIONS_AT = env("SCHEDULE_PURGE_LOCATIONS_AT", "03:00")
BILL_GENERATION_DAY = int(env("BILL_GENERATION_DAY", "1"))

# ── Tracking ────────────────────────────────────────────────────────────────
LOCATION_RETENTION_DAYS = int(env("LOCATION_RETENTION_DAYS", "90"))
MIN_PING_INTERVAL_SECONDS = int(env("MIN_PING_INTERVAL_SECONDS", "30"))
