import { useRef, useState } from "react";
import { Plus } from "lucide-react";
import { Button, Input } from "../../platform/ui";
import DraftNotice from "../../platform/DraftNotice";
import { useBeforeUnload, useTabDraft } from "../../platform/useTabDraft";
import type { TaskFocus } from "./focus";
export default function TaskFocusTools({
  owner,
  focus,
  onFocus,
  counts,
  busy,
  onCreate,
}: {
  owner: string;
  focus: TaskFocus;
  onFocus: (focus: TaskFocus) => void;
  counts: Record<TaskFocus, number>;
  busy: boolean;
  onCreate: (title: string) => Promise<boolean>;
}) {
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const pending = useRef(false);
  const drafts = useTabDraft(owner + ":quick-task", ["title"], ["quick-task"]);
  useBeforeUnload(Boolean(title.trim()));
  return (
    <section
      aria-label="Task focus and quick add"
      className="mt-6 grid gap-4 rounded-2xl border border-line bg-surface p-4 sm:p-5"
    >
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Task focus"
      >
        {(
          [
            ["all", "All tasks"],
            ["today", "Due today"],
            ["overdue", "Overdue"],
          ] as const
        ).map(([value, label]) => (
          <Button
            key={value}
            tone={focus === value ? "primary" : "quiet"}
            aria-pressed={focus === value}
            onClick={() => onFocus(value)}
          >
            {label}
            <span className="rounded-md bg-current/10 px-1.5 text-xs tabular-nums">
              {counts[value]}
            </span>
          </Button>
        ))}
      </div>
      {drafts.draft && !title && (
        <DraftNotice
          onRestore={() => setTitle(drafts.draft?.values.title || "")}
          onDiscard={drafts.clear}
        />
      )}
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={async (event) => {
          event.preventDefault();
          if (busy || pending.current || !title.trim()) return;
          pending.current = true;
          setSaving(true);
          try {
            if (await onCreate(title.trim())) {
              setTitle("");
              drafts.clear();
            }
          } finally {
            pending.current = false;
            setSaving(false);
          }
        }}
        onChange={(event) => {
          if (
            String(new FormData(event.currentTarget).get("title") || "").trim()
          )
            drafts.capture(event.currentTarget, { kind: "quick-task" });
          else drafts.clear();
        }}
      >
        <label className="grid min-w-48 flex-1 gap-2 text-sm font-medium">
          Quick task
          <Input
            name="title"
            aria-label="Quick task title"
            placeholder="What needs to happen next?"
            value={title}
            maxLength={200}
            required
            disabled={busy || saving || Boolean(drafts.draft && !title)}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        <Button type="submit" disabled={busy || saving || !title.trim()}>
          <Plus size={16} />
          {saving ? "Adding…" : "Quick add"}
        </Button>
      </form>
      <p className="text-xs leading-5 text-muted">
        Enter adds to your current project. In a date-focused view, the new task
        is due today.
      </p>
      {drafts.storageError && (
        <p role="status" className="text-xs text-danger">
          {drafts.storageError}
        </p>
      )}
    </section>
  );
}
