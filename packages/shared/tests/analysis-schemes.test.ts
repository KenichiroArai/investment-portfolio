import { describe, expect, it } from "vitest";

import {
  collectHoldingsClassificationSchemes,
  findClassificationTagValue,
  resolveAnalysisSchemes,
} from "../src/analysis-schemes";
import type { AnalysisSchemeConfig, HoldingLineDto } from "../src/types";

function makeLine(
  overrides: Partial<HoldingLineDto> & Pick<HoldingLineDto, "tags">,
): HoldingLineDto {
  let result: HoldingLineDto = {
    id: overrides.id ?? "line-1",
    instrumentId: overrides.instrumentId ?? "inst-1",
    instrumentName: overrides.instrumentName ?? "テスト銘柄",
    sortOrder: overrides.sortOrder ?? 0,
    quantity: overrides.quantity ?? 1,
    marketValueMinor: overrides.marketValueMinor ?? 1000,
    bookValueMinor: overrides.bookValueMinor ?? null,
    metrics: overrides.metrics ?? [],
    instrumentAttributes: overrides.instrumentAttributes ?? [],
    tags: overrides.tags,
  };
  return result;
}

describe("findClassificationTagValue", () => {
  it("returns valueName when tag exists", () => {
    const tags = [
      {
        schemeCode: "region",
        schemeName: "地域",
        valueCode: "japan",
        valueName: "日本",
      },
    ];
    expect(findClassificationTagValue(tags, "region")).toBe("日本");
  });

  it("returns null when tag is missing", () => {
    expect(findClassificationTagValue([], "region")).toBeNull();
  });
});

describe("resolveAnalysisSchemes", () => {
  it("returns configured schemes for non-ideco snapshots", () => {
    const snapshot = {
      analysisSchemes: [{ schemeCode: "x1", schemeName: "軸1" }],
      lines: [makeLine({ tags: [] })],
    };

    expect(resolveAnalysisSchemes(snapshot, "taxable")).toEqual([
      { schemeCode: "x1", schemeName: "軸1" },
    ]);
  });
});

describe("collectHoldingsClassificationSchemes", () => {
  it("returns empty array when analysisSchemes and lines are empty", () => {
    expect(collectHoldingsClassificationSchemes([], [])).toEqual([]);
  });

  it("returns analysisSchemes when lines have no tags", () => {
    const analysisSchemes: AnalysisSchemeConfig[] = [
      { schemeCode: "region", schemeName: "地域分類" },
      { schemeCode: "asset", schemeName: "資産分類" },
    ];
    expect(
      collectHoldingsClassificationSchemes(analysisSchemes, [
        makeLine({ tags: [] }),
      ]),
    ).toEqual(analysisSchemes);
  });

  it("returns schemes from tags when analysisSchemes is empty", () => {
    const lines = [
      makeLine({
        tags: [
          {
            schemeCode: "region",
            schemeName: "地域分類",
            valueCode: "domestic",
            valueName: "国内",
          },
        ],
      }),
    ];
    expect(collectHoldingsClassificationSchemes([], lines)).toEqual([
      { schemeCode: "region", schemeName: "地域分類" },
    ]);
  });

  it("keeps analysisSchemes order and appends extra schemes from tags", () => {
    const analysisSchemes: AnalysisSchemeConfig[] = [
      { schemeCode: "region", schemeName: "地域分類" },
      { schemeCode: "asset", schemeName: "資産分類" },
    ];
    const lines = [
      makeLine({
        sortOrder: 2,
        tags: [
          {
            schemeCode: "major",
            schemeName: "大分類",
            valueCode: "fund",
            valueName: "投資信託",
          },
        ],
      }),
      makeLine({
        sortOrder: 1,
        tags: [
          {
            schemeCode: "style",
            schemeName: "商品タイプ(スタイル)",
            valueCode: "passive",
            valueName: "パッシブ",
          },
          {
            schemeCode: "region",
            schemeName: "地域分類",
            valueCode: "domestic",
            valueName: "国内",
          },
        ],
      }),
    ];

    expect(
      collectHoldingsClassificationSchemes(analysisSchemes, lines),
    ).toEqual([
      { schemeCode: "region", schemeName: "地域分類" },
      { schemeCode: "asset", schemeName: "資産分類" },
      { schemeCode: "style", schemeName: "商品タイプ(スタイル)" },
      { schemeCode: "major", schemeName: "大分類" },
    ]);
  });

  it("deduplicates scheme codes across analysisSchemes and tags", () => {
    const analysisSchemes: AnalysisSchemeConfig[] = [
      { schemeCode: "region", schemeName: "地域分類" },
    ];
    const lines = [
      makeLine({
        tags: [
          {
            schemeCode: "region",
            schemeName: "地域分類",
            valueCode: "domestic",
            valueName: "国内",
          },
        ],
      }),
    ];

    expect(
      collectHoldingsClassificationSchemes(analysisSchemes, lines),
    ).toEqual([{ schemeCode: "region", schemeName: "地域分類" }]);
  });
});
