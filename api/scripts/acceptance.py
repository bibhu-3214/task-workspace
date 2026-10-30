import os

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.test")
django.setup()
from django.conf import settings
from django.core.management import call_command

if (
    settings.SETTINGS_MODULE != "config.settings.test"
    or os.environ.get("WORKSPACE_EPHEMERAL") != "1"
):
    raise SystemExit("Acceptance requires an isolated temporary PostgreSQL database.")
call_command("migrate", verbosity=0, interactive=False)
call_command("runserver", "127.0.0.1:" + str(settings.PRODUCT["apiPort"]), use_reloader=False)
