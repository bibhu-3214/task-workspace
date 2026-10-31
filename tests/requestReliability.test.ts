import product from "../product.json";
const PRODUCT = product.id;
import { afterEach, expect, test, vi } from "vitest";
import {
  request,
  REQUEST_TIMEOUT_MS,
  ApiError,
} from "../src/platform/workspaceApi";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.restoreAllMocks();
  sessionStorage.clear();
});
test("a hung request times out once and aborts without retrying", async () => {
  vi.useFakeTimers();
  const fetcher = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    return new Promise<Response>(() => {});
  });
  vi.stubGlobal("fetch", fetcher);
  const result = request("workspace").catch((error: unknown) => error);
  await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);
  expect(await result).toBeInstanceOf(ApiError);
  expect(((await result) as ApiError).message).toContain("too long");
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(fetcher.mock.calls[0][1]?.signal?.aborted).toBe(true);
  expect(vi.getTimerCount()).toBe(0);
});
test("deadline includes a response body that never finishes", async () => {
  vi.useFakeTimers();
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue({
        status: 200,
        ok: true,
        json: () => new Promise<unknown>(() => {}),
      }),
  );
  const result = request("workspace").catch((error: unknown) => error);
  await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);
  expect(((await result) as ApiError).message).toContain("too long");
});
test("failed writes keep the outcome uncertain and never replay automatically", async () => {
  const fetcher = vi.fn().mockRejectedValue(new TypeError("offline"));
  vi.stubGlobal("fetch", fetcher);
  await expect(
    request("workspace", "PUT", { revision: 1, records: [] }),
  ).rejects.toThrow("check whether your change was saved");
  expect(fetcher).toHaveBeenCalledTimes(1);
});
test("an expired session clears drafts even when the error body is malformed", async () => {
  sessionStorage.setItem(PRODUCT + ".tab-draft.v1.1", "private draft");
  const expired = vi.fn();
  window.addEventListener("workspace:expired", expired);
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response("upstream error", { status: 401 })),
  );
  await expect(request("workspace")).rejects.toBeInstanceOf(ApiError);
  expect(expired).toHaveBeenCalledOnce();
  expect(sessionStorage.getItem(PRODUCT + ".tab-draft.v1.1")).toBeNull();
  window.removeEventListener("workspace:expired", expired);
});
