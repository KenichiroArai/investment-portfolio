import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: [
      "apps/web/tests/**/*.test.{ts,tsx}",
      "packages/*/tests/**/*.test.ts",
    ],
    coverage: {
      provider: "v8",
      include: [
        "apps/web/src/**/*.{ts,tsx}",
        "apps/web/next.config.ts",
        "packages/shared/src/**/*.ts",
        "packages/ui/src/**/*.ts",
      ],
      exclude: [
        "**/*.d.ts",
        "**/tests/**",
        "apps/web/next-env.d.ts",
        "packages/shared/src/index.ts",
        "packages/ui/src/index.ts",
      ],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "apps/web/src"),
    },
  },
});
