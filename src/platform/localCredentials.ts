import { z } from "zod";

const credentials = z.object({
  email: z.email().max(120),
  password: z.string().min(12).max(128),
});

export function localCredentialsForEnvironment(
  configured: unknown,
  development: boolean,
  hostname: string,
) {
  if (!development || !["127.0.0.1", "localhost", "[::1]"].includes(hostname))
    return null;
  const parsed = credentials.safeParse(configured);
  return parsed.success ? parsed.data : null;
}

export function getLocalCredentials() {
  return localCredentialsForEnvironment(
    typeof __LOCAL_CREDENTIALS__ === "undefined" ? null : __LOCAL_CREDENTIALS__,
    import.meta.env.DEV,
    window.location.hostname,
  );
}
