import json
import os
import stat
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

from django.conf import settings
from django.contrib.auth.models import User
from django.core.exceptions import ImproperlyConfigured
from django.test import Client, TestCase, override_settings

from scripts.local_login import ensure_local_login
from workspace.models import Workspace


@override_settings(SETTINGS_MODULE="config.settings.development", DEBUG=True)
class LocalLoginTests(TestCase):
    def setUp(self):
        self.folder = TemporaryDirectory(prefix="workspace-local-login-")
        self.addCleanup(self.folder.cleanup)
        self.override = override_settings(
            BASE_DIR=Path(self.folder.name), SETTINGS_MODULE="config.settings.development"
        )
        self.override.enable()
        self.addCleanup(self.override.disable)
        self.environment = patch.dict(os.environ, {"WORKSPACE_EPHEMERAL": "0"})
        self.environment.start()
        self.addCleanup(self.environment.stop)

    def test_generated_login_is_private_reusable_and_can_authenticate(self):
        other = User.objects.create_user("existing@example.test", password="KeepThisPassword#4827")
        original = other.password
        credentials = ensure_local_login()
        self.assertEqual(ensure_local_login(), credentials)
        self.assertEqual(User.objects.count(), 2)
        owner = User.objects.get(pk=credentials["userId"])
        self.assertTrue(owner.check_password(credentials["password"]))
        self.assertFalse(owner.is_staff)
        self.assertFalse(owner.is_superuser)
        self.assertEqual(Workspace.objects.get(owner=owner).records, [])
        other.refresh_from_db()
        self.assertEqual(other.password, original)
        path = settings.BASE_DIR / ".local" / "local-login.json"
        self.assertEqual(stat.S_IMODE(path.stat().st_mode), 0o600)
        self.assertEqual(json.loads(path.read_text()), credentials)
        client = Client(enforce_csrf_checks=True)
        token = client.get("/api/session").json()["csrfToken"]
        response = client.post(
            "/api/auth/login",
            json.dumps({"email": credentials["email"], "password": credentials["password"]}),
            content_type="application/json",
            HTTP_X_CSRFTOKEN=token,
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(client.get("/api/workspace").status_code, 200)

    def test_seeding_requires_persistent_private_development(self):
        for module, debug in [
            ("config.settings.production", False),
            ("config.settings.test", True),
            ("config.settings.development", False),
        ]:
            with (
                self.subTest(module=module, debug=debug),
                override_settings(SETTINGS_MODULE=module, DEBUG=debug),
            ):
                self.assertIsNone(ensure_local_login())
        with patch.dict(os.environ, {"WORKSPACE_EPHEMERAL": "1"}):
            self.assertIsNone(ensure_local_login())
        with patch.dict(settings.DATABASES["default"], {"HOST": "db.example.test"}):
            self.assertIsNone(ensure_local_login())
        with patch.dict(settings.DATABASES["default"], {"ENGINE": "django.db.backends.sqlite3"}):
            self.assertIsNone(ensure_local_login())
        self.assertFalse(User.objects.exists())
        self.assertFalse((settings.BASE_DIR / ".local").exists())

    def test_restart_preserves_changed_password_and_workspace(self):
        credentials = ensure_local_login()
        owner = User.objects.get(pk=credentials["userId"])
        owner.set_password("ChangedLocally#4827")
        owner.save(update_fields=["password"])
        Workspace.objects.filter(owner=owner).update(revision=7)
        ensure_local_login()
        owner.refresh_from_db()
        self.assertTrue(owner.check_password("ChangedLocally#4827"))
        self.assertEqual(Workspace.objects.get(owner=owner).revision, 7)

    def test_removed_local_account_is_not_replaced_silently(self):
        credentials = ensure_local_login()
        User.objects.get(pk=credentials["userId"]).delete()
        with self.assertRaises(ImproperlyConfigured):
            ensure_local_login()
        self.assertFalse(User.objects.exists())

    def test_existing_email_is_not_taken_over(self):
        email = "local.owner@" + settings.PRODUCT["id"] + ".test"
        other = User.objects.create_user(email, email=email, password="PreserveThis#4827")
        credentials = ensure_local_login()
        self.assertNotEqual(credentials["email"], email)
        self.assertNotEqual(credentials["userId"], other.pk)
        other.refresh_from_db()
        self.assertTrue(other.check_password("PreserveThis#4827"))
