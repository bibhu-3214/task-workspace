import { DayPicker } from "@daypicker/react";
import type { Matcher } from "@daypicker/react";
import { dateString, localDate } from "./dateValues";

export default function DateCalendar({
  value,
  min,
  max,
  onPick,
}: {
  value: string;
  min?: string;
  max?: string;
  onPick: (value: string) => void;
}) {
  const selected = localDate(value),
    minimum = min ? localDate(min) : undefined,
    maximum = max ? localDate(max) : undefined;
  const disabled: Matcher[] = [];
  if (minimum) disabled.push({ before: minimum });
  if (maximum) disabled.push({ after: maximum });
  let month = selected || new Date();
  if (minimum && dateString(month) < dateString(minimum)) month = minimum;
  if (maximum && dateString(month) > dateString(maximum)) month = maximum;
  const today = dateString(new Date()),
    todayDisabled = Boolean((min && today < min) || (max && today > max));
  return (
    <div className="w-[280px] max-w-[calc(100vw-24px)] text-ink">
      <DayPicker
        mode="single"
        required
        selected={selected}
        defaultMonth={month}
        disabled={disabled}
        autoFocus
        navLayout="around"
        weekStartsOn={1}
        showOutsideDays
        onSelect={(date) => onPick(dateString(date))}
        classNames={{
          root: "p-3",
          months: "flex flex-col",
          month: "relative w-full",
          month_caption: "flex h-10 items-center justify-center px-9 pb-2",
          caption_label: "text-sm font-semibold",
          button_previous:
            "absolute top-0 left-0 grid size-8 place-items-center rounded-lg text-muted transition-colors hover:bg-primary-soft hover:text-primary disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-primary",
          button_next:
            "absolute top-0 right-0 grid size-8 place-items-center rounded-lg text-muted transition-colors hover:bg-primary-soft hover:text-primary disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-primary",
          chevron: "size-4 fill-current",
          month_grid: "w-full border-collapse",
          weekday: "h-8 w-9 text-center text-[11px] font-medium text-muted",
          day: "p-0 text-center",
          day_button:
            "mx-auto grid size-9 place-items-center rounded-lg border border-transparent text-xs transition-colors enabled:hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed motion-reduce:transition-none",
          selected:
            "[&_button]:bg-primary! [&_button]:font-semibold [&_button]:text-white! dark:[&_button]:text-[#181a31]!",
          today: "[&_button]:border-primary/60 [&_button]:text-primary",
          outside: "text-muted opacity-50",
          disabled: "opacity-35",
          hidden: "invisible",
        }}
      />
      <div className="flex items-center justify-between border-t border-line px-4 py-3">
        <span className="text-[11px] text-muted">YYYY-MM-DD</span>
        <button
          type="button"
          disabled={todayDisabled}
          onClick={() => onPick(today)}
          className="rounded-lg px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary-soft disabled:cursor-not-allowed disabled:opacity-40"
        >
          Today
        </button>
      </div>
    </div>
  );
}
