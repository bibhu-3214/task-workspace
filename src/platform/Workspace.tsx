import { useState } from "react";
import type { FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import {
  BookOpen,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Download,
  Film,
  LayoutDashboard,
  ListTodo,
  Moon,
  NotebookPen,
  Pencil,
  Pin,
  Plus,
  Search,
  Sun,
  Trash2,
  TrendingUp,
  Upload,
  Users,
  Wallet,
} from "lucide-react";
import type { WorkspaceState } from "./ServiceGate";
import { Button, Dropdown, Input, Modal, Textarea } from "./ui";
import {
  amount,
  normalizedPhone,
  fields,
  fromForm,
  kindSchema,
  orderSummary,
  recordStatus,
  recordTitle,
  schemas,
  today,
} from "./records";
import type { WorkspaceRecord } from "./records";
import { message } from "./api";
import product from "../../product.json";
import DateInput from "./DateInput";

function Theme() {
  const [dark, setDark] = useState(
    () => document.documentElement.dataset.theme === "dark",
  );
  return (
    <button
      type="button"
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => {
        const next = !dark;
        document.documentElement.dataset.theme = next ? "dark" : "light";
        setDark(next);
        try {
          localStorage.setItem(
            product.id + ".appearance",
            next ? "dark" : "light",
          );
        } catch {
          /* Appearance remains usable for this visit. */
        }
      }}
      className="grid size-10 place-items-center rounded-xl bg-soft text-muted hover:text-primary focus-visible:outline-2 focus-visible:outline-primary"
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
function Icon({ kind, size = 20 }: { kind: string; size?: number }) {
  return kind === "task" ? (
    <ListTodo size={size} />
  ) : kind === "movie" ? (
    <Film size={size} />
  ) : kind === "order" ? (
    <Users size={size} />
  ) : (
    <NotebookPen size={size} />
  );
}
function download(name: string, body: string, type = "application/json") {
  const url = URL.createObjectURL(new Blob([body], { type })),
    anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function Workspace({
  state,
}: {
  state: WorkspaceState<WorkspaceRecord>;
}) {
  const kind = kindSchema.parse(product.kind),
    [params, setParams] = useSearchParams(),
    [editor, setEditor] = useState<{ record?: WorkspaceRecord } | null>(null),
    [remove, setRemove] = useState<WorkspaceRecord | null>(null),
    [discard, setDiscard] = useState(false),
    [dirty, setDirty] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [imported, setImported] = useState<WorkspaceRecord[] | null>(null),
    [detail, setDetail] = useState<string | null>(null);
  const query = params.get("q") || "",
    filter = params.get("filter") || "All",
    sort = params.get("sort") || "recent",
    view = params.get("view") === "records" ? "records" : "overview",
    page = Math.max(1, Number.parseInt(params.get("page") || "1") || 1);
  const change = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    next.set(key, value);
    if (key !== "page") next.delete("page");
    setParams(next, { replace: true });
  };
  const records = state.records,
    summary = orderSummary(records),
    statuses =
      kind === "task"
        ? ["All", "To do", "In progress", "Done"]
        : kind === "movie"
          ? ["All", "Watchlist", "Watched"]
          : kind === "note"
            ? ["All", "Pinned", "Notes"]
            : ["All"];
  const visible = records
    .filter((record) => {
      const values = Object.values(record)
        .filter((value) => typeof value === "string")
        .join(" ")
        .toLowerCase();
      return (
        values.includes(query.trim().toLowerCase()) &&
        (filter === "All" || recordStatus(record) === filter)
      );
    })
    .sort((a, b) =>
      sort === "name"
        ? recordTitle(a).localeCompare(recordTitle(b))
        : sort === "rating" && "rating" in a && "rating" in b
          ? b.rating - a.rating
          : b.updatedAt.localeCompare(a.updatedAt),
    );
  const totalPages = Math.max(1, Math.ceil(visible.length / 12)),
    current = Math.min(page, totalPages),
    shown = visible.slice((current - 1) * 12, current * 12);
  const metrics =
    kind === "order"
      ? [
          {
            label: "Recorded revenue",
            value: amount(summary.total),
            detail: "From saved orders",
            icon: Wallet,
          },
          {
            label: "Customers",
            value: summary.customers.length,
            detail: "Grouped by phone number",
            icon: Users,
          },
          {
            label: "Orders",
            value: records.length,
            detail: "Full purchase history",
            icon: TrendingUp,
          },
        ]
      : kind === "task"
        ? [
            {
              label: "All tasks",
              value: records.length,
              detail: "Your current workspace",
              icon: ListTodo,
            },
            {
              label: "Completed",
              value: records.filter((r) => recordStatus(r) === "Done").length,
              detail: "Work you have finished",
              icon: CheckCheck,
            },
            {
              label: "Overdue",
              value: records.filter(
                (r) =>
                  "dueDate" in r &&
                  r.dueDate &&
                  r.dueDate < today() &&
                  r.status !== "Done",
              ).length,
              detail: "Open tasks past their due date",
              icon: TrendingUp,
            },
          ]
        : kind === "movie"
          ? [
              {
                label: "Your collection",
                value: records.length,
                detail: "Movies you have saved",
                icon: Film,
              },
              {
                label: "Watched",
                value: records.filter((r) => recordStatus(r) === "Watched")
                  .length,
                detail: "Ready for your next discovery",
                icon: CheckCheck,
              },
              {
                label: "Average rating",
                value: records.length
                  ? (
                      records.reduce(
                        (sum, r) => sum + ("rating" in r ? r.rating : 0),
                        0,
                      ) / records.length
                    ).toFixed(1)
                  : "—",
                detail: "Your personal ratings, out of 10",
                icon: TrendingUp,
              },
            ]
          : [
              {
                label: "All notes",
                value: records.length,
                detail: "Ideas, saved and organised",
                icon: BookOpen,
              },
              {
                label: "Pinned",
                value: records.filter((r) => "pinned" in r && r.pinned).length,
                detail: "Keep important ideas close",
                icon: Pin,
              },
              {
                label: "Words",
                value: records.reduce(
                  (sum, r) =>
                    sum +
                    ("body" in r
                      ? r.body.trim().split(/\s+/).filter(Boolean).length
                      : 0),
                  0,
                ),
                detail: "Across your saved notes",
                icon: NotebookPen,
              },
            ];
  const heading =
    kind === "task"
      ? "Make room for your best work."
      : kind === "movie"
        ? "A collection worth coming back to."
        : kind === "order"
          ? "Know the people behind every order."
          : "A quieter place for your next idea.";
  async function mutate(next: WorkspaceRecord[], success: string) {
    setError("");
    setNotice("");
    try {
      await state.save(next);
      setNotice(success);
      return true;
    } catch (error) {
      setError(message(error));
      return false;
    }
  }
  const close = () => {
    if (state.busy) return;
    if (dirty) setDiscard(true);
    else setEditor(null);
  };
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      const record = fromForm(
          kind,
          new FormData(event.currentTarget),
          editor?.record,
        ),
        next = editor?.record
          ? records.map((item) => (item.id === record.id ? record : item))
          : [record, ...records];
      if (await mutate(next, "Saved to your workspace.")) {
        setEditor(null);
        setDirty(false);
      }
    } catch (error) {
      setError(message(error));
    }
  }
  const values: Record<string, unknown> = editor?.record
    ? { ...editor.record }
    : {};
  const noun =
    kind === "order"
      ? "order"
      : kind === "movie"
        ? "movie"
        : kind === "task"
          ? "task"
          : "note";
  return (
    <div className="min-h-[calc(100dvh-48px)] bg-canvas text-ink">
      <a
        href="#workspace-main"
        className="fixed top-2 left-2 z-50 -translate-y-24 rounded-lg bg-ink px-4 py-3 text-canvas focus:translate-y-0"
      >
        Skip to content
      </a>
      <aside className="border-b border-line bg-surface px-5 py-4 lg:fixed lg:top-12 lg:bottom-0 lg:w-60 lg:border-r lg:border-b-0 lg:px-5 lg:py-7">
        <a
          href="/"
          className="flex items-center gap-3 text-xl font-semibold tracking-tight"
        >
          <span className="grid size-10 place-items-center rounded-xl bg-primary text-white dark:text-slate-950 shadow-sm">
            <Icon kind={kind} />
          </span>
          {product.title}
        </a>
        <p className="mt-2 hidden text-xs text-muted lg:block">
          {product.eyebrow}
        </p>
        <nav
          aria-label="Workspace navigation"
          className="mt-5 flex gap-2 lg:mt-10 lg:grid"
        >
          {[
            { key: "overview", label: "Overview", icon: LayoutDashboard },
            {
              key: "records",
              label: product.collection,
              icon:
                kind === "task"
                  ? ListTodo
                  : kind === "movie"
                    ? Film
                    : kind === "order"
                      ? Users
                      : BookOpen,
            },
          ].map((item) => (
            <button
              type="button"
              key={item.key}
              aria-current={view === item.key ? "page" : undefined}
              onClick={() => change("view", item.key)}
              className={
                "flex min-h-11 items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors " +
                (view === item.key
                  ? "bg-soft text-primary"
                  : "text-muted hover:bg-soft")
              }
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="mt-auto hidden pt-12 lg:block">
          <p className="text-[10px] font-semibold tracking-[.14em] text-muted uppercase">
            YOUR WORKSPACE
          </p>
          <p className="mt-3 text-sm font-medium">{state.account.name}</p>
          <p className="mt-1 break-all text-xs text-muted">
            {state.account.email}
          </p>
          <p className="mt-6 text-xs leading-6 text-muted">
            Changes save to your account. Refresh to load work saved on another
            device.
          </p>
        </div>
      </aside>
      <main
        id="workspace-main"
        tabIndex={-1}
        className="mx-auto max-w-[1500px] px-4 py-7 outline-none sm:px-7 sm:py-9 lg:ml-60 lg:px-10"
      >
        <header className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-[10px] font-semibold tracking-[.16em] text-primary uppercase">
              {product.eyebrow} / {view}
            </p>
            <h1 className="mt-3 max-w-2xl text-[clamp(1.8rem,3.4vw,2.55rem)] font-semibold leading-tight tracking-tight">
              {view === "overview" ? heading : product.collection}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-7 text-muted">
              {product.description}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Theme />
            {kind === "order" && (
              <Button tone="quiet" onClick={() => window.print()}>
                Print report
              </Button>
            )}
            <Button
              onClick={() => {
                setDirty(false);
                setEditor({});
                setError("");
              }}
            >
              <Plus size={16} />
              Add {noun}
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
        {view === "overview" && (
          <section
            aria-label="Workspace statistics"
            className="mt-8 grid gap-4 sm:grid-cols-3"
          >
            {metrics.map((metric) => (
              <article
                key={metric.label}
                className="rounded-2xl border border-line bg-surface p-5 shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-xs font-medium text-muted">
                    {metric.label}
                  </h2>
                  <span className="grid size-9 place-items-center rounded-xl bg-soft text-primary">
                    <metric.icon size={17} />
                  </span>
                </div>
                <strong className="mt-4 block break-words text-3xl font-semibold tracking-tight">
                  {metric.value}
                </strong>
                <p className="mt-2 text-xs text-muted">{metric.detail}</p>
              </article>
            ))}
          </section>
        )}
        <section className="mt-7 rounded-2xl border border-line bg-surface p-4 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                {product.collection}
              </h2>
              <p className="mt-1 text-xs text-muted">
                {visible.length} {visible.length === 1 ? "record" : "records"}{" "}
                in this view
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                tone="quiet"
                onClick={() =>
                  download(
                    product.id + "-workspace.json",
                    JSON.stringify(
                      { version: 1, product: product.id, records },
                      null,
                      2,
                    ),
                  )
                }
              >
                <Download size={15} />
                Export JSON
              </Button>
              <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-soft px-4 py-2.5 text-sm font-semibold focus-within:outline-2 focus-within:outline-primary">
                <Upload size={15} />
                Import JSON
                <input
                  aria-label="Import workspace JSON"
                  type="file"
                  accept=".json,application/json"
                  className="sr-only"
                  onChange={async (event) => {
                    const input = event.currentTarget,
                      file = input.files?.[0];
                    if (!file) return;
                    setError("");
                    try {
                      if (file.size > 1_500_000)
                        throw new Error("Choose a JSON file under 1.5 MB.");
                      const parsed: unknown = JSON.parse(await file.text());
                      const outer = schemas[kind].array().max(10000);
                      if (
                        typeof parsed !== "object" ||
                        parsed === null ||
                        !("version" in parsed) ||
                        parsed.version !== 1 ||
                        !("product" in parsed) ||
                        parsed.product !== product.id ||
                        !("records" in parsed)
                      )
                        throw new Error(
                          "Choose an export from this application.",
                        );
                      const loaded = outer.parse(parsed.records);
                      if (
                        new Set(loaded.map((item) => item.id)).size !==
                        loaded.length
                      )
                        throw new Error("The file contains duplicate IDs.");
                      setImported(loaded);
                    } catch (error) {
                      setError(message(error));
                    } finally {
                      input.value = "";
                    }
                  }}
                />
              </label>
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_190px]">
            <label className="relative block">
              <span className="sr-only">
                Search {product.collection.toLowerCase()}
              </span>
              <Search
                size={17}
                className="absolute top-3.5 left-3.5 text-muted"
                aria-hidden="true"
              />
              <Input
                type="search"
                value={query}
                onChange={(event) => change("q", event.target.value)}
                placeholder={"Search " + product.collection.toLowerCase()}
                className="pl-10"
              />
            </label>
            <Dropdown
              label="Filter records"
              value={filter}
              onChange={(value) => change("filter", value)}
              options={statuses.map((value) => ({ value, label: value }))}
            />
            <Dropdown
              label="Sort records"
              value={sort}
              onChange={(value) => change("sort", value)}
              options={[
                { value: "recent", label: "Recently updated" },
                { value: "name", label: "Name A–Z" },
                ...(kind === "movie"
                  ? [{ value: "rating", label: "Highest rated" }]
                  : []),
              ]}
            />
          </div>
          {!shown.length ? (
            <div className="grid min-h-64 place-items-center py-12 text-center">
              <div>
                <span className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl bg-soft text-primary">
                  <Icon kind={kind} size={26} />
                </span>
                <h3 className="text-lg font-semibold">
                  {records.length
                    ? "No matching records"
                    : "Your workspace starts here."}
                </h3>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-7 text-muted">
                  {records.length
                    ? "Try a different search or filter."
                    : "Add your first " +
                      noun +
                      " to begin. Your overview updates from the records you save."}
                </p>
                <Button
                  tone="quiet"
                  className="mt-5"
                  onClick={() => {
                    if (records.length) {
                      setParams({ view, q: "", filter: "All" });
                    } else {
                      setDirty(false);
                      setEditor({});
                    }
                  }}
                >
                  {records.length ? "Clear filters" : "Add your first " + noun}
                </Button>
              </div>
            </div>
          ) : (
            <div
              className={
                "mt-6 grid gap-4 " + (kind === "order" ? "" : "xl:grid-cols-2")
              }
            >
              {shown.map((record) => (
                <article
                  key={record.id}
                  className="min-w-0 rounded-xl border border-line bg-field p-5 transition-colors hover:border-primary/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="inline-flex items-center rounded-md bg-soft px-2 py-1 text-[10px] font-semibold text-primary">
                        {recordStatus(record)}
                      </span>
                      <h3 className="mt-3 break-words text-base font-semibold">
                        {recordTitle(record)}
                      </h3>
                    </div>
                    <span className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        aria-label={"Edit " + recordTitle(record)}
                        onClick={() => {
                          setDirty(false);
                          setError("");
                          setEditor({ record });
                        }}
                        className="grid size-9 place-items-center rounded-lg text-muted hover:bg-soft hover:text-primary focus-visible:outline-2 focus-visible:outline-primary"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        aria-label={"Delete " + recordTitle(record)}
                        onClick={() => setRemove(record)}
                        className="grid size-9 place-items-center rounded-lg text-muted hover:bg-danger/10 hover:text-danger focus-visible:outline-2 focus-visible:outline-primary"
                      >
                        <Trash2 size={15} />
                      </button>
                    </span>
                  </div>
                  {"body" in record && (
                    <>
                      <p className="mt-3 line-clamp-4 whitespace-pre-wrap text-sm leading-7 text-muted">
                        {record.body}
                      </p>
                      <p className="mt-3 text-xs text-muted">
                        {record.tag || "Untagged"}
                      </p>
                      <Button
                        tone="quiet"
                        className="mt-4"
                        disabled={state.busy}
                        onClick={() =>
                          void mutate(
                            records.map((item) =>
                              item.id === record.id
                                ? {
                                    ...record,
                                    pinned: !record.pinned,
                                    updatedAt: new Date().toISOString(),
                                  }
                                : item,
                            ),
                            record.pinned ? "Unpinned." : "Pinned.",
                          )
                        }
                      >
                        <Pin size={14} />
                        {record.pinned ? "Unpin" : "Pin note"}
                      </Button>
                    </>
                  )}
                  {"priority" in record && (
                    <>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted">
                        {record.description || "No description added."}
                      </p>
                      <p className="mt-4 text-xs text-muted">
                        {record.priority} priority ·{" "}
                        {record.dueDate || "No due date"}
                      </p>
                      <Button
                        tone="quiet"
                        className="mt-4"
                        disabled={state.busy}
                        onClick={() =>
                          void mutate(
                            records.map((item) =>
                              item.id === record.id
                                ? {
                                    ...record,
                                    status:
                                      record.status === "Done"
                                        ? "To do"
                                        : "Done",
                                    updatedAt: new Date().toISOString(),
                                  }
                                : item,
                            ),
                            record.status === "Done"
                              ? "Task reopened."
                              : "Task completed.",
                          )
                        }
                      >
                        <Check size={15} />
                        {record.status === "Done"
                          ? "Reopen task"
                          : "Mark complete"}
                      </Button>
                    </>
                  )}
                  {"rating" in record && (
                    <>
                      <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted">
                        <span className="font-semibold text-primary">
                          {record.rating.toFixed(1)} / 10
                        </span>
                        <span>{record.year ?? "Year not recorded"}</span>
                        <span>{record.genre}</span>
                      </div>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted">
                        {record.notes || "A place for your own review."}
                      </p>
                    </>
                  )}
                  {"amountMinor" in record && (
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                      <p className="text-xs text-muted">
                        {record.phone} · {record.date}
                      </p>
                      <strong className="text-lg font-semibold">
                        {amount(record.amountMinor)}
                      </strong>
                      <Button
                        tone="quiet"
                        onClick={() => setDetail(record.phone)}
                      >
                        Customer history
                      </Button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
          <nav
            aria-label="Record pagination"
            className="mt-6 flex items-center justify-end gap-3 text-xs text-muted"
          >
            <span>
              Page {current} of {totalPages}
            </span>
            <Button
              tone="quiet"
              aria-label="Previous page"
              disabled={current <= 1}
              onClick={() => change("page", String(current - 1))}
            >
              <ChevronLeft size={15} />
            </Button>
            <Button
              tone="quiet"
              aria-label="Next page"
              disabled={current >= totalPages}
              onClick={() => change("page", String(current + 1))}
            >
              <ChevronRight size={15} />
            </Button>
          </nav>
        </section>
        {kind === "order" && view === "overview" && (
          <section className="mt-7 rounded-2xl border border-line bg-surface p-5 sm:p-6">
            <h2 className="text-lg font-semibold">
              Customer order distribution
            </h2>
            <p className="mt-2 text-sm text-muted">
              Calculated from saved purchases, grouped by phone number.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
              {[1, 2, 3, 4, 5].map((count) => (
                <article key={count} className="rounded-xl bg-soft p-4">
                  <p className="text-xs text-muted">
                    {count === 5 ? "5+" : count} orders
                  </p>
                  <strong className="mt-2 block text-xl font-semibold">
                    {
                      summary.customers.filter((customer) =>
                        count === 5
                          ? customer.count >= 5
                          : customer.count === count,
                      ).length
                    }
                  </strong>
                  <span className="text-xs text-muted">customers</span>
                </article>
              ))}
            </div>
          </section>
        )}
        <footer className="mt-8 text-center text-[11px] leading-6 text-muted">
          {product.title} · Account workspace · {records.length} saved records
        </footer>
      </main>
      <Modal
        open={Boolean(editor)}
        title={(editor?.record ? "Edit " : "Add ") + noun}
        onClose={close}
        busy={state.busy}
      >
        <form
          onSubmit={submit}
          onInvalid={(event) => {
            event.preventDefault();
            const element = event.target;
            if (
              element instanceof HTMLInputElement ||
              element instanceof HTMLTextAreaElement
            )
              setError(element.validationMessage);
          }}
          onChange={() => {
            setDirty(true);
            setError("");
          }}
          className="grid gap-4"
        >
          <fieldset disabled={state.busy} className="grid min-w-0 gap-4">
            {fields[kind].map((field) => {
              let value = values[field.key];
              if (
                field.key === "amount" &&
                editor?.record &&
                "amountMinor" in editor.record
              )
                value = (editor.record.amountMinor / 100).toFixed(2);
              const initial =
                typeof value === "string" || typeof value === "number"
                  ? value
                  : field.defaultValue;
              return (
                <div
                  key={field.key}
                  className="grid min-w-0 gap-2 text-sm font-medium"
                >
                  <label htmlFor={"record-" + field.key}>{field.label}</label>
                  {field.options ? (
                    <Dropdown
                      id={"record-" + field.key}
                      name={field.key}
                      label={field.label}
                      defaultValue={String(initial || field.options[0])}
                      options={field.options.map((value) => ({
                        value,
                        label: value,
                      }))}
                      onChange={() => setDirty(true)}
                    />
                  ) : field.type === "textarea" ? (
                    <Textarea
                      id={"record-" + field.key}
                      name={field.key}
                      defaultValue={initial}
                      required={field.required}
                      maxLength={field.maxLength}
                    />
                  ) : field.type === "date" ? (
                    <DateInput
                      id={"record-" + field.key}
                      name={field.key}
                      label={field.label}
                      defaultValue={
                        typeof initial === "string" ? initial : undefined
                      }
                      required={field.required}
                    />
                  ) : (
                    <Input
                      id={"record-" + field.key}
                      name={field.key}
                      type={field.type || "text"}
                      defaultValue={initial}
                      required={field.required}
                      maxLength={field.maxLength}
                      min={field.min}
                      max={field.max}
                      step={field.step}
                    />
                  )}
                </div>
              );
            })}
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
          Your changes have not been saved.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button tone="quiet" onClick={() => setDiscard(false)}>
            Keep editing
          </Button>
          <Button
            tone="danger"
            onClick={() => {
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
        open={Boolean(remove)}
        title={"Delete " + noun + "?"}
        onClose={() => setRemove(null)}
        busy={state.busy}
      >
        <p className="text-sm leading-7 text-muted">
          Remove “{remove ? recordTitle(remove) : ""}” from your account? This
          cannot be undone.
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
                (await mutate(
                  records.filter((record) => record.id !== remove.id),
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
        open={Boolean(imported)}
        title="Replace workspace from export?"
        onClose={() => setImported(null)}
        busy={state.busy}
      >
        <p className="text-sm leading-7 text-muted">
          This file contains {imported?.length} records. Importing replaces your{" "}
          {records.length} current records. Export a backup before continuing.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button
            tone="quiet"
            disabled={state.busy}
            onClick={() => setImported(null)}
          >
            Cancel import
          </Button>
          <Button
            disabled={state.busy}
            onClick={async () => {
              if (imported && (await mutate(imported, "Workspace imported.")))
                setImported(null);
            }}
          >
            Replace workspace
          </Button>
        </div>
      </Modal>
      <Modal
        open={detail !== null}
        title="Customer purchase history"
        onClose={() => setDetail(null)}
      >
        <div className="grid gap-3">
          {records
            .filter(
              (record) =>
                "phone" in record &&
                normalizedPhone(record.phone) === normalizedPhone(detail || ""),
            )
            .map((record) => (
              <article
                key={record.id}
                className="flex justify-between gap-4 rounded-xl bg-soft p-4 text-sm"
              >
                <span>
                  {"date" in record ? record.date : ""} · {recordTitle(record)}
                </span>
                <strong>
                  {"amountMinor" in record ? amount(record.amountMinor) : ""}
                </strong>
              </article>
            ))}
        </div>
        <Button className="mt-6" tone="quiet" onClick={() => window.print()}>
          Print history
        </Button>
      </Modal>
    </div>
  );
}
