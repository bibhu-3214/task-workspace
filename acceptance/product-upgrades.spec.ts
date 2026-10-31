import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { z } from "zod";
async function register(page: Page) {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Create an account", exact: true })
    .click();
  await page.getByLabel("Your name", { exact: true }).fill("Product Owner");
  await page
    .getByLabel("Email address", { exact: true })
    .fill(randomUUID() + "@example.test");
  await page.getByLabel("Password", { exact: true }).fill("BrowserOnly#4827");
  await page
    .getByRole("button", { name: "Create workspace", exact: true })
    .click();
  await expect(page.locator(".platform-session")).toBeVisible();
}
async function seed(page: Page, records: unknown[]) {
  const session = z
    .object({ csrfToken: z.string() })
    .parse(
      await page.request
        .get("/api/session")
        .then((response) => response.json()),
    );
  const response = await page.request.put("/api/workspace", {
    data: { revision: 0, records },
    headers: { "X-CSRFToken": session.csrfToken },
  });
  expect(response.ok()).toBe(true);
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
}

test("today and overdue views exclude finished work and quick entry survives a failed save", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.setFixedTime(new Date());
  await register(page);
  const dates = await page.evaluate(() => {
    const date = new Date();
    const fmt = (value: Date) =>
      `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
    const today = fmt(date);
    date.setDate(date.getDate() - 1);
    return { today, yesterday: fmt(date) };
  });
  const stamp = new Date().toISOString();
  const records = [
    {
      id: "today",
      title: "Due today task",
      dueDate: dates.today,
      status: "To do",
    },
    {
      id: "overdue",
      title: "Overdue task",
      dueDate: dates.yesterday,
      status: "To do",
    },
    {
      id: "finished",
      title: "Finished task",
      dueDate: dates.yesterday,
      status: "Done",
    },
  ].map((record) => ({
    ...record,
    recordType: "task",
    description: "",
    priority: "Normal",
    createdAt: stamp,
    updatedAt: stamp,
  }));
  await seed(page, records);
  const focus = page.getByRole("group", { name: "Task focus", exact: true });
  await page.getByLabel("Search work", { exact: true }).fill("Overdue");
  await expect(focus.getByRole("button", { name: /^Due today/ })).toHaveText(
    "Due today0",
  );
  await expect(focus.getByRole("button", { name: /^Overdue/ })).toHaveText(
    "Overdue1",
  );
  await page.getByLabel("Search work", { exact: true }).fill("");
  await focus.getByRole("button", { name: /^Due today/ }).click();
  await expect(
    page.getByRole("heading", { name: "Due today task", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Overdue task", exact: true }),
  ).toHaveCount(0);
  await focus.getByRole("button", { name: /^Overdue/ }).click();
  await expect(
    page.getByRole("heading", { name: "Overdue task", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Finished task", exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("Quick task title", { exact: true }).fill("Focus next");
  await page.getByLabel("Quick task title", { exact: true }).press("Enter");
  await expect(
    focus.getByRole("button", { name: /^Due today/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("heading", { name: "Focus next", exact: true }),
  ).toBeVisible();
  const saved = (await page.request
    .get("/api/workspace")
    .then((response) => response.json())) as {
    records: { title: string; dueDate: string }[];
  };
  expect(
    saved.records.find((record) => record.title === "Focus next")?.dueDate,
  ).toBe(dates.today);
  await page.route("**/api/workspace", async (route) => {
    if (route.request().method() === "PUT")
      await route.abort("internetdisconnected");
    else await route.continue();
  });
  await page
    .getByLabel("Quick task title", { exact: true })
    .fill("Keep this quick task");
  await page.getByRole("button", { name: "Quick add", exact: true }).click();
  await expect(
    page.getByText(/check whether your change was saved/).first(),
  ).toBeVisible();
  page.once("dialog", (dialog) => void dialog.accept());
  await page.reload();
  await page
    .getByRole("button", { name: "Recover draft", exact: true })
    .click();
  await expect(
    page.getByLabel("Quick task title", { exact: true }),
  ).toHaveValue("Keep this quick task");
  await page.unroute("**/api/workspace");
  await page.getByRole("button", { name: "Quick add", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Keep this quick task", exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("region", { name: "Task focus and quick add" })
    .scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("task-focus-phone.png") });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
});
