import { z } from "zod";

const credentials = z.object({
  email: z.email().max(120),
  password: z.string().min(12).max(128),
});

export function localLoginForEnvironment(
  configured: unknown,
  development: boolean,
  hostname: string,
) {
  if (!development || !["127.0.0.1", "localhost", "[::1]"].includes(hostname))
    return null;
  const parsed = credentials.safeParse(configured);
  return parsed.success ? parsed.data : null;
}

export function getLocalLogin() {
  return localLoginForEnvironment(
    typeof __LOCAL_LOGIN__ === "undefined" ? null : __LOCAL_LOGIN__,
    import.meta.env.DEV,
    window.location.hostname,
  );
}
