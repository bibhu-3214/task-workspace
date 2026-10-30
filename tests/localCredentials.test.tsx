import { afterEach, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { z } from "zod";
import AccountWorkspaceGate from "../src/platform/AccountWorkspaceGate";
import {
  getLocalCredentials,
  localCredentialsForEnvironment,
} from "../src/platform/localCredentials";

vi.mock("../src/platform/localCredentials", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("../src/platform/localCredentials")
  >()),
  getLocalCredentials: vi.fn(),
}));
const local = {
  email: "local.owner@fixture.test",
  password: "LocalFixtureOnly#4827",
};
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

test("local credentials require development, a loopback browser and valid fields", () => {
  expect(localCredentialsForEnvironment(local, true, "127.0.0.1")).toEqual(
    local,
  );
  expect(localCredentialsForEnvironment(local, true, "localhost")).toEqual(
    local,
  );
  expect(localCredentialsForEnvironment(local, false, "localhost")).toBeNull();
  expect(
    localCredentialsForEnvironment(local, true, "host.example.test"),
  ).toBeNull();
  expect(
    localCredentialsForEnvironment({ email: local.email }, true, "localhost"),
  ).toBeNull();
  expect(localCredentialsForEnvironment(null, true, "localhost")).toBeNull();
});

test("local login is prefilled and editable, while signup starts blank", async () => {
  vi.mocked(getLocalCredentials).mockReturnValue(local);
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(JSON.stringify({ user: null, csrfToken: "fixture" }), {
          headers: { "Content-Type": "application/json" },
        }),
    ),
  );
  render(
    <AccountWorkspaceGate schema={z.object({ id: z.string() })}>
      {() => <p>Workspace</p>}
    </AccountWorkspaceGate>,
  );
  const email = await screen.findByLabelText("Email address", { exact: true });
  const password = screen.getByLabelText("Password", { exact: true });
  expect(email).toHaveValue(local.email);
  expect(password).toHaveValue(local.password);
  expect(password).toHaveAttribute("type", "password");
  fireEvent.change(email, { target: { value: "another@example.test" } });
  expect(email).toHaveValue("another@example.test");
  fireEvent.click(screen.getByRole("button", { name: "Create an account" }));
  expect(screen.getByLabelText("Email address", { exact: true })).toHaveValue(
    "",
  );
  expect(screen.getByLabelText("Password", { exact: true })).toHaveValue("");
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
  expect(screen.getByLabelText("Email address", { exact: true })).toHaveValue(
    local.email,
  );
  expect(screen.getByLabelText("Password", { exact: true })).toHaveValue(
    local.password,
  );
});
