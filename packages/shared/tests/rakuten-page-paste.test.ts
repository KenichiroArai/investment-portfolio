import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  detectRakutenPasteFormat,
  parseRakutenPaste,
  parseRakutenPagePasteBlockForTest,
  RakutenPasteError,
} from "../src/index";

const dir = dirname(fileURLToPath(import.meta.url));

const pageSample = readFileSync(
  join(dir, "fixtures/rakuten-page-paste.txt"),
  "utf8",
);

describe("parseRakutenPagePaste", () => {
  it("detects page format for UI copy paste", () => {
    const lines = pageSample.split("\n").filter((line) => line.trim() !== "");
    expect(detectRakutenPasteFormat(lines)).toBe("page");
  });

  it("parses wrap cash block in isolation", () => {
    const parsed = parseRakutenPagePasteBlockForTest({
      kind: "wrap_cash",
      lines: ["現金等", "現金等［円］", "315", "合計", "315"],
      index: 0,
    });
    expect(parsed.row.marketValueMinor).toBe(315);
  });

  it("parses holdings before wrap cash section", () => {
    const lines = pageSample.split("\n").filter((line) => line.trim() !== "");
    const cashIndex = lines.findIndex((line) => line.trim() === "現金等");
    const partial = lines.slice(0, cashIndex).join("\n");
    const parsed = parseRakutenPaste(partial);
    expect(parsed.holdings.length).toBeGreaterThan(0);
  });

  it("parses the full page fixture with 45 holdings", () => {
    const parsed = parseRakutenPaste(pageSample);
    const bySource: Record<string, number> = {};

    for (const row of parsed.holdings) {
      bySource[row.source] = (bySource[row.source] ?? 0) + 1;
    }

    if (parsed.holdings.length !== 45) {
      const summary = parsed.holdings.map(
        (row) => `${row.source}:${row.ticker ?? row.instrumentName.slice(0, 20)}`,
      );
      throw new Error(`expected 45 holdings, got ${parsed.holdings.length}: ${summary.join(", ")}`);
    }

    expect(parsed.holdings).toHaveLength(45);
    expect(bySource).toEqual({
      domestic_equity: 11,
      mutual_fund: 6,
      fx_mmf: 1,
      domestic_bond: 2,
      wrap_fund: 23,
      wrap_cash: 1,
      money_fund: 1,
    });
  });

  it("parses domestic equity from page format", () => {
    const parsed = parseRakutenPaste(`特定口座
1489	
ＮＦ日経高配当５０
1 株
3,285.00 円
3,285 円
3,585.0 円
-66.0 円
3,585 円
+300 円`);

    expect(parsed.holdings).toHaveLength(1);
    expect(parsed.holdings[0].source).toBe("domestic_equity");
    expect(parsed.holdings[0].ticker).toBe("1489");
    expect(parsed.holdings[0].accountType).toBe("特定");
    expect(parsed.holdings[0].marketValueMinor).toBe(3585);
  });

  it("skips filter tab lines without throwing", () => {
    expect(() =>
      parseRakutenPaste(`すべて
国内株式
投信`),
    ).toThrow(RakutenPasteError);

    try {
      parseRakutenPaste(`すべて
国内株式
投信`);
    } catch (error) {
      expect(error).toBeInstanceOf(RakutenPasteError);
      if (error instanceof RakutenPasteError) {
        expect(error.message).toBe("保有明細を1件も読み取れませんでした");
        expect(error.hint).toContain("保有商品一覧");
      }
    }
  });

  it("skips standalone section headers in legacy format", () => {
    expect(() => parseRakutenPaste("国内株式\n未対応行")).toThrow(RakutenPasteError);
    expect(() => parseRakutenPaste("投資信託\n未対応行")).toThrow(RakutenPasteError);
  });
});
