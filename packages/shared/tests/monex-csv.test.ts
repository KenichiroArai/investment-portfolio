import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  buildMonexAssetClassNameMap,
  parseMonexDomesticHoldingsCsv,
  parseMonexUsStocksCsv,
} from "../src/index";

const fixtureDir = join(dirname(fileURLToPath(import.meta.url)), "fixtures/monex");

describe("monex csv parsers", () => {
  it("parses domestic holdings csv", () => {
    const content = readFileSync(join(fixtureDir, "国内株等.csv"), "utf8");
    const parsed = parseMonexDomesticHoldingsCsv(content);

    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0]).toMatchObject({
      asOfDate: "2026-07-05",
      instrumentName: "テストファンドＡ",
      accountType: "一般",
      quantity: 100,
      marketValueMinor: 1000,
      unrealizedGainRate: 0.0526,
    });
  });

  it("parses us stocks csv", () => {
    const content = readFileSync(join(fixtureDir, "米国株.csv"), "utf8");
    const parsed = parseMonexUsStocksCsv(content);

    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0]).toMatchObject({
      ticker: "TEST",
      instrumentName: "テスト米国株",
      quantity: 2,
      marketValueMinor: 14400,
    });
  });

  it("builds asset class map from csv files", () => {
    const content = readFileSync(join(fixtureDir, "国内株式.csv"), "utf8");
    const map = buildMonexAssetClassNameMap(
      [{ fileName: "国内株式.csv", content }],
      {
        "国内株式.csv": { code: "domestic_equity", name: "国内株式" },
      },
    );

    expect(map.get("テストファンドＡ")).toBe("domestic_equity");
  });
});
