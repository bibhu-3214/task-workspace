import { expect, test, vi } from "vitest";
import { webcrypto } from "node:crypto";
import {
  taskSchema,
  parseBackup,
  validateWorkspace,
  type WorkRecord,
} from "../src/features/work/model";
import { reviewNotesImport } from "../src/features/notes/importNotes";
vi.stubGlobal("crypto", webcrypto);
const stamp = {
  createdAt: "2026-10-30T09:00:00.000Z",
  updatedAt: "2026-10-30T09:00:00.000Z",
};
const project = {
  ...stamp,
  id: "project",
  recordType: "project" as const,
  name: "Launch",
  description: "",
};
const task = {
  ...stamp,
  id: "task",
  title: "Review",
  description: "",
  priority: "Normal" as const,
  dueDate: "",
  status: "To do" as const,
};
const source = {
  version: 1,
  product: "notes-workspace",
  records: [
    {
      ...stamp,
      id: "note1",
      title: "Private note",
      body: "  Preserve this body\n  with indentation  ",
      tag: "Ideas",
      pinned: true,
    },
  ],
};
test("legacy tasks survive new backups; linked projects are validated", () => {
  expect(
    parseBackup({ version: 1, product: "taskbox", records: [task] }),
  ).toEqual([task]);
  const mixed: WorkRecord[] = [project, { ...task, projectId: "project" }];
  expect(
    parseBackup({ version: 2, product: "task-workspace", records: mixed }),
  ).toEqual(mixed);
  expect(() => validateWorkspace([{ ...task, projectId: "missing" }])).toThrow(
    "missing",
  );
  expect(() =>
    parseBackup({
      version: 2,
      product: "task-workspace",
      records: [task, task],
    }),
  ).toThrow();
  expect(taskSchema.safeParse({ ...task, dueDate: "2026-02-30" }).success).toBe(
    false,
  );
});
test("notes import retains contents and timestamps, skips repeats and preserves subsequent edits", async () => {
  const first = await reviewNotesImport(source, [project], "project");
  expect(first).toMatchObject({ duplicates: 0, sourceCount: 1 });
  expect(first.notes[0]).toMatchObject({
    ...source.records[0],
    id: expect.stringMatching(/^import-note-/),
    projectId: "project",
    recordType: "note",
  });
  const edited = { ...first.notes[0], body: "Edited in Task Workspace" };
  const again = await reviewNotesImport(
    {
      ...source,
      records: [{ ...source.records[0], body: "Changed at source" }],
    },
    [project, edited],
    "",
  );
  expect(again).toEqual({ notes: [], duplicates: 1, sourceCount: 1 });
  expect(edited.body).toBe("Edited in Task Workspace");
});
test("notes import rejects wrong products, duplicates, malformed notes and cross-domain ID collisions", async () => {
  await expect(
    reviewNotesImport({ ...source, product: "film-journal" }, [], ""),
  ).rejects.toThrow();
  await expect(
    reviewNotesImport(
      { ...source, records: [...source.records, ...source.records] },
      [],
      "",
    ),
  ).rejects.toThrow();
  await expect(
    reviewNotesImport(
      { ...source, records: [{ ...source.records[0], body: "" }] },
      [],
      "",
    ),
  ).rejects.toThrow();
  const result = await reviewNotesImport(source, [], "");
  await expect(
    reviewNotesImport(source, [{ ...task, id: result.notes[0].id }], ""),
  ).rejects.toThrow("conflicts");
});
