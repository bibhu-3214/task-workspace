import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
for (const width of [1440, 390])
  test(`project board and reviewed Notes transfer at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    await page
      .getByRole("button", { name: "Create an account", exact: true })
      .click();
    await page.getByLabel("Your name", { exact: true }).fill("Project Owner");
    await page
      .getByLabel("Email address", { exact: true })
      .fill(randomUUID() + "@example.test");
    await page.getByLabel("Password", { exact: true }).fill("BrowserOnly#4827");
    await page
      .getByRole("button", { name: "Create workspace", exact: true })
      .click();
    await expect(
      page.getByText("Account workspace", { exact: false }).first(),
    ).toBeVisible();
    await page.getByRole("button", { name: "Projects", exact: true }).click();
    await page
      .getByRole("button", { name: "New project", exact: true })
      .first()
      .click();
    let dialog = page.getByRole("dialog", { name: "Add project", exact: true });
    await dialog.getByLabel("Project name", { exact: true }).fill("Launch");
    await dialog
      .getByRole("button", { name: "Save project", exact: true })
      .click();
    await expect(dialog).not.toBeVisible();
    await page.getByRole("button", { name: "Task board", exact: true }).click();
    await page
      .getByRole("button", { name: "Add task", exact: true })
      .first()
      .click();
    dialog = page.getByRole("dialog", { name: "Add task", exact: true });
    await dialog
      .getByLabel("Task title", { exact: true })
      .fill("Review launch");
    await dialog
      .getByRole("combobox", { name: "Project", exact: true })
      .click();
    await page.getByRole("option", { name: "Launch", exact: true }).click();
    await dialog
      .getByRole("button", { name: "Save task", exact: true })
      .click();
    await expect(dialog).not.toBeVisible();
    await page
      .getByRole("button", { name: "Mark complete", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Reopen task", exact: true }),
    ).toBeVisible();
    const stamp = {
      createdAt: "2026-10-30T09:00:00.000Z",
      updatedAt: "2026-10-30T09:00:00.000Z",
    };
    const file = {
      name: "notes.json",
      mimeType: "application/json",
      buffer: Buffer.from(
        JSON.stringify({
          version: 1,
          product: "notes-workspace",
          records: [
            {
              ...stamp,
              id: "source-note",
              title: "Imported research",
              body: "Preserve this private note",
              tag: "Ideas",
              pinned: true,
            },
          ],
        }),
      ),
    };
    const upload = page.getByLabel("Import Notes Workspace JSON", {
      exact: true,
    });
    await upload.setInputFiles(file);
    dialog = page.getByRole("dialog", {
      name: "Review Notes Workspace import",
      exact: true,
    });
    await expect(dialog).toBeVisible();
    await dialog
      .getByRole("button", { name: "Cancel import", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Imported research", exact: true }),
    ).toHaveCount(0);
    await upload.setInputFiles(file);
    await dialog
      .getByRole("button", { name: "Import notes", exact: true })
      .click();
    await expect(dialog).not.toBeVisible();
    await page
      .getByRole("button", { name: "Project notes", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Imported research", exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Imported research", exact: true }),
    ).toBeVisible();
    await upload.setInputFiles(file);
    await expect(dialog.getByText(/0 new/)).toBeVisible();
    await dialog
      .getByRole("button", { name: "Cancel import", exact: true })
      .click();
    const downloading = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Export JSON", exact: true })
      .click();
    const download = await downloading;
    const path = "output/combined-" + width + ".json";
    await download.saveAs(path);
    const backup: unknown = JSON.parse(await readFile(path, "utf8"));
    expect(backup).toMatchObject({
      version: 2,
      product: "task-workspace",
      records: expect.arrayContaining([
        expect.objectContaining({
          title: "Imported research",
          body: "Preserve this private note",
        }),
        expect.objectContaining({ title: "Review launch", status: "Done" }),
        expect.objectContaining({ recordType: "project", name: "Launch" }),
      ]),
    });
    await page
      .getByRole("button", { name: "Switch to dark mode", exact: true })
      .click();
    await page.screenshot({
      path: "output/task-focused-" + width + ".png",
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    expect(errors).toEqual([]);
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Sign in", exact: true }),
    ).toBeVisible();
  });
