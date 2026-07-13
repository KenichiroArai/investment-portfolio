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
});
