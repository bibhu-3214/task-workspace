import product from "../../product.json";
export default function WorkspaceLoading() {
  return (
    <main
      aria-busy="true"
      aria-label="Loading workspace"
      className="min-h-screen bg-canvas p-5 text-ink sm:p-10"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 flex items-center gap-3">
          <span
            className="grid size-10 place-items-center rounded-xl bg-primary text-lg font-semibold text-white dark:text-slate-950"
            aria-hidden="true"
          >
            {product.title.charAt(0)}
          </span>
          <div>
            <p className="text-sm font-semibold">{product.title}</p>
            <p role="status" className="mt-1 text-xs text-muted">
              Opening your workspace…
            </p>
          </div>
        </div>
        <div
          aria-hidden="true"
          className="grid gap-6 motion-safe:animate-pulse"
        >
          <div className="rounded-3xl border border-line bg-surface p-8">
            <div className="h-3 w-24 rounded-full bg-soft" />
            <div className="mt-5 h-7 w-3/4 max-w-md rounded-lg bg-soft" />
            <div className="mt-4 h-3 w-1/2 rounded-full bg-soft" />
          </div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[0, 1, 2, 3].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-line bg-surface p-5"
              >
                <div className="h-3 w-16 rounded-full bg-soft" />
                <div className="mt-5 h-8 w-20 rounded-lg bg-soft" />
              </div>
            ))}
          </div>
          <div className="h-64 rounded-3xl border border-line bg-surface" />
        </div>
      </div>
    </main>
  );
}
