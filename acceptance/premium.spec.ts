import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
test("guided states, deferred workspace loading and filter recovery", async ({
  page,
}) => {
  page.setDefaultTimeout(10000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const workspaceRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/src/features/work/WorkStudio.tsx"))
      workspaceRequests.push(request.url());
  });
  await page.route("**/src/features/work/WorkStudio.tsx*", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    await route.continue();
  });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeVisible();
  expect(workspaceRequests).toEqual([]);
  await page
    .getByRole("button", { name: "Create an account", exact: true })
    .click();
  await page.getByLabel("Your name", { exact: true }).fill("Polish Owner");
  await page
    .getByLabel("Email address", { exact: true })
    .fill(randomUUID() + "@example.test");
  await page.getByLabel("Password", { exact: true }).fill("BrowserOnly#4827");
  await page
    .getByRole("button", { name: "Create workspace", exact: true })
    .click();
  await expect(
    page.getByRole("main", { name: "Loading workspace" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Create a project", exact: true })
    .click();
  await page.getByLabel("Project name", { exact: true }).fill("Launch project");
  await page.getByRole("button", { name: "Save project", exact: true }).click();
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await page.getByLabel("Search work").fill("no-project-match");
  await expect(
    page.getByRole("heading", {
      name: "No projects match this view.",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Launch project", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Task board", exact: true }).click();
  await page
    .getByRole("button", { name: "Add your first task", exact: true })
    .click();
  await page
    .getByLabel("Task title", { exact: true })
    .fill("Review the launch");
  await page.getByRole("button", { name: "Save task", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Add task", exact: true }),
  ).not.toBeVisible();
  await page.getByLabel("Search work").fill("no-task-match");
  await expect(
    page.getByRole("heading", {
      name: "No tasks match this view.",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Review the launch", exact: true }),
  ).toBeVisible();
  expect(workspaceRequests.length).toBeGreaterThan(0);
  await page.setViewportSize({ width: 390, height: 844 });
  for (const name of ["Task board", "Project notes", "Projects"]) {
    const box = await page
      .getByRole("button", { name, exact: true })
      .boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
});
