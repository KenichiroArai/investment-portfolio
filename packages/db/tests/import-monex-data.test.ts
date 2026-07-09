import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import iconv from "iconv-lite";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { computeMonexMutualFundBookValueMinor } from "@repo/shared";

import { createTestDb } from "../src/test-utils";
import { importMonexData } from "../src/import-monex-data";
import { createInstrument, listInstruments } from "../src/repositories/instruments";
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

function writeShiftJisTextFile(directory: string, fileName: string, content: string) {
  let result: void = undefined;
  const targetPath = join(directory, fileName);
  writeFileSync(targetPath, iconv.encode(content, "Shift_JIS"));
  return result;
}

describe("importMonexData", () => {
  let dbPath = "";
  let sqliteToClose: { close: () => void } | null = null;
  const mappingFilePath = join(shiftJisFixtureDir, "銘柄マッピング.csv");

  beforeAll(() => {
    if (!existsSync(shiftJisFixtureDir)) {
      mkdirSync(shiftJisFixtureDir, { recursive: true });
    }
    writeShiftJisFixture("国内株等.csv");
    writeShiftJisFixture("米国株.csv");
    writeShiftJisFixture("国内株式.csv");
  });

  afterEach(() => {
    if (sqliteToClose) {
      sqliteToClose.close();
      sqliteToClose = null;
    }
    if (existsSync(mappingFilePath)) {
      rmSync(mappingFilePath, { force: true });
    }
    if (dbPath && existsSync(dbPath)) {
      rmSync(dbPath, { force: true });
    }
  });

  it("imports monex holdings from fixture directory", async () => {
    const { db, sqlite, path } = createTestDb();
    sqliteToClose = sqlite;
    dbPath = path;

    const outcome = await importMonexData(db, { directory: shiftJisFixtureDir });
    expect(outcome.lineCount).toBeGreaterThan(0);
    expect(outcome.asOfDate).toBe("2026-07-05");

    const snapshot = await getCurrentSnapshot(db, "monex");
    expect(snapshot).not.toBeNull();
    expect(snapshot?.portfolioKind).toBe("monex");
    expect(snapshot?.lines.length).toBe(outcome.lineCount);
    const domesticLine = snapshot?.lines.find(
      (line) => line.instrumentName === "テストファンドＡ",
    );
    expect(domesticLine?.accountId).toBe("monex:一般:普通預り");
    expect(domesticLine?.accountName).toBe("一般 / 普通預り");
    expect(domesticLine?.bookValueMinor).toBe(
      computeMonexMutualFundBookValueMinor(9500, 100),
    );
    expect(
      snapshot?.analysisSchemes.some(
        (scheme) => scheme.schemeCode === "monex_asset_class",
      ),
    ).toBe(true);
  });

  it("does not create duplicate instrument when mapping aliases existing instrument", async () => {
    const { db, sqlite, path } = createTestDb();
    sqliteToClose = sqlite;
    dbPath = path;
    const importDir = join(dirname(path), "monex-import-with-mapping");
    mkdirSync(importDir, { recursive: true });

    await createInstrument(db, {
      portfolioCode: "monex",
      accountId: "monex:一般:特定",
      name: "ＭＳＶ内外ＥＴＦ資産配分ファンド（Ｇコース）",
      instrumentType: "mutual_fund",
      currency: "JPY",
      externalId: null,
    });

    writeShiftJisTextFile(
      importDir,
      "国内株等.csv",
      `"日付","銘柄","口座区分","預り区分","基準価額(円)","分配金の取扱い","保有数(口)","平均取得単価(円)","概算評価額(円)","評価損益(円)","評価損益率"\n"2026/07/09","ＭＳＶ内外ＥＴＦ資産配分Ｆ・Ｇ","一般","特定","10,000","再投資","100","9,500","1,000","50","5.26"\n`,
    );
    writeShiftJisTextFile(
      importDir,
      "銘柄マッピング.csv",
      `"番号","日付","対応値1","対応値2"\n"1","2026/07/09","ＭＳＶ内外ＥＴＦ資産配分Ｆ・Ｇ","ＭＳＶ内外ＥＴＦ資産配分ファンド（Ｇコース）"\n`,
    );

    const outcome = await importMonexData(db, { directory: importDir });
    expect(outcome.createdInstruments).toBe(0);

    const instruments = await listInstruments(db, { portfolioCode: "monex" });
    expect(instruments).toHaveLength(1);
    expect(instruments[0]?.name).toBe("ＭＳＶ内外ＥＴＦ資産配分ファンド（Ｇコース）");
  });

  it("creates new instrument when mapping file is not present", async () => {
    const { db, sqlite, path } = createTestDb();
    sqliteToClose = sqlite;
    dbPath = path;
    const importDir = join(dirname(path), "monex-import-without-mapping");
    mkdirSync(importDir, { recursive: true });

    await createInstrument(db, {
      portfolioCode: "monex",
      accountId: "monex:一般:特定",
      name: "ＭＳＶ内外ＥＴＦ資産配分ファンド（Ｇコース）",
      instrumentType: "mutual_fund",
      currency: "JPY",
      externalId: null,
    });

    writeShiftJisTextFile(
      importDir,
      "国内株等.csv",
      `"日付","銘柄","口座区分","預り区分","基準価額(円)","分配金の取扱い","保有数(口)","平均取得単価(円)","概算評価額(円)","評価損益(円)","評価損益率"\n"2026/07/09","ＭＳＶ内外ＥＴＦ資産配分Ｆ・Ｇ","一般","特定","10,000","再投資","100","9,500","1,000","50","5.26"\n`,
    );

    const outcome = await importMonexData(db, { directory: importDir });
    expect(outcome.createdInstruments).toBe(1);

    const instruments = await listInstruments(db, { portfolioCode: "monex" });
    expect(instruments).toHaveLength(2);
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
