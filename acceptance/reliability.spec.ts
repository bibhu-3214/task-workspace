import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
test("interrupted save recovers only after review and clears after success/sign-out", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Create an account", exact: true })
    .click();
  await page.getByLabel("Your name", { exact: true }).fill("Recovery Owner");
  await page
    .getByLabel("Email address", { exact: true })
    .fill(randomUUID() + "@example.test");
  await page.getByLabel("Password", { exact: true }).fill("BrowserOnly#4827");
  await page
    .getByRole("button", { name: "Create workspace", exact: true })
    .click();
  await expect(page.locator(".platform-session")).toBeVisible();
  await page
    .getByRole("button", { name: "Add task", exact: true })
    .first()
    .click();
  await page.getByLabel("Task title", { exact: true }).fill("Recovered Task");
  await page
    .getByLabel("Description", { exact: true })
    .fill("Do not lose this task");
  await page.getByRole("combobox", { name: "Priority", exact: true }).click();
  await page.getByRole("option", { name: "High", exact: true }).click();
  let writes = 0;
  await page.route("**/api/workspace", async (route) => {
    if (route.request().method() === "PUT") {
      writes++;
      await route.abort("internetdisconnected");
    } else await route.continue();
  });
  await page.getByRole("button", { name: "Save task", exact: true }).click();
  await expect(
    page.getByText(/check whether your change was saved/).first(),
  ).toBeVisible();
  expect(writes).toBe(1);
  await expect(page.getByLabel("Task title", { exact: true })).toHaveValue(
    "Recovered Task",
  );
  page.once("dialog", (dialog) => void dialog.accept());
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Recover draft", exact: true }),
  ).toBeVisible();
  expect(
    (
      (await page.request
        .get("/api/workspace")
        .then((response) => response.json())) as { records: unknown[] }
    ).records,
  ).toHaveLength(0);
  await page.screenshot({ path: testInfo.outputPath("draft-recovery.png") });
  await page
    .getByRole("button", { name: "Recover draft", exact: true })
    .click();
  await expect(page.getByLabel("Task title", { exact: true })).toHaveValue(
    "Recovered Task",
  );
  await expect(
    page.getByRole("combobox", { name: "Priority", exact: true }),
  ).toContainText("High");
  await page.unroute("**/api/workspace");
  await page.getByRole("button", { name: "Save task", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Recovered Task", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() =>
      Object.keys(sessionStorage).filter((key) =>
        key.includes(".tab-draft.v1."),
      ),
    ),
  ).toEqual([]);
  await page
    .getByRole("button", { name: "Add task", exact: true })
    .first()
    .click();
  await page.getByLabel("Task title", { exact: true }).fill("Recovered Task");
  await page
    .getByLabel("Description", { exact: true })
    .fill("Do not lose this task");
  await page.getByRole("combobox", { name: "Priority", exact: true }).click();
  await page.getByRole("option", { name: "High", exact: true }).click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page
    .getByRole("button", { name: "Discard changes", exact: true })
    .click();
  // A draft held in a different tab/form must still be purged at sign-out.
  await page.evaluate(() =>
    sessionStorage.setItem("task-workspace.tab-draft.v1.another", "private"),
  );
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() =>
      Object.keys(sessionStorage).filter((key) =>
        key.includes(".tab-draft.v1."),
      ),
    ),
  ).toEqual([]);
});
