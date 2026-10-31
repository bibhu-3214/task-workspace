import type { ReactNode } from "react";
export default function DraftNotice({
  onRestore,
  onDiscard,
  children,
}: {
  onRestore: () => void;
  onDiscard: () => void;
  children?: ReactNode;
}) {
  return (
    <section
      aria-label="Unsaved draft"
      className="my-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-primary/25 bg-primary/5 p-4 text-sm text-ink"
    >
      <div>
        <p className="font-semibold">You have an unfinished draft.</p>
        <div className="mt-1 text-xs leading-5 text-muted">
          {children ||
            "Kept in this tab for up to 24 hours. Review it before saving."}
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onRestore}
          className="min-h-11 rounded-xl bg-primary px-4 py-2 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:text-canvas"
        >
          Recover draft
        </button>
        <button
          type="button"
          onClick={onDiscard}
          className="min-h-11 rounded-xl border border-line bg-surface px-4 py-2 font-semibold hover:bg-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Discard draft
        </button>
      </div>
    </section>
  );
}
