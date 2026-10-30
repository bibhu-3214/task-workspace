import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { z } from "zod";
import product from "../product.json" with { type: "json" };
const password = "BrowserOnly#4827";
async function createRecord(page: Page, title: string, amount = "10.29") {
  if (product.kind === "candidate") {
    await page
      .getByRole("link", { name: "Candidate intake", exact: true })
      .click();
    await page.getByLabel("Full name", { exact: true }).fill(title);
    await page
      .getByLabel("Email address", { exact: true })
      .fill("candidate-" + randomUUID() + "@example.test");
    await page.getByLabel("Phone number", { exact: true }).fill("1234567890");
    await page.getByLabel("Years of experience", { exact: true }).fill("3");
    await page.getByLabel("Skills", { exact: true }).fill("React, TypeScript");
    await page
      .getByRole("button", { name: "Add candidate", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "View " + title, exact: true }),
    ).toBeVisible();
    return;
  }
  const noun = product.kind === "order" ? "order" : product.kind;
  await page.getByRole("button", { name: "Add " + noun, exact: true }).click();
  const modal = page.getByRole("dialog", { name: "Add " + noun, exact: true });
  if (product.kind === "note") {
    await modal.getByLabel("Title", { exact: true }).fill(title);
    await modal
      .getByLabel("Note", { exact: true })
      .fill("A private idea saved through the account API.");
    await modal.getByLabel("Tag", { exact: true }).fill("Ideas");
  }
  if (product.kind === "task") {
    await modal.getByLabel("Task title", { exact: true }).fill(title);
    await modal
      .getByLabel("Description", { exact: true })
      .fill("Review the new workspace.");
    await modal
      .getByRole("textbox", { name: "Due date", exact: true })
      .fill("2026-11-15");
    await modal
      .getByRole("button", { name: "Choose Due date", exact: true })
      .click();
    const calendar = page.getByRole("dialog", {
      name: "Due date calendar",
      exact: true,
    });
    await expect(calendar).toBeVisible();
    await calendar.getByRole("button", { name: "Today", exact: true }).click();
    await expect(calendar).not.toBeVisible();
    await modal
      .getByRole("textbox", { name: "Due date", exact: true })
      .fill("2026-11-15");
  }
  if (product.kind === "movie") {
    await modal.getByLabel("Movie title", { exact: true }).fill(title);
    await modal.getByLabel("Your rating (0–10)", { exact: true }).fill("8.5");
    await modal
      .getByLabel("Your review", { exact: true })
      .fill("A personal review, not an external rating.");
  }
  if (product.kind === "order") {
    await modal.getByLabel("Customer name", { exact: true }).fill(title);
    await modal.getByLabel("Phone number", { exact: true }).fill("1234567890");
    await modal
      .getByRole("textbox", { name: "Order date", exact: true })
      .fill("2026-10-30");
    await modal
      .getByRole("button", { name: "Choose Order date", exact: true })
      .click();
    const calendar = page.getByRole("dialog", {
      name: "Order date calendar",
      exact: true,
    });
    await expect(calendar).toBeVisible();
    await calendar.getByRole("button", { name: "Today", exact: true }).click();
    await expect(calendar).not.toBeVisible();
    await modal
      .getByRole("textbox", { name: "Order date", exact: true })
      .fill("2026-10-30");
    await modal.getByLabel("Amount (₹)", { exact: true }).fill(amount);
  }
  await modal
    .getByRole("button", { name: "Save " + noun, exact: true })
    .click();
  await expect(modal).not.toBeVisible();
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
}
for (const [name, width, height] of [
  ["desktop", 1440, 1000],
  ["tablet", 820, 1180],
  ["phone", 390, 844],
] as const) {
  test(
    name + ": private account, saved workflow, export and sign-out",
    async ({ page }) => {
      await page.setViewportSize({ width, height });
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto("/");
      await page
        .getByRole("button", { name: "Create an account", exact: true })
        .click();
      const email = "browser-" + randomUUID() + "@example.test";
      await page.getByLabel("Your name", { exact: true }).fill("Browser Owner");
      await page.getByLabel("Email address", { exact: true }).fill(email);
      await page.getByLabel("Password", { exact: true }).fill(password);
      await page
        .getByRole("button", { name: "Create workspace", exact: true })
        .click();
      await expect(
        page.getByText("Account workspace", { exact: false }).first(),
      ).toBeVisible();
      const title = "Browser Sample " + name;
      await createRecord(page, title);
      await page.reload();
      if (product.kind === "candidate") {
        await page
          .getByRole("link", { name: "Candidates", exact: false })
          .first()
          .click();
        await expect(
          page.getByRole("button", { name: "View " + title, exact: true }),
        ).toBeVisible();
        await page
          .getByRole("button", { name: "View " + title, exact: true })
          .click();
        await page
          .getByRole("button", { name: "Shortlist", exact: true })
          .click();
        await expect(
          page.getByRole("dialog").getByText("Shortlisted", { exact: true }),
        ).toBeVisible();
        await page.keyboard.press("Escape");
      } else {
        await expect(
          page.getByRole("heading", { name: title, exact: true }),
        ).toBeVisible();
        if (product.kind === "task") {
          await page
            .getByRole("button", { name: "Mark complete", exact: true })
            .click();
          await expect(
            page.getByRole("button", { name: "Reopen task", exact: true }),
          ).toBeVisible();
        }
        if (product.kind === "note") {
          await page
            .getByRole("button", { name: "Pin note", exact: true })
            .click();
          await expect(
            page.getByRole("button", { name: "Unpin", exact: true }),
          ).toBeVisible();
        }
        if (product.kind === "order") {
          await createRecord(page, title + " repeat", "0.71");
          await expect(page.getByText("₹11.00", { exact: true })).toBeVisible();
          await page
            .getByRole("button", { name: "Customer history", exact: true })
            .first()
            .click();
          await expect(page.getByRole("dialog").locator("article")).toHaveCount(
            2,
          );
          await page.keyboard.press("Escape");
        }
        await page
          .getByRole("button", { name: "Edit " + title, exact: true })
          .click();
        const dialog = page.getByRole("dialog");
        const input = dialog.getByLabel(
          product.kind === "note"
            ? "Title"
            : product.kind === "task"
              ? "Task title"
              : product.kind === "movie"
                ? "Movie title"
                : "Customer name",
          { exact: true },
        );
        await input.fill(title + " updated");
        await page.keyboard.press("Escape");
        await expect(
          page.getByRole("dialog", { name: "Discard unsaved changes?" }),
        ).toBeVisible();
        await page
          .getByRole("button", { name: "Keep editing", exact: true })
          .click();
        await expect(input).toHaveValue(title + " updated");
        await dialog
          .getByRole("button", {
            name: "Save " + (product.kind === "order" ? "order" : product.kind),
            exact: true,
          })
          .click();
        await expect(
          page.getByRole("heading", { name: title + " updated", exact: true }),
        ).toBeVisible();
      }
      const exporting = page.waitForEvent("download");
      await page
        .getByRole("button", {
          name:
            product.kind === "candidate" ? "Export candidates" : "Export JSON",
          exact: true,
        })
        .click();
      const file = await exporting;
      const path = "output/" + product.id + "-" + name + "-export.json";
      await file.saveAs(path);
      const raw: unknown = JSON.parse(await readFile(path, "utf8"));
      const backup = z
        .object({
          version: z.literal(1),
          product: z.string(),
          records: z.array(z.unknown()),
        })
        .parse(raw);
      expect(backup.product).toBe(product.id);
      expect(backup.records.length).toBeGreaterThan(0);
      const importInput = page.getByLabel(
        product.kind === "candidate"
          ? "Import candidates JSON"
          : "Import workspace JSON",
        { exact: true },
      );
      const importTitle =
        product.kind === "candidate"
          ? "Replace candidate workspace?"
          : "Replace workspace from export?";
      await importInput.setInputFiles(path);
      await expect(
        page.getByRole("dialog", { name: importTitle, exact: true }),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "Cancel import", exact: true })
        .click();
      await expect(
        page.getByRole("dialog", { name: importTitle, exact: true }),
      ).not.toBeVisible();
      await importInput.setInputFiles(path);
      await page
        .getByRole("dialog", { name: importTitle, exact: true })
        .getByRole("button", {
          name:
            product.kind === "candidate"
              ? "Replace candidates"
              : "Replace workspace",
          exact: true,
        })
        .click();
      await expect(
        page.getByRole("dialog", { name: importTitle, exact: true }),
      ).not.toBeVisible();
      if (product.kind === "candidate") {
        await page
          .getByRole("link", { name: "Candidates", exact: false })
          .first()
          .click();
        await expect(
          page.getByRole("button", { name: "View " + title, exact: true }),
        ).toBeVisible();
      } else {
        await expect(
          page.getByRole("heading", { name: title + " updated", exact: true }),
        ).toBeVisible();
      }

      await page.evaluate(() => {
        if (document.activeElement instanceof HTMLElement)
          document.activeElement.blur();
        document.querySelectorAll(".table-scroll").forEach((element) => {
          element.scrollLeft = 0;
        });
        window.scrollTo(0, 0);
      });
      await page.screenshot({
        path: "output/" + product.id + "-" + name + "-light.png",
        fullPage: true,
        animations: "disabled",
      });
      if (product.kind === "candidate")
        await page
          .getByRole("button", { name: "Dark theme", exact: true })
          .click();
      else
        await page
          .getByRole("button", { name: "Switch to dark mode", exact: true })
          .click();
      await page.evaluate(() => {
        if (document.activeElement instanceof HTMLElement)
          document.activeElement.blur();
        document.querySelectorAll(".table-scroll").forEach((element) => {
          element.scrollLeft = 0;
        });
        window.scrollTo(0, 0);
      });
      await page.screenshot({
        path: "output/" + product.id + "-" + name + "-dark.png",
        fullPage: true,
        animations: "disabled",
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
      await page.getByLabel("Email address", { exact: true }).fill(email);
      await page.getByLabel("Password", { exact: true }).fill(password);
      await page.getByRole("button", { name: "Sign in", exact: true }).click();
      await expect(
        page.getByRole("button", { name: "Sign out", exact: true }),
      ).toBeVisible();
      await page.getByRole("button", { name: "Sign out", exact: true }).click();
      await page.reload();
      await expect(
        page.getByRole("button", { name: "Sign in", exact: true }),
      ).toBeVisible();
    },
  );
}
