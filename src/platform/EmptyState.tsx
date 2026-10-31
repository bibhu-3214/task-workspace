import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
export default function EmptyState({
  icon: Icon,
  title,
  description,
  children,
  level = 2,
  eyebrow = "A little room for what’s next",
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  children: ReactNode;
  level?: 2 | 3;
  eyebrow?: string;
}) {
  const Heading = level === 3 ? "h3" : "h2";
  return (
    <div className="relative isolate overflow-hidden rounded-3xl border border-line bg-surface px-6 py-12 text-center shadow-[0_8px_32px_-24px_#17203340] sm:px-10 sm:py-14">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-36 bg-linear-to-b from-soft/60 to-transparent"
      />
      <span className="mx-auto mb-6 grid size-14 place-items-center rounded-2xl border border-line bg-surface text-primary shadow-sm ring-8 ring-soft/50">
        <Icon size={25} aria-hidden="true" />
      </span>
      <p className="text-[10px] font-semibold tracking-[.16em] text-muted uppercase">
        {eyebrow}
      </p>
      <Heading className="mt-3 text-xl font-semibold tracking-tight text-ink sm:text-2xl">
        {title}
      </Heading>
      <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-muted">
        {description}
      </p>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        {children}
      </div>
    </div>
  );
}
