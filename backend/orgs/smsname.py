"""
The operator's name at the end of every customer SMS ("... செலுத்தவும். Velu TV").
Kept to 12 characters so the SMS stays short (fewer SMS parts = lower cost) and reads like a signature.
"""
import re

MAX_SMS_NAME = 12

# Words that say what the business is, not who it is: dropped when we shorten a name.
GENERIC = {
    "cable", "cables", "network", "networks", "net", "tv", "vision", "visions", "digital", "broadband", "internet",
    "communication", "communications", "comm", "services", "service", "systems", "system", "enterprises",
    "enterprise", "media", "entertainment", "entertainments", "pvt", "ltd", "private", "limited", "the", "and",
    "co", "company", "agency", "agencies", "fiber", "fibre", "satellite", "sat", "dth", "telecom", "info",
    "solutions", "&", "கேபிள்", "நெட்வொர்க்", "டிவி", "விஷன்",
}
# Respectful prefixes: "Sri Murugan Cable" reads best as "Murugan".
HONORIFIC = {"sri", "shri", "sree", "shree", "om", "jai", "new", "thiru", "ஸ்ரீ"}
# Any language's letters (Tamil vowel signs included), digits, space and & . - ; no symbols or line breaks.
ALLOWED = re.compile(r"^[^\x00-\x1f\x7f<>{}\[\]|\\\"'`#$%^*+=~;:!?@/,()_]+$")


def _words(name):
    return [w for w in re.split(r"[\s,./()\-_]+", name or "") if w]


def clean(value):
    """Collapse spaces."""
    return re.sub(r"\s+", " ", str(value or "")).strip()


def is_valid(value):
    value = clean(value)
    return 0 < len(value) <= MAX_SMS_NAME and bool(ALLOWED.match(value))


def suggestions(name, limit=4):
    """Short names from the business name, best first. 'Sri Murugan Cable Network' -> Murugan, SMCN, SM TV ..."""
    words = _words(name)
    all_caps = (name or "").isupper()

    def nice(w):  # GTPL stays GTPL; MURUGA (whole name in capitals) -> Muruga; Tamil as typed
        if not w.isascii():
            return w
        return w if (w.isupper() and len(w) <= 4 and not all_caps) else w.capitalize()

    core = [w for w in words if w.lower() not in GENERIC] or words
    main = [w for w in core if w.lower() not in HONORIFIC] or core
    out = []

    def add(text):
        text = clean(text)
        if text and len(text) <= MAX_SMS_NAME and ALLOWED.match(text) and text.lower() not in {o.lower() for o in out}:
            out.append(text)

    if main:
        first = nice(main[0])
        add("".join(nice(w) for w in main))   # VeluRaj
        add(" ".join(nice(w) for w in main))  # Velu Raj
        add(" ".join(nice(w) for w in core))  # Sri Murugan
        add("".join(nice(w) for w in core))   # OmMuruga
        add(first)                            # Murugan
        add(f"{first} TV")                    # Velu TV
        add(f"{first} Cable")                 # Velu Cable
        if all(w.isascii() for w in words):
            initials = "".join(w[0] for w in words if w[0].isalnum()).upper()
            if len(initials) >= 2:
                add(initials)                 # SMCN
            core_initials = "".join(w[0] for w in core if w[0].isalnum()).upper()
            if len(core_initials) >= 2:
                add(f"{core_initials} TV")    # SM TV
        add(first[:MAX_SMS_NAME])             # a long single word, cut
    return out[:limit]


def sms_name(org):
    """What actually goes in the SMS: the owner's choice, else the best suggestion."""
    chosen = clean(org.sms_display_name)
    if chosen:
        return chosen[:MAX_SMS_NAME]
    options = suggestions(org.name)
    return options[0] if options else clean(org.name)[:MAX_SMS_NAME]
