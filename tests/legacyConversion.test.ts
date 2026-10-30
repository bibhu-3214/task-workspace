import { test, expect } from "vitest";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { z } from "zod";
import product from "../product.json";
import { recordSchema } from "../src/platform/workspaceRecords";

test("explicit legacy conversion preserves records and refuses overwrites", () => {
  const folder = mkdtempSync(join(tmpdir(), "workspace-conversion-"));
  try {
    const input = join(folder, "legacy.json"),
      output = join(folder, "converted.json");
    const original = JSON.stringify([
      { _id: "legacy-1", title: "Legacy task", status: false },
    ]);
    writeFileSync(input, original);
    const convert = () =>
      spawnSync(
        process.execPath,
        ["scripts/convert-legacy-data.mjs", input, output],
        { encoding: "utf8" },
      );
    const result = convert();
    expect(result.status, result.stderr).toBe(0);
    const raw: unknown = JSON.parse(readFileSync(output, "utf8"));
    const parsed = z
      .object({
        version: z.literal(1),
        product: z.literal(product.id),
        records: z.array(recordSchema),
      })
      .strict()
      .parse(raw);
    expect(parsed.records).toHaveLength(1);
    const record = parsed.records[0];
    expect("status" in record && record.status).toBe("To do");
    const saved = readFileSync(output, "utf8");
    expect(convert().status).not.toBe(0);
    expect(readFileSync(input, "utf8")).toBe(original);
    expect(readFileSync(output, "utf8")).toBe(saved);
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});
