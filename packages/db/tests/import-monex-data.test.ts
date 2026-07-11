import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import iconv from "iconv-lite";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { computeMonexMutualFundBookValueMinor } from "@repo/shared";

import { createTestDb } from "../src/test-utils";
import { importMonexData, listMonexImportCsvFiles } from "../src/import-monex-data";
import { listInstrumentClassificationValueIds } from "../src/repositories/classifications";
import * as classificationsRepository from "../src/repositories/classifications";
import { createInstrument, listInstruments } from "../src/repositories/instruments";
import { getCurrentSnapshot } from "../src/repositories/snapshots";
import { readCsvText } from "../src/read-csv-text";
import { instrumentClassifications } from "../src/schema/index";
import { eq } from "drizzle-orm";

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

  it("stores weighted asset class breakdown from asset class csv files", async () => {
    const { db, sqlite, path } = createTestDb();
    sqliteToClose = sqlite;
    dbPath = path;
    const importDir = join(dirname(path), "monex-import-breakdown");
    mkdirSync(importDir, { recursive: true });

    writeShiftJisTextFile(
      importDir,
      "国内株等.csv",
      `"日付","銘柄","口座区分","預り区分","基準価額(円)","分配金の取扱い","保有数(口)","平均取得単価(円)","概算評価額(円)","評価損益(円)","評価損益率"\n"2026/07/09","テスト複合ファンド","一般","特定","10,000","再投資","100","9,500","1,000","50","5.26"\n`,
    );
    writeShiftJisTextFile(
      importDir,
      "国内株式.csv",
      `"番号","日付","銘柄","保有比率","評価額(円)","評価額前日比(円)","評価額前日比率"\n"1","2026/07/09","テスト複合ファンド","0.6","600","0","0"\n`,
    );
    writeShiftJisTextFile(
      importDir,
      "国内債券.csv",
      `"番号","日付","銘柄","保有比率","評価額(円)","評価額前日比(円)","評価額前日比率"\n"1","2026/07/09","テスト複合ファンド","1.0","400","0","0"\n`,
    );

    await importMonexData(db, { directory: importDir });

    const instruments = await listInstruments(db, { portfolioCode: "monex" });
    expect(instruments).toHaveLength(1);

    const instrumentId = instruments[0]!.id;
    const classificationValueIds = await listInstrumentClassificationValueIds(
      db,
      instrumentId,
    );
    expect(classificationValueIds).toHaveLength(2);

    const rows = await db
      .select()
      .from(instrumentClassifications)
      .where(eq(instrumentClassifications.instrumentId, instrumentId));
    const weights = rows
      .map((row) => row.allocationWeight)
      .sort((left, right) => (right ?? 0) - (left ?? 0));
    expect(weights[0]).toBeCloseTo(0.6);
    expect(weights[1]).toBeCloseTo(0.4);

    const snapshot = await getCurrentSnapshot(db, "monex");
    const line = snapshot?.lines[0];
    expect(line?.tags.filter((tag) => tag.schemeCode === "monex_asset_class")).toHaveLength(2);
  });

  it("throws when directory is missing or has no importable rows", async () => {
    const { db, sqlite, path } = createTestDb();
    sqliteToClose = sqlite;
    dbPath = path;

    await expect(
      importMonexData(db, { directory: join(dirname(path), "missing-monex-dir") }),
    ).rejects.toThrow("ディレクトリが見つかりません");

    const emptyDir = join(dirname(path), "empty-monex-dir");
    mkdirSync(emptyDir, { recursive: true });
    await expect(importMonexData(db, { directory: emptyDir })).rejects.toThrow(
      "取り込み対象の明細がありません",
    );
  });

  it("imports compass fund csv rows", async () => {
    const { db, sqlite, path } = createTestDb();
    sqliteToClose = sqlite;
    dbPath = path;
    const importDir = join(dirname(path), "monex-import-compass");
    mkdirSync(importDir, { recursive: true });

    writeShiftJisTextFile(
      importDir,
      "ON COMPASS.csv",
      `"番号","日付","ファンド名","口座区分","預り区分","基準価額(円)","分配金","保有数(口)","平均取得単価(円)","概算評価額(円)","概算評価損益(円)"
"1","2026/07/09","テストコンパスF","一般","普通預り","10000","再投資","100","9500","1000","50"\n`,
    );

    const outcome = await importMonexData(db, { directory: importDir });
    expect(outcome.lineCount).toBe(1);
    expect(outcome.asOfDate).toBe("2026-07-09");
  });

  it("is idempotent on second import and lists csv files", async () => {
    const { db, sqlite, path } = createTestDb();
    sqliteToClose = sqlite;
    dbPath = path;

    const first = await importMonexData(db, { directory: shiftJisFixtureDir });
    const second = await importMonexData(db, { directory: shiftJisFixtureDir });
    expect(second.createdInstruments).toBe(0);
    expect(second.lineCount).toBe(first.lineCount);
    expect(listMonexImportCsvFiles(shiftJisFixtureDir).length).toBeGreaterThan(0);
    expect(listMonexImportCsvFiles(join(dirname(path), "missing-monex-dir"))).toEqual([]);
  });

  it("uses fallback asset class tag when only domestic holdings csv is present", async () => {
    const { db, sqlite, path } = createTestDb();
    sqliteToClose = sqlite;
    dbPath = path;
    const importDir = join(dirname(path), "monex-import-fallback");
    mkdirSync(importDir, { recursive: true });

    writeShiftJisTextFile(
      importDir,
      "国内株等.csv",
      `"日付","銘柄","口座区分","預り区分","基準価額(円)","分配金の取扱い","保有数(口)","平均取得単価(円)","概算評価額(円)","評価損益(円)","評価損益率"
"2026/07/09","テスト単独ファンド","一般","特定","10,000","再投資","100","9,500","1,000","50","5.26"\n`,
    );
    writeShiftJisTextFile(
      importDir,
      "国内株式.csv",
      `"番号","日付","銘柄","保有比率","評価額(円)","評価額前日比(円)","評価額前日比率"
"1","2026/07/09","テスト単独ファンド","1.0","1000","0","0"\n`,
    );
    writeShiftJisTextFile(
      importDir,
      "銘柄マッピング.csv",
      `"番号","日付","対応値1","対応値2"
"1","2026/07/09","","ＭＳＶ内外ＥＴＦ資産配分ファンド（Ｇコース）"
"2","2026/07/09","同一","同一"
"3","2026/07/09","CSV表記","正規表記"
"4","2026/07/09","欠落行"\n`,
    );

    await importMonexData(db, { directory: importDir });
    const instruments = await listInstruments(db, { portfolioCode: "monex" });
    expect(instruments).toHaveLength(1);
    const classificationValueIds = await listInstrumentClassificationValueIds(
      db,
      instruments[0]!.id,
    );
    expect(classificationValueIds).toHaveLength(1);
  });

  it("reuses existing instrument when alias mapping resolves to an already imported name", async () => {
    const { db, sqlite, path } = createTestDb();
    sqliteToClose = sqlite;
    dbPath = path;
    const importDir = join(dirname(path), "monex-import-alias-fallback");
    mkdirSync(importDir, { recursive: true });

    writeShiftJisTextFile(
      importDir,
      "国内株等.csv",
      `"日付","銘柄","口座区分","預り区分","基準価額(円)","分配金の取扱い","保有数(口)","平均取得単価(円)","概算評価額(円)","評価損益(円)","評価損益率"
"2026/07/09","CSV表記","一般","特定","10,000","再投資","100","9,500","1,000","50","5.26"
"2026/07/09","CSV表記","NISA","特定","10,000","再投資","50","9,500","500","25","5.26"\n`,
    );
    writeShiftJisTextFile(
      importDir,
      "国内株式.csv",
      `"番号","日付","銘柄","保有比率","評価額(円)","評価額前日比(円)","評価額前日比率"
"1","2026/07/09","正規表記","1.0","1000","0","0"\n`,
    );
    writeShiftJisTextFile(
      importDir,
      "銘柄マッピング.csv",
      `"番号","日付","対応値1","対応値2"
"1","2026/07/09","CSV表記","正規表記"\n`,
    );

    const outcome = await importMonexData(db, { directory: importDir });
    expect(outcome.lineCount).toBe(2);
    expect(outcome.createdInstruments).toBe(1);

    const instruments = await listInstruments(db, { portfolioCode: "monex" });
    expect(instruments).toHaveLength(1);
  });

  it("ignores header-only mapping files", async () => {
    const { db, sqlite, path } = createTestDb();
    sqliteToClose = sqlite;
    dbPath = path;
    const importDir = join(dirname(path), "monex-import-header-mapping");
    mkdirSync(importDir, { recursive: true });

    writeShiftJisTextFile(
      importDir,
      "国内株等.csv",
      `"日付","銘柄","口座区分","預り区分","基準価額(円)","分配金の取扱い","保有数(口)","平均取得単価(円)","概算評価額(円)","評価損益(円)","評価損益率"
"2026/07/09","テスト単独ファンド","一般","特定","10,000","再投資","100","9,500","1,000","50","5.26"\n`,
    );
    writeShiftJisTextFile(
      importDir,
      "銘柄マッピング.csv",
      `"番号","日付","対応値1","対応値2"\n`,
    );

    const outcome = await importMonexData(db, { directory: importDir });
    expect(outcome.lineCount).toBe(1);
  });

  it("falls back to single asset class tag when breakdown values are missing", async () => {
    const { db, sqlite, path } = createTestDb();
    sqliteToClose = sqlite;
    dbPath = path;
    const importDir = join(dirname(path), "monex-import-fallback-tag");
    mkdirSync(importDir, { recursive: true });

    writeShiftJisTextFile(
      importDir,
      "国内株等.csv",
      `"日付","銘柄","口座区分","預り区分","基準価額(円)","分配金の取扱い","保有数(口)","平均取得単価(円)","概算評価額(円)","評価損益(円)","評価損益率"
"2026/07/09","CSV表記","一般","特定","10,000","再投資","100","9,500","1,000","50","5.26"\n`,
    );
    writeShiftJisTextFile(
      importDir,
      "国内株式.csv",
      `"番号","日付","銘柄","保有比率","評価額(円)","評価額前日比(円)","評価額前日比率"
"1","2026/07/09","正規表記","1.0","1000","0","0"\n`,
    );
    writeShiftJisTextFile(
      importDir,
      "銘柄マッピング.csv",
      `"番号","日付","対応値1","対応値2"
"1","2026/07/09","CSV表記","正規表記"\n`,
    );

    const originalFindValue = classificationsRepository.findClassificationValueBySchemeAndCode;
    let domesticEquityLookups = 0;
    vi.spyOn(classificationsRepository, "findClassificationValueBySchemeAndCode").mockImplementation(
      async (database, schemeId, code) => {
        if (code === "domestic_equity") {
          domesticEquityLookups += 1;
          if (domesticEquityLookups === 2) {
            return null;
          }
        }
        return originalFindValue(database, schemeId, code);
      },
    );

    await importMonexData(db, { directory: importDir });

    const instruments = await listInstruments(db, { portfolioCode: "monex" });
    const classificationValueIds = await listInstrumentClassificationValueIds(
      db,
      instruments[0]!.id,
    );
    expect(classificationValueIds).toHaveLength(1);
    vi.restoreAllMocks();
  });

  it("reuses existing instrument when the same us stock appears twice", async () => {
    const { db, sqlite, path } = createTestDb();
    sqliteToClose = sqlite;
    dbPath = path;
    const importDir = join(dirname(path), "monex-import-us-duplicate");
    mkdirSync(importDir, { recursive: true });

    writeShiftJisTextFile(
      importDir,
      "米国株.csv",
      `"日付","ティッカー","銘柄名","市場","口座区分","預り区分","保有株数","概算簿価単価(円)","概算評価額(円)","概算評価損益(円)","概算評価損益率(円)"
"2026/07/09","TEST","テスト米国株","NYSE","一般","普通預り","2","7200","14400","400","2.86"
"2026/07/09","TEST","テスト米国株","NYSE","NISA","普通預り","1","7200","7200","200","2.86"\n`,
    );

    const outcome = await importMonexData(db, { directory: importDir });
    expect(outcome.lineCount).toBe(2);
    expect(outcome.createdInstruments).toBe(1);
    expect(await listInstruments(db, { portfolioCode: "monex" })).toHaveLength(1);
  });

  it("applies fallback asset class tag using direct instrument name lookup", async () => {
    const { db, sqlite, path } = createTestDb();
    sqliteToClose = sqlite;
    dbPath = path;
    const importDir = join(dirname(path), "monex-import-direct-fallback");
    mkdirSync(importDir, { recursive: true });

    writeShiftJisTextFile(
      importDir,
      "国内株等.csv",
      `"日付","銘柄","口座区分","預り区分","基準価額(円)","分配金の取扱い","保有数(口)","平均取得単価(円)","概算評価額(円)","評価損益(円)","評価損益率"
"2026/07/09","テスト単独","一般","特定","10,000","再投資","100","9,500","1,000","50","5.26"\n`,
    );
    writeShiftJisTextFile(
      importDir,
      "国内株式.csv",
      `"番号","日付","銘柄","保有比率","評価額(円)","評価額前日比(円)","評価額前日比率"
"1","2026/07/09","テスト単独","1.0","1000","0","0"\n`,
    );

    const originalFindValue = classificationsRepository.findClassificationValueBySchemeAndCode;
    let domesticEquityLookups = 0;
    vi.spyOn(classificationsRepository, "findClassificationValueBySchemeAndCode").mockImplementation(
      async (database, schemeId, code) => {
        if (code === "domestic_equity") {
          domesticEquityLookups += 1;
          if (domesticEquityLookups === 2) {
            return null;
          }
        }
        return originalFindValue(database, schemeId, code);
      },
    );

    await importMonexData(db, { directory: importDir });

    const instruments = await listInstruments(db, { portfolioCode: "monex" });
    const classificationValueIds = await listInstrumentClassificationValueIds(
      db,
      instruments[0]!.id,
    );
    expect(classificationValueIds).toHaveLength(1);
    vi.restoreAllMocks();
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

  it("strips utf8 bom", () => {
    writeFileSync(tempPath, "\uFEFF" + "a,b\n1,2", "utf8");
    expect(readCsvText(tempPath)).toBe("a,b\n1,2");
  });
});
