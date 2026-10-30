import { expect, test } from "vitest";
import { z } from "zod";
import product from "../product.json";
import { parseWorkspaceBackup } from "../src/platform/workspaceBackup";
import { readFileSync } from "node:fs";
const schema = z.object({ id: z.string(), title: z.string() }).strict();
const records = [{ id: "preserved-record", title: "Existing private work" }];

test("the renamed project accepts both new and previous export identities", () => {
  for (const name of [product.id, ...product.legacyProductIds])
    expect(
      parseWorkspaceBackup({ version: 1, product: name, records }, schema),
    ).toEqual(records);
  expect(() =>
    parseWorkspaceBackup(
      { version: 1, product: "other-application", records },
      schema,
    ),
  ).toThrow();
});

test("renamed imports still reject duplicate IDs and invalid records", () => {
  expect(() =>
    parseWorkspaceBackup(
      {
        version: 1,
        product: product.legacyProductIds[0],
        records: [...records, ...records],
      },
      schema,
    ),
  ).toThrow();
  expect(() =>
    parseWorkspaceBackup(
      {
        version: 1,
        product: product.id,
        records: [{ id: "a", unsupported: true }],
      },
      schema,
    ),
  ).toThrow();
});

test("the pre-paint theme uses the same persisted appearance namespace", () => {
  const source = readFileSync("public/theme-init.js", "utf8");
  expect(source).toContain(product.storageNamespace + ".appearance");
  expect(product.legacyProductIds).toContain(product.storageNamespace);
});
