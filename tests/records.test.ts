import { describe, it, expect } from "vitest";
import {
  fromForm,
  taskSchema,
  movieSchema,
  noteSchema,
  orderSchema,
  orderSummary,
  csvCell,
} from "../src/platform/records";
const base = {
  id: "fixture",
  createdAt: "2026-10-30T09:00:00.000Z",
  updatedAt: "2026-10-30T09:00:00.000Z",
};
describe("workspace record validation", () => {
  it("rejects impossible dates and invalid task status", () => {
    expect(
      taskSchema.safeParse({
        ...base,
        title: "Review",
        description: "",
        priority: "Normal",
        dueDate: "2026-02-30",
        status: "Done",
      }).success,
    ).toBe(false);
    expect(
      taskSchema.safeParse({
        ...base,
        title: "Review",
        description: "",
        priority: "Normal",
        dueDate: "",
        status: "finished",
      }).success,
    ).toBe(false);
  });
  it("rejects excessive ratings and empty notes", () => {
    expect(
      movieSchema.safeParse({
        ...base,
        title: "Movie",
        year: 2020,
        rating: 11,
        genre: "Drama",
        status: "Watched",
        notes: "",
      }).success,
    ).toBe(false);
    expect(
      noteSchema.safeParse({
        ...base,
        title: "Note",
        body: " ",
        tag: "",
        pinned: false,
      }).success,
    ).toBe(false);
  });
  it("keeps order amounts in integer minor units", () => {
    const data = new FormData();
    for (const [key, value] of Object.entries({
      name: "Sample Buyer",
      phone: "1234567890",
      date: "2026-10-30",
      amount: "0.29",
    }))
      data.set(key, value);
    expect(fromForm("order", data)).toMatchObject({ amountMinor: 29 });
    data.set("amount", "0.001");
    expect(() => fromForm("order", data)).toThrow();
  });
  it("groups customers by normalized phone and counts all orders", () => {
    const one = orderSchema.parse({
      ...base,
      name: "Sample Buyer",
      phone: "123 456 7890",
      date: "2026-10-30",
      amountMinor: 29,
    });
    const two = { ...one, id: "second", phone: "1234567890", amountMinor: 71 };
    expect(orderSummary([one, two])).toMatchObject({
      count: 2,
      total: 100,
      customers: [{ count: 2, total: 100 }],
    });
  });
  it("escapes spreadsheet formula prefixes and CSV quotes", () => {
    expect(csvCell('=IMPORTXML("url")')).toBe('"\'=IMPORTXML(""url"")"');
    expect(csvCell("ordinary")).toBe('"ordinary"');
  });
});
