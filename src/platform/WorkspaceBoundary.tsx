import { Component, createRef, type PropsWithChildren } from "react";
import { RefreshCw } from "lucide-react";
export default class WorkspaceBoundary extends Component<
  PropsWithChildren,
  { failed: boolean }
> {
  override state = { failed: false };
  private panel = createRef<HTMLElement>();
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override componentDidCatch() {
    this.panel.current?.focus({ preventScroll: true });
  }
  override render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main
        ref={this.panel}
        tabIndex={-1}
        className="grid min-h-screen place-items-center bg-canvas p-5 text-ink outline-none"
      >
        <section
          role="alert"
          className="w-full max-w-lg rounded-3xl border border-line bg-surface p-8 shadow-sm sm:p-10"
        >
          <span className="mb-6 grid size-12 place-items-center rounded-2xl bg-soft text-primary">
            <RefreshCw size={22} aria-hidden="true" />
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">
            Let’s get you back to your workspace.
          </h1>
          <p className="mt-4 text-sm leading-7 text-muted">
            This view couldn’t open. Reload to try again. Your saved records
            remain in your account; unfinished edits may need to be entered
            again.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-sm hover:brightness-95 dark:text-slate-950"
          >
            <RefreshCw size={16} aria-hidden="true" />
            Reload workspace
          </button>
        </section>
      </main>
    );
  }
}
