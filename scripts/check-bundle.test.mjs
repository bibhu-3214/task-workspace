import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
const script = new URL("./check-bundle.mjs", import.meta.url).pathname;
function fixture(run) {
  const root = mkdtempSync(join(tmpdir(), "bundle-budget-"));
  try {
    writeFileSync(
      join(root, "bundle-budget.json"),
      JSON.stringify({ directory: "dist", initialScriptBytes: 20 }),
    );
    for (const [folder, length] of [
      ["dist", 10],
      ["output/public-web", 30],
    ]) {
      mkdirSync(join(root, folder, "assets"), { recursive: true });
      writeFileSync(
        join(root, folder, "index.html"),
        '<script src="/theme.js"></script><script type="module" src="/assets/entry.js"></script><link rel="modulepreload" href="/assets/entry.js">',
      );
      writeFileSync(join(root, folder, "theme.js"), "x");
      writeFileSync(join(root, folder, "assets/entry.js"), "a".repeat(length));
    }
    run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
test("counts theme scripts and static preloads once", () =>
  fixture((root) => {
    const result = spawnSync(process.execPath, [script], {
      cwd: root,
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).initialScriptBytes, 11);
  }));
test("an alternate production directory uses its own HTML and enforces the budget", () =>
  fixture((root) => {
    const result = spawnSync(process.execPath, [script, "output/public-web"], {
      cwd: root,
      encoding: "utf8",
    });
    assert.equal(result.status, 1);
    assert.equal(JSON.parse(result.stdout).initialScriptBytes, 31);
    assert.match(result.stderr, /budget exceeded/);
  }));
