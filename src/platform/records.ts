import { z } from "zod";
const stamp = z.iso.datetime({ offset: true });
const core = {
  id: z.string().min(1).max(80),
  createdAt: stamp,
  updatedAt: stamp,
};
const title = z.string().trim().min(1, "Enter a title.").max(160);
const calendar = z.string().refine((value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number),
    date = new Date(0);
  date.setFullYear(y, m - 1, d);
  return (
    y >= 1 &&
    date.getFullYear() === y &&
    date.getMonth() === m - 1 &&
    date.getDate() === d
  );
}, "Choose a real date.");
export const noteSchema = z
  .object({
    ...core,
    title,
    body: z.string().trim().min(1, "Add some text.").max(20000),
    tag: z.string().trim().max(40),
    pinned: z.boolean(),
  })
  .strict();
export const taskSchema = z
  .object({
    ...core,
    title: title.max(200),
    description: z.string().max(2000),
    priority: z.enum(["Low", "Normal", "High"]),
    dueDate: z.union([z.literal(""), calendar]),
    status: z.enum(["To do", "In progress", "Done"]),
  })
  .strict();
export const movieSchema = z
  .object({
    ...core,
    title,
    year: z.number().int().min(1888).max(2200).nullable(),
    rating: z.number().min(0).max(10),
    genre: z.enum([
      "Drama",
      "Comedy",
      "Thriller",
      "Animation",
      "Documentary",
      "Other",
    ]),
    status: z.enum(["Watchlist", "Watched"]),
    notes: z.string().max(2000),
  })
  .strict();
export const orderSchema = z
  .object({
    ...core,
    name: z.string().trim().min(2).max(100),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[\d ()-]{7,25}$/, "Enter a valid phone number.")
      .refine((value) => {
        const count = value.replace(/\D/g, "").length;
        return count >= 7 && count <= 15;
      }, "Use 7 to 15 digits."),
    date: calendar,
    amountMinor: z.number().int().min(1).max(100_000_000_000),
  })
  .strict();
export const recordSchema = z.union([
  noteSchema,
  taskSchema,
  movieSchema,
  orderSchema,
]);
export type WorkspaceRecord = z.infer<typeof recordSchema>;
export const kindSchema = z.enum(["note", "task", "movie", "order"]);
export type Kind = z.infer<typeof kindSchema>;
export const schemas = {
  note: noteSchema,
  task: taskSchema,
  movie: movieSchema,
  order: orderSchema,
};
export function recordTitle(record: WorkspaceRecord) {
  return "title" in record ? record.title : record.name;
}
export function recordStatus(record: WorkspaceRecord) {
  return "status" in record
    ? record.status
    : "pinned" in record
      ? record.pinned
        ? "Pinned"
        : "Notes"
      : "Order";
}
export function today() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function amount(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value / 100);
}
export function normalizedPhone(value: string) {
  return value.replace(/[ ()-]/g, "");
}
export function orderSummary(records: readonly WorkspaceRecord[]) {
  const orders = records.filter(
    (r): r is z.infer<typeof orderSchema> => "amountMinor" in r,
  );
  const customers = new Map<
    string,
    { name: string; phone: string; count: number; total: number }
  >();
  for (const order of orders) {
    const phone = normalizedPhone(order.phone),
      existing = customers.get(phone) || {
        name: order.name,
        phone,
        count: 0,
        total: 0,
      };
    customers.set(phone, {
      ...existing,
      count: existing.count + 1,
      total: existing.total + order.amountMinor,
    });
  }
  return {
    count: orders.length,
    total: orders.reduce((sum, r) => sum + r.amountMinor, 0),
    customers: [...customers.values()].sort((a, b) => b.total - a.total),
  };
}
export function csvCell(value: string | number) {
  const text = String(value);
  return (
    '"' +
    (/^[\s]*[=+\-@]/.test(text) ? "'" + text : text).replaceAll('"', '""') +
    '"'
  );
}
export interface Field {
  key: string;
  label: string;
  type?: "text" | "number" | "date" | "tel" | "textarea";
  required?: boolean;
  options?: readonly string[];
  maxLength?: number;
  min?: number;
  max?: number;
  step?: number;
  defaultValue?: string | number;
}
export const fields: Record<Kind, readonly Field[]> = {
  note: [
    { key: "title", label: "Title", required: true, maxLength: 160 },
    { key: "tag", label: "Tag", maxLength: 40 },
    {
      key: "body",
      label: "Note",
      type: "textarea",
      required: true,
      maxLength: 20000,
    },
  ],
  task: [
    { key: "title", label: "Task title", required: true, maxLength: 200 },
    {
      key: "description",
      label: "Description",
      type: "textarea",
      maxLength: 2000,
    },
    {
      key: "priority",
      label: "Priority",
      options: ["Low", "Normal", "High"],
      defaultValue: "Normal",
    },
    { key: "dueDate", label: "Due date", type: "date" },
    {
      key: "status",
      label: "Status",
      options: ["To do", "In progress", "Done"],
      defaultValue: "To do",
    },
  ],
  movie: [
    { key: "title", label: "Movie title", required: true, maxLength: 160 },
    {
      key: "year",
      label: "Release year (optional)",
      type: "number",
      min: 1888,
      max: 2200,
      step: 1,
    },
    {
      key: "rating",
      label: "Your rating (0–10)",
      type: "number",
      required: true,
      min: 0,
      max: 10,
      step: 0.1,
      defaultValue: 0,
    },
    {
      key: "genre",
      label: "Genre",
      options: [
        "Drama",
        "Comedy",
        "Thriller",
        "Animation",
        "Documentary",
        "Other",
      ],
      defaultValue: "Drama",
    },
    {
      key: "status",
      label: "Status",
      options: ["Watchlist", "Watched"],
      defaultValue: "Watchlist",
    },
    { key: "notes", label: "Your review", type: "textarea", maxLength: 2000 },
  ],
  order: [
    { key: "name", label: "Customer name", required: true, maxLength: 100 },
    {
      key: "phone",
      label: "Phone number",
      type: "tel",
      required: true,
      maxLength: 25,
    },
    {
      key: "date",
      label: "Order date",
      type: "date",
      required: true,
      defaultValue: today(),
    },
    {
      key: "amount",
      label: "Amount (₹)",
      type: "number",
      required: true,
      min: 0.01,
      max: 1_000_000_000,
      step: 0.01,
    },
  ],
};
export function fromForm(
  kind: Kind,
  data: FormData,
  previous?: WorkspaceRecord,
): WorkspaceRecord {
  const now = new Date().toISOString(),
    base = {
      id: previous?.id || crypto.randomUUID(),
      createdAt: previous?.createdAt || now,
      updatedAt: now,
    },
    values = Object.fromEntries(data);
  switch (kind) {
    case "note":
      return noteSchema.parse({
        ...base,
        ...values,
        pinned: previous && "pinned" in previous ? previous.pinned : false,
      });
    case "task":
      return taskSchema.parse({ ...base, ...values });
    case "movie":
      return movieSchema.parse({
        ...base,
        ...values,
        year: String(values.year || "").trim() ? Number(values.year) : null,
        rating: Number(values.rating),
      });
    case "order": {
      const raw = String(values.amount || "");
      if (!/^\d+(\.\d{1,2})?$/.test(raw))
        throw new Error("Enter an amount with up to two decimal places.");
      const [whole, fraction = ""] = raw.split(".");
      return orderSchema.parse({
        ...base,
        name: values.name,
        phone: values.phone,
        date: values.date,
        amountMinor: Number(whole) * 100 + Number(fraction.padEnd(2, "0")),
      });
    }
  }
}
