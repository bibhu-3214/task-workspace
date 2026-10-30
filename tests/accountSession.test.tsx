import { StrictMode } from "react";
import { afterEach, expect, test, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { z } from "zod";
import AccountWorkspaceGate from "../src/platform/AccountWorkspaceGate";
const schema = z.object({ id: z.string(), title: z.string() });
const ownerA = { id: 1, name: "Owner A", email: "owner-a@example.test" },
  ownerB = { id: 2, name: "Owner B", email: "owner-b@example.test" };
const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test("a failed account refresh clears the previous private workspace", async () => {
  let changed = false;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) =>
      String(input).endsWith("/session")
        ? json({ user: changed ? ownerB : ownerA, csrfToken: "test-csrf" })
        : changed
          ? json({ error: "Offline fixture" }, 503)
          : json({
              revision: 1,
              records: [{ id: "private-a", title: "Secret from owner A" }],
            }),
    ),
  );
  render(
    <AccountWorkspaceGate schema={schema}>
      {(state) => (
        <div>
          {state.records.map((record) => (
            <p key={record.id}>{record.title}</p>
          ))}
        </div>
      )}
    </AccountWorkspaceGate>,
  );
  await screen.findByText("Secret from owner A");
  changed = true;
  fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
  await screen.findByRole("alert");
  expect(screen.queryByText("Secret from owner A")).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Sign out" }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Sign in" })).toBeVisible();
});

test("StrictMode shares initial session restoration instead of racing CSRF cookies", async () => {
  const fetcher = vi.fn(async (input: RequestInfo | URL) =>
    String(input).endsWith("/session")
      ? json({ user: ownerA, csrfToken: "test-csrf" })
      : json({ revision: 0, records: [] }),
  );
  vi.stubGlobal("fetch", fetcher);
  render(
    <StrictMode>
      <AccountWorkspaceGate schema={schema}>
        {() => <p>Private workspace ready</p>}
      </AccountWorkspaceGate>
    </StrictMode>,
  );
  await screen.findByText("Private workspace ready");
  await waitFor(() =>
    expect(
      fetcher.mock.calls.filter(([input]) =>
        String(input).endsWith("/session"),
      ),
    ).toHaveLength(1),
  );
});
