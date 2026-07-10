import { describe, expect, it } from "vitest";

import { IDECO_SCHEME_CODES } from "../src/ideco-analysis";
import { IDECO_KAKEIBO_METRIC_CODES } from "../src/holding-line-metrics";
import { IDECO_PORTFOLIO_METRIC_CODES } from "../src/ideco-portfolio-metrics";
import {
  computeSnapshotGainRate,
  computeSnapshotPortfolioGainMinor,
  resolveSnapshotTotalContributions,
} from "../src/portfolio-snapshot-metrics";
import {
  buildAllocationByScheme,
  buildAllocationBySchemeWithLines,
  buildAllocationBySchemeWithLinesFromSnapshots,
  computeSliceGainMetrics,
  computeSnapshotUnrealizedGainRate,
  groupSnapshotLinesByTag,
  groupSnapshotLinesByTagWithLines,
  mergeSnapshotsForGlobalAnalysis,
  sumSnapshotBookValue,
  sumSnapshotMarketValue,
  sumSnapshotUnrealizedGainMinor,
} from "../src/snapshot-allocation";
import type { CurrentSnapshotDto, HoldingLineDto } from "../src/types";

function makeLine(
  marketValueMinor: number,
  tags: HoldingLineDto["tags"],
  overrides?: Partial<HoldingLineDto>,
): HoldingLineDto {
  let result: HoldingLineDto = {
    id: overrides?.id ?? "line-1",
    instrumentId: overrides?.instrumentId ?? "inst-1",
    instrumentName: overrides?.instrumentName ?? "テスト銘柄",
    sortOrder: overrides?.sortOrder ?? 0,
    quantity: overrides?.quantity ?? 1,
    marketValueMinor,
    bookValueMinor: overrides?.bookValueMinor ?? null,
    metrics: overrides?.metrics ?? [],
    instrumentAttributes: overrides?.instrumentAttributes ?? [],
    tags,
  };
  return result;
}

describe("snapshot-allocation", () => {
  it("sums market values", () => {
    const lines = [
      makeLine(100_000, []),
      makeLine(200_000, []),
    ];
    expect(sumSnapshotMarketValue(lines)).toBe(300_000);
  });

  it("sums book values", () => {
    const lines = [
      makeLine(100_000, [], { bookValueMinor: 80_000 }),
      makeLine(200_000, [], { bookValueMinor: 150_000 }),
      makeLine(50_000, [], { bookValueMinor: null }),
    ];
    expect(sumSnapshotBookValue(lines)).toBe(230_000);
  });

  it("sums unrealized gain from metrics", () => {
    const lines = [
      makeLine(100_000, [], {
        metrics: [
          {
            code: IDECO_KAKEIBO_METRIC_CODES.unrealizedGainMinor,
            integerValue: 10_000,
            realValue: null,
            textValue: null,
          },
        ],
      }),
      makeLine(200_000, [], {
        metrics: [
          {
            code: IDECO_KAKEIBO_METRIC_CODES.unrealizedGainMinor,
            integerValue: 20_000,
            realValue: null,
            textValue: null,
          },
        ],
      }),
    ];
    expect(sumSnapshotUnrealizedGainMinor(lines)).toBe(30_000);
  });

  it("prefers portfolio metric for total contributions", () => {
    const snapshot: CurrentSnapshotDto = {
      id: "snap-1",
      portfolioCode: "ideco",
      portfolioName: "iDeCo",
      asOfDate: "2026-06-01",
      analysisSchemes: [],
      metrics: [
        {
          code: IDECO_PORTFOLIO_METRIC_CODES.totalContributions,
          integerValue: 2_716_679,
          realValue: null,
          textValue: null,
        },
      ],
      lines: [
        makeLine(100_000, [], { bookValueMinor: 80_000 }),
        makeLine(200_000, [], { bookValueMinor: 150_000 }),
      ],
    };

    expect(resolveSnapshotTotalContributions(snapshot)).toBe(2_716_679);
  });

  it("falls back to book value sum when portfolio metric is absent", () => {
    const snapshot: CurrentSnapshotDto = {
      id: "snap-1",
      portfolioCode: "nisa",
      portfolioName: "NISA",
      asOfDate: "2026-06-01",
      analysisSchemes: [],
      metrics: [],
      lines: [
        makeLine(100_000, [], { bookValueMinor: 80_000 }),
        makeLine(200_000, [], { bookValueMinor: 150_000 }),
      ],
    };

    expect(resolveSnapshotTotalContributions(snapshot)).toBe(230_000);
  });

  it("computes unrealized gain rate", () => {
    expect(computeSnapshotUnrealizedGainRate(30_000, 230_000)).toBeCloseTo(
      30_000 / 230_000,
    );
    expect(computeSnapshotUnrealizedGainRate(30_000, 0)).toBeNull();
  });

  it("computes slice gain metrics from line metrics", () => {
    const lines = [
      makeLine(100_000, [], {
        bookValueMinor: 80_000,
        metrics: [
          {
            code: IDECO_KAKEIBO_METRIC_CODES.unrealizedGainMinor,
            integerValue: 10_000,
            realValue: null,
            textValue: null,
          },
        ],
      }),
      makeLine(200_000, [], {
        bookValueMinor: 150_000,
        metrics: [
          {
            code: IDECO_KAKEIBO_METRIC_CODES.unrealizedGainMinor,
            integerValue: 20_000,
            realValue: null,
            textValue: null,
          },
        ],
      }),
    ];

    const metrics = computeSliceGainMetrics(lines);

    expect(metrics.unrealizedGainMinor).toBe(30_000);
    expect(metrics.unrealizedGainRate).toBeCloseTo(30_000 / 230_000);
  });

  it("returns null gain metrics when no line has gain metric", () => {
    const metrics = computeSliceGainMetrics([
      makeLine(100_000, [], { bookValueMinor: 80_000 }),
    ]);

    expect(metrics.unrealizedGainMinor).toBeNull();
    expect(metrics.unrealizedGainRate).toBeNull();
  });

  it("computes portfolio gain from asset balance and contributions", () => {
    expect(computeSnapshotPortfolioGainMinor(300_000, 2716679)).toBe(
      300_000 - 2_716_679,
    );
  });

  it("computes gain rate against contributions and asset balance", () => {
    const gain = 50_000;
    const contributions = 250_000;
    const assetBalance = 300_000;

    expect(computeSnapshotGainRate(gain, contributions)).toBeCloseTo(
      gain / contributions,
    );
    expect(computeSnapshotGainRate(gain, assetBalance)).toBeCloseTo(
      gain / assetBalance,
    );
    expect(computeSnapshotGainRate(gain, 0)).toBeNull();
  });

  it("groups lines by scheme code", () => {
    const lines = [
      makeLine(100_000, [
        {
          schemeCode: "ideco_region",
          schemeName: "地域分類",
          valueCode: "domestic",
          valueName: "国内",
        },
      ]),
      makeLine(300_000, [
        {
          schemeCode: "ideco_region",
          schemeName: "地域分類",
          valueCode: "foreign",
          valueName: "海外",
        },
      ]),
      makeLine(50_000, []),
    ];

    const slices = groupSnapshotLinesByTag(lines, "ideco_region");
    expect(slices).toHaveLength(2);
    expect(slices[0]?.valueName).toBe("海外");
    expect(slices[0]?.weight).toBeCloseTo(0.75);
    expect(slices[1]?.valueName).toBe("国内");
    expect(slices[1]?.weight).toBeCloseTo(0.25);

    const emptyTagged = groupSnapshotLinesByTag([], "ideco_region");
    expect(emptyTagged).toEqual([]);
    const noMatch = groupSnapshotLinesByTag([makeLine(100, [])], "ideco_region");
    expect(noMatch).toEqual([]);

    const duplicateTagLines = [
      makeLine(100, [
        {
          schemeCode: "ideco_region",
          schemeName: "地域分類",
          valueCode: "domestic",
          valueName: "国内",
        },
      ]),
      makeLine(200, [
        {
          schemeCode: "ideco_region",
          schemeName: "地域分類",
          valueCode: "domestic",
          valueName: "国内",
        },
      ]),
    ];
    const mergedSlice = groupSnapshotLinesByTag(duplicateTagLines, "ideco_region");
    expect(mergedSlice).toHaveLength(1);
    expect(mergedSlice[0]?.marketValueMinor).toBe(300);
    expect(mergedSlice[0]?.weight).toBe(1);

    const zeroTaggedTotal = groupSnapshotLinesByTag(
      [
        makeLine(0, [
          {
            schemeCode: "ideco_region",
            schemeName: "地域分類",
            valueCode: "domestic",
            valueName: "国内",
          },
        ]),
      ],
      "ideco_region",
    );
    expect(zeroTaggedTotal[0]?.weight).toBe(0);
  });

  it("splits a holding across weighted tags for the same scheme", () => {
    const lines = [
      makeLine(
        1_000_000,
        [
          {
            schemeCode: "monex_asset_class",
            schemeName: "資産クラス",
            valueCode: "developed_equity",
            valueName: "先進国株式",
            allocationWeight: 0.6,
          },
          {
            schemeCode: "monex_asset_class",
            schemeName: "資産クラス",
            valueCode: "domestic_bond",
            valueName: "国内債券",
            allocationWeight: 0.4,
          },
        ],
        { instrumentName: "テスト複合ファンド" },
      ),
    ];

    const slices = groupSnapshotLinesByTag(lines, "monex_asset_class");
    expect(slices).toHaveLength(2);
    expect(slices[0]?.valueCode).toBe("developed_equity");
    expect(slices[0]?.marketValueMinor).toBe(600_000);
    expect(slices[0]?.weight).toBeCloseTo(0.6);
    expect(slices[1]?.valueCode).toBe("domestic_bond");
    expect(slices[1]?.marketValueMinor).toBe(400_000);
    expect(slices[1]?.weight).toBeCloseTo(0.4);

    const withLines = groupSnapshotLinesByTagWithLines(lines, "monex_asset_class");
    expect(withLines[0]?.lines).toHaveLength(1);
    expect(withLines[0]?.lines[0]?.weightInSlice).toBeCloseTo(1);
    expect(withLines[1]?.lines[0]?.weightInSlice).toBeCloseTo(1);
  });

  it("builds allocation by scheme", () => {
    const lines = [
      makeLine(50_000, [
        {
          schemeCode: "ideco_asset_class",
          schemeName: "資産分類",
          valueCode: "equity",
          valueName: "株式",
        },
      ]),
    ];

    const allocation = buildAllocationByScheme(
      lines,
      "ideco_asset_class",
      "資産分類",
    );
    expect(allocation.totalMarketValueMinor).toBe(50_000);
    expect(allocation.slices[0]?.valueName).toBe("株式");

    const withLines = buildAllocationBySchemeWithLines(
      lines,
      "ideco_asset_class",
      "資産分類",
    );
    expect(withLines.slices[0]?.lines).toHaveLength(1);
  });

  it("groups lines with holding details and weightInSlice", () => {
    const lines = [
      makeLine(
        100_000,
        [
          {
            schemeCode: "ideco_region",
            schemeName: "地域分類",
            valueCode: "domestic",
            valueName: "国内",
          },
        ],
        { id: "line-a", instrumentName: "銘柄A" },
      ),
      makeLine(
        300_000,
        [
          {
            schemeCode: "ideco_region",
            schemeName: "地域分類",
            valueCode: "domestic",
            valueName: "国内",
          },
        ],
        { id: "line-b", instrumentName: "銘柄B" },
      ),
    ];

    const slices = groupSnapshotLinesByTagWithLines(lines, "ideco_region");
    expect(slices).toHaveLength(1);
    expect(slices[0]?.lines).toHaveLength(2);
    expect(slices[0]?.lines[0]?.line.instrumentName).toBe("銘柄B");
    expect(slices[0]?.lines[0]?.weightInSlice).toBeCloseTo(0.75);
    expect(slices[0]?.lines[1]?.weightInSlice).toBeCloseTo(0.25);

    const untagged = groupSnapshotLinesByTagWithLines(
      [makeLine(100, [])],
      "ideco_region",
    );
    expect(untagged).toEqual([]);

    const zeroSliceLines = [
      makeLine(
        0,
        [
          {
            schemeCode: "ideco_region",
            schemeName: "地域分類",
            valueCode: "domestic",
            valueName: "国内",
          },
        ],
        { id: "zero-line" },
      ),
    ];
    const zeroSlice = groupSnapshotLinesByTagWithLines(zeroSliceLines, "ideco_region");
    expect(zeroSlice[0]?.lines[0]?.weightInSlice).toBe(0);
  });

  it("builds allocation with lines from multiple snapshots", () => {
    const snapshots: CurrentSnapshotDto[] = [
      {
        id: "snap-1",
        portfolioCode: "ideco",
        portfolioName: "iDeCo",
        asOfDate: "2026-06-01",
        analysisSchemes: [],
        metrics: [],
        lines: [
          makeLine(
            100_000,
            [
              {
                schemeCode: IDECO_SCHEME_CODES.region,
                schemeName: "地域分類",
                valueCode: "domestic",
                valueName: "国内",
              },
            ],
            { id: "line-1" },
          ),
        ],
      },
      {
        id: "snap-2",
        portfolioCode: "ideco2",
        portfolioName: "iDeCo 2",
        asOfDate: "2026-06-01",
        analysisSchemes: [],
        metrics: [],
        lines: [
          makeLine(
            200_000,
            [
              {
                schemeCode: IDECO_SCHEME_CODES.region,
                schemeName: "地域分類",
                valueCode: "domestic",
                valueName: "国内",
              },
            ],
            { id: "line-2" },
          ),
        ],
      },
    ];

    const allocation = buildAllocationBySchemeWithLinesFromSnapshots(
      snapshots,
      IDECO_SCHEME_CODES.region,
      "地域分類",
    );
    expect(allocation.totalMarketValueMinor).toBe(300_000);
    expect(allocation.slices[0]?.lines).toHaveLength(2);
    expect(allocation.slices[0]?.lines[0]?.portfolioCode).toBe("ideco2");
    expect(allocation.slices[0]?.lines[1]?.portfolioCode).toBe("ideco");
  });

  it("merges snapshots for global analysis", () => {
    const snapshots: CurrentSnapshotDto[] = [
      {
        id: "snap-1",
        portfolioCode: "ideco",
        portfolioName: "iDeCo",
        asOfDate: "2026-06-01",
        analysisSchemes: [
          {
            schemeCode: IDECO_SCHEME_CODES.region,
            schemeName: "地域分類",
          },
        ],
        metrics: [],
        lines: [
          makeLine(100_000, [
            {
              schemeCode: IDECO_SCHEME_CODES.region,
              schemeName: "地域分類",
              valueCode: "domestic",
              valueName: "国内",
            },
          ]),
        ],
      },
    ];

    const schemes = snapshots[0]?.analysisSchemes ?? [];
    const merged = mergeSnapshotsForGlobalAnalysis(snapshots, schemes);
    expect(merged.totalMarketValueMinor).toBe(100_000);
    expect(merged.portfolios[0]?.portfolioCode).toBe("ideco");
    expect(merged.allocations[0]?.slices[0]?.valueName).toBe("国内");
  });

  it("handles zero total market value in global analysis weights", () => {
    const snapshots: CurrentSnapshotDto[] = [
      {
        id: "snap-empty",
        portfolioCode: "empty",
        portfolioName: "空",
        asOfDate: "2026-06-01",
        analysisSchemes: [],
        metrics: [],
        lines: [],
      },
    ];

    const merged = mergeSnapshotsForGlobalAnalysis(snapshots, []);
    expect(merged.totalMarketValueMinor).toBe(0);
    expect(merged.portfolios[0]?.weight).toBe(0);
  });
});
