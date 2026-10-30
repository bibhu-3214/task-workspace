import { z } from "zod";
import product from "../../product.json";

export function parseWorkspaceBackup<T extends { id: string }>(
  raw: unknown,
  schema: z.ZodType<T>,
) {
  const envelope = z
    .object({
      version: z.literal(1),
      product: z.string(),
      records: z.array(schema).max(10000),
    })
    .strict()
    .parse(raw);
  if (![product.id, ...product.legacyProductIds].includes(envelope.product))
    throw new Error("Choose an export from this application.");
  if (
    new Set(envelope.records.map((record) => record.id)).size !==
    envelope.records.length
  )
    throw new Error("The file contains duplicate IDs.");
  return envelope.records;
}
