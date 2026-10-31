import { useEffect, useState } from "react";
import { z } from "zod";
import product from "../../product.json";
const prefix = product.id + ".tab-draft.v1.";
const maxSize = 100_000;
const maxAge = 24 * 60 * 60 * 1000;
const schema = z
  .object({
    owner: z.string().max(100),
    kind: z.string().max(30),
    recordId: z.string().max(100).optional(),
    base: z.string().max(40_000).optional(),
    savedAt: z.number().finite(),
    values: z.record(z.string(), z.string().max(24_000)),
  })
  .strict();
export type TabDraft = z.infer<typeof schema>;
export type DraftContext = Pick<TabDraft, "kind" | "recordId" | "base">;
export function clearTabDrafts() {
  try {
    for (const key of Object.keys(sessionStorage)) {
      if (key.startsWith(prefix)) sessionStorage.removeItem(key);
    }
  } catch {
    /* Storage can be blocked. Server data is unaffected. */
  }
}
export function readTabDraft(
  owner: string,
  fields: readonly string[],
  kinds: readonly string[],
): TabDraft | null {
  const key = prefix + owner;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    if (raw.length > maxSize) throw new Error("Oversized draft");
    const draft = schema.parse(JSON.parse(raw) as unknown);
    if (
      draft.owner !== owner ||
      !kinds.includes(draft.kind) ||
      Object.keys(draft.values).some((name) => !fields.includes(name)) ||
      draft.savedAt > Date.now() ||
      Date.now() - draft.savedAt > maxAge
    )
      throw new Error("Invalid draft");
    return draft;
  } catch {
    try {
      sessionStorage.removeItem(key);
    } catch {
      /* Storage unavailable. */
    }
    return null;
  }
}
export function useBeforeUnload(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
}
export function useTabDraft(
  owner: string,
  fields: readonly string[],
  kinds: readonly string[],
) {
  const [draft, setDraft] = useState(() => readTabDraft(owner, fields, kinds));
  const [storageError, setStorageError] = useState("");
  function capture(form: HTMLFormElement, context: DraftContext) {
    const data = new FormData(form);
    const values: Record<string, string> = {};
    for (const name of fields) {
      const control = form.elements.namedItem(name);
      if (
        control instanceof HTMLInputElement &&
        ["password", "file"].includes(control.type)
      )
        continue;
      const value = data.get(name);
      if (typeof value === "string") values[name] = value;
    }
    try {
      const next = schema.parse({
        ...context,
        owner,
        savedAt: Date.now(),
        values,
      });
      if (!kinds.includes(next.kind)) throw new Error("Invalid kind");
      const raw = JSON.stringify(next);
      if (raw.length > maxSize) throw new Error("Draft too large");
      sessionStorage.setItem(prefix + owner, raw);
      setDraft(next);
      setStorageError("");
    } catch {
      // Never offer an older snapshot as if it contained the latest keystroke.
      try {
        sessionStorage.removeItem(prefix + owner);
      } catch {
        /* Storage unavailable. */
      }
      setDraft(null);
      setStorageError(
        "Draft recovery is unavailable in this tab. Keep this form open until you save.",
      );
    }
  }
  function clear() {
    try {
      sessionStorage.removeItem(prefix + owner);
    } catch {
      /* Storage unavailable. */
    }
    setDraft(null);
    setStorageError("");
  }
  return { draft, capture, clear, storageError };
}
