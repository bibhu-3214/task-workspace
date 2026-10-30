import {
  forwardRef,
  lazy,
  Suspense,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { InputHTMLAttributes } from "react";
import * as Popover from "@radix-ui/react-popover";
import { CalendarDays } from "lucide-react";
import { changeNativeValue } from "./nativeEvents";
import { localDate } from "./dateValues";
const DateCalendar = lazy(() =>
  import("./DateCalendar").catch(() => ({
    default: () => (
      <p
        role="status"
        className="max-w-[280px] p-5 text-xs leading-relaxed text-muted"
      >
        The calendar is unavailable. You can still type a date in YYYY-MM-DD
        format.
      </p>
    ),
  })),
);

interface DateControlProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> {
  fieldLabel?: string;
}
export default forwardRef<HTMLInputElement, DateControlProps>(
  function DateControl(
    { fieldLabel = "date", value, min, max, ...props },
    forwardedRef,
  ) {
    const input = useRef<HTMLInputElement | null>(null);
    const [open, setOpen] = useState(false);
    const raw = String(value ?? ""),
      minimum = min === undefined ? undefined : String(min),
      maximum = max === undefined ? undefined : String(max);
    useLayoutEffect(() => {
      const problem =
        raw && !localDate(raw)
          ? "Use a real date in YYYY-MM-DD format."
          : raw && minimum && raw < minimum
            ? `Choose ${minimum} or later.`
            : raw && maximum && raw > maximum
              ? `Choose ${maximum} or earlier.`
              : "";
      input.current?.setCustomValidity(problem);
    }, [raw, minimum, maximum]);
    return (
      <>
        <input
          {...props}
          ref={(node) => {
            input.current = node;
            if (typeof forwardedRef === "function") forwardedRef(node);
            else if (forwardedRef) forwardedRef.current = node;
          }}
          type="text"
          inputMode="numeric"
          value={raw}
          placeholder="YYYY-MM-DD"
          maxLength={10}
          autoComplete="off"
        />
        <Popover.Root open={open} onOpenChange={setOpen}>
          <Popover.Trigger asChild>
            <button
              type="button"
              aria-label={`Choose ${fieldLabel}`}
              disabled={props.disabled || props.readOnly}
              className="mr-1.5 grid size-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-primary-soft hover:text-primary focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40"
            >
              <CalendarDays size={17} aria-hidden="true" />
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              sideOffset={8}
              collisionPadding={12}
              align="end"
              aria-label={`${fieldLabel} calendar`}
              className="pointer-events-auto z-[1600] overflow-hidden rounded-xl border border-line bg-surface text-ink shadow-[0_18px_52px_#0f172a26] outline-none backdrop-blur-xl dark:shadow-[0_18px_52px_#00000055]"
            >
              <Suspense
                fallback={
                  <p role="status" className="p-5 text-xs text-muted">
                    Loading calendar…
                  </p>
                }
              >
                <DateCalendar
                  value={raw}
                  min={minimum}
                  max={maximum}
                  onPick={(date) => {
                    if (input.current && !input.current.matches(":disabled")) {
                      changeNativeValue(input.current, date);
                      setOpen(false);
                    }
                  }}
                />
              </Suspense>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </>
    );
  },
);
