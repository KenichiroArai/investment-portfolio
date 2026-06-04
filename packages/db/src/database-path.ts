import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(packageDir, "../../..");

export function isSampleDataModeEnabled(): boolean {
  const raw = process.env.SEED_SAMPLE_DATA;
  const result = raw === "1" || raw === "true";
  return result;
}

export function resolveDatabasePath(options?: { sample?: boolean }): string {
  const explicit = process.env.DATABASE_PATH;
  if (explicit) {
    const result = explicit;
    return result;
  }

  const useSample = options?.sample ?? isSampleDataModeEnabled();
  const fileName = useSample ? "portfolio.sample.db" : "portfolio.db";
  const result = resolve(repoRoot, "data", fileName);
  return result;
}
