"""Prepare one private, reusable owner account for the loopback development stack."""

import json
import os
import secrets

from django.conf import settings
from django.contrib.auth.models import User
from django.core.exceptions import ImproperlyConfigured
from django.db import transaction

from workspace.models import Workspace


def ensure_local_credentials():
    database = settings.DATABASES["default"]
    host = database.get("HOST") or database.get("OPTIONS", {}).get("host", "")
    if (
        settings.SETTINGS_MODULE != "config.settings.development"
        or not settings.DEBUG
        or database.get("ENGINE") != "django.db.backends.postgresql"
        or not host.startswith("/")
        or os.environ.get("WORKSPACE_EPHEMERAL") != "0"
    ):
        return None

    folder = settings.BASE_DIR / ".local"
    folder.mkdir(mode=0o700, parents=True, exist_ok=True)
    path = folder / "local-login.json"
    if path.exists():
        credentials = json.loads(path.read_text())
        if (
            not isinstance(credentials, dict)
            or not isinstance(credentials.get("email"), str)
            or not isinstance(credentials.get("password"), str)
            or not User.objects.filter(
                pk=credentials.get("userId"), email=credentials["email"]
            ).exists()
        ):
            raise ImproperlyConfigured(
                "The saved local login no longer matches an account. "
                "Review api/.local/local-login.json before restarting."
            )
        path.chmod(0o600)
        return credentials

    email = "local.owner@" + settings.PRODUCT["id"] + ".test"
    while (
        User.objects.filter(username__iexact=email).exists()
        or User.objects.filter(email__iexact=email).exists()
    ):
        email = "local.owner." + secrets.token_hex(4) + "@" + settings.PRODUCT["id"] + ".test"
    password = secrets.token_urlsafe(24) + "aA1!"
    created = False
    try:
        with transaction.atomic():
            user = User.objects.create_user(
                username=email, email=email, password=password, first_name="Local owner"
            )
            Workspace.objects.create(owner=user)
            credentials = {"userId": user.pk, "email": email, "password": password}
            descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
            created = True
            with os.fdopen(descriptor, "w") as stream:
                json.dump(credentials, stream)
                stream.write("\n")
    except Exception:
        if created:
            path.unlink(missing_ok=True)
        raise
    return credentials
