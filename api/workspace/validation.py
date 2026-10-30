import re
from datetime import date, datetime
from math import isfinite

from django.conf import settings
from django.core.validators import validate_email


class Invalid(ValueError):
    pass


def text(record, key, minimum=0, maximum=200):
    value = record.get(key)
    if not isinstance(value, str) or not minimum <= len(value.strip()) <= maximum:
        raise Invalid(f"Invalid {key}.")
    return value


def choice(record, key, options):
    if record.get(key) not in options:
        raise Invalid(f"Invalid {key}.")


def number(record, key, minimum, maximum, integer=False):
    value = record.get(key)
    if (
        isinstance(value, bool)
        or not isinstance(value, (int, float))
        or not isfinite(value)
        or not minimum <= value <= maximum
        or (integer and not isinstance(value, int))
    ):
        raise Invalid(f"Invalid {key}.")


def validate_phone(record):
    value = text(record, "phone", 7, 25)
    if (
        not re.fullmatch(r"\+?[\d ()-]{7,25}", value)
        or not 7 <= len(re.sub(r"\D", "", value)) <= 15
    ):
        raise Invalid("Invalid phone.")


def validate_records(records):
    if not isinstance(records, list) or len(records) > 10000:
        raise Invalid("A workspace supports up to 10,000 records.")
    seen = set()
    kind = settings.PRODUCT["kind"]
    fields = {
        "candidate": {"name", "email", "phone", "skills", "jobTitle", "experience", "status"},
        "note": {"title", "body", "tag", "pinned"},
        "task": {"title", "description", "priority", "dueDate", "status"},
        "movie": {"title", "year", "rating", "genre", "status", "notes"},
        "order": {"name", "phone", "date", "amountMinor"},
    }[kind]
    for record in records:
        if not isinstance(record, dict) or set(record) not in (
            [fields | {"id", "createdAt"}, fields | {"id", "createdAt", "updatedAt"}]
            if kind == "candidate"
            else [fields | {"id", "createdAt", "updatedAt"}]
        ):
            raise Invalid("Record fields do not match this application.")
        identity = text(record, "id", 1, 80)
        if identity in seen or not re.fullmatch(r"[A-Za-z0-9_-]+", identity):
            raise Invalid("Record IDs must be unique and valid.")
        seen.add(identity)
        for key in ["createdAt"] + (["updatedAt"] if "updatedAt" in record else []):
            stamp = text(record, key, 1, 40)
            try:
                parsed = datetime.fromisoformat(stamp.replace("Z", "+00:00"))
                if parsed.tzinfo is None:
                    raise ValueError()
            except ValueError as exc:
                raise Invalid("Record timestamps require an explicit timezone.") from exc
        if kind == "candidate":
            text(record, "name", 2, 80)
            validate_email(text(record, "email", 1, 120))
            validate_phone(record)
            text(record, "skills", 2, 250)
            number(record, "experience", 0, 50)
            choice(
                record,
                "jobTitle",
                [
                    "Front-End Developer",
                    "Node.js Developer",
                    "MEAN Stack Developer",
                    "FULL Stack Developer",
                ],
            )
            choice(record, "status", ["applied", "shortlisted", "rejected"])
        elif kind == "note":
            text(record, "title", 1, 160)
            text(record, "body", 1, 20000)
            text(record, "tag", 0, 40)
            if not isinstance(record.get("pinned"), bool):
                raise Invalid("Invalid pinned state.")
        elif kind == "task":
            text(record, "title", 1, 200)
            text(record, "description", 0, 2000)
            choice(record, "priority", ["Low", "Normal", "High"])
            choice(record, "status", ["To do", "In progress", "Done"])
            due = text(record, "dueDate", 0, 10)
            if due:
                try:
                    if date.fromisoformat(due).isoformat() != due:
                        raise ValueError()
                except ValueError as exc:
                    raise Invalid("Invalid due date.") from exc
        elif kind == "movie":
            text(record, "title", 1, 160)
            text(record, "notes", 0, 2000)
            if record.get("year") is not None:
                number(record, "year", 1888, 2200, True)
            number(record, "rating", 0, 10)
            choice(
                record,
                "genre",
                ["Drama", "Comedy", "Thriller", "Animation", "Documentary", "Other"],
            )
            choice(record, "status", ["Watchlist", "Watched"])
        elif kind == "order":
            text(record, "name", 2, 100)
            validate_phone(record)
            number(record, "amountMinor", 1, 100_000_000_000, True)
            stamp = text(record, "date", 10, 10)
            try:
                if date.fromisoformat(stamp).isoformat() != stamp:
                    raise ValueError()
            except ValueError as exc:
                raise Invalid("Invalid order date.") from exc
    return records
