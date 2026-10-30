import { readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import product from "../product.json" with { type: "json" };
const [source, destination] = process.argv.slice(2);
if (!source || !destination)
  throw new Error(
    "Usage: node scripts/convert-legacy.mjs input.json output.json",
  );
const raw = JSON.parse(readFileSync(source, "utf8"));
const original = Array.isArray(raw)
  ? raw
  : Array.isArray(raw.candidates)
    ? raw.candidates
    : null;
if (!original || original.length > 10000)
  throw new Error(
    "Choose a legacy array or Forma candidate envelope with at most 10,000 records.",
  );
const now = new Date().toISOString();
const records = original.map((record, index) => {
  if (!record || typeof record !== "object" || Array.isArray(record))
    throw new Error("Invalid record " + (index + 1));
  const id =
    typeof (record.id || record._id) === "string"
      ? record.id || record._id
      : randomUUID();
  const base = {
    id,
    createdAt: typeof record.createdAt === "string" ? record.createdAt : now,
    updatedAt: now,
  };
  if (product.kind === "candidate") {
    const { id, createdAt } = base;
    return {
      id,
      createdAt,
      name: record.name,
      email: record.email,
      phone: record.phone,
      skills: record.skills,
      jobTitle: record.jobTitle,
      experience: record.experience,
      status: record.status,
    };
  }
  if (product.kind === "note")
    return {
      ...base,
      title: record.title,
      body: record.body,
      tag: record.tag || "",
      pinned: record.pinned === true,
    };
  if (product.kind === "task") {
    if (
      ![true, false, "true", "false", "To do", "In progress", "Done"].includes(
        record.status,
      )
    )
      throw new Error("Review the status of legacy task " + (index + 1));
    return {
      ...base,
      title: record.title,
      description: record.description || "",
      priority: record.priority || "Normal",
      dueDate: record.dueDate || "",
      status:
        record.status === true || record.status === "true"
          ? "Done"
          : record.status === false || record.status === "false"
            ? "To do"
            : record.status,
    };
  }
  if (product.kind === "movie")
    return {
      ...base,
      title: record.title || record.name,
      year: record.year ?? null,
      rating: Number(record.rating ?? record.rank),
      genre: record.genre || "Other",
      status: record.status || "Watchlist",
      notes: record.notes || "",
    };
  if (product.kind === "order") {
    const amount = String(record.Amount ?? "");
    if (record.amountMinor === undefined && !/^\d+(\.\d{1,2})?$/.test(amount))
      throw new Error("Review the amount of legacy order " + (index + 1));
    const [whole, fraction = ""] = amount.split(".");
    return {
      ...base,
      name: record.name || record.Name,
      phone: String(record.phone ?? record.Phone ?? ""),
      date: record.date || record.Date,
      amountMinor:
        record.amountMinor ??
        Number(whole) * 100 + Number(fraction.padEnd(2, "0")),
    };
  }
  throw new Error("Unsupported project.");
});
writeFileSync(
  destination,
  JSON.stringify({ version: 1, product: product.id, records }, null, 2),
  { flag: "wx", mode: 0o600 },
);
console.log(
  "Converted " +
    records.length +
    " records. Review and import the file in the app. No original file was changed. Unknown creation dates use the conversion time; unknown movie release years remain blank.",
);
