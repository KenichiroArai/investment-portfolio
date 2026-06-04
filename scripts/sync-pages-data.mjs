import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const sourceDir = resolve(repoRoot, "docs/data");
const targetDir = resolve(repoRoot, "apps/web/public/data");

if (!existsSync(sourceDir)) {
  console.warn(`sync-pages-data: source missing (${sourceDir}), skipping`);
  process.exit(0);
}

if (existsSync(targetDir)) {
  rmSync(targetDir, { recursive: true, force: true });
}

mkdirSync(dirname(targetDir), { recursive: true });
cpSync(sourceDir, targetDir, { recursive: true });
console.log(`sync-pages-data: ${sourceDir} -> ${targetDir}`);
