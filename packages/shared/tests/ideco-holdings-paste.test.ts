import { describe, expect, it } from "vitest";

import { IdecoCsvError } from "../src/ideco-csv-utils";
import {
  parseIdecoHoldingsPaste,
  parseIdecoLotQuantity,
  parseIdecoYenValue,
} from "../src/ideco-holdings-paste";
import {
  matchIdecoInstrumentId,
  normalizeIdecoInstrumentMatchKey,
  stripIdecoPasteDuplicateSuffix,
} from "../src/ideco-instrument-match";

const SAMPLE_PASTE = `商品タイプ	運用商品名（略称）	時価単価
(1万口当り)	残高数量	資産残高	購入金額	損益
損益率	 
国内株式
ｅＭＡＸＩＳ　Ｓｌｉｍ　国内株式（ＴＯＰＩＸ）（eMAXIS Slim 国内株式(TOPIX)）	31,530円	41,772口	131,707円	128,321円	3,386円
2.6％	
内外株式
ＳＢＩ・全世界株式インデックス・ファンド（SBI･全世界株式ｲﾝﾃﾞｯｸｽ･ﾌｧﾝﾄﾞ）	35,235円	195,416口	688,548円	639,283円	49,265円
7.7％	
海外株式
ｅＭＡＸＩＳ　Ｓｌｉｍ　全世界株式（除く日本）（eMAXIS Slim 全世界株式(除く日本)）	38,076円	104,128口	396,477円	385,698円	10,779円
2.8％	
海外株式
ｅＭＡＸＩＳ　Ｓｌｉｍ　先進国株式インデックス（eMAXIS Slim 先進国株式ｲﾝﾃﾞｯｸｽ）	44,593円	8,789口	39,192円	38,644円	548円
1.4％	
海外株式
ｅＭＡＸＩＳ　Ｓｌｉｍ　米国株式（Ｓ＆Ｐ５００）（eMAXIS Slim 米国株式(S&P500)）	43,772円	12,827口	56,146円	55,330円	816円
1.5％	
海外株式
ｅＭＡＸＩＳ　Ｓｌｉｍ　新興国株式インデックス（eMAXIS Slim 新興国株式ｲﾝﾃﾞｯｸｽ）	28,615円	14,501口	41,494円	38,644円	2,850円
7.4％	
国内債券
★除外商品（手続中）ｅＭＡＸＩＳ　Ｓｌｉｍ　国内債券インデックス（eMAXIS Slim 国内債券ｲﾝﾃﾞｯｸｽ）	8,579円	105,741口	90,715円	89,677円	1,038円
1.2％	
海外債券
ｅＭＡＸＩＳ　Ｓｌｉｍ　先進国債券インデックス（eMAXIS Slim 先進国債券ｲﾝﾃﾞｯｸｽ）	15,789円	81,731口	129,045円	126,172円	2,873円
2.3％	
海外債券
ｉＦｒｅｅ　新興国債券インデックス（iFree 新興国債券ｲﾝﾃﾞｯｸｽ）	19,193円	19,345口	37,128円	36,138円	990円
2.7％	
国内不動産投信
ニッセイＪリートインデックスファンド（購入・換金手数料なし）（ﾆｯｾｲJﾘｰﾄｲﾝﾃﾞｯｸｽ(購入･換金手数料なし)）	21,790円	24,368口	53,097円	53,181円	-84円
-0.2％	
海外不動産投信
三井住友・ＤＣ外国リートインデックスファンド（三井住友･DC外国ﾘｰﾄｲﾝﾃﾞｯｸｽﾌｧﾝﾄﾞ）	24,795円	22,596口	56,026円	53,181円	2,845円
5.3％	
内外資産複合
ｅＭＡＸＩＳ　Ｓｌｉｍ　バランス（８資産均等型）（eMAXIS Slim ﾊﾞﾗﾝｽ(8資産均等型)）	21,640円	181,641口	393,071円	371,851円	21,220円
5.7％	
内外資産複合
ｉＦｒｅｅ　年金バランス（iFree 年金ﾊﾞﾗﾝｽ）	19,630円	124,894口	245,166円	239,712円	5,454円
2.3％	
国内その他資産
三菱ＵＦＪ純金ファンド（愛称：ファインゴールド）（三菱UFJ純金ﾌｧﾝﾄﾞ）	48,898円	183,252口	896,065円	626,239円	269,826円
43.1％	
内外資産複合
ｾﾚﾌﾞﾗｲﾌ･ｽﾄｰﾘｰ2045（ｾﾚﾌﾞﾗｲﾌ･ｽﾄｰﾘｰ2045）	23,733円	41,722口	99,018円	100,102円	-1,084円
-1.1％`;

describe("parseIdecoHoldingsPaste", () => {
  it("parses iDeCo site paste sample with 15 rows", () => {
    const parsed = parseIdecoHoldingsPaste(SAMPLE_PASTE);

    expect(parsed.rows).toHaveLength(15);
    expect(parsed.rows[0].unrealizedGainRate).toBeCloseTo(0.026);
    expect(parsed.rows[0]).toMatchObject({
      productType: "国内株式",
      instrumentName:
        "ｅＭＡＸＩＳ　Ｓｌｉｍ　国内株式（ＴＯＰＩＸ）（eMAXIS Slim 国内株式(TOPIX)）",
      unitPricePerTenThousandLots: 31530,
      quantity: 41772,
      marketValueMinor: 131707,
      bookValueMinor: 128321,
      unrealizedGainMinor: 3386,
    });
    expect(parsed.rows[9].unrealizedGainRate).toBeCloseTo(-0.002);
    expect(parsed.rows[9]).toMatchObject({
      productType: "国内不動産投信",
      unrealizedGainMinor: -84,
    });
    expect(parsed.rows[10].unrealizedGainRate).toBeCloseTo(0.053);
    expect(parsed.rows[10]).toMatchObject({
      productType: "海外不動産投信",
    });
    expect(parsed.rows[14].unrealizedGainRate).toBeCloseTo(-0.011);
    expect(parsed.rows[14]).toMatchObject({
      productType: "内外資産複合",
      unrealizedGainMinor: -1084,
    });
  });

  it("parses yen and lot suffix helpers", () => {
    expect(parseIdecoYenValue("31,530円")).toBe(31530);
    expect(parseIdecoLotQuantity("41,772口")).toBe(41772);
    expect(parseIdecoYenValue("-84円")).toBe(-84);
  });

  it("rejects empty paste", () => {
    expect(() => parseIdecoHoldingsPaste("")).toThrow(IdecoCsvError);
  });

  it("rejects incomplete record groups", () => {
    expect(() =>
      parseIdecoHoldingsPaste(`国内株式
ｅＭＡＸＩＳ	31,530円	41,772口	131,707円	128,321円	3,386円`),
    ).toThrow(/3 行単位/);
  });
});

describe("matchIdecoInstrumentId", () => {
  const candidates = [
    {
      id: "inst-1",
      name: "ｅＭＡＸＩＳ Ｓｌｉｍ 国内株式（ＴＯＰＩＸ）",
      shortName: "eMAXIS Slim 国内株式(TOPIX)",
    },
    {
      id: "inst-2",
      name: "ＳＢＩ・全世界株式インデックス・ファンド",
      shortName: "SBI・全世界株式インデックス・ファンド",
    },
  ];

  it("matches by exact name with half-width spaces in DB", () => {
    expect(matchIdecoInstrumentId(candidates, "ｅＭＡＸＩＳ Ｓｌｉｍ 国内株式（ＴＯＰＩＸ）")).toBe(
      "inst-1",
    );
  });

  it("matches by shortName attribute", () => {
    expect(matchIdecoInstrumentId(candidates, "SBI･全世界株式ｲﾝﾃﾞｯｸｽ･ﾌｧﾝﾄﾞ")).toBe("inst-2");
  });

  it("matches paste with full-width spaces and duplicate suffix from iDeCo site", () => {
    expect(
      matchIdecoInstrumentId(
        candidates,
        "ｅＭＡＸＩＳ　Ｓｌｉｍ　国内株式（ＴＯＰＩＸ）（eMAXIS Slim 国内株式(TOPIX)）",
      ),
    ).toBe("inst-1");
  });

  it("matches worldwide equity paste against DB-style candidate", () => {
    const worldwideCandidates = [
      {
        id: "inst-world",
        name: "ｅＭＡＸＩＳ Ｓｌｉｍ 全世界株式（除く日本）",
        shortName: "eMAXIS Slim 全世界株式(除く日本)",
      },
    ];

    expect(
      matchIdecoInstrumentId(
        worldwideCandidates,
        "ｅＭＡＸＩＳ　Ｓｌｉｍ　全世界株式（除く日本）（eMAXIS Slim 全世界株式(除く日本)）",
      ),
    ).toBe("inst-world");
  });

  it("matches developed equity index paste against DB-style candidate", () => {
    const developedCandidates = [
      {
        id: "inst-developed",
        name: "ｅＭＡＸＩＳ Ｓｌｉｍ 先進国株式インデックス",
        shortName: "eMAXIS Slim 先進国株式インデックス",
      },
    ];

    expect(
      matchIdecoInstrumentId(
        developedCandidates,
        "ｅＭＡＸＩＳ　Ｓｌｉｍ　先進国株式インデックス（eMAXIS Slim 先進国株式ｲﾝﾃﾞｯｸｽ）",
      ),
    ).toBe("inst-developed");
  });

  it("matches by name prefix after duplicate suffix removal", () => {
    expect(
      matchIdecoInstrumentId(
        candidates,
        "ｅＭＡＸＩＳ　Ｓｌｉｍ　国内株式（ＴＯＰＩＸ）（extra suffix)）",
      ),
    ).toBe("inst-1");
  });

  it("returns null when no match", () => {
    expect(matchIdecoInstrumentId(candidates, "存在しない銘柄")).toBeNull();
  });
});

describe("normalizeIdecoInstrumentMatchKey", () => {
  it("normalizes full-width spaces and NFKC characters", () => {
    expect(normalizeIdecoInstrumentMatchKey("ｅＭＡＸＩＳ　Ｓｌｉｍ")).toBe("eMAXIS Slim");
  });

  it("normalizes half-width katakana to full-width", () => {
    expect(normalizeIdecoInstrumentMatchKey("SBI･全世界株式ｲﾝﾃﾞｯｸｽ･ﾌｧﾝﾄﾞ")).toBe(
      "SBI・全世界株式インデックス・ファンド",
    );
  });
});

describe("stripIdecoPasteDuplicateSuffix", () => {
  it("removes duplicate trailing parenthetical when preceded by closing paren", () => {
    expect(
      stripIdecoPasteDuplicateSuffix(
        "ｅＭＡＸＩＳ　Ｓｌｉｍ　国内株式（ＴＯＰＩＸ）（eMAXIS Slim 国内株式(TOPIX)）",
      ),
    ).toBe("ｅＭＡＸＩＳ　Ｓｌｉｍ　国内株式（ＴＯＰＩＸ）");
  });

  it("keeps single trailing parenthetical in official name", () => {
    expect(stripIdecoPasteDuplicateSuffix("ＳＢＩ・全世界株式インデックス・ファンド（SBI･全世界株式ｲﾝﾃﾞｯｸｽ･ﾌｧﾝﾄﾞ）")).toBe(
      "ＳＢＩ・全世界株式インデックス・ファンド（SBI･全世界株式ｲﾝﾃﾞｯｸｽ･ﾌｧﾝﾄﾞ）",
    );
  });
});

const CURRENT_JSON_CANDIDATES = [
  {
    id: "13462933-8a0b-48f4-912a-3bfd25762509",
    name: "ｅＭＡＸＩＳ Ｓｌｉｍ 国内株式（ＴＯＰＩＸ）",
    shortName: "eMAXIS Slim 国内株式(TOPIX)",
  },
  {
    id: "31275e89-c5aa-46ec-8108-bc56f6ea17b2",
    name: "ＳＢＩ・全世界株式インデックス・ファンド",
    shortName: "SBI・全世界株式インデックス・ファンド",
  },
  {
    id: "362250ad-b3df-44b8-a221-a599b923e754",
    name: "ｅＭＡＸＩＳ Ｓｌｉｍ 全世界株式（除く日本）",
    shortName: "eMAXIS Slim 全世界株式(除く日本)",
  },
  {
    id: "e251ef8b-9dc7-443f-9a76-8ae44ba08faa",
    name: "ｅＭＡＸＩＳ Ｓｌｉｍ 先進国株式インデックス",
    shortName: "eMAXIS Slim 先進国株式インデックス",
  },
  {
    id: "e6dc9d16-d6b0-4a65-ab00-e5c4d338df88",
    name: "ｅＭＡＸＩＳ Ｓｌｉｍ 米国株式（Ｓ＆Ｐ５００）",
    shortName: "eMAXIS Slim 米国株式(S&P500)",
  },
  {
    id: "a3028224-f890-4258-b8f9-417133d7cf6a",
    name: "ｅＭＡＸＩＳ Ｓｌｉｍ 新興国株式インデックス",
    shortName: "eMAXIS Slim 新興国株式インデックス",
  },
  {
    id: "bb25c6ee-a8d6-402d-b971-67f1e582c69a",
    name: "ｅＭＡＸＩＳ Ｓｌｉｍ 国内債券インデックス",
    shortName: "eMAXIS Slim 国内債券インデックス",
  },
  {
    id: "f74a084e-8eee-45c3-abef-a9337b908b01",
    name: "ｅＭＡＸＩＳ Ｓｌｉｍ 先進国債券インデックス",
    shortName: "eMAXIS Slim 先進国債券インデックス",
  },
  {
    id: "d642675f-5dd0-42df-8feb-63429b27ca60",
    name: "ｉＦｒｅｅ 新興国債券インデックス",
    shortName: "iFree 新興国債券インデックス",
  },
  {
    id: "37996eea-0305-4a45-8400-996f1962292c",
    name: "ニッセイＪリートインデックスファンド（購入・換金手数料なし）",
    shortName: "ニッセイJリートインデックス(購入・換金手数料なし)",
  },
  {
    id: "c991d741-dcd5-479f-abd9-7da4a97e7547",
    name: "三井住友・ＤＣ外国リートインデックスファンド",
    shortName: "三井住友・DC外国リートインデックスファンド",
  },
  {
    id: "ba158649-918a-42c7-824b-021765191743",
    name: "ｅＭＡＸＩＳ Ｓｌｉｍ バランス（８資産均等型）",
    shortName: "eMAXIS Slim ﾊﾞﾗﾝｽ(8資産均等型)",
  },
  {
    id: "47ccafe2-9d8f-49a7-b922-cf2e484a7860",
    name: "ｉＦｒｅｅ 年金バランス",
    shortName: "iFree 年金ﾊﾞﾗﾝｽ",
  },
  {
    id: "68b9b628-c237-4397-8530-c099d33c6658",
    name: "三菱ＵＦＪ 純金ファンド（愛称：ファインゴールド）",
    shortName: "三菱UFJ純金ﾌｧﾝﾄﾞ",
  },
  {
    id: "53bdddb7-cab9-48eb-9f3e-9bf731df27b7",
    name: "セレブライフ・ストーリー2045",
    shortName: "セレブライフ・ストーリー2045",
  },
];

describe("matchIdecoInstrumentId with SAMPLE_PASTE and current.json candidates", () => {
  it("matches all 15 paste rows to existing instruments", () => {
    const parsed = parseIdecoHoldingsPaste(SAMPLE_PASTE);

    expect(parsed.rows).toHaveLength(15);

    for (const row of parsed.rows) {
      const instrumentId = matchIdecoInstrumentId(CURRENT_JSON_CANDIDATES, row.instrumentName);
      expect(instrumentId).not.toBeNull();
    }
  });
});
