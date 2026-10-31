import type { Task } from "./model";
export type TaskFocus = "all" | "today" | "overdue";
export function taskFocus(value: string | null): TaskFocus {
  return value === "today" || value === "overdue" ? value : "all";
}
export function inFocus(task: Task, focus: TaskFocus, today: string): boolean {
  if (focus === "all") return true;
  if (task.status === "Done" || !task.dueDate) return false;
  return focus === "today" ? task.dueDate === today : task.dueDate < today;
}
