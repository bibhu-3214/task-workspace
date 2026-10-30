import { z } from "zod";
import { isNote, noteSchema, type WorkRecord, type Note } from "../work/model";
export interface NotesImport {
  notes: Note[];
  duplicates: number;
  sourceCount: number;
}
export async function reviewNotesImport(
  raw: unknown,
  current: readonly WorkRecord[],
  projectId: string,
): Promise<NotesImport> {
  const saved = z
    .object({
      version: z.literal(1),
      product: z.enum(["notes", "notes-workspace"]),
      records: z.array(noteSchema).max(10000),
    })
    .strict()
    .parse(raw);
  if (
    new Set(saved.records.map((note) => note.id)).size !== saved.records.length
  )
    throw new Error("The source file contains duplicate IDs.");
  const existing = new Map(current.map((record) => [record.id, record]));
  let duplicates = 0;
  const notes: Note[] = [];
  for (const note of saved.records) {
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode("notes-workspace:" + note.id),
    );
    const id =
      "import-note-" +
      Array.from(new Uint8Array(digest))
        .map((value) => value.toString(16).padStart(2, "0"))
        .join("")
        .slice(0, 48);
    const previous = existing.get(id);
    if (previous) {
      if (!isNote(previous))
        throw new Error("An import ID conflicts with an existing record.");
      duplicates++;
      continue;
    }
    notes.push({ ...note, id, recordType: "note", projectId });
  }
  if (current.length + notes.length > 10000)
    throw new Error("The combined workspace exceeds 10,000 records.");
  return { notes, duplicates, sourceCount: saved.records.length };
}
