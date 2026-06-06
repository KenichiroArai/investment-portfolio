import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  resolveIdecoAnalysisTags,
  resolveIdecoProductType,
} from "../src/ideco-analysis";
import { parseIdecoAnalysisCsv } from "../src/ideco-analysis-csv";
import {
  IdecoCsvError,
  parseGainRate,
  parseIdecoDate,
  parseJapaneseInteger,
  parseJapanesePercentRate,
  stripUtf8Bom,
  thousandsYenToYen,
} from "../src/ideco-csv-utils";
import { parseIdecoHoldingsCsv } from "../src/ideco-holdings-csv";
import { parseIdecoInstrumentsCsv } from "../src/ideco-instruments-csv";
import { parseIdecoProductTypesCsv } from "../src/ideco-product-types-csv";

const HOLDINGS_CSV = `番号,日付,運用商品名,時価単価(1万口当り),残高数量,資産残高,購入金額,損益,損益率
1,2026/6/2,eMAXIS Slim 国内株式(TOPIX),"31,351","41,773","130,962","128,324","2,638",0.021
2,2026/6/2,eMAXIS Slim 全世界株式(除く日本),"38,275","104,130","398,557","385,705","12,852",3.30%
`;

describe("ideco csv parsers", () => {
  it("parses shared numeric and date helpers", () => {
    expect(parseJapaneseInteger("31,351")).toBe(31351);
    expect(thousandsYenToYen(130962)).toBe(130962000);
    expect(parseIdecoDate("2026/6/2")).toBe("2026-06-02");
    expect(parseJapanesePercentRate("2.10%")).toBe(0.021);
    expect(parseGainRate("0.021")).toBe(0.021);
    expect(parseGainRate("2.10%")).toBe(0.021);
    expect(resolveIdecoProductType("国内株式").code).toBe("domestic_equity");
    expect(stripUtf8Bom("\uFEFFhello")).toBe("hello");
    expect(resolveIdecoAnalysisTags("domestic_equity")).toEqual({
      regionCode: "domestic",
      assetClassCode: "equity",
    });
    expect(resolveIdecoAnalysisTags("principal_protected")).toBeNull();
  });

  it("parses product types, instruments, holdings, and analysis csv", () => {
    const productTypes = parseIdecoProductTypesCsv(`商品タイプ\n国内株式\n海外株式\n`);
    expect(productTypes.rows).toHaveLength(2);

    const instruments = parseIdecoInstrumentsCsv(
      `No.,大分類,商品タイプ,商品タイプ(スタイル),ステータス,運用商品名,運用商品名(略称),提供・委託会社,信託報酬（％）（税込）,信託財産保留額（％）
1,投資信託,国内株式,パッシブ,,フルネーム,eMAXIS Slim 国内株式(TOPIX),三菱UFJアセットマネジメント,0.143以内,0
`,
    );
    expect(instruments.rows[0]).toMatchObject({
      shortName: "eMAXIS Slim 国内株式(TOPIX)",
      productTypeCode: "domestic_equity",
    });

    const holdings = parseIdecoHoldingsCsv(HOLDINGS_CSV);
    expect(holdings.asOfDate).toBe("2026-06-02");
    expect(holdings.rows[0]).toMatchObject({
      instrumentName: "eMAXIS Slim 国内株式(TOPIX)",
      unrealizedGainRate: 0.021,
    });
    expect(holdings.rows[1].unrealizedGainRate).toBe(0.033);

    const analysis = parseIdecoAnalysisCsv(
      `分析軸名,カテゴリ名,メンバー名,,,,,,商品タイプ,地域分類,資産分類
商品タイプ,すべて,all,,,,,,国内株式,国内,株式
`,
    );
    expect(analysis.mappings[0].productTypeCode).toBe("domestic_equity");
  });

  it("rejects invalid holdings csv", () => {
    expect(() => parseIdecoHoldingsCsv("")).toThrow(IdecoCsvError);
    expect(() => parseIdecoDate("bad")).toThrow(IdecoCsvError);
    expect(() =>
      parseIdecoHoldingsCsv(
        `番号,日付,運用商品名,時価単価(1万口当り),残高数量,資産残高,購入金額,損益,損益率
1,2026/6/2,テスト,"1","0","1","1","0",0.021
`,
      ),
    ).toThrow(/残高数量が不正/);
  });

  it("parses ideco fixture directory csv when present", () => {
    const fixtureDir = resolve(import.meta.dirname, "../../../data/imports/ideco");
    const holdingsPath = resolve(fixtureDir, "明細.csv");

    let content = "";
    try {
      content = readFileSync(holdingsPath, "utf8");
    } catch {
      return;
    }

    if (content.includes("\uFFFD")) {
      return;
    }

    const parsed = parseIdecoHoldingsCsv(content);
    expect(parsed.rows.length).toBeGreaterThan(0);
  });
});
