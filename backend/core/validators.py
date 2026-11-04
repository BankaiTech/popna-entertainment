import re

from django.core.exceptions import ValidationError

INDIAN_MOBILE_RE = re.compile(r"^[6-9]\d{9}$")


def normalize_mobile(value):
    """Keep the last 10 digits of an Indian mobile number ('+91 98400 12345' -> '9840012345')."""
    digits = re.sub(r"\D", "", value or "")
    if len(digits) > 10 and digits.startswith("91"):
        digits = digits[-10:]
    return digits


def validate_indian_mobile(value):
    if value and not INDIAN_MOBILE_RE.match(normalize_mobile(value)):
        raise ValidationError("Enter a valid 10-digit Indian mobile number.")
