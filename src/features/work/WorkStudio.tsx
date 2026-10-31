import TaskFocusTools from "./TaskFocusTools";
import { inFocus, taskFocus, type TaskFocus } from "./focus";
import DraftNotice from "../../platform/DraftNotice";
import {
  useTabDraft,
  useBeforeUnload,
  type TabDraft,
} from "../../platform/useTabDraft";
import EmptyState from "../../platform/EmptyState";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import {
  BookOpen,
  Check,
  ClipboardList,
  Download,
  FolderKanban,
  Moon,
  Pencil,
  Pin,
  Plus,
  Search,
  Sun,
  Trash2,
  Upload,
} from "lucide-react";
import type { WorkspaceState } from "../../platform/AccountWorkspaceGate";
import { Button, Dropdown, Input, Modal, Textarea } from "../../platform/ui";
import DateInput from "../../platform/DateInput";
import { message } from "../../platform/workspaceApi";
import product from "../../../product.json";
import {
  isNote,
  isProject,
  isTask,
  localToday,
  noteSchema,
  parseBackup,
  projectSchema,
  stampRecord,
  taskSchema,
  validateWorkspace,
  type Note,
  type Project,
  type Task,
  type WorkRecord,
} from "./model";
import { reviewNotesImport, type NotesImport } from "../notes/importNotes";

type Editor =
  | { kind: "task"; record?: Task }
  | { kind: "note"; record?: Note }
  | { kind: "project"; record?: Project };
const statuses = ["To do", "In progress", "Done"] as const;
const fieldLabel = "grid min-w-0 gap-2 text-sm font-medium";
function download(records: WorkRecord[]) {
  const url = URL.createObjectURL(
    new Blob(
      [JSON.stringify({ version: 2, product: product.id, records }, null, 2)],
      { type: "application/json" },
    ),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "task-workspace-backup.json";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function WorkStudio({
  state,
}: {
  state: WorkspaceState<WorkRecord>;
}) {
  const drafts = useTabDraft(
    String(state.account.id),
    [
      "name",
      "title",
      "description",
      "body",
      "tag",
      "projectId",
      "priority",
      "status",
      "dueDate",
    ],
    ["task", "note", "project"],
  );
  const [recovered, setRecovered] = useState<TabDraft | null>(null);
  const editorForm = useRef<HTMLFormElement>(null);
  const [params, setParams] = useSearchParams();
  const view =
    params.get("view") === "notes"
      ? "notes"
      : params.get("view") === "projects"
        ? "projects"
        : "board";
  const focus = taskFocus(params.get("focus"));
  const [day, setDay] = useState(localToday);
  useEffect(() => {
    const refresh = () => setDay(localToday());
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  function changeFocus(next: TaskFocus) {
    setParams((previous) => {
      const query = new URLSearchParams(previous);
      if (next === "all") query.delete("focus");
      else query.set("focus", next);
      return query;
    });
  }
  const main = useRef<HTMLElement>(null);
  useEffect(() => {
    const titles = {
      board: "Task board",
      notes: "Project notes",
      projects: "Projects",
    };
    document.title = `${titles[view]} · ${product.title}`;
    main.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [view]);
  const [query, setQuery] = useState(""),
    [project, setProject] = useState("all");
  const [editor, setEditor] = useState<Editor | null>(null),
    [dirty, setDirty] = useState(false),
    [discard, setDiscard] = useState(false);
  const [remove, setRemove] = useState<WorkRecord | null>(null),
    [reading, setReading] = useState<Note | null>(null);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [imported, setImported] = useState<NotesImport | null>(null),
    [notesSource, setNotesSource] = useState<unknown>(null),
    [importProject, setImportProject] = useState("inbox");
  const [restore, setRestore] = useState<WorkRecord[] | null>(null);
  const [dark, setDark] = useState(
    () => document.documentElement.dataset.theme === "dark",
  );
  const notesFile = useRef<HTMLInputElement>(null),
    backupFile = useRef<HTMLInputElement>(null);
  const projects = state.records.filter(isProject),
    tasks = state.records.filter(isTask),
    notes = state.records.filter(isNote);
  const projectOptions = [
    { value: "inbox", label: "Inbox" },
    ...projects.map((item) => ({ value: item.id, label: item.name })),
  ];
  const projectName = (id?: string) =>
    projects.find((item) => item.id === id)?.name || "Inbox";
  const matches = (record: Task | Note) =>
    (project === "all" || (record.projectId || "inbox") === project) &&
    (
      record.title +
      " " +
      ("body" in record ? record.body + " " + record.tag : record.description)
    )
      .toLowerCase()
      .includes(query.toLowerCase().trim());
  const shownProjects = projects.filter(
    (item) =>
      (project === "all" || project === "inbox" || item.id === project) &&
      (item.name + " " + item.description)
        .toLowerCase()
        .includes(query.toLowerCase().trim()),
  );
  const clearFilters = () => {
    setQuery("");
    setProject("all");
    changeFocus("all");
  };
  const shownTasks = tasks.filter(
      (task) => matches(task) && inFocus(task, focus, day),
    ),
    shownNotes = notes
      .filter(matches)
      .sort(
        (a, b) =>
          Number(b.pinned) - Number(a.pinned) ||
          b.updatedAt.localeCompare(a.updatedAt),
      );
  function navigate(next: string) {
    setParams({ view: next });
    setQuery("");
    setError("");
  }
  function open(next: Editor) {
    if (drafts.draft) {
      setError(
        "Recover or discard your unfinished draft before starting another entry.",
      );
      return;
    }
    setRecovered(null);
    setEditor(next);
    setDirty(false);
    setError("");
  }
  useBeforeUnload(dirty);
  function changed() {
    setDirty(true);
    // Radix updates its hidden form controls after the value callback.
    queueMicrotask(() => {
      if (editorForm.current && editor)
        drafts.capture(editorForm.current, {
          kind: editor.kind,
          ...(editor.record
            ? {
                recordId: editor.record.id,
                base: JSON.stringify(editor.record),
              }
            : {}),
        });
    });
  }
  function recoverDraft() {
    const draft = drafts.draft;
    if (!draft) return;
    let record = draft.recordId
      ? state.records.find((item) => item.id === draft.recordId)
      : undefined;
    const stale = Boolean(
      draft.recordId && (!record || JSON.stringify(record) !== draft.base),
    );
    if (stale) record = undefined;
    if (draft.kind === "task" && (!record || isTask(record)))
      setEditor({ kind: "task", record });
    else if (draft.kind === "note" && (!record || isNote(record)))
      setEditor({ kind: "note", record });
    else if (draft.kind === "project" && (!record || isProject(record)))
      setEditor({ kind: "project", record });
    else return;
    const values = { ...draft.values };
    if (
      values.projectId &&
      values.projectId !== "inbox" &&
      !projects.some((project) => project.id === values.projectId)
    ) {
      values.projectId = "inbox";
    }
    setRecovered({ ...draft, values });
    setDirty(true);
    setError(
      stale
        ? "The original entry changed or was removed. This draft is recovered as a new entry; review it before saving."
        : "",
    );
  }
  function close() {
    if (state.busy) return;
    if (dirty) setDiscard(true);
    else setEditor(null);
  }
  async function save(records: WorkRecord[], success: string) {
    setError("");
    try {
      await state.save(validateWorkspace(records));
      setNotice(success);
      return true;
    } catch (failure) {
      setError(message(failure));
      return false;
    }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editor) return;
    const values = new FormData(event.currentTarget),
      previous = editor.record;
    const common = {
      ...(previous || stampRecord()),
      updatedAt: new Date().toISOString(),
    };
    const projectId = String(values.get("projectId") || "inbox");
    try {
      const next =
        editor.kind === "project"
          ? projectSchema.parse({
              ...common,
              recordType: "project",
              name: values.get("name"),
              description: values.get("description"),
            })
          : editor.kind === "note"
            ? noteSchema.parse({
                ...common,
                recordType: "note",
                projectId: projectId === "inbox" ? "" : projectId,
                title: values.get("title"),
                body: values.get("body"),
                tag: values.get("tag"),
                pinned: editor.record?.pinned || false,
              })
            : taskSchema.parse({
                ...common,
                recordType: "task",
                projectId: projectId === "inbox" ? "" : projectId,
                title: values.get("title"),
                description: values.get("description"),
                priority: values.get("priority"),
                dueDate: values.get("dueDate"),
                status: values.get("status"),
              });
      const records = previous
        ? state.records.map((record) =>
            record.id === previous.id ? next : record,
          )
        : [...state.records, next];
      if (
        await save(
          records,
          previous
            ? "Changes saved."
            : editor.kind === "project"
              ? "Project created."
              : editor.kind === "note"
                ? "Note saved."
                : "Task added.",
        )
      ) {
        drafts.clear();
        setRecovered(null);
        setEditor(null);
        setDirty(false);
      }
    } catch (failure) {
      setError(message(failure));
    }
  }
  async function readFile(input: HTMLInputElement, kind: "notes" | "backup") {
    const file = input.files?.[0];
    if (!file) return;
    try {
      if (file.size > 1_500_000)
        throw new Error("Choose a JSON file under 1.5 MB.");
      const raw: unknown = JSON.parse(await file.text());
      setError("");
      if (kind === "backup") setRestore(parseBackup(raw));
      else {
        setNotesSource(raw);
        setImportProject("inbox");
        setImported(await reviewNotesImport(raw, state.records, ""));
      }
    } catch (failure) {
      setError(message(failure));
    } finally {
      input.value = "";
    }
  }
  async function changeImportProject(value: string) {
    try {
      setImportProject(value);
      setImported(
        await reviewNotesImport(
          notesSource,
          state.records,
          value === "inbox" ? "" : value,
        ),
      );
    } catch (failure) {
      setError(message(failure));
    }
  }
  const currentTask = editor?.kind === "task" ? editor.record : undefined;
  const currentNote = editor?.kind === "note" ? editor.record : undefined;
  const currentProject = editor?.kind === "project" ? editor.record : undefined;
  const noun = editor?.kind || "task";
  return (
    <div className="min-h-[calc(100dvh-48px)] bg-canvas text-ink">
      <a
        href="#work-main"
        className="sr-only z-50 rounded-lg bg-ink p-3 text-canvas focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <aside className="border-b border-line bg-surface px-5 py-5 lg:fixed lg:top-12 lg:bottom-0 lg:w-64 lg:border-r lg:border-b-0 lg:px-6 lg:py-8">
        <a
          href="/"
          className="flex items-center gap-3 text-xl font-semibold tracking-tight"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-white dark:text-slate-950">
            <FolderKanban size={22} />
          </span>
          <span>Task Workspace</span>
        </a>
        <p className="mt-4 hidden text-xs leading-6 text-muted lg:block">
          Projects, tasks and the thinking behind them.
        </p>
        <nav
          aria-label="Workspace navigation"
          className="mt-6 grid grid-cols-3 gap-1 lg:grid-cols-1 lg:gap-2"
        >
          {[
            ["board", "Task board", ClipboardList],
            ["notes", "Project notes", BookOpen],
            ["projects", "Projects", FolderKanban],
          ].map(([key, label, Icon]) => {
            const Component = Icon as typeof ClipboardList;
            return (
              <button
                key={String(key)}
                type="button"
                aria-current={view === key ? "page" : undefined}
                aria-label={String(label)}
                onClick={() => navigate(String(key))}
                className={`flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-xl px-2 py-3 text-xs font-medium lg:justify-start lg:gap-3 lg:px-4 lg:text-sm ${view === key ? "bg-soft text-primary" : "text-muted hover:bg-soft"}`}
              >
                <Component size={18} aria-hidden="true" className="shrink-0" />
                {key === "notes" ? (
                  <>
                    <span className="lg:hidden">Notes</span>
                    <span className="hidden lg:inline">Project notes</span>
                  </>
                ) : (
                  <span>{String(label)}</span>
                )}
              </button>
            );
          })}
        </nav>
        <div className="mt-10 hidden border-t border-line pt-5 text-xs leading-6 text-muted lg:block">
          <strong className="block text-ink">Your private workspace</strong>
          <p className="mt-2">
            Tasks and notes stay together. Import a saved Notes Workspace JSON
            export to bring existing notes into your projects.
          </p>
        </div>
      </aside>
      <main
        id="work-main"
        ref={main}
        tabIndex={-1}
        className="mx-auto max-w-[1700px] p-4 outline-none sm:p-8 lg:ml-64 lg:p-10"
      >
        {drafts.draft && !editor && (
          <DraftNotice onRestore={recoverDraft} onDiscard={drafts.clear} />
        )}

        <header className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-[10px] font-semibold tracking-[.18em] text-primary uppercase">
              Work, with context
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              {view === "board"
                ? "A clear plan for what comes next."
                : view === "notes"
                  ? "Ideas belong beside the work."
                  : "Give your work a home."}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-7 text-muted">
              {view === "board"
                ? "Move tasks through your workflow and keep the details close."
                : view === "notes"
                  ? "Read, pin and organise the notes linked to your projects."
                  : "Bring related tasks and notes into focused projects."}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              tone="quiet"
              aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
              onClick={() => {
                const next = !dark;
                setDark(next);
                document.documentElement.dataset.theme = next
                  ? "dark"
                  : "light";
                try {
                  localStorage.setItem(
                    product.storageNamespace + ".appearance",
                    next ? "dark" : "light",
                  );
                } catch {
                  /* Appearance remains available for this visit. */
                }
              }}
            >
              {dark ? <Sun size={17} /> : <Moon size={17} />}
            </Button>
            <Button
              disabled={state.busy}
              onClick={() =>
                open({
                  kind:
                    view === "notes"
                      ? "note"
                      : view === "projects"
                        ? "project"
                        : "task",
                })
              }
            >
              <Plus size={17} />
              {view === "notes"
                ? "Add note"
                : view === "projects"
                  ? "New project"
                  : "Add task"}
            </Button>
          </div>
        </header>
        {notice && (
          <p
            role="status"
            className="mt-5 rounded-xl bg-success/10 p-3 text-sm text-success"
          >
            {notice}
          </p>
        )}
        {error && !editor && (
          <p
            role="alert"
            className="mt-5 rounded-xl bg-danger/10 p-3 text-sm text-danger"
          >
            {error}
          </p>
        )}
        <section
          aria-label="Workspace tools"
          className="mt-8 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface p-4"
        >
          <div className="relative min-w-48 flex-1">
            <Search
              size={17}
              className="pointer-events-none absolute top-3.5 left-3 text-muted"
            />
            <Input
              type="search"
              aria-label="Search work"
              placeholder={
                view === "notes"
                  ? "Search notes and tags"
                  : view === "projects"
                    ? "Search projects"
                    : "Search tasks"
              }
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="pl-10"
            />
          </div>
          <div className="min-w-44">
            <Dropdown
              label="Filter by project"
              value={
                view === "projects" && project === "inbox" ? "all" : project
              }
              onChange={setProject}
              options={[
                { value: "all", label: "All projects" },
                ...(view === "projects"
                  ? projectOptions.filter((item) => item.value !== "inbox")
                  : projectOptions),
              ]}
            />
          </div>
          <Button
            tone="quiet"
            disabled={state.busy}
            onClick={() => notesFile.current?.click()}
          >
            <Upload size={15} />
            Import notes
          </Button>
          <Button
            tone="quiet"
            disabled={state.busy}
            onClick={() => download(state.records)}
          >
            <Download size={15} />
            Export JSON
          </Button>
          <Button
            tone="quiet"
            disabled={state.busy}
            onClick={() => backupFile.current?.click()}
          >
            Restore backup
          </Button>
          <input
            ref={notesFile}
            type="file"
            accept=".json,application/json"
            aria-label="Import Notes Workspace JSON"
            className="sr-only"
            onChange={(event) => void readFile(event.currentTarget, "notes")}
          />
          <input
            ref={backupFile}
            type="file"
            accept=".json,application/json"
            aria-label="Restore workspace JSON"
            className="sr-only"
            onChange={(event) => void readFile(event.currentTarget, "backup")}
          />
        </section>
        {view === "board" && (
          <>
            <TaskFocusTools
              owner={String(state.account.id)}
              focus={focus}
              onFocus={changeFocus}
              counts={{
                all: tasks.filter(matches).length,
                today: tasks.filter(
                  (task) => matches(task) && inFocus(task, "today", day),
                ).length,
                overdue: tasks.filter(
                  (task) => matches(task) && inFocus(task, "overdue", day),
                ).length,
              }}
              busy={state.busy}
              onCreate={async (title) => {
                try {
                  const next = taskSchema.parse({
                    ...stampRecord(),
                    recordType: "task",
                    title,
                    description: "",
                    projectId:
                      project === "all" || project === "inbox" ? "" : project,
                    priority: "Normal",
                    status: "To do",
                    dueDate: focus === "all" ? "" : localToday(),
                  });
                  const saved = await save(
                    [...state.records, next],
                    "Task added.",
                  );
                  if (saved) {
                    setQuery("");
                    if (focus === "overdue") changeFocus("today");
                  }
                  return saved;
                } catch (failure) {
                  setError(message(failure));
                  return false;
                }
              }}
            />

            <section
              aria-label="Workspace summary"
              className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4"
            >
              {[
                {
                  label: "Tasks",
                  value: tasks.length,
                  detail: "Across your workspace",
                  icon: ClipboardList,
                },
                {
                  label: "Completed",
                  value: tasks.filter((task) => task.status === "Done").length,
                  detail: "Progress you can see",
                  icon: Check,
                },
                {
                  label: "Project notes",
                  value: notes.length,
                  detail: "Context kept close",
                  icon: BookOpen,
                },
                {
                  label: "Projects",
                  value: projects.length,
                  detail: "Focused spaces for work",
                  icon: FolderKanban,
                },
              ].map(({ label, value, detail, icon: Icon }) => (
                <article
                  key={label}
                  className="rounded-2xl border border-line bg-surface p-4 shadow-[0_4px_18px_-12px_#17203320] sm:p-5"
                >
                  <div className="flex items-center justify-between gap-2 text-xs font-medium text-muted">
                    <span>{label}</span>
                    <Icon
                      size={17}
                      aria-hidden="true"
                      className="text-primary"
                    />
                  </div>
                  <strong className="mt-4 block text-3xl font-semibold tracking-tight tabular-nums">
                    {value}
                  </strong>
                  <p className="mt-2 text-[11px] leading-5 text-muted">
                    {detail}
                  </p>
                </article>
              ))}
            </section>
            {!shownTasks.length && (
              <div className="mt-6">
                <EmptyState
                  icon={ClipboardList}
                  eyebrow={
                    tasks.length
                      ? "A clearer view"
                      : "Your next chapter starts small"
                  }
                  title={
                    tasks.length
                      ? focus === "today"
                        ? "Nothing due today in this view."
                        : focus === "overdue"
                          ? "No overdue tasks in this view."
                          : "No tasks match this view."
                      : "Start with one meaningful task."
                  }
                  description={
                    tasks.length
                      ? "Try another search, project or date view to bring your work back into view."
                      : "Capture one thing to do, move it into progress, and enjoy seeing it done. Projects and notes can grow around it."
                  }
                >
                  <Button
                    onClick={() =>
                      tasks.length ? clearFilters() : open({ kind: "task" })
                    }
                  >
                    {tasks.length ? "Clear filters" : "Add your first task"}
                  </Button>
                  {!tasks.length && (
                    <Button
                      tone="quiet"
                      onClick={() => open({ kind: "project" })}
                    >
                      Create a project
                    </Button>
                  )}
                </EmptyState>
              </div>
            )}
            {shownTasks.length > 0 && (
              <div className="mt-5 grid gap-5 xl:grid-cols-3">
                {statuses.map((status) => (
                  <section
                    key={status}
                    aria-label={status + " tasks"}
                    className="min-w-0 rounded-2xl border border-line bg-surface/70 p-4"
                  >
                    <header className="mb-4 flex items-center justify-between">
                      <h2 className="flex items-center gap-2 font-semibold">
                        <span
                          className={`size-2 rounded-full ${status === "Done" ? "bg-success" : status === "In progress" ? "bg-primary" : "bg-muted"}`}
                        />
                        {status}
                      </h2>
                      <span className="rounded-md bg-soft px-2 py-1 text-xs text-muted">
                        {
                          shownTasks.filter((task) => task.status === status)
                            .length
                        }
                      </span>
                    </header>
                    <div className="grid gap-3">
                      {shownTasks
                        .filter((task) => task.status === status)
                        .map((task) => (
                          <article
                            key={task.id}
                            className="rounded-xl border border-line bg-surface p-4 shadow-sm"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span
                                className={`rounded-md px-2 py-1 text-[10px] font-semibold ${task.priority === "High" ? "bg-danger/10 text-danger" : "bg-soft text-muted"}`}
                              >
                                {task.priority} priority
                              </span>
                              <span className="flex">
                                <Button
                                  tone="quiet"
                                  className="min-h-8 p-2"
                                  aria-label={"Edit " + task.title}
                                  disabled={state.busy}
                                  onClick={() =>
                                    open({ kind: "task", record: task })
                                  }
                                >
                                  <Pencil size={14} />
                                </Button>
                                <Button
                                  tone="quiet"
                                  className="ml-1 min-h-8 p-2"
                                  aria-label={"Delete " + task.title}
                                  disabled={state.busy}
                                  onClick={() => setRemove(task)}
                                >
                                  <Trash2 size={14} />
                                </Button>
                              </span>
                            </div>
                            <h3 className="mt-3 font-semibold leading-6">
                              {task.title}
                            </h3>
                            {task.description && (
                              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted">
                                {task.description}
                              </p>
                            )}
                            <p className="mt-4 text-[11px] text-muted">
                              {projectName(task.projectId)}
                            </p>
                            {task.dueDate && (
                              <p
                                className={`mt-2 text-xs ${task.status !== "Done" && task.dueDate < localToday() ? "text-danger" : "text-muted"}`}
                              >
                                Due {task.dueDate}
                              </p>
                            )}
                            <div className="mt-4 flex flex-wrap gap-2">
                              {status !== "Done" && (
                                <Button
                                  tone="quiet"
                                  className="min-h-9 px-3 py-2 text-xs"
                                  disabled={state.busy}
                                  onClick={() =>
                                    void save(
                                      state.records.map((record) =>
                                        record.id === task.id
                                          ? {
                                              ...task,
                                              status: "Done",
                                              updatedAt:
                                                new Date().toISOString(),
                                            }
                                          : record,
                                      ),
                                      "Task completed.",
                                    )
                                  }
                                >
                                  <Check size={14} />
                                  Mark complete
                                </Button>
                              )}
                              {status === "To do" && (
                                <Button
                                  tone="quiet"
                                  className="min-h-9 px-3 py-2 text-xs"
                                  disabled={state.busy}
                                  onClick={() =>
                                    void save(
                                      state.records.map((record) =>
                                        record.id === task.id
                                          ? {
                                              ...task,
                                              status: "In progress",
                                              updatedAt:
                                                new Date().toISOString(),
                                            }
                                          : record,
                                      ),
                                      "Task started.",
                                    )
                                  }
                                >
                                  Start task
                                </Button>
                              )}
                              {status === "Done" && (
                                <Button
                                  tone="quiet"
                                  className="min-h-9 px-3 py-2 text-xs"
                                  disabled={state.busy}
                                  onClick={() =>
                                    void save(
                                      state.records.map((record) =>
                                        record.id === task.id
                                          ? {
                                              ...task,
                                              status: "To do",
                                              updatedAt:
                                                new Date().toISOString(),
                                            }
                                          : record,
                                      ),
                                      "Task reopened.",
                                    )
                                  }
                                >
                                  Reopen task
                                </Button>
                              )}
                            </div>
                          </article>
                        ))}
                      {!shownTasks.some((task) => task.status === status) && (
                        <p className="rounded-xl border border-dashed border-line p-6 text-center text-xs leading-6 text-muted">
                          {status === "To do"
                            ? "A little breathing room. Add your next task."
                            : status === "In progress"
                              ? "Start a task when you are ready to focus."
                              : "Your completed work will appear here."}
                        </p>
                      )}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </>
        )}
        {view === "notes" && (
          <section
            aria-label="Project notes"
            className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3"
          >
            {shownNotes.map((note) => (
              <article
                key={note.id}
                className="rounded-2xl border border-line bg-surface p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="rounded-md bg-soft px-2 py-1 text-[10px] text-primary">
                    {projectName(note.projectId)}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      tone="quiet"
                      className="min-h-8 p-2"
                      aria-label={note.pinned ? "Unpin note" : "Pin note"}
                      disabled={state.busy}
                      onClick={() =>
                        void save(
                          state.records.map((record) =>
                            record.id === note.id
                              ? {
                                  ...note,
                                  pinned: !note.pinned,
                                  updatedAt: new Date().toISOString(),
                                }
                              : record,
                          ),
                          note.pinned ? "Note unpinned." : "Note pinned.",
                        )
                      }
                    >
                      <Pin
                        size={14}
                        className={note.pinned ? "fill-current" : ""}
                      />
                    </Button>
                    <Button
                      tone="quiet"
                      className="min-h-8 p-2"
                      aria-label={"Edit " + note.title}
                      onClick={() => open({ kind: "note", record: note })}
                    >
                      <Pencil size={14} />
                    </Button>
                    <Button
                      tone="quiet"
                      className="min-h-8 p-2"
                      aria-label={"Delete " + note.title}
                      onClick={() => setRemove(note)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setReading(note)}
                  className="mt-4 block w-full text-left"
                >
                  <h2 className="font-semibold leading-6">{note.title}</h2>
                  <p className="mt-3 line-clamp-5 whitespace-pre-wrap text-sm leading-7 text-muted">
                    {note.body}
                  </p>
                </button>
                <p className="mt-4 text-xs text-muted">
                  {note.tag || "Untagged"}
                </p>
              </article>
            ))}
            {!shownNotes.length && (
              <div className="md:col-span-2 xl:col-span-3">
                <EmptyState
                  icon={BookOpen}
                  eyebrow="Ideas, kept in context"
                  title={
                    notes.length
                      ? "No notes match this view."
                      : "Keep the context beside your tasks."
                  }
                  description={
                    notes.length
                      ? "Clear your search and project filter to see all your notes again."
                      : "Write a project note or review a saved Notes Workspace export before importing it."
                  }
                >
                  <Button
                    onClick={() =>
                      notes.length ? clearFilters() : open({ kind: "note" })
                    }
                  >
                    {notes.length ? "Clear filters" : "Add note"}
                  </Button>
                </EmptyState>
              </div>
            )}
          </section>
        )}
        {view === "projects" && (
          <section
            aria-label="Projects"
            className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3"
          >
            {shownProjects.map((item) => {
              const linked = tasks.filter((task) => task.projectId === item.id);
              const complete = linked.filter(
                (task) => task.status === "Done",
              ).length;
              return (
                <article
                  key={item.id}
                  className="rounded-2xl border border-line bg-surface p-6"
                >
                  <FolderKanban className="mb-5 text-primary" />
                  <h2 className="text-lg font-semibold">{item.name}</h2>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-muted">
                    {item.description || "A focused space for related work."}
                  </p>
                  <p className="mt-5 text-xs text-muted">
                    {complete} of {linked.length} tasks complete ·{" "}
                    {notes.filter((note) => note.projectId === item.id).length}{" "}
                    notes
                  </p>
                  <div className="mt-5 flex gap-2">
                    <Button
                      tone="quiet"
                      onClick={() => {
                        setProject(item.id);
                        navigate("board");
                      }}
                    >
                      Open project
                    </Button>
                    <Button
                      tone="quiet"
                      aria-label={"Edit project " + item.name}
                      onClick={() => open({ kind: "project", record: item })}
                    >
                      <Pencil size={15} />
                    </Button>
                  </div>
                </article>
              );
            })}
            {!shownProjects.length && (
              <div className="md:col-span-2 xl:col-span-3">
                <EmptyState
                  icon={FolderKanban}
                  eyebrow="A home for the whole picture"
                  title={
                    projects.length
                      ? "No projects match this view."
                      : "Start with one clear project."
                  }
                  description={
                    projects.length
                      ? "Clear your filters to return to all your projects."
                      : "Give related work a shared purpose. Existing tasks remain in Inbox until you choose a project for them."
                  }
                >
                  <Button
                    onClick={() =>
                      projects.length
                        ? clearFilters()
                        : open({ kind: "project" })
                    }
                  >
                    {projects.length ? "Clear filters" : "New project"}
                  </Button>
                </EmptyState>
              </div>
            )}
          </section>
        )}
        <footer className="mt-10 text-center text-[11px] text-muted">
          Task Workspace · {tasks.length} tasks · {notes.length} notes · Saved
          to your account
        </footer>
      </main>
      <Modal
        open={editor !== null}
        title={(editor?.record ? "Edit " : "Add ") + noun}
        onClose={close}
        busy={state.busy}
      >
        <form
          ref={editorForm}
          key={editor?.record?.id || noun}
          onSubmit={(event) => void submit(event)}
          onChange={changed}
          onInput={changed}
          className="grid gap-4"
        >
          {drafts.storageError && (
            <p role="status" className="text-sm text-danger">
              {drafts.storageError}
            </p>
          )}
          <p className="text-xs text-muted">
            Unsaved text is kept in this tab until saved, discarded, or signed
            out.
          </p>
          <fieldset disabled={state.busy} className="grid min-w-0 gap-4">
            {editor?.kind === "project" ? (
              <>
                <label className={fieldLabel}>
                  Project name
                  <Input
                    name="name"
                    defaultValue={
                      recovered?.values.name ?? currentProject?.name
                    }
                    required
                    minLength={2}
                    maxLength={80}
                  />
                </label>
                <label className={fieldLabel}>
                  Project description
                  <Textarea
                    name="description"
                    defaultValue={
                      recovered?.values.description ??
                      currentProject?.description
                    }
                    maxLength={1000}
                  />
                </label>
              </>
            ) : (
              <>
                <label className={fieldLabel}>
                  {editor?.kind === "note" ? "Title" : "Task title"}
                  <Input
                    name="title"
                    defaultValue={
                      recovered?.values.title ??
                      (currentTask?.title || currentNote?.title)
                    }
                    required
                    maxLength={editor?.kind === "note" ? 160 : 200}
                  />
                </label>
                <div className={fieldLabel}>
                  <label htmlFor="work-project">Project</label>
                  <Dropdown
                    id="work-project"
                    name="projectId"
                    label="Project"
                    defaultValue={
                      recovered?.values.projectId ??
                      (currentTask?.projectId ||
                        currentNote?.projectId ||
                        (project !== "all" ? project : "inbox"))
                    }
                    options={projectOptions}
                    onChange={changed}
                  />
                </div>
                {editor?.kind === "note" ? (
                  <>
                    <label className={fieldLabel}>
                      Note
                      <Textarea
                        name="body"
                        defaultValue={
                          recovered?.values.body ?? currentNote?.body
                        }
                        required
                        maxLength={20000}
                        className="min-h-64"
                      />
                    </label>
                    <label className={fieldLabel}>
                      Tag
                      <Input
                        name="tag"
                        defaultValue={recovered?.values.tag ?? currentNote?.tag}
                        maxLength={40}
                      />
                    </label>
                  </>
                ) : (
                  <>
                    <label className={fieldLabel}>
                      Description
                      <Textarea
                        name="description"
                        defaultValue={
                          recovered?.values.description ??
                          currentTask?.description
                        }
                        maxLength={2000}
                      />
                    </label>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className={fieldLabel}>
                        <label htmlFor="work-priority">Priority</label>
                        <Dropdown
                          id="work-priority"
                          name="priority"
                          label="Priority"
                          defaultValue={
                            recovered?.values.priority ??
                            (currentTask?.priority || "Normal")
                          }
                          options={["Low", "Normal", "High"].map((value) => ({
                            value,
                            label: value,
                          }))}
                          onChange={changed}
                        />
                      </div>
                      <div className={fieldLabel}>
                        <label htmlFor="work-status">Status</label>
                        <Dropdown
                          id="work-status"
                          name="status"
                          label="Status"
                          defaultValue={
                            recovered?.values.status ??
                            (currentTask?.status || "To do")
                          }
                          options={statuses.map((value) => ({
                            value,
                            label: value,
                          }))}
                          onChange={changed}
                        />
                      </div>
                    </div>
                    <div className={fieldLabel}>
                      <label htmlFor="work-date">Due date</label>
                      <DateInput
                        id="work-date"
                        name="dueDate"
                        label="Due date"
                        defaultValue={
                          recovered?.values.dueDate ?? currentTask?.dueDate
                        }
                      />
                    </div>
                  </>
                )}
              </>
            )}
          </fieldset>
          {error && (
            <p
              role="alert"
              className="rounded-xl bg-danger/10 p-3 text-sm text-danger"
            >
              {error}
            </p>
          )}
          <div className="mt-3 flex justify-end gap-3">
            <Button tone="quiet" disabled={state.busy} onClick={close}>
              Cancel
            </Button>
            <Button type="submit" disabled={state.busy}>
              {state.busy ? "Saving…" : "Save " + noun}
            </Button>
          </div>
        </form>
      </Modal>
      <Modal
        open={discard}
        title="Discard unsaved changes?"
        onClose={() => setDiscard(false)}
      >
        <p className="text-sm leading-7 text-muted">
          Your edits have not been saved.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button tone="quiet" onClick={() => setDiscard(false)}>
            Keep editing
          </Button>
          <Button
            tone="danger"
            onClick={() => {
              drafts.clear();
              setRecovered(null);
              setDiscard(false);
              setEditor(null);
              setDirty(false);
            }}
          >
            Discard changes
          </Button>
        </div>
      </Modal>
      <Modal
        open={remove !== null}
        title="Delete record?"
        onClose={() => setRemove(null)}
        busy={state.busy}
      >
        <p className="text-sm leading-7 text-muted">
          This removes the selected record from your account. Other tasks,
          projects and notes remain available.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button
            tone="quiet"
            disabled={state.busy}
            onClick={() => setRemove(null)}
          >
            Keep record
          </Button>
          <Button
            tone="danger"
            disabled={state.busy}
            onClick={async () => {
              if (
                remove &&
                (await save(
                  state.records.filter((record) => record.id !== remove.id),
                  "Record deleted.",
                ))
              )
                setRemove(null);
            }}
          >
            Delete record
          </Button>
        </div>
      </Modal>
      <Modal
        open={reading !== null}
        title={reading?.title || "Read note"}
        onClose={() => setReading(null)}
      >
        <p className="text-xs text-muted">
          {reading ? projectName(reading.projectId) : ""}
          {reading?.tag ? " · " + reading.tag : ""}
        </p>
        <div className="mt-6 whitespace-pre-wrap text-sm leading-8">
          {reading?.body}
        </div>
      </Modal>
      <Modal
        open={imported !== null}
        title="Review Notes Workspace import"
        onClose={() => {
          setImported(null);
          setNotesSource(null);
        }}
        busy={state.busy}
      >
        <p className="text-sm leading-7 text-muted">
          {imported?.sourceCount} source notes · {imported?.notes.length} new ·{" "}
          {imported?.duplicates} already imported. Existing notes and source
          accounts are preserved. Previously imported IDs are skipped, including
          any edits you made here.
        </p>
        <div className="mt-5">
          <Dropdown
            label="Destination project"
            value={importProject}
            options={projectOptions}
            onChange={(value) => void changeImportProject(value)}
          />
        </div>
        <ul className="mt-5 max-h-48 space-y-2 overflow-auto text-sm">
          {imported?.notes.slice(0, 50).map((note) => (
            <li key={note.id} className="rounded-lg bg-soft px-3 py-2">
              {note.title}
            </li>
          ))}
        </ul>
        {error && (
          <p role="alert" className="mt-4 text-sm text-danger">
            {error}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <Button
            tone="quiet"
            disabled={state.busy}
            onClick={() => {
              setImported(null);
              setNotesSource(null);
            }}
          >
            Cancel import
          </Button>
          <Button
            disabled={state.busy || !imported?.notes.length}
            onClick={async () => {
              if (!imported) return;
              if (
                await save(
                  [...state.records, ...imported.notes],
                  "Notes imported.",
                )
              ) {
                setImported(null);
                setNotesSource(null);
                navigate("notes");
              }
            }}
          >
            Import notes
          </Button>
        </div>
      </Modal>
      <Modal
        open={restore !== null}
        title="Replace workspace from backup?"
        onClose={() => setRestore(null)}
        busy={state.busy}
      >
        <p className="text-sm leading-7 text-muted">
          The backup contains {restore?.filter(isTask).length} tasks,{" "}
          {restore?.filter(isNote).length} notes and{" "}
          {restore?.filter(isProject).length} projects. Restoring replaces the{" "}
          {state.records.length} current records. Export a backup before
          continuing. Old task-only exports are supported.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button
            tone="quiet"
            disabled={state.busy}
            onClick={() => setRestore(null)}
          >
            Cancel import
          </Button>
          <Button
            disabled={state.busy}
            onClick={async () => {
              if (restore && (await save(restore, "Workspace restored.")))
                setRestore(null);
            }}
          >
            Replace workspace
          </Button>
        </div>
      </Modal>
    </div>
  );
}
