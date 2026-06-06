import { describe, expect, it } from "vitest";

import { listAnalysisSchemesForPortfolio } from "../src/analysis-schemes";
import { IDECO_SCHEME_CODES } from "../src/ideco-analysis";
import {
  buildAllocationByScheme,
  groupSnapshotLinesByTag,
  mergeSnapshotsForGlobalAnalysis,
  sumSnapshotMarketValue,
} from "../src/snapshot-allocation";
import type { CurrentSnapshotDto, HoldingLineDto } from "../src/types";

function makeLine(
  marketValueMinor: number,
  tags: HoldingLineDto["tags"],
): HoldingLineDto {
  let result: HoldingLineDto = {
    id: "line-1",
    instrumentId: "inst-1",
    instrumentName: "テスト銘柄",
    sortOrder: 0,
    quantity: 1,
    marketValueMinor,
    bookValueMinor: null,
    metrics: [],
    instrumentAttributes: [],
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
    ];

    const slices = groupSnapshotLinesByTag(lines, "ideco_region");
    expect(slices).toHaveLength(2);
    expect(slices[0]?.valueName).toBe("海外");
    expect(slices[0]?.weight).toBeCloseTo(0.75);
    expect(slices[1]?.valueName).toBe("国内");
    expect(slices[1]?.weight).toBeCloseTo(0.25);
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
  });

  it("merges snapshots for global analysis", () => {
    const snapshots: CurrentSnapshotDto[] = [
      {
        id: "snap-1",
        portfolioCode: "ideco",
        portfolioName: "iDeCo",
        asOfDate: "2026-06-01",
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

    const schemes = listAnalysisSchemesForPortfolio("ideco");
    const merged = mergeSnapshotsForGlobalAnalysis(snapshots, schemes);
    expect(merged.totalMarketValueMinor).toBe(100_000);
    expect(merged.portfolios[0]?.portfolioCode).toBe("ideco");
    expect(merged.allocations[0]?.slices[0]?.valueName).toBe("国内");
  });
});
