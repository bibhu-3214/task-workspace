import { useState } from "react";
import DateControl from "./DateControl";
export default function DateInput({
  id,
  name,
  label,
  defaultValue,
  required,
}: {
  id: string;
  name: string;
  label: string;
  defaultValue?: string;
  required?: boolean;
}) {
  const [value, setValue] = useState(defaultValue || "");
  return (
    <div className="flex min-w-0 items-center rounded-xl border border-line bg-field focus-within:border-primary focus-within:ring-3 focus-within:ring-primary/15">
      <DateControl
        id={id}
        name={name}
        fieldLabel={label}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        required={required}
        className="min-w-0 flex-1 border-0 bg-transparent px-3.5 py-3 text-sm text-ink outline-none"
      />
    </div>
  );
}
