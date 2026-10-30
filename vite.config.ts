import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import product from "./product.json" with { type: "json" };
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { z } from "zod";
export default defineConfig(({ command, mode, isPreview }) => {
  const loginFile = fileURLToPath(
    new URL("./api/.local/local-login.json", import.meta.url),
  );
  let localLogin: { email: string; password: string } | null = null;
  if (
    command === "serve" &&
    !isPreview &&
    mode === "development" &&
    process.env.WORKSPACE_LOCAL_LOGIN === "1" &&
    existsSync(loginFile)
  ) {
    const raw: unknown = JSON.parse(readFileSync(loginFile, "utf8"));
    localLogin = z
      .object({ email: z.email(), password: z.string().min(12).max(128) })
      .parse(raw);
  }
  return {
    define: { __LOCAL_LOGIN__: JSON.stringify(localLogin) },
    plugins: [tailwindcss(), react()],
    server: {
      host: "127.0.0.1",
      port: product.webPort,
      strictPort: true,
      fs: {
        deny: [
          ".env",
          ".env.*",
          "**/.git/**",
          "**/api/**",
          "**/.cache/**",
          "**/.venv/**",
        ],
      },
      watch: {
        ignored: ["**/output/**", "**/test-results/**", "**/artifacts/**"],
      },
      proxy: {
        "/api": {
          target: "http://127.0.0.1:" + product.apiPort,
          changeOrigin: false,
        },
      },
    },
    preview: {
      host: "127.0.0.1",
      port: product.webPort + 100,
      strictPort: true,
    },
    test: {
      environment: "jsdom",
      setupFiles: ["./tests/setup.ts"],
      include: ["tests/**/*.test.{ts,tsx}"],
    },
  };
});
