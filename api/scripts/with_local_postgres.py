"""Run a Python command against private local PostgreSQL, without Docker or paid hosting.

The optional embedded binary is for development/testing only. Hosted services use managed PG.
"""

import argparse
import fcntl
import os
import shlex
import signal
import subprocess
import sys
from pathlib import Path
from tempfile import TemporaryDirectory
from urllib.parse import urlencode


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--temporary", action="store_true")
    parser.add_argument("command", nargs=argparse.REMAINDER)
    args = parser.parse_args()
    command = args.command
    if command[:1] == ["--"]:
        command = command[1:]
    if not command:
        parser.error("Supply a Python command, e.g. -- -m pytest")

    def stop_on_termination(signum, frame):
        # Let subprocess.run and our finally block stop the child and PostgreSQL.
        raise SystemExit(128 + signum)

    signal.signal(signal.SIGTERM, stop_on_termination)
    try:
        import embedded_postgres
    except ImportError:
        parser.error("Install api/requirements-local.txt for the optional local PostgreSQL runner.")
    root = Path(__file__).resolve().parents[1]
    with TemporaryDirectory(prefix="workspace-pg-") as temp:
        data = Path(temp) / "data" if args.temporary else root / ".local" / "postgres"
        data.mkdir(parents=True, exist_ok=True, mode=0o700)
        # Use the bundled command wrappers directly: their server manager writes a user-global
        # runtime directory on macOS. Keep this runner entirely in the project and private temp.
        lock_dir = root / ".local"
        lock_dir.mkdir(mode=0o700, exist_ok=True)
        with (lock_dir / "postgres.lock").open("a") as lock:
            # Only the shared persistent data directory needs exclusion. A temporary cluster is
            # private, so tests must not block (indefinitely) behind a running dev server.
            if not args.temporary:
                fcntl.flock(lock, fcntl.LOCK_EX)
            if not (data / "PG_VERSION").exists():
                embedded_postgres.initdb(
                    ["-A", "trust", "-U", "postgres", "--encoding=UTF8", "--locale=C"],
                    pgdata=data,
                    timeout=30,
                )
            socket = Path(temp) / "socket"
            socket.mkdir(mode=0o700)
            embedded_postgres.pg_ctl(
                [
                    "-w",
                    "-l",
                    str(data / "server.log"),
                    "-o",
                    f"-h '' -k {shlex.quote(str(socket))}",
                    "start",
                ],
                pgdata=data,
                timeout=30,
            )
            try:
                uri = "postgresql://postgres@/postgres?" + urlencode({"host": str(socket)})
                env = {
                    **os.environ,
                    "DATABASE_URL": uri,
                    "WORKSPACE_EPHEMERAL": "1" if args.temporary else "0",
                }
                # Never print the URI or inherit production settings by accident.
                env["DJANGO_SETTINGS_MODULE"] = (
                    "config.settings.test" if args.temporary else "config.settings.development"
                )
                result = subprocess.run([sys.executable, *command], cwd=root, env=env, check=False)
                return result.returncode
            finally:
                embedded_postgres.pg_ctl(["-w", "stop"], pgdata=data, timeout=30)


if __name__ == "__main__":
    sys.exit(main())
