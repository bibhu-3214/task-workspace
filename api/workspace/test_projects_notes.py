from copy import deepcopy

from django.test import TestCase

from . import test_workspace as support

fixture = support.fixture
send = support.send
from .models import Workspace


class ProjectNotesTests(TestCase):
    def setUp(self):
        support.BoundaryTests.setUp(self)

    def test_project_tasks_and_notes_round_trip_without_rewriting_legacy_tasks(self):
        task = fixture()
        project = {
            "id": "project",
            "recordType": "project",
            "name": "Launch",
            "description": "",
            "createdAt": task["createdAt"],
            "updatedAt": task["updatedAt"],
        }
        note = {
            "id": "note",
            "recordType": "note",
            "projectId": "project",
            "title": "Research",
            "body": "Keep these details",
            "tag": "Ideas",
            "pinned": True,
            "createdAt": task["createdAt"],
            "updatedAt": task["updatedAt"],
        }
        records = [task, project, note]
        response = send(self.client, "/api/workspace", {"revision": 0, "records": records}, "put")
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(self.client.get("/api/workspace").json()["records"], records)
        self.assertEqual(Workspace.objects.get(owner=self.other).records[0]["id"], "other-record")
        for patch in [{"projectId": "foreign-project"}, {"recordType": "task"}, {"pinned": "yes"}]:
            invalid = deepcopy(records)
            invalid[2].update(patch)
            self.assertEqual(
                send(
                    self.client, "/api/workspace", {"revision": 1, "records": invalid}, "put"
                ).status_code,
                400,
            )
        self.assertEqual(self.client.get("/api/workspace").json()["records"], records)
