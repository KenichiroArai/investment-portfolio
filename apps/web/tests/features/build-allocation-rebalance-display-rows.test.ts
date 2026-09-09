import { describe, expect, it } from "vitest";

import { buildAllocationRebalanceDisplayRows } from "@/features/allocation/build-allocation-rebalance-display-rows";
import type { AllocationBySchemeWithLines } from "@repo/shared";

const schemeAllocation: AllocationBySchemeWithLines = {
  schemeCode: "ideco_major_asset",
  schemeName: "主要資産",
  totalMarketValueMinor: 1_000_000,
  slices: [
    {
      valueCode: "global_equity",
      valueName: "内外株式",
      marketValueMinor: 700_000,
      weight: 0.7,
      unrealizedGainMinor: null,
      unrealizedGainRate: null,
      lines: [
        {
          line: {
            id: "line-1",
            instrumentId: "inst-1",
            instrumentName: "全世界株式",
            accountId: "ideco:unknown",
            accountName: "不明口座",
            sortOrder: null,
            quantity: 1,
            marketValueMinor: 700_000,
            bookValueMinor: null,
            metrics: [],
            instrumentAttributes: [],
            tags: [],
          },
          weightInSlice: 1,
          attributedMarketValueMinor: 700_000,
          attributedBookValueMinor: null,
          attributedUnrealizedGainMinor: null,
          attributedUnrealizedGainRate: null,
        },
      ],
    },
    {
      valueCode: "foreign_equity",
      valueName: "海外株式",
      marketValueMinor: 300_000,
      weight: 0.3,
      unrealizedGainMinor: null,
      unrealizedGainRate: null,
      lines: [
        {
          line: {
            id: "line-2",
            instrumentId: "inst-2",
            instrumentName: "海外株式",
            accountId: "ideco:unknown",
            accountName: "不明口座",
            sortOrder: null,
            quantity: 1,
            marketValueMinor: 300_000,
            bookValueMinor: null,
            metrics: [],
            instrumentAttributes: [],
            tags: [],
          },
          weightInSlice: 1,
          attributedMarketValueMinor: 300_000,
          attributedBookValueMinor: null,
          attributedUnrealizedGainMinor: null,
          attributedUnrealizedGainRate: null,
        },
      ],
    },
  ],
};

describe("buildAllocationRebalanceDisplayRows", () => {
  it("uses classified total and normalized targets for rebalance ratios", () => {
    let result = buildAllocationRebalanceDisplayRows({
      schemeAllocation,
      targets: [
        { valueCode: "global_equity", targetRatio: 0.4 },
        { valueCode: "foreign_equity", targetRatio: 0.59 },
      ],
      depositMinor: 0,
      mode: "full",
      classificationSchemes: [],
    });

    const globalHeader = result.rows.find(
      (row) => row.isGroupHeader && row.groupKey === "global_equity",
    );
    const normalizedTarget = 0.4 / 0.99;

    expect(globalHeader?.currentRatio).toBeCloseTo(0.7);
    expect(globalHeader?.targetRatio).toBeCloseTo(normalizedTarget, 4);
    expect(globalHeader?.gapRatio).toBeCloseTo(0.7 - normalizedTarget, 4);
    expect(globalHeader?.sellMinor).toBeGreaterThan(0);
    expect(result.totalBuyMinor).toBe(result.totalSellMinor);
  });

  it("excludes parent residual slices from rebalance rows", () => {
    const residualSlice = {
      ...schemeAllocation.slices[1]!,
      valueCode: "domestic_equity",
      valueName: "その他（未細分）",
      isParentResidual: true,
    };
    let result = buildAllocationRebalanceDisplayRows({
      schemeAllocation: {
        ...schemeAllocation,
        slices: [schemeAllocation.slices[0]!, residualSlice],
      },
      targets: [
        { valueCode: "global_equity", targetRatio: 0.4 },
        { valueCode: "domestic_equity", targetRatio: 0.6 },
      ],
      depositMinor: 0,
      mode: "full",
      classificationSchemes: [],
    });

    expect(
      result.rows.some((row) => row.groupKey === "domestic_equity"),
    ).toBe(false);

    const globalHeader = result.rows.find(
      (row) => row.isGroupHeader && row.groupKey === "global_equity",
    );
    expect(globalHeader?.currentRatio).toBeCloseTo(1);
  });
});
