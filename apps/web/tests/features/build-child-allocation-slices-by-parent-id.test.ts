import type {
  ClassificationSchemeWithValuesDto,
  ClassificationTagDto,
  HoldingLineDto,
} from "@repo/shared";
import { describe, expect, it } from "vitest";

import {
  buildChildAllocationSlicesByParentId,
  buildSchemeAllocationWithHierarchy,
  buildAllocationRowExpandKey,
  getAllocationSliceExpandKey,
} from "@/features/allocation/build-scheme-allocation-with-hierarchy";

function makeTaggedLine(
  marketValueMinor: number,
  tags: ClassificationTagDto[],
  id = "line-1",
): HoldingLineDto {
  let result: HoldingLineDto = {
    id,
    instrumentId: `inst-${id}`,
    instrumentName: `Fund ${id}`,
    accountId: "acc-1",
    accountName: "Account",
    sortOrder: 1,
    quantity: 1,
    marketValueMinor,
    bookValueMinor: marketValueMinor,
    metrics: [],
    instrumentAttributes: [],
    tags,
  };
  return result;
}

function makeHierarchyLine(
  marketValueMinor: number,
  valueCode: string,
  id?: string,
): HoldingLineDto {
  let result = makeTaggedLine(
    marketValueMinor,
    [
      {
        schemeCode: "asset_class",
        schemeName: "資産クラス",
        valueCode,
        valueName: valueCode,
        allocationWeight: 1,
      },
    ],
    id,
  );
  return result;
}

const classificationSchemes: ClassificationSchemeWithValuesDto[] = [
  {
    id: "scheme-a",
    code: "asset_class",
    name: "資産クラス",
    values: [
      {
        id: "stock",
        code: "stock",
        name: "株式",
        sortOrder: 1,
        schemeId: "scheme-a",
        childIds: ["domestic", "developed"],
        parentIds: [],
      },
      {
        id: "domestic",
        code: "domestic",
        name: "国内株式",
        sortOrder: 1,
        schemeId: "scheme-a",
        childIds: ["income", "growth"],
        parentIds: ["stock"],
      },
      {
        id: "developed",
        code: "developed",
        name: "先進国株式",
        sortOrder: 2,
        schemeId: "scheme-a",
        childIds: [],
        parentIds: ["stock"],
      },
      {
        id: "income",
        code: "income",
        name: "高配当",
        sortOrder: 1,
        schemeId: "scheme-a",
        childIds: [],
        parentIds: ["domestic"],
      },
      {
        id: "growth",
        code: "growth",
        name: "成長",
        sortOrder: 2,
        schemeId: "scheme-a",
        childIds: [],
        parentIds: ["domestic"],
      },
    ],
    links: [
      { parentValueId: "stock", childValueId: "domestic", sortOrder: 1 },
      { parentValueId: "stock", childValueId: "developed", sortOrder: 2 },
      { parentValueId: "domestic", childValueId: "income", sortOrder: 1 },
      { parentValueId: "domestic", childValueId: "growth", sortOrder: 2 },
    ],
  },
];

describe("buildChildAllocationSlicesByParentId", () => {
  it("maps direct children under each parent with root-total weights", () => {
    const lines = [
      makeHierarchyLine(600_000, "income", "l1"),
      makeHierarchyLine(400_000, "developed", "l2"),
    ];
    const rootAllocation = buildSchemeAllocationWithHierarchy({
      lines,
      schemeCode: "asset_class",
      schemeName: "資産クラス",
      classificationSchemes,
      parentValueId: null,
    });
    const childMap = buildChildAllocationSlicesByParentId({
      lines,
      schemeCode: "asset_class",
      schemeName: "資産クラス",
      classificationSchemes,
      rootTotalMarketValueMinor: rootAllocation.totalMarketValueMinor,
    });

    const stockChildren = childMap.get("stock") ?? [];
    expect(stockChildren.map((slice) => slice.valueCode).sort()).toEqual([
      "developed",
      "domestic",
    ]);

    const domesticSlice = stockChildren.find((slice) => slice.valueCode === "domestic");
    const developedSlice = stockChildren.find((slice) => slice.valueCode === "developed");
    expect(domesticSlice?.marketValueMinor).toBe(600_000);
    expect(developedSlice?.marketValueMinor).toBe(400_000);
    expect(domesticSlice?.weight).toBeCloseTo(0.6);
    expect(developedSlice?.weight).toBeCloseTo(0.4);

    const domesticChildren = childMap.get("domestic") ?? [];
    expect(domesticChildren.map((slice) => slice.valueCode)).toContain("income");
    const incomeSlice = domesticChildren.find((slice) => slice.valueCode === "income");
    expect(incomeSlice?.weight).toBeCloseTo(0.6);
  });

  it("returns empty map when hierarchy links are absent", () => {
    const flatSchemes: ClassificationSchemeWithValuesDto[] = [
      {
        id: "scheme-a",
        code: "asset_class",
        name: "資産クラス",
        values: [
          {
            id: "domestic",
            code: "domestic",
            name: "国内株式",
            sortOrder: 1,
            schemeId: "scheme-a",
          },
        ],
        links: [],
      },
    ];
    const childMap = buildChildAllocationSlicesByParentId({
      lines: [makeHierarchyLine(100_000, "domestic")],
      schemeCode: "asset_class",
      schemeName: "資産クラス",
      classificationSchemes: flatSchemes,
      rootTotalMarketValueMinor: 100_000,
    });

    expect(childMap.size).toBe(0);
  });
});

describe("getAllocationSliceExpandKey", () => {
  it("uses residual suffix for parent residual slices", () => {
    expect(
      getAllocationSliceExpandKey({
        valueCode: "stock",
        valueName: "その他（未細分）",
        marketValueMinor: 1,
        weight: 0,
        unrealizedGainMinor: null,
        unrealizedGainRate: null,
        lines: [],
        isParentResidual: true,
      }),
    ).toBe("stock__residual");

    expect(
      getAllocationSliceExpandKey({
        valueCode: "stock",
        valueName: "株式",
        marketValueMinor: 1,
        weight: 1,
        unrealizedGainMinor: null,
        unrealizedGainRate: null,
        lines: [],
      }),
    ).toBe("stock");
  });
});

describe("buildAllocationRowExpandKey", () => {
  it("scopes expand keys by parent path for shared DAG children", () => {
    const incomeSlice = {
      valueCode: "income",
      valueName: "インカム",
      marketValueMinor: 1,
      weight: 0.1,
      unrealizedGainMinor: null,
      unrealizedGainRate: null,
      lines: [],
    };

    expect(buildAllocationRowExpandKey("", incomeSlice)).toBe("income");
    expect(buildAllocationRowExpandKey("domestic_equity", incomeSlice)).toBe(
      "domestic_equity/income",
    );
    expect(buildAllocationRowExpandKey("developed_equity", incomeSlice)).toBe(
      "developed_equity/income",
    );
  });
});
