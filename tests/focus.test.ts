import { expect, test } from "vitest";
import { inFocus, taskFocus } from "../src/features/work/focus";
import { taskSchema } from "../src/features/work/model";
const task = taskSchema.parse({
  id: "task",
  title: "Prepare",
  description: "",
  priority: "Normal",
  status: "To do",
  dueDate: "2026-10-31",
  createdAt: "2026-10-30T09:00:00Z",
  updatedAt: "2026-10-30T09:00:00Z",
});
test("date views distinguish open work from done, undated and future tasks", () => {
  expect(inFocus(task, "today", "2026-10-31")).toBe(true);
  expect(inFocus(task, "overdue", "2026-11-01")).toBe(true);
  expect(inFocus({ ...task, status: "Done" }, "today", "2026-10-31")).toBe(
    false,
  );
  expect(inFocus({ ...task, dueDate: "" }, "overdue", "2026-11-01")).toBe(
    false,
  );
  expect(
    inFocus({ ...task, dueDate: "2026-11-02" }, "overdue", "2026-11-01"),
  ).toBe(false);
  expect(inFocus({ ...task, status: "Done" }, "all", "2026-10-31")).toBe(true);
});
test("unsupported focus parameters recover to all tasks", () => {
  expect(taskFocus("other")).toBe("all");
  expect(taskFocus("today")).toBe("today");
});
