import product from "../product.json";
const PRODUCT = product.id;
import { act, renderHook } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import {
  readTabDraft,
  useTabDraft,
  clearTabDrafts,
} from "../src/platform/useTabDraft";
const fields = ["title", "body"];
const kinds = ["note"];
afterEach(() => {
  sessionStorage.clear();
  vi.restoreAllMocks();
});
function form() {
  const form = document.createElement("form");
  form.innerHTML =
    '<input name="title" value="Unfinished"><textarea name="body">Private text</textarea><input name="password" type="password" value="never persist"><input name="upload" type="file">';
  return form;
}
test("drafts survive remount, remain owner-scoped, and omit unlisted credentials/files", () => {
  const first = renderHook(() => useTabDraft("owner-a", fields, kinds));
  act(() => first.result.current.capture(form(), { kind: "note" }));
  expect(first.result.current.draft?.values).toEqual({
    title: "Unfinished",
    body: "Private text",
  });
  first.unmount();
  const second = renderHook(() => useTabDraft("owner-a", fields, kinds));
  expect(second.result.current.draft?.values.body).toBe("Private text");
  expect(readTabDraft("owner-b", fields, kinds)).toBeNull();
  act(() => second.result.current.clear());
  expect(readTabDraft("owner-a", fields, kinds)).toBeNull();
});
test("invalid, oversized and expired snapshots cannot become recoverable form values", () => {
  const key = PRODUCT + ".tab-draft.v1.owner";
  for (const raw of [
    "broken JSON",
    "x".repeat(100001),
    JSON.stringify({
      owner: "owner",
      kind: "note",
      savedAt: Date.now() - 86400001,
      values: { title: "old" },
    }),
    JSON.stringify({
      owner: "someone-else",
      kind: "note",
      savedAt: Date.now(),
      values: { title: "foreign" },
    }),
    JSON.stringify({
      owner: "owner",
      kind: "note",
      savedAt: Date.now(),
      values: { password: "secret" },
    }),
  ]) {
    sessionStorage.setItem(key, raw);
    expect(readTabDraft("owner", fields, kinds)).toBeNull();
    expect(sessionStorage.getItem(key)).toBeNull();
  }
});
test("blocked storage reports missing recovery and removes any stale snapshot", () => {
  const hook = renderHook(() => useTabDraft("owner", fields, kinds));
  act(() => hook.result.current.capture(form(), { kind: "note" }));
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new DOMException("Quota", "QuotaExceededError");
  });
  act(() => hook.result.current.capture(form(), { kind: "note" }));
  expect(hook.result.current.storageError).toContain("Keep this form open");
  expect(hook.result.current.draft).toBeNull();
});
test("session cleanup removes all product drafts and preserves unrelated tab data", () => {
  sessionStorage.setItem(PRODUCT + ".tab-draft.v1.owner", "private");
  sessionStorage.setItem("appearance", "dark");
  clearTabDrafts();
  expect(sessionStorage.getItem(PRODUCT + ".tab-draft.v1.owner")).toBeNull();
  expect(sessionStorage.getItem("appearance")).toBe("dark");
});
