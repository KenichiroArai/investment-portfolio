import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(packageDir, "../../..");

export function resolveDatabasePath(): string {
  const explicit = process.env.DATABASE_PATH;
  if (explicit) {
    const result = explicit;
    return result;
  }

  const result = resolve(repoRoot, "data", "portfolio.db");
  return result;
}
