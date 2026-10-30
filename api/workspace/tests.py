import json
from concurrent.futures import ThreadPoolExecutor

from django.conf import settings
from django.contrib.auth.models import User
from django.db import close_old_connections, connections
from django.test import Client, TestCase, TransactionTestCase

from .models import Workspace

PASSWORD = "WorkspaceOnly#4827"


def fixture(identity="record"):
    base = {
        "id": identity,
        "createdAt": "2026-10-30T09:00:00.000Z",
        "updatedAt": "2026-10-30T09:00:00.000Z",
    }
    values = {
        "candidate": {
            "name": "Sample Candidate",
            "email": "candidate@example.test",
            "phone": "1234567890",
            "skills": "React, TypeScript",
            "jobTitle": "Front-End Developer",
            "experience": 3,
            "status": "applied",
        },
        "note": {"title": "Sample note", "body": "Private text", "tag": "Ideas", "pinned": False},
        "task": {
            "title": "Sample task",
            "description": "Review this",
            "priority": "Normal",
            "dueDate": "2026-10-30",
            "status": "To do",
        },
        "movie": {
            "title": "Sample film",
            "year": None,
            "rating": 8.5,
            "genre": "Drama",
            "status": "Watchlist",
            "notes": "",
        },
        "order": {
            "name": "Sample Buyer",
            "phone": "1234567890",
            "date": "2026-10-30",
            "amountMinor": 29,
        },
    }
    return {**base, **values[settings.PRODUCT["kind"]]}


def send(client, path, data, method="post"):
    token = client.get("/api/session").json()["csrfToken"]
    return getattr(client, method)(
        path, json.dumps(data), content_type="application/json", HTTP_X_CSRFTOKEN=token
    )


class BoundaryTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            "owner@example.test", "owner@example.test", PASSWORD, first_name="Sample Owner"
        )
        self.other = User.objects.create_user("other@example.test", "other@example.test", PASSWORD)
        Workspace.objects.create(owner=self.user)
        Workspace.objects.create(owner=self.other, records=[fixture("other-record")])
        self.client = Client(enforce_csrf_checks=True)
        self.client.force_login(self.user)

    def test_private_reads_require_a_session(self):
        self.assertEqual(Client().get("/api/workspace").status_code, 401)

    def test_write_requires_csrf(self):
        self.assertEqual(
            self.client.put("/api/workspace", "{}", content_type="application/json").status_code,
            403,
        )

    def test_workspace_is_owner_scoped(self):
        self.assertEqual(self.client.get("/api/workspace").json()["records"], [])
        response = send(
            self.client, "/api/workspace", {"revision": 0, "records": [fixture()]}, "put"
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(Workspace.objects.get(owner=self.other).records[0]["id"], "other-record")

    def test_stale_revision_cannot_overwrite_newer_records(self):
        self.assertEqual(
            send(
                self.client, "/api/workspace", {"revision": 0, "records": [fixture("first")]}, "put"
            ).status_code,
            200,
        )
        self.assertEqual(
            send(
                self.client, "/api/workspace", {"revision": 0, "records": [fixture("stale")]}, "put"
            ).status_code,
            409,
        )
        self.assertEqual(self.client.get("/api/workspace").json()["records"][0]["id"], "first")

    def test_duplicate_ids_and_foreign_fields_are_rejected(self):
        self.assertEqual(
            send(
                self.client,
                "/api/workspace",
                {"revision": 0, "records": [fixture(), fixture()]},
                "put",
            ).status_code,
            400,
        )
        self.assertEqual(
            send(
                self.client,
                "/api/workspace",
                {"revision": 0, "records": [], "owner": self.other.id},
                "put",
            ).status_code,
            400,
        )
        self.assertEqual(Workspace.objects.get(owner=self.user).revision, 0)

    def test_domain_schema_and_unknown_record_fields_are_rejected(self):
        record = fixture()
        record["unexpected"] = "injected"
        self.assertEqual(
            send(
                self.client, "/api/workspace", {"revision": 0, "records": [record]}, "put"
            ).status_code,
            400,
        )
        record = fixture()
        if "phone" in record:
            record["phone"] = "-------"
            self.assertEqual(
                send(
                    self.client, "/api/workspace", {"revision": 0, "records": [record]}, "put"
                ).status_code,
                400,
            )
        record = fixture()
        record["id"] = ""
        self.assertEqual(
            send(
                self.client, "/api/workspace", {"revision": 0, "records": [record]}, "put"
            ).status_code,
            400,
        )

    def test_wrong_http_methods_are_rejected(self):
        self.assertEqual(
            self.client.post("/api/workspace", "{}", content_type="application/json").status_code,
            403,
        )
        self.assertEqual(Client().get("/api/auth/logout").status_code, 405)

    def test_session_response_and_security_headers(self):
        response = self.client.get("/api/session")
        self.assertEqual(response["Cache-Control"], "no-store")
        self.assertEqual(response["X-Frame-Options"], "DENY")
        self.assertIn("frame-ancestors 'none'", response["Content-Security-Policy"])
        self.assertNotIn("password", response.content.decode())

    def test_real_registration_login_and_logout(self):
        client = Client(enforce_csrf_checks=True)
        response = send(
            client,
            "/api/auth/register",
            {"name": "Another Owner", "email": "NEW@example.test", "password": PASSWORD},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["user"]["email"], "new@example.test")
        self.assertTrue(response.cookies[settings.SESSION_COOKIE_NAME]["httponly"])
        self.assertEqual(client.get("/api/workspace").json()["records"], [])
        self.assertEqual(send(client, "/api/auth/logout", {}).status_code, 200)
        self.assertEqual(client.get("/api/workspace").status_code, 401)
        self.assertEqual(
            send(
                client, "/api/auth/login", {"email": "new@example.test", "password": PASSWORD}
            ).status_code,
            200,
        )

    def test_password_change_requires_current_password(self):
        self.assertEqual(
            send(
                self.client,
                "/api/auth/password",
                {"password": "wrong", "newPassword": "ChangedOnly#8294"},
            ).status_code,
            400,
        )
        self.assertEqual(
            send(
                self.client,
                "/api/auth/password",
                {"password": PASSWORD, "newPassword": "ChangedOnly#8294"},
            ).status_code,
            200,
        )
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("ChangedOnly#8294"))

    def test_failed_login_is_rate_limited(self):
        client = Client(enforce_csrf_checks=True)
        responses = [
            send(
                client, "/api/auth/login", {"email": "missing@example.test", "password": "wrong"}
            ).status_code
            for _ in range(13)
        ]
        self.assertEqual(responses[-1], 429)

    def test_deleting_an_account_requires_both_confirmations(self):
        self.assertEqual(
            send(
                self.client, "/api/auth/delete", {"password": PASSWORD, "confirmation": "no"}
            ).status_code,
            400,
        )
        self.assertEqual(
            send(
                self.client, "/api/auth/delete", {"password": PASSWORD, "confirmation": "DELETE"}
            ).status_code,
            200,
        )
        self.assertFalse(Workspace.objects.filter(owner_id=self.user.id).exists())
        self.assertTrue(User.objects.filter(pk=self.other.id).exists())


class ConcurrentWrites(TransactionTestCase):
    def test_only_one_editor_can_commit_a_given_revision(self):
        user = User.objects.create_user("concurrent@example.test", password=PASSWORD)
        Workspace.objects.create(owner=user)

        def write(index):
            close_old_connections()
            try:
                client = Client(enforce_csrf_checks=True)
                client.force_login(user)
                return send(
                    client,
                    "/api/workspace",
                    {"revision": 0, "records": [fixture("concurrent-" + str(index))]},
                    "put",
                ).status_code
            finally:
                connections.close_all()

        with ThreadPoolExecutor(max_workers=4) as pool:
            statuses = list(pool.map(write, range(4)))
        self.assertEqual(statuses.count(200), 1)
        self.assertEqual(statuses.count(409), 3)
        self.assertEqual(Workspace.objects.get(owner=user).revision, 1)
