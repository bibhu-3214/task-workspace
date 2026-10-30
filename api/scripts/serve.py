import os

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
import django

django.setup()
from django.conf import settings
from django.core.management import call_command

from scripts.local_login import ensure_local_login

call_command("migrate", interactive=False, verbosity=0)
ensure_local_login()
call_command("runserver", "127.0.0.1:" + str(settings.PRODUCT["apiPort"]), use_reloader=False)
