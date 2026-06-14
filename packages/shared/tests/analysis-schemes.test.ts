import { describe, expect, it } from "vitest";

import {
  collectHoldingsClassificationSchemes,
  findClassificationTagValue,
  findClassificationTagValueCode,
  listAnalysisSchemesForPortfolio,
  mergeAnalysisSchemesFromSnapshots,
  resolveAnalysisSchemes,
  __analysisSchemesTesting,
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

describe("findClassificationTagValueCode", () => {
  it("returns valueCode when tag exists", () => {
    const tags = [
      {
        schemeCode: "region",
        schemeName: "地域",
        valueCode: "japan",
        valueName: "日本",
      },
    ];
    expect(findClassificationTagValueCode(tags, "region")).toBe("japan");
  });

  it("returns null when tag is missing", () => {
    expect(findClassificationTagValueCode([], "region")).toBeNull();
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

  it("falls back to portfolio kind when analysisSchemes is empty", () => {
    const snapshot = {
      analysisSchemes: [],
      lines: [makeLine({ tags: [] })],
    };

    expect(resolveAnalysisSchemes(snapshot, "ideco")).toEqual([]);
    expect(resolveAnalysisSchemes(snapshot, "taxable")).toEqual([]);
  });
});

describe("listAnalysisSchemesForPortfolio", () => {
  it("returns empty list for ideco and other portfolio kinds", () => {
    expect(listAnalysisSchemesForPortfolio("ideco")).toEqual([]);
    expect(listAnalysisSchemesForPortfolio("taxable")).toEqual([]);
  });
});

describe("mergeAnalysisSchemesFromSnapshots", () => {
  it("merges unique schemes across snapshots preserving first occurrence order", () => {
    const merged = mergeAnalysisSchemesFromSnapshots([
      {
        id: "snap-1",
        portfolioCode: "a",
        portfolioName: "A",
        asOfDate: "2026-06-01",
        analysisSchemes: [
          { schemeCode: "region", schemeName: "地域" },
          { schemeCode: "asset", schemeName: "資産" },
        ],
        metrics: [],
        lines: [],
      },
      {
        id: "snap-2",
        portfolioCode: "b",
        portfolioName: "B",
        asOfDate: "2026-06-01",
        analysisSchemes: [
          { schemeCode: "asset", schemeName: "資産（別名）" },
          { schemeCode: "style", schemeName: "スタイル" },
        ],
        metrics: [],
        lines: [],
      },
    ]);

    expect(merged).toEqual([
      { schemeCode: "region", schemeName: "地域" },
      { schemeCode: "asset", schemeName: "資産" },
      { schemeCode: "style", schemeName: "スタイル" },
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

  it("skips duplicate scheme codes in analysisSchemes", () => {
    const analysisSchemes: AnalysisSchemeConfig[] = [
      { schemeCode: "region", schemeName: "地域分類" },
      { schemeCode: "region", schemeName: "重複" },
    ];

    expect(collectHoldingsClassificationSchemes(analysisSchemes, [])).toEqual([
      { schemeCode: "region", schemeName: "地域分類" },
    ]);
  });

  it("preserves order when lines share the same sortOrder", () => {
    const lines = [
      makeLine({
        sortOrder: 1,
        tags: [
          {
            schemeCode: "style",
            schemeName: "スタイル",
            valueCode: "passive",
            valueName: "パッシブ",
          },
        ],
      }),
      makeLine({
        sortOrder: 1,
        tags: [
          {
            schemeCode: "major",
            schemeName: "大分類",
            valueCode: "fund",
            valueName: "投資信託",
          },
        ],
      }),
    ];

    expect(collectHoldingsClassificationSchemes([], lines)).toEqual([
      { schemeCode: "style", schemeName: "スタイル" },
      { schemeCode: "major", schemeName: "大分類" },
    ]);
  });

  it("orders lines with different sortOrder values before collecting tags", () => {
    const lines = [
      makeLine({
        sortOrder: 2,
        tags: [
          {
            schemeCode: "second",
            schemeName: "第二",
            valueCode: "b",
            valueName: "B",
          },
        ],
      }),
      makeLine({
        sortOrder: 1,
        tags: [
          {
            schemeCode: "first",
            schemeName: "第一",
            valueCode: "a",
            valueName: "A",
          },
        ],
      }),
    ];

    expect(collectHoldingsClassificationSchemes([], lines)).toEqual([
      { schemeCode: "first", schemeName: "第一" },
      { schemeCode: "second", schemeName: "第二" },
    ]);
  });

  it("orders lines with null sortOrder after numbered lines", () => {
    const nullSortLine = makeLine({
      tags: [
        {
          schemeCode: "late",
          schemeName: "後",
          valueCode: "b",
          valueName: "B",
        },
      ],
    });
    nullSortLine.sortOrder = null as unknown as number;

    const numberedLine = makeLine({
      sortOrder: 1,
      tags: [
        {
          schemeCode: "first",
          schemeName: "先",
          valueCode: "a",
          valueName: "A",
        },
      ],
    });

    expect(
      __analysisSchemesTesting.compareHoldingsLinesBySortOrder(
        numberedLine,
        numberedLine,
      ),
    ).toBe(0);
    expect(
      __analysisSchemesTesting.compareHoldingsLinesBySortOrder(
        nullSortLine,
        numberedLine,
      ),
    ).toBeGreaterThan(0);
    expect(
      __analysisSchemesTesting.compareHoldingsLinesBySortOrder(
        numberedLine,
        nullSortLine,
      ),
    ).toBeLessThan(0);

    const lines = [nullSortLine, numberedLine];

    expect(collectHoldingsClassificationSchemes([], lines)).toEqual([
      { schemeCode: "first", schemeName: "先" },
      { schemeCode: "late", schemeName: "後" },
    ]);
  });
});
