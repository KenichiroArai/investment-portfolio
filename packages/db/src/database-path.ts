import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(packageDir, "../../..");

export function resolveDatabasePath(): string {
  let result = resolve(repoRoot, "data", "portfolio.db");

  const explicit = process.env.DATABASE_PATH;
  if (explicit) {
    result = explicit;
    return result;
  }

  return result;
}
