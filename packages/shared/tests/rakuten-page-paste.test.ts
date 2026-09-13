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

  it("throws when wrap cash has no market value row", () => {
    expect(() =>
      parseRakutenPagePasteBlockForTest({
        kind: "wrap_cash",
        lines: ["現金等", "詳細"],
        index: 0,
      }),
    ).toThrow(RakutenPasteError);
  });

  it("skips noise and total rows while parsing wrap cash", () => {
    const parsed = parseRakutenPagePasteBlockForTest({
      kind: "wrap_cash",
      lines: ["現金等", "あし", "315", "合計", "315", "次のセクション"],
      index: 0,
    });
    expect(parsed.row.marketValueMinor).toBe(315);
    expect(parsed.nextIndex).toBe(5);
  });

  it("breaks wrap cash scan when a non-numeric non-noise line appears first", () => {
    expect(() =>
      parseRakutenPagePasteBlockForTest({
        kind: "wrap_cash",
        lines: ["現金等", "評価対象外テキスト"],
        index: 0,
      }),
    ).toThrow(/楽ラップ現金等の時価評価額行がありません/);
  });

  it("throws on truncated or invalid numeric page blocks", () => {
    expect(() =>
      parseRakutenPagePasteBlockForTest({
        kind: "mutual_fund",
        lines: ["テストオープンファンド"],
        index: 0,
        accountTypeRaw: "特定",
      }),
    ).toThrow(/数値行がありません/);

    expect(() =>
      parseRakutenPagePasteBlockForTest({
        kind: "mutual_fund",
        lines: ["テストオープンファンド", "数量ではない"],
        index: 0,
        accountTypeRaw: "特定",
      }),
    ).toThrow(/数値が読み取れません/);

    const truncatedGain = parseRakutenPagePasteBlockForTest({
      kind: "wrap_fund",
      lines: [
        "【楽ラップ専用】テストファンド＜ラップ専用＞",
        "10",
        "1,000.00",
        "1,100",
        "11",
      ],
      index: 0,
    });
    expect(truncatedGain.row.source).toBe("wrap_fund");
    expect(truncatedGain.row.marketValueMinor).toBe(11);
  });

  it("throws when page paste finds no holdings", () => {
    expect(() =>
      parseRakutenPaste(`特定口座
すべて
国内株式
投信`),
    ).toThrow(/保有明細を1件も読み取れませんでした/);
  });

  it("parses each page block kind via the test helper", () => {
    const mutual = parseRakutenPagePasteBlockForTest({
      kind: "mutual_fund",
      lines: [
        "テストオープンファンド",
        "1,000",
        "10,000",
        "10,000",
        "10,000",
        "+0",
        "10,000",
        "+0.00 %",
      ],
      index: 0,
      accountTypeRaw: "特定",
    });
    expect(mutual.row.source).toBe("mutual_fund");

    const wrapFund = parseRakutenPagePasteBlockForTest({
      kind: "wrap_fund",
      lines: [
        "【楽ラップ専用】テストファンド＜ラップ専用＞",
        "10",
        "1,000.00",
        "1,100",
        "11",
        "+1",
        "+1.00 %",
      ],
      index: 0,
    });
    expect(wrapFund.row.source).toBe("wrap_fund");

    const bond = parseRakutenPagePasteBlockForTest({
      kind: "domestic_bond",
      lines: [
        "個人国債　変動10年　第195回",
        "2036/07/15",
        "FR",
        "20,000",
        "20,000",
        "100.00",
        "100.0000 %",
        "0",
        "0.00 %",
      ],
      index: 0,
      accountTypeRaw: "特定",
    });
    expect(bond.row.source).toBe("domestic_bond");

    const fx = parseRakutenPagePasteBlockForTest({
      kind: "fx_mmf",
      lines: [
        "ノーザン・トラスト・米ドル・リクイディティ・ファンド(楽天・米ドルMMF)",
        "米ドル",
        "2,820 口",
        "0.00 USD",
        "16,010.63 円",
        "4,515 円",
        "158.71 円 / USD",
        "（09/02 22:50）",
        "4,475 円",
        "-40 円",
      ],
      index: 0,
      accountTypeRaw: "特定",
    });
    expect(fx.row.source).toBe("fx_mmf");

    const money = parseRakutenPagePasteBlockForTest({
      kind: "money_fund",
      lines: ["楽天・マネーファンド", "100,000 口", "5 円", "100,005 円"],
      index: 0,
      accountTypeRaw: "特定",
    });
    expect(money.row.source).toBe("money_fund");

    const equity = parseRakutenPagePasteBlockForTest({
      kind: "domestic_equity",
      lines: [
        "1489",
        "ＮＦ日経高配当５０",
        "1 株",
        "3,285.00 円",
        "3,285 円",
        "3,585.0 円",
        "-66.0 円",
        "3,585 円",
        "+300 円",
      ],
      index: 0,
      accountTypeRaw: "特定",
    });
    expect(equity.row.source).toBe("domestic_equity");

    expect(() =>
      parseRakutenPagePasteBlockForTest({
        kind: "domestic_equity",
        lines: ["1489", "", "1 株"],
        index: 0,
        accountTypeRaw: "特定",
      }),
    ).toThrow(/銘柄名が空/);

    expect(() =>
      parseRakutenPagePasteBlockForTest({
        kind: "domestic_equity",
        lines: ["ABCD"],
        index: 0,
        accountTypeRaw: "特定",
      }),
    ).toThrow(/銘柄コードが読み取れません/);

    expect(() =>
      parseRakutenPagePasteBlockForTest({
        kind: "domestic_equity",
        lines: ["1489"],
        index: 0,
        accountTypeRaw: "特定",
      }),
    ).toThrow(/銘柄名行がありません/);
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
