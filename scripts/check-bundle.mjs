import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { gzipSync } from "node:zlib";
const root = process.cwd();
const config = JSON.parse(
  readFileSync(resolve(root, "bundle-budget.json"), "utf8"),
);
const directory = process.argv[2] || config.directory;
if (directory.startsWith("/") || directory.includes(".."))
  throw new Error("Use a relative build directory inside the project.");
const html = readFileSync(resolve(root, directory, "index.html"), "utf8");
const files = [
  ...new Set(
    [
      ...html.matchAll(
        /<(?:script|link)\b[^>]*(?:src|href)=["']([^"']+\.js)["'][^>]*>/g,
      ),
    ].map((match) => match[1]),
  ),
];
if (!files.length)
  throw new Error(
    "No production entry scripts found. Run npm run build first.",
  );
let bytes = 0,
  gzipBytes = 0;
for (const file of files) {
  if (!file.startsWith("/") || file.includes(".."))
    throw new Error("Unexpected production script path.");
  const path = resolve(root, directory, file.slice(1));
  bytes += statSync(path).size;
  gzipBytes += gzipSync(readFileSync(path)).length;
}
console.log(
  JSON.stringify(
    {
      initialScriptBytes: bytes,
      gzipBytes,
      budgetBytes: config.initialScriptBytes,
      files,
    },
    null,
    2,
  ),
);
if (bytes > config.initialScriptBytes)
  throw new Error(
    "Initial JavaScript budget exceeded. Review the import graph before increasing the budget.",
  );
