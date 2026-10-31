import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import WorkspaceBoundary from "../src/platform/WorkspaceBoundary";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.removeItem("polish.recovery.fixture");
});
test("a failed workspace view preserves saved data and offers focused recovery", () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  localStorage.setItem("polish.recovery.fixture", "saved record");
  function BrokenView(): never {
    throw new Error("Simulated view load failure");
  }
  render(
    <WorkspaceBoundary>
      <BrokenView />
    </WorkspaceBoundary>,
  );
  expect(screen.getByRole("alert")).toHaveTextContent(
    "This view couldn’t open",
  );
  expect(
    screen.getByRole("button", { name: "Reload workspace" }),
  ).toBeVisible();
  expect(screen.getByRole("main")).toHaveFocus();
  expect(localStorage.getItem("polish.recovery.fixture")).toBe("saved record");
});
