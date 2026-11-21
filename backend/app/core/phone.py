"""Phone helpers shared by Client Master, reminders and WhatsApp matching."""
import re
from typing import Optional, Tuple


def normalize_phone(raw) -> Tuple[Optional[str], Optional[str]]:
    """
    Returns (e164, error). Blank -> (None, None).
    Indian mobiles: 10 digits, 0XXXXXXXXXX, 91XXXXXXXXXX or +91XXXXXXXXXX.
    Other countries only with an explicit +<country code> (8-15 digits).
    """
    s = "" if raw is None else str(raw).strip()
    if s.endswith(".0"):  # numbers read from Excel as floats
        s = s[:-2]
    if not s:
        return None, None
    has_plus = s.startswith("+")
    digits = re.sub(r"[\s\-().]", "", s.lstrip("+"))
    if not digits.isdigit():
        return None, "Phone number may contain only digits, spaces, dashes and a leading +."
    if has_plus and not digits.startswith("91"):
        if 8 <= len(digits) <= 15:
            return "+" + digits, None
        return None, "International numbers need 8 to 15 digits after the +."
    if digits.startswith("91") and len(digits) == 12:
        digits = digits[2:]
    elif digits.startswith("0") and len(digits) == 11:
        digits = digits[1:]
    if len(digits) != 10 or digits[0] not in "6789":
        return None, "Enter a 10-digit Indian mobile number (starts with 6-9), or +<country code> for other countries."
    return "+91" + digits, None


def whatsapp_jid(e164: str) -> str:
    return e164.lstrip("+") + "@s.whatsapp.net"


def phone_from_jid(jid: str) -> Optional[str]:
    """'919876543210@s.whatsapp.net' -> '+919876543210'. Group / LID jids return None."""
    if not jid or not jid.endswith("@s.whatsapp.net"):
        return None
    num = jid.split("@")[0].split(":")[0]
    return ("+" + num) if num.isdigit() else None
