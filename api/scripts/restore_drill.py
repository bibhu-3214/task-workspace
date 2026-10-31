"""Rehearse pg_dump/pg_restore in the explicitly disposable local test cluster."""

import os
import subprocess
import sys
import uuid
from pathlib import Path
from tempfile import TemporaryDirectory

import django
import embedded_postgres
import psycopg
from psycopg import sql
from psycopg.conninfo import conninfo_to_dict


def main():
    if os.environ.get("WORKSPACE_EPHEMERAL") != "1":
        raise SystemExit("Use the --temporary PostgreSQL runner for this rehearsal.")
    if os.environ.get("DJANGO_SETTINGS_MODULE") != "config.settings.test":
        raise SystemExit("Restore rehearsal requires isolated test settings.")
    params = conninfo_to_dict(os.environ["DATABASE_URL"])
    socket = Path(params.get("host", ""))
    if (
        not socket.is_absolute()
        or socket.name != "socket"
        or not socket.parent.name.startswith("workspace-pg-")
        or params.get("password")
    ):
        raise SystemExit("Restore rehearsal requires the private temporary Unix socket.")
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
    django.setup()
    from django.conf import settings
    from django.contrib.auth import get_user_model
    from django.core.management import call_command

    from workspace.models import Workspace

    if not settings.DEBUG:
        raise SystemExit("Production settings are forbidden for this rehearsal.")
    call_command("migrate", verbosity=0)
    # A sentinel deliberately includes nested data, punctuation, Unicode and a revision.
    records = [
        {
            "id": "restore-sentinel",
            "title": "Private café",
            "details": {"amount": "10.29", "tags": ["one", "two"]},
        }
    ]
    owner = get_user_model().objects.create_user(
        username="restore-owner", email="restore@example.test", password="SyntheticOnly#4827"
    )
    workspace = Workspace.objects.create(owner=owner, records=records, revision=7)
    binaries = Path(embedded_postgres.__file__).parent / "pginstall" / "bin"
    target = "restore_" + uuid.uuid4().hex
    source = params.get("dbname", "postgres")
    args = [
        "-h",
        str(socket),
        "-U",
        params.get("user", "postgres"),
        "-p",
        params.get("port", "5432"),
    ]

    def pg(tool, *extra):
        subprocess.run([str(binaries / tool), *args, *extra], check=True, capture_output=True)

    with TemporaryDirectory(prefix="workspace-restore-") as folder:
        dump = str(Path(folder) / "private.dump")
        pg("pg_dump", "--format=custom", "--no-owner", "--no-acl", "-f", dump, source)
        with psycopg.connect(**params, autocommit=True) as admin:
            admin.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(target)))
            try:
                pg("pg_restore", "--no-owner", "--no-acl", "--exit-on-error", "-d", target, dump)
                with psycopg.connect(**{**params, "dbname": target}) as restored:
                    row = restored.execute(
                        "SELECT records, revision, owner_id FROM workspace_workspace WHERE id = %s",
                        [workspace.id],
                    ).fetchone()
                    assert row == (records, 7, owner.id), (
                        "Workspace or revision differed after restore."
                    )
                    account = restored.execute(
                        "SELECT email, password FROM auth_user WHERE id = %s", [owner.id]
                    ).fetchone()
                    assert account == (owner.email, owner.password), (
                        "Account differed after restore."
                    )
                print("Restore rehearsal passed: workspace JSON, revision and account match.")
            finally:
                admin.execute(
                    sql.SQL("DROP DATABASE {} WITH (FORCE)").format(sql.Identifier(target))
                )


if __name__ == "__main__":
    main()
