import re
from datetime import date, datetime


class Invalid(ValueError):
    pass


def text(record, key, minimum=0, maximum=200):
    value = record.get(key)
    if not isinstance(value, str) or not minimum <= len(value.strip()) <= maximum:
        raise Invalid(f"Invalid {key}.")
    return value


def validate_records(records):
    if not isinstance(records, list) or len(records) > 10000:
        raise Invalid("A workspace supports up to 10,000 records.")
    seen = set()
    projects = set()
    references = []
    core = {"id", "createdAt", "updatedAt"}
    shapes = {
        "task": {"title", "description", "priority", "dueDate", "status"},
        "note": {"title", "body", "tag", "pinned"},
        "project": {"recordType", "name", "description"},
    }
    for record in records:
        if not isinstance(record, dict):
            raise Invalid("Invalid record.")
        kind = "task" if "status" in record else "note" if "body" in record else "project"
        optional = {"projectId", "recordType"} if kind != "project" else set()
        if not core | shapes[kind] <= set(record) or set(record) - core - shapes[kind] - optional:
            raise Invalid("Record fields do not match this application.")
        if "recordType" in record and record["recordType"] != kind:
            raise Invalid("Record type does not match its fields.")
        identity = text(record, "id", 1, 80)
        if identity in seen or not re.fullmatch(r"[A-Za-z0-9_-]+", identity):
            raise Invalid("Record IDs must be unique and valid.")
        seen.add(identity)
        for key in ["createdAt", "updatedAt"]:
            stamp = text(record, key, 1, 40)
            try:
                parsed = datetime.fromisoformat(stamp.replace("Z", "+00:00"))
                if parsed.tzinfo is None:
                    raise ValueError()
            except ValueError as exc:
                raise Invalid("Record timestamps require an explicit timezone.") from exc
        if kind == "project":
            text(record, "name", 2, 80)
            text(record, "description", 0, 1000)
            projects.add(identity)
            continue
        text(record, "title", 1, 200 if kind == "task" else 160)
        if "projectId" in record:
            reference = text(record, "projectId", 0, 80)
            if reference:
                references.append(reference)
        if kind == "note":
            text(record, "body", 1, 20000)
            text(record, "tag", 0, 40)
            if not isinstance(record.get("pinned"), bool):
                raise Invalid("Invalid pinned state.")
        else:
            text(record, "description", 0, 2000)
            if record.get("status") not in ["To do", "In progress", "Done"]:
                raise Invalid("Invalid task status.")
            if record.get("priority") not in ["Low", "Normal", "High"]:
                raise Invalid("Invalid task priority.")
            due = text(record, "dueDate", 0, 10)
            if due:
                try:
                    if date.fromisoformat(due).isoformat() != due:
                        raise ValueError()
                except ValueError as exc:
                    raise Invalid("Invalid due date.") from exc
    if any(reference not in projects for reference in references):
        raise Invalid("A linked project is missing.")
    return records
