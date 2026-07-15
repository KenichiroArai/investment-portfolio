import { describe, expect, it } from "vitest";

import {
  MonexCsvError,
  parseMonexAssetClassPaste,
  parseMonexCompassFundPaste,
  parseMonexDomesticHoldingsPaste,
  parseMonexPaste,
  parseMonexUsStocksPaste,
  splitMonexPasteLines,
} from "../src/index";

const domesticSample = `投資信託
時価総額	24,511円 評価損益 合計	-401円
銘柄	口座区分
預り区分	基準価額（円）
前日比	分配金の
取扱い	保有数（口）	平均取得単価
（円）	概算評価額（円）	評価損益（円）
評価損益率	取引
ｅＭＡＸＩＳ　Ｓｌｉｍ　新興国株式インデックス	特定
普通預り	27,406
-101	再投資コース
再投資中
（変更）	1,357	29,138	3,718	
-236
-5.94%	買付
売却

乗換
ｅＭＡＸＩＳ　Ｓｌｉｍ　国内株式（ＴＯＰＩＸ）	一般
普通預り	32,138
+125	再投資コース
再投資中
（変更）	311	32,155	999	
-1
-0.05%	買付
売却`;

const usSample = `銘柄	市場	口座区分
預り区分	保有株数	概算簿価単価
（参考値）	概算取得金額
概算評価額	概算評価損益
概算評価損益率	取引
JEPQ
ＪＰモルガン・ナスダック米国株式・プレミアム・インカムＥＴＦ	米国	特定
保護	1
61.13US$	61.13US$
60.51US$	-0.62US$
-1.01%	取引
9,913円	9,913円
9,789円	-124円
-1.25%`;

const compassSample = `投資信託
ファンド名	口座区分
預り区分	基準価額	分配金	保有数（口）
発注数（口）	平均取得単価
（円）	概算評価額
（円）	概算評価損益
（円）
ＭＳＶ内外ＥＴＦ資産配分Ｆ・Ｇ	特定
普通預り	29,502	受取	
3,431

0

29,147	10,122	+122`;

const assetClassSample = `銘柄
▼
保有比率
▼
評価額
▼
評価額前日比
▼
評価損益
▼
国内株式全体
6,325
0
(0.00%)
---
(---%)
ｅＭＡＸＩＳ　日経半導体株インデックス
20.85%
1,319
0
(0.00%)
---
(---%)

ｅＭＡＸＩＳ　Ｓｌｉｍ　国内株式（ＴＯＰＩＸ）
15.79%
999
0
(0.00%)
---
(---%)

銘柄
▼
保有比率
▼
評価額
▼
その他資産全体
990
0
(0.00%)
---
(---%)
Ｔｒａｃｅｒｓ　ＭＳＣＩオール・カントリー・ゴールドプラス
100.00%
990
0
(0.00%)
---
(---%)`;

describe("monex paste parsers", () => {
  it("parses domestic holdings paste", () => {
    const parsed = parseMonexDomesticHoldingsPaste(splitMonexPasteLines(domesticSample));

    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows[0]).toMatchObject({
      source: "domestic",
      instrumentName: "ｅＭＡＸＩＳ　Ｓｌｉｍ　新興国株式インデックス",
      accountType: "特定",
      custodyType: "普通預り",
      quantity: 1357,
      avgCostMinor: 29138,
      marketValueMinor: 3718,
      unrealizedGainMinor: -236,
    });
    expect(parsed.rows[0].unrealizedGainRate).toBeCloseTo(-0.0594, 4);
    expect(parsed.rows[1].accountType).toBe("一般");
  });

  it("parses fund names that contain 分配金 in the product name", () => {
    const content = `銘柄	口座区分
預り区分	基準価額（円）
保有数（口）	平均取得単価
評価損益率	取引
ＷＣＭ　世界成長株厳選ファンド（予想分配金提示型）	特定
普通預り	13,135
+150	再投資コース
再投資中
（変更）	742	13,478	974	
-26
-2.54%	買付
売却

次世代通信関連　世界株式戦略ファンド（予想分配金提示型）	特定
普通預り	16,273
+364	再投資コース
再投資中
（変更）	303	16,238	493	
+1
+0.21%	買付
売却`;

    const parsed = parseMonexDomesticHoldingsPaste(splitMonexPasteLines(content));
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows[0].instrumentName).toBe(
      "ＷＣＭ　世界成長株厳選ファンド（予想分配金提示型）",
    );
    expect(parsed.rows[0].quantity).toBe(742);
    expect(parsed.rows[1].instrumentName).toBe(
      "次世代通信関連　世界株式戦略ファンド（予想分配金提示型）",
    );
    expect(parsed.rows[1].quantity).toBe(303);
  });

  it("parses us stocks paste using yen values", () => {
    const parsed = parseMonexUsStocksPaste(splitMonexPasteLines(usSample));

    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0]).toMatchObject({
      source: "us",
      ticker: "JEPQ",
      instrumentName: "ＪＰモルガン・ナスダック米国株式・プレミアム・インカムＥＴＦ",
      market: "米国",
      accountType: "特定",
      custodyType: "保護",
      quantity: 1,
      bookValueMinor: 9913,
      marketValueMinor: 9789,
      unrealizedGainMinor: -124,
    });
    expect(parsed.rows[0].unrealizedGainRate).toBeCloseTo(-0.0125, 4);
  });

  it("parses compass fund paste", () => {
    const parsed = parseMonexCompassFundPaste(splitMonexPasteLines(compassSample));

    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0]).toMatchObject({
      source: "compass",
      instrumentName: "ＭＳＶ内外ＥＴＦ資産配分Ｆ・Ｇ",
      accountType: "特定",
      custodyType: "普通預り",
      dividendOption: "受取",
      quantity: 3431,
      avgCostMinor: 29147,
      marketValueMinor: 10122,
      unrealizedGainMinor: 122,
    });
  });

  it("parses asset class paste with other asset and last-wins", () => {
    const duplicated = `${assetClassSample}

銘柄
▼
保有比率
▼
評価額
▼
国内株式全体
1
0
(0.00%)
---
(---%)
置き換え銘柄
100.00%
100
0
(0.00%)
---
(---%)`;

    const parsed = parseMonexAssetClassPaste(splitMonexPasteLines(duplicated));
    const domesticRows = parsed.rows.filter((row) => row.valueCode === "domestic_equity");
    const otherRows = parsed.rows.filter((row) => row.valueCode === "other");

    expect(domesticRows).toHaveLength(1);
    expect(domesticRows[0].instrumentName).toBe("置き換え銘柄");
    expect(otherRows).toHaveLength(1);
    expect(otherRows[0]).toMatchObject({
      valueCode: "other",
      instrumentName: "Ｔｒａｃｅｒｓ　ＭＳＣＩオール・カントリー・ゴールドプラス",
      marketValueMinor: 990,
    });
  });

  it("parses bulk paste regardless of section order", () => {
    const bulk = [assetClassSample, usSample, compassSample, domesticSample].join("\n\n");
    const parsed = parseMonexPaste(bulk);

    expect(parsed.holdings.filter((row) => row.source === "domestic")).toHaveLength(2);
    expect(parsed.holdings.filter((row) => row.source === "us")).toHaveLength(1);
    expect(parsed.holdings.filter((row) => row.source === "compass")).toHaveLength(1);
    expect(parsed.assetClassBreakdownByInstrumentName.size).toBeGreaterThan(0);

    const gold = parsed.assetClassBreakdownByInstrumentName.get(
      "Ｔｒａｃｅｒｓ　ＭＳＣＩオール・カントリー・ゴールドプラス",
    );
    expect(gold?.[0]).toMatchObject({ valueCode: "other", allocationWeight: 1 });
  });

  it("throws when paste is empty", () => {
    expect(() => parseMonexPaste("")).toThrow(MonexCsvError);
  });

  it("throws when paste has no holdings sections", () => {
    expect(() => parseMonexPaste("ただのテキスト\n意味のない行")).toThrow(MonexCsvError);
  });

  it("drops unknown leading lines before the first section header", () => {
    const parsed = parseMonexPaste(["乗換", assetClassSample, domesticSample].join("\n"));
    expect(parsed.holdings.filter((row) => row.source === "domestic")).toHaveLength(2);
  });

  it("keeps detectable leading lines before the first section header", () => {
    const parsed = parseMonexPaste(
      ["平均取得単価\t基準価額", assetClassSample, domesticSample].join("\n"),
    );
    expect(parsed.holdings.filter((row) => row.source === "domestic")).toHaveLength(2);
  });

  it("skips asset class rows with invalid ratio, value, or name", () => {
    const parsed = parseMonexAssetClassPaste([
      "国内株式全体",
      "6,325",
      "銘柄A",
      "---%",
      "100",
      "銘柄B",
      "10.00%",
      "---",
      "銘柄C",
      "20.00%",
      "0",
      " ",
      "30.00%",
      "100",
    ]);
    expect(parsed.rows).toHaveLength(0);
  });

  it("skips header and unknown lines around asset class totals", () => {
    const parsed = parseMonexAssetClassPaste([
      "ようこそ",
      "国内株式全体",
      "▼",
      "6,325",
      "その他資産全体",
      "990",
      "銘柄Y",
      "50.00%",
      "990",
    ]);
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0]).toMatchObject({
      valueCode: "other",
      instrumentName: "銘柄Y",
      marketValueMinor: 990,
    });
  });

  it("ignores stray lines that are not fund starts", () => {
    expect(parseMonexCompassFundPaste(["単独行"]).rows).toHaveLength(0);
    expect(parseMonexDomesticHoldingsPaste(["単独行", "\t特定"]).rows).toHaveLength(0);
    expect(parseMonexUsStocksPaste(["概算評価額", "日本語銘柄行"]).rows).toHaveLength(0);
  });

  it("stops asset class parsing when input ends mid-block", () => {
    const nameOnly = parseMonexAssetClassPaste(["国内株式全体", "6,325", "銘柄X"]);
    expect(nameOnly.rows).toHaveLength(0);

    const ratioOnly = parseMonexAssetClassPaste([
      "国内株式全体",
      "6,325",
      "銘柄X",
      "10.00%",
    ]);
    expect(ratioOnly.rows).toHaveLength(0);
  });

  it("throws for truncated compass fund blocks", () => {
    expect(() => parseMonexCompassFundPaste(["ファンドA\t特定"])).toThrow(MonexCsvError);
    expect(() =>
      parseMonexCompassFundPaste(["ファンドA\t特定", "普通預り\t100\t受取"]),
    ).toThrow(MonexCsvError);
    expect(() =>
      parseMonexCompassFundPaste(["ファンドA\t特定", "普通預り\t100\t受取", "3,431"]),
    ).toThrow(MonexCsvError);
    expect(() =>
      parseMonexCompassFundPaste([
        "ファンドA\t特定",
        "普通預り\t100\t受取",
        "3,431",
        "abc",
      ]),
    ).toThrow(MonexCsvError);
    expect(() =>
      parseMonexCompassFundPaste([
        "ファンドA\t特定",
        "普通預り\t100\t受取",
        "---",
        "1\t2\t3",
      ]),
    ).toThrow(MonexCsvError);
  });

  it("falls back compass unit price and rate when values are missing", () => {
    const parsed = parseMonexCompassFundPaste([
      "\t特定",
      "ファンドA\t特定",
      "普通預り\t---\t受取",
      "3,431",
      "0\t10,122\t+122",
    ]);
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0].unitPriceMinor).toBe(0);
    expect(parsed.rows[0].bookValueMinor).toBe(0);
    expect(parsed.rows[0].unrealizedGainRate).toBe(0);
  });

  it("parses compass block when custody line has a single cell", () => {
    const parsed = parseMonexCompassFundPaste([
      "ファンドA\t特定",
      "普通預り",
      "3,431",
      "29,147\t10,122\t+122",
    ]);
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0].unitPriceMinor).toBe(0);
    expect(parsed.rows[0].dividendOption).toBe("");
  });

  it("skips standalone change markers and non-percent gain cells in domestic paste", () => {
    const parsed = parseMonexDomesticHoldingsPaste([
      "ファンドA\t特定",
      "普通預り\t27,406",
      "受取中",
      "（変更）",
      "1,357\t29,138\t3,718",
      "-236\tメモ",
      "-5.94%",
    ]);
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0].dividendOption).toBe("受取中");
    expect(parsed.rows[0].unrealizedGainRate).toBeCloseTo(-0.0594, 4);
  });

  it("throws for us stock blocks with missing cells", () => {
    expect(() =>
      parseMonexUsStocksPaste(["JEPQ", "名前\t米国\t特定", "保護"]),
    ).toThrow(MonexCsvError);
    expect(() =>
      parseMonexUsStocksPaste([
        "JEPQ",
        "名前\t米国\t特定",
        "保護\t1",
        "9,913円\t9,913円",
        "9,789円",
        "-1.25%",
      ]),
    ).toThrow(MonexCsvError);
  });

  it("skips us-stock-like and noise lines in domestic paste", () => {
    const parsed = parseMonexDomesticHoldingsPaste([
      "銘柄X\t米国\t特定",
      "ファンドA\t特定",
      "乗換",
      "普通預り\t27,406",
      "(変更)\t1,357\t29,138\t3,718",
      "-236\t-5.94%",
    ]);
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0].quantity).toBe(1357);
    expect(parsed.rows[0].dividendOption).toBe("");
    expect(parsed.rows[0].unrealizedGainRate).toBeCloseTo(-0.0594, 4);
  });

  it("parses domestic gain rate from a single percent line and missing unit price", () => {
    const parsed = parseMonexDomesticHoldingsPaste([
      "ファンドA\t特定",
      "普通預り",
      "1,357\t29,138\t3,718",
      "-236%",
    ]);
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0].unitPriceMinor).toBe(0);
    expect(parsed.rows[0].unrealizedGainRate).toBeCloseTo(-2.36, 4);
  });

  it("throws for truncated domestic blocks", () => {
    expect(() => parseMonexDomesticHoldingsPaste(["ファンドA\t特定"])).toThrow(
      MonexCsvError,
    );
    expect(() =>
      parseMonexDomesticHoldingsPaste(["ファンドA\t特定", "普通預り\t27,406", "再投資中"]),
    ).toThrow(MonexCsvError);
    expect(() =>
      parseMonexDomesticHoldingsPaste([
        "ファンドA\t特定",
        "普通預り\t27,406",
        "1,357\t29,138",
      ]),
    ).toThrow(MonexCsvError);
    expect(() =>
      parseMonexDomesticHoldingsPaste([
        "ファンドA\t特定",
        "普通預り\t27,406",
        "1\t2\t3",
      ]),
    ).toThrow(MonexCsvError);
    expect(() =>
      parseMonexDomesticHoldingsPaste([
        "ファンドA\t特定",
        "普通預り\t27,406",
        "1\t2\t3",
        "-236",
      ]),
    ).toThrow(MonexCsvError);
  });

  it("throws for truncated us stock blocks", () => {
    expect(() => parseMonexUsStocksPaste(["JEPQ"])).toThrow(MonexCsvError);
    expect(() => parseMonexUsStocksPaste(["JEPQ", "名前\t米国"])).toThrow(MonexCsvError);
    expect(() => parseMonexUsStocksPaste(["JEPQ", "名前\t米国\t不明"])).toThrow(
      MonexCsvError,
    );
    expect(() => parseMonexUsStocksPaste(["JEPQ", "名前\t米国\t特定"])).toThrow(
      MonexCsvError,
    );
    expect(() =>
      parseMonexUsStocksPaste(["JEPQ", "名前\t米国\t特定", "保護\t1"]),
    ).toThrow(MonexCsvError);
    expect(() =>
      parseMonexUsStocksPaste([
        "JEPQ",
        "名前\t米国\t特定",
        "保護\t1",
        "9,913円\t9,913円",
      ]),
    ).toThrow(MonexCsvError);
    expect(() =>
      parseMonexUsStocksPaste([
        "JEPQ",
        "名前\t米国\t特定",
        "保護\t1",
        "9,913円",
        "9,789円\t-124円",
      ]),
    ).toThrow(MonexCsvError);
  });

  it("skips percent-only lines and trailing trade actions in us stock paste", () => {
    const parsed = parseMonexUsStocksPaste([
      "JEPQ",
      "名前\t米国\t特定",
      "保護\t1",
      "-1.01%",
      "0.5%\t9,913円",
      "9,789円\t-124円",
      "-1.25%",
      "買付",
      "売却",
    ]);
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0].bookValueMinor).toBe(0);
    expect(parsed.rows[0].avgCostMinor).toBe(9913);
  });

  it("falls back us stock avg cost when the value is invalid", () => {
    const parsed = parseMonexUsStocksPaste([
      "JEPQ",
      "名前\t米国\t特定",
      "保護\t1",
      "9,913円\t---",
      "9,789円\t-124円",
      "-1.25%",
    ]);
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0].avgCostMinor).toBe(9913);
  });
});
