import { z } from "zod";
import product from "../../product.json";
const userSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  email: z.email(),
});
export type Account = z.infer<typeof userSchema>;
const sessionSchema = z.object({
  user: userSchema.nullable(),
  csrfToken: z.string(),
});
export const accountChannel = product.id + ".account-session";
let csrf = "";
let restoring: Promise<Account | null> | undefined;
function announceSessionChange() {
  try {
    if (typeof window.BroadcastChannel === "function") {
      const channel = new window.BroadcastChannel(accountChannel);
      channel.postMessage("changed");
      channel.close();
      return;
    }
  } catch {
    /* Use the storage notification when channel access is unavailable. */
  }
  try {
    localStorage.setItem(accountChannel, crypto.randomUUID());
  } catch {
    /* A focus/reconnect still re-verifies the server session when storage is blocked. */
  }
}
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}
export async function request(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<unknown> {
  const response = await fetch("/api/" + path, {
    method,
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      ...(body !== undefined
        ? { "Content-Type": "application/json", "X-CSRFToken": csrf }
        : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new ApiError(
      "The service returned an unexpected response. Reconnect and try again.",
      response.status,
    );
  }
  if (!response.ok) {
    const parsed = z.object({ error: z.string() }).safeParse(payload);
    if (response.status === 401)
      window.dispatchEvent(new Event("workspace:expired"));
    throw new ApiError(
      parsed.success
        ? parsed.data.error
        : "The request could not finish. Please try again.",
      response.status,
    );
  }
  return payload;
}
export function restoreSession(): Promise<Account | null> {
  if (!restoring)
    restoring = (async () => {
      try {
        const session = sessionSchema.parse(await request("session"));
        csrf = session.csrfToken;
        return session.user;
      } finally {
        restoring = undefined;
      }
    })();
  return restoring;
}
export async function authenticate(
  action: "login" | "register",
  data: { email: string; password: string; name?: string },
) {
  if (!csrf) await restoreSession();
  const session = sessionSchema.parse(
    await request("auth/" + action, "POST", data),
  );
  csrf = session.csrfToken;
  if (!session.user) throw new Error("No account was returned.");
  announceSessionChange();
  return session.user;
}
export async function signOut() {
  await request("auth/logout", "POST", {});
  csrf = "";
  announceSessionChange();
}
export function workspaceSchema<T>(schema: z.ZodType<T>) {
  return z.object({
    revision: z.number().int().nonnegative(),
    records: z
      .array(schema)
      .max(10000)
      .refine((records) => {
        const ids = records.map(
          (record) => z.object({ id: z.string() }).parse(record).id,
        );
        return new Set(ids).size === ids.length;
      }, "Duplicate record IDs."),
  });
}
export function message(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}
