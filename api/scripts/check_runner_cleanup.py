"""Check that interrupted test commands stop their own disposable PostgreSQL server."""

import json
import os
import signal
import subprocess
import sys
import time
from pathlib import Path
from tempfile import TemporaryDirectory


def alive(pid):
    try:
        os.kill(pid, 0)
        return True
    except ProcessLookupError:
        return False


def main():
    root = Path(__file__).resolve().parents[1]
    for interrupt in [signal.SIGTERM, signal.SIGINT]:
        with TemporaryDirectory(prefix="pgcheck-", dir="/tmp") as folder:
            temporary = Path(folder)
            ready = temporary / "ready"
            process = subprocess.Popen(
                [
                    sys.executable,
                    str(root / "scripts/local_postgres.py"),
                    "--temporary",
                    "--",
                    "-c",
                    "import sys,time; from pathlib import Path; Path(sys.argv[1]).write_text('ready'); time.sleep(60)",
                    str(ready),
                ],
                cwd=root,
                env={**os.environ, "TMPDIR": folder},
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
            )
            data = None
            pid = None
            try:
                for _ in range(150):
                    if ready.exists():
                        break
                    if process.poll() is not None:
                        _, error = process.communicate()
                        raise RuntimeError(
                            "The disposable runner stopped before readiness: " + error[-1800:]
                        )
                    time.sleep(0.1)
                else:
                    raise RuntimeError("Disposable runner readiness timed out.")
                [pidfile] = temporary.glob("workspace-pg-*/data/postmaster.pid")
                data = pidfile.parent
                pid = int(pidfile.read_text().splitlines()[0])
                process.send_signal(interrupt)
                process.communicate(timeout=12)
                if process.returncode != 128 + interrupt or alive(pid):
                    raise RuntimeError("Interrupted runner left its PostgreSQL server running.")
                if data.exists():
                    raise RuntimeError("Interrupted runner left its temporary database behind.")
                print(
                    json.dumps(
                        {
                            "signal": interrupt.name,
                            "postgresStopped": True,
                            "temporaryDataRemoved": True,
                        }
                    )
                )
            finally:
                if process.poll() is None:
                    process.terminate()
                    try:
                        process.communicate(timeout=12)
                    except subprocess.TimeoutExpired:
                        process.kill()
                        process.communicate(timeout=5)
                if pid and data and data.exists() and alive(pid):
                    import embedded_postgres

                    embedded_postgres.pg_ctl(["-w", "-m", "fast", "stop"], pgdata=data, timeout=10)


if __name__ == "__main__":
    main()
