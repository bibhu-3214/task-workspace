import { readFileSync, existsSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
const root = fileURLToPath(new URL("../", import.meta.url));
const product = JSON.parse(readFileSync(join(root, "product.json"), "utf8"));
const python = join(root, "api/.venv/bin/python");
function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status || 1);
}
if (!existsSync(python)) {
  console.log("Preparing the local Python environment…");
  run("python3", ["-m", "venv", "api/.venv"]);
  run(python, [
    "-m",
    "pip",
    "install",
    "--disable-pip-version-check",
    "-r",
    "api/requirements-local.txt",
  ]);
}
const api = spawn(
  python,
  ["api/scripts/local_postgres.py", "--", "-m", "scripts.run_development"],
  {
    cwd: root,
    stdio: "inherit",
    detached: true,
    env: { ...process.env, APP_ENV: "development" },
  },
);
let server,
  stopping = false;
async function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  await server?.close();
  try {
    if (api.pid) process.kill(-api.pid, "SIGTERM");
  } catch {
    /* The child may already have exited, or its API may still be starting. */
  }
  process.exitCode = code;
}
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => void stop());
api.on("exit", (code) => {
  if (!stopping) {
    console.error("The local API stopped. Check the error above.");
    void stop(code || 1);
  }
});
try {
  let ready = false;
  for (let attempt = 0; attempt < 120; attempt++) {
    if (stopping) break;
    try {
      const response = await fetch(
        "http://127.0.0.1:" + product.apiPort + "/api/health",
      );
      if (response.ok) {
        const value = await response.json();
        if (value.product === product.id) {
          ready = true;
          break;
        }
        throw new Error("That port belongs to another product.");
      }
    } catch {
      /* The child may already have exited, or its API may still be starting. */
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (!ready) throw new Error("The local API did not become ready.");
  process.env.WORKSPACE_LOCAL_CREDENTIALS = "1";
  const { createServer } = await import("vite");
  server = await createServer({
    root,
    server: { host: "127.0.0.1", port: product.webPort, strictPort: true },
  });
  await server.listen();
  server.printUrls();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  await stop(1);
}
