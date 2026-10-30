import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as Select from "@radix-ui/react-select";
import { Check, ChevronDown, X } from "lucide-react";
export function Button({
  children,
  className = "",
  tone = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: "primary" | "quiet" | "danger";
}) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50 ${tone === "primary" ? "bg-primary text-white dark:text-slate-950 shadow-sm hover:bg-primary/90" : tone === "danger" ? "bg-danger/10 text-danger hover:bg-danger/20" : "bg-soft text-ink hover:bg-line"} ${className}`}
    >
      {children}
    </button>
  );
}
export const controlClass =
  "w-full min-w-0 rounded-xl border border-line bg-field px-3.5 py-3 text-sm text-ink outline-none transition-shadow focus:border-primary focus:ring-3 focus:ring-primary/15 disabled:opacity-50 placeholder:text-muted";
export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={controlClass + " " + (props.className || "")}
    />
  );
}
export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={controlClass + " min-h-32 " + (props.className || "")}
    />
  );
}
export function Dropdown({
  id,
  label,
  name,
  value,
  defaultValue,
  options,
  onChange,
  required,
  disabled,
}: {
  id?: string;
  label: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  options: readonly { value: string; label: string }[];
  onChange?: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <Select.Root
      name={name}
      value={value}
      defaultValue={defaultValue}
      onValueChange={onChange}
      required={required}
      disabled={disabled}
    >
      <Select.Trigger
        id={id}
        aria-label={label}
        className={
          controlClass +
          " inline-flex items-center justify-between gap-3 text-left"
        }
      >
        <Select.Value placeholder={"Choose " + label.toLowerCase()} />
        <Select.Icon>
          <ChevronDown size={16} aria-hidden="true" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          position="popper"
          sideOffset={6}
          collisionPadding={12}
          className="z-[70] min-w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-24px)] overflow-hidden rounded-xl border border-line bg-surface p-1.5 text-ink shadow-xl"
        >
          <Select.Viewport className="max-h-72 overflow-y-auto">
            {options.map((option) => (
              <Select.Item
                key={option.value}
                value={option.value}
                className="relative cursor-default rounded-lg py-3 pr-4 pl-9 text-sm outline-none data-[highlighted]:bg-soft data-[highlighted]:text-primary"
              >
                <Select.ItemIndicator className="absolute left-3">
                  <Check size={14} aria-hidden="true" />
                </Select.ItemIndicator>
                <Select.ItemText>{option.label}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
export function Modal({
  open,
  title,
  children,
  onClose,
  busy = false,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  busy?: boolean;
}) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(value) => {
        if (!value && !busy) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="workspace-overlay fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-sm" />
        <Dialog.Content
          onPointerDownOutside={(event) => {
            if (busy) event.preventDefault();
          }}
          onEscapeKeyDown={(event) => {
            if (busy) event.preventDefault();
          }}
          className="fixed top-1/2 left-1/2 z-[60] grid max-h-[calc(100dvh-24px)] w-[min(600px,calc(100%-24px))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-line bg-surface p-6 text-ink shadow-2xl sm:p-7"
        >
          <header className="mb-5 flex items-center justify-between gap-4">
            <Dialog.Title className="text-xl font-semibold tracking-tight">
              {title}
            </Dialog.Title>
            <button
              type="button"
              disabled={busy}
              aria-label="Close dialog"
              onClick={onClose}
              className="grid size-9 place-items-center rounded-lg text-muted hover:bg-soft focus-visible:outline-2 focus-visible:outline-primary"
            >
              <X size={18} />
            </button>
          </header>
          <Dialog.Description className="sr-only">
            {title}. Changes are saved only after confirmation.
          </Dialog.Description>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
