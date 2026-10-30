import { z } from "zod";
const stamp = z.iso.datetime({ offset: true });
const id = z.string().regex(/^[A-Za-z0-9_-]{1,80}$/);
const common = {
  id,
  createdAt: stamp,
  updatedAt: stamp,
  projectId: z.string().max(80).optional(),
};
const calendar = z.string().refine((value) => {
  if (value === "") return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  return (
    year > 0 &&
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}, "Choose a real date.");
export const taskSchema = z
  .object({
    ...common,
    recordType: z.literal("task").optional(),
    title: z.string().trim().min(1).max(200),
    description: z.string().max(2000),
    priority: z.enum(["Low", "Normal", "High"]),
    dueDate: calendar,
    status: z.enum(["To do", "In progress", "Done"]),
  })
  .strict();
export const noteSchema = z
  .object({
    ...common,
    recordType: z.literal("note").optional(),
    title: z.string().trim().min(1).max(160),
    body: z.string().min(1).max(20000).refine(value => Boolean(value.trim()), 'Enter a note.'),
    tag: z.string().trim().max(40),
    pinned: z.boolean(),
  })
  .strict();
export const projectSchema = z
  .object({
    id,
    recordType: z.literal("project"),
    name: z.string().trim().min(2).max(80),
    description: z.string().max(1000),
    createdAt: stamp,
    updatedAt: stamp,
  })
  .strict();
export const workRecordSchema = z.union([
  taskSchema,
  noteSchema,
  projectSchema,
]);
export type Task = z.infer<typeof taskSchema>;
export type Note = z.infer<typeof noteSchema>;
export type Project = z.infer<typeof projectSchema>;
export type WorkRecord = z.infer<typeof workRecordSchema>;
export const isTask = (record: WorkRecord): record is Task =>
  "status" in record;
export const isNote = (record: WorkRecord): record is Note => "body" in record;
export const isProject = (record: WorkRecord): record is Project =>
  record.recordType === "project";
export function validateWorkspace(records: WorkRecord[]) {
  if (records.length > 10000)
    throw new Error("A workspace supports up to 10,000 records.");
  if (new Set(records.map((record) => record.id)).size !== records.length)
    throw new Error("The file contains duplicate IDs.");
  const projects = new Set(
    records.filter(isProject).map((project) => project.id),
  );
  if (
    records.some(
      (record) =>
        "projectId" in record &&
        record.projectId &&
        !projects.has(record.projectId),
    )
  )
    throw new Error("A linked project is missing.");
  return records;
}
export function parseBackup(raw: unknown) {
  const saved = z
    .object({
      version: z.union([z.literal(1), z.literal(2)]),
      product: z.enum(["task-workspace", "taskbox"]),
      records: z.array(workRecordSchema).max(10000),
    })
    .strict()
    .parse(raw);
  return validateWorkspace(saved.records);
}
export function stampRecord() {
  const now = new Date().toISOString();
  return { id: crypto.randomUUID(), createdAt: now, updatedAt: now };
}
export function localToday() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
