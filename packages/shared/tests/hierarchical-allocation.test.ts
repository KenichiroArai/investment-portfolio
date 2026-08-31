import { describe, expect, it } from "vitest";

import {
  buildAllocationBySchemeWithLines,
  buildHierarchicalAllocationBySchemeWithLines,
} from "../src/snapshot-allocation";
import type { HoldingLineDto } from "../src/types";

function makeHierarchyLine(
  marketValueMinor: number,
  valueCode: string,
): HoldingLineDto {
  let result: HoldingLineDto = {
    id: "line-1",
    instrumentId: "inst-1",
    instrumentName: "Fund A",
    accountId: "acc-1",
    accountName: "Account",
    sortOrder: 1,
    quantity: 1,
    marketValueMinor,
    bookValueMinor: marketValueMinor,
    metrics: [],
    instrumentAttributes: [],
    tags: [
      {
        schemeCode: "asset_class",
        schemeName: "資産クラス",
        valueCode,
        valueName: valueCode,
        allocationWeight: 1,
      },
    ],
  };
  return result;
}

describe("buildHierarchicalAllocationBySchemeWithLines", () => {
  const schemeValues = [
    {
      id: "stock",
      code: "stock",
      name: "株式",
      sortOrder: 1,
      schemeId: "scheme-a",
      schemeCode: "asset_class",
    },
    {
      id: "domestic",
      code: "domestic",
      name: "国内株式",
      sortOrder: 1,
      schemeId: "scheme-a",
      schemeCode: "asset_class",
    },
    {
      id: "developed",
      code: "developed",
      name: "先進国株式",
      sortOrder: 2,
      schemeId: "scheme-a",
      schemeCode: "asset_class",
    },
  ];

  const links = [
    { parentValueId: "stock", childValueId: "domestic", sortOrder: 1 },
    { parentValueId: "stock", childValueId: "developed", sortOrder: 2 },
  ];

  it("rolls up parent allocation from leaf tags", () => {
    const lines = [
      makeHierarchyLine(600_000, "domestic"),
      makeHierarchyLine(400_000, "developed"),
    ];
    const allocation = buildHierarchicalAllocationBySchemeWithLines(
      lines,
      "asset_class",
      "資産クラス",
      {
        aggregationLevel: "parent",
        includeOrphans: true,
        links,
        schemeValues,
        schemeId: "scheme-a",
      },
    );

    expect(allocation.slices).toHaveLength(1);
    expect(allocation.slices[0]?.valueCode).toBe("stock");
    expect(allocation.slices[0]?.marketValueMinor).toBe(1_000_000);
    expect(allocation.slices[0]?.weight).toBeCloseTo(1);
  });

  it("falls back to flat allocation when links are empty", () => {
    const lines = [makeHierarchyLine(500_000, "domestic")];
    const hierarchical = buildHierarchicalAllocationBySchemeWithLines(
      lines,
      "asset_class",
      "資産クラス",
      {
        aggregationLevel: "parent",
        includeOrphans: true,
        links: [],
        schemeValues,
        schemeId: "scheme-a",
      },
    );
    const flat = buildAllocationBySchemeWithLines(lines, "asset_class", "資産クラス");

    expect(hierarchical.slices).toEqual(flat.slices);
  });
});
