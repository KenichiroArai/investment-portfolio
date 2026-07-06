import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import iconv from "iconv-lite";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { createTestDb } from "../src/test-utils";
import { importMonexData } from "../src/import-monex-data";
import { getCurrentSnapshot } from "../src/repositories/snapshots";
import { readCsvText } from "../src/read-csv-text";

const packageDir = dirname(fileURLToPath(import.meta.url));
const utf8FixtureDir = join(packageDir, "../../shared/tests/fixtures/monex");
const shiftJisFixtureDir = join(packageDir, "fixtures/monex-shift-jis");

function writeShiftJisFixture(fileName: string) {
  const sourcePath = join(utf8FixtureDir, fileName);
  const targetPath = join(shiftJisFixtureDir, fileName);
  const utf8Content = readFileSync(sourcePath, "utf8");
  writeFileSync(targetPath, iconv.encode(utf8Content, "Shift_JIS"));
}

describe("importMonexData", () => {
  let dbPath = "";

  beforeAll(() => {
    if (!existsSync(shiftJisFixtureDir)) {
      mkdirSync(shiftJisFixtureDir, { recursive: true });
    }
    writeShiftJisFixture("国内株等.csv");
    writeShiftJisFixture("米国株.csv");
    writeShiftJisFixture("国内株式.csv");
  });

  afterEach(() => {
    if (dbPath && existsSync(dbPath)) {
      rmSync(dbPath, { force: true });
      const dir = join(dbPath, "..");
      if (existsSync(dir)) {
        rmSync(dir, { recursive: true, force: true });
      }
    }
  });

  it("imports monex holdings from fixture directory", async () => {
    const { db, dbFile } = createTestDb();
    dbPath = dbFile;

    const outcome = await importMonexData(db, { directory: shiftJisFixtureDir });
    expect(outcome.lineCount).toBeGreaterThan(0);
    expect(outcome.asOfDate).toBe("2026-07-05");

    const snapshot = await getCurrentSnapshot(db, "monex");
    expect(snapshot).not.toBeNull();
    expect(snapshot?.lines.length).toBe(outcome.lineCount);
    expect(
      snapshot?.analysisSchemes.some(
        (scheme) => scheme.schemeCode === "monex_asset_class",
      ),
    ).toBe(true);
  });
});

describe("readCsvText", () => {
  const tempPath = join(packageDir, "tmp-read-csv-text.csv");

  afterEach(() => {
    if (existsSync(tempPath)) {
      rmSync(tempPath, { force: true });
    }
  });

  it("reads utf8 csv", () => {
    writeFileSync(tempPath, "a,b\n1,2", "utf8");
    expect(readCsvText(tempPath)).toBe("a,b\n1,2");
  });

  it("reads shift_jis csv", () => {
    const utf8Content = readFileSync(
      join(utf8FixtureDir, "国内株等.csv"),
      "utf8",
    );
    writeFileSync(tempPath, iconv.encode(utf8Content, "Shift_JIS"));
    const content = readCsvText(tempPath, { encoding: "shift_jis" });
    expect(content).toContain("テストファンドＡ");
  });
});
