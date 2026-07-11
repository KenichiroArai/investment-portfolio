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
      "apps/api/tests/**/*.test.ts",
      "packages/*/tests/**/*.test.ts",
    ],
    coverage: {
      provider: "v8",
      include: [
        "packages/shared/src/**/*.ts",
        "packages/db/src/**/*.ts",
      ],
      exclude: [
        "**/*.d.ts",
        "**/tests/**",
        "apps/web/next-env.d.ts",
        "apps/api/src/index.ts",
        "apps/api/src/db.ts",
        "packages/shared/src/index.ts",
        "packages/shared/src/types.ts",
        "packages/db/src/index.ts",
        "packages/db/src/migrate.ts",
        "packages/db/src/import-monex-csv-cli.ts",
        "packages/db/src/export-pages-data.ts",
        "packages/db/src/test-utils.ts",
        "packages/db/src/schema/**",
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
      "@repo/shared": path.resolve(rootDir, "packages/shared/src/index.ts"),
      "@repo/db": path.resolve(rootDir, "packages/db/src/index.ts"),
    },
  },
});
