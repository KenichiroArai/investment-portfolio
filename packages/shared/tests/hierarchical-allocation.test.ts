import { describe, expect, it } from "vitest";

import {
  PARENT_RESIDUAL_SLICE_NAME,
  buildAllocationBySchemeWithLines,
  buildHierarchicalAllocationBySchemeWithLines,
} from "../src/snapshot-allocation";
import type { ClassificationTagDto, HoldingLineDto } from "../src/types";

function makeTaggedLine(
  marketValueMinor: number,
  tags: ClassificationTagDto[],
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
    tags,
  };
  return result;
}

function makeHierarchyLine(
  marketValueMinor: number,
  valueCode: string,
): HoldingLineDto {
  let result = makeTaggedLine(marketValueMinor, [
    {
      schemeCode: "asset_class",
      schemeName: "資産クラス",
      valueCode,
      valueName: valueCode,
      allocationWeight: 1,
    },
  ]);
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
        links: [],
        schemeValues,
        schemeId: "scheme-a",
      },
    );
    const flat = buildAllocationBySchemeWithLines(lines, "asset_class", "資産クラス");

    expect(hierarchical.slices).toEqual(flat.slices);
  });

  it("ignores unknown tag codes while building hierarchical allocation", () => {
    const lines = [
      makeTaggedLine(100_000, [
        {
          schemeCode: "asset_class",
          schemeName: "資産クラス",
          valueCode: "domestic",
          valueName: "国内株式",
          allocationWeight: 0.5,
        },
        {
          schemeCode: "asset_class",
          schemeName: "資産クラス",
          valueCode: "missing-code",
          valueName: "未登録",
          allocationWeight: 0.5,
        },
        {
          schemeCode: "unknown_scheme",
          schemeName: "未知",
          valueCode: "missing",
          valueName: "missing",
          allocationWeight: 1,
        },
      ]),
      makeHierarchyLine(200_000, "missing-code"),
    ];
    const allocation = buildHierarchicalAllocationBySchemeWithLines(
      lines,
      "asset_class",
      "資産クラス",
      {
        links,
        schemeValues,
        schemeId: "scheme-a",
      },
    );

    expect(allocation.slices).toHaveLength(1);
    expect(allocation.slices[0]?.valueCode).toBe("stock");
    expect(allocation.slices[0]?.marketValueMinor).toBe(50_000);
  });

  it("ignores attributions whose scheme has no registered values", () => {
    // 表示単位は「地域」軸の値だが、集計対象タグは値が登録されていない「資産クラス」軸
    const regionValues = [
      {
        id: "region-root",
        code: "region_root",
        name: "地域",
        sortOrder: 1,
        schemeId: "scheme-a",
        schemeCode: "region",
      },
      {
        id: "region-domestic",
        code: "region_domestic",
        name: "日本",
        sortOrder: 1,
        schemeId: "scheme-a",
        schemeCode: "region",
      },
    ];
    const lines = [
      makeTaggedLine(500_000, [
        {
          schemeCode: "region",
          schemeName: "地域",
          valueCode: "region_domestic",
          valueName: "日本",
          allocationWeight: 1,
        },
        {
          schemeCode: "asset_class",
          schemeName: "資産クラス",
          valueCode: "domestic",
          valueName: "国内株式",
          allocationWeight: 1,
        },
      ]),
    ];
    const allocation = buildHierarchicalAllocationBySchemeWithLines(
      lines,
      "asset_class",
      "資産クラス",
      {
        links: [
          { parentValueId: "region-root", childValueId: "region-domestic", sortOrder: 1 },
        ],
        schemeValues: regionValues,
        schemeId: "scheme-a",
      },
    );

    expect(allocation.slices).toEqual([]);
  });

  it("ignores roots that belong to another scheme", () => {
    const crossSchemeValues = [
      ...schemeValues,
      {
        id: "region-root",
        code: "region_root",
        name: "地域",
        sortOrder: 1,
        schemeId: "scheme-b",
        schemeCode: "region",
      },
    ];
    const lines = [makeHierarchyLine(500_000, "domestic")];
    const allocation = buildHierarchicalAllocationBySchemeWithLines(
      lines,
      "asset_class",
      "資産クラス",
      {
        links,
        schemeValues: crossSchemeValues,
        schemeId: "scheme-a",
      },
    );

    expect(allocation.slices.map((slice) => slice.valueCode)).toEqual(["stock"]);
  });

  it("drills down by parent value id", () => {
    const lines = [
      makeHierarchyLine(600_000, "domestic"),
      makeHierarchyLine(400_000, "developed"),
    ];
    const allocation = buildHierarchicalAllocationBySchemeWithLines(
      lines,
      "asset_class",
      "資産クラス",
      {
        parentValueId: "stock",
        links,
        schemeValues,
        schemeId: "scheme-a",
      },
    );

    expect(allocation.slices.map((slice) => slice.valueCode).sort()).toEqual(
      ["developed", "domestic"].sort(),
    );
  });

  it("splits a single line across sibling children on drilldown", () => {
    const lines = [
      makeTaggedLine(1_000_000, [
        {
          schemeCode: "asset_class",
          schemeName: "資産クラス",
          valueCode: "domestic",
          valueName: "国内株式",
          allocationWeight: 0.6,
        },
        {
          schemeCode: "asset_class",
          schemeName: "資産クラス",
          valueCode: "developed",
          valueName: "先進国株式",
          allocationWeight: 0.4,
        },
      ]),
    ];
    const allocation = buildHierarchicalAllocationBySchemeWithLines(
      lines,
      "asset_class",
      "資産クラス",
      {
        parentValueId: "stock",
        links,
        schemeValues,
        schemeId: "scheme-a",
      },
    );

    expect(
      allocation.slices.map((slice) => [slice.valueCode, slice.marketValueMinor]),
    ).toEqual([
      ["domestic", 600_000],
      ["developed", 400_000],
    ]);
    // 同一明細がどちらのスライスにも重複して積まれないこと
    for (const slice of allocation.slices) {
      expect(slice.lines).toHaveLength(1);
    }
  });

  it("skips lines that do not match the active display unit", () => {
    const lines = [makeHierarchyLine(500_000, "domestic")];
    const allocation = buildHierarchicalAllocationBySchemeWithLines(
      lines,
      "asset_class",
      "資産クラス",
      {
        parentValueId: "developed",
        links,
        schemeValues,
        schemeId: "scheme-a",
      },
    );

    expect(allocation.slices).toEqual([]);
  });

  it("assigns zero weightInSlice when slice market value is zero", () => {
    const lines = [makeHierarchyLine(0, "domestic")];
    const allocation = buildHierarchicalAllocationBySchemeWithLines(
      lines,
      "asset_class",
      "資産クラス",
      {
        links,
        schemeValues,
        schemeId: "scheme-a",
      },
    );

    expect(allocation.slices[0]?.lines[0]?.weightInSlice).toBe(0);
  });

  it("skips untagged lines and unknown display values", () => {
    const partialSchemeValues = schemeValues.filter((value) => value.id !== "developed");
    const lines = [
      makeHierarchyLine(100_000, "domestic"),
      { ...makeHierarchyLine(200_000, "developed"), tags: [] },
    ];
    const allocation = buildHierarchicalAllocationBySchemeWithLines(
      lines,
      "asset_class",
      "資産クラス",
      {
        parentValueId: "stock",
        links,
        schemeValues: partialSchemeValues,
        schemeId: "scheme-a",
      },
    );

    expect(allocation.slices.map((slice) => slice.valueCode)).toEqual(["domestic"]);
  });

  it("ignores display units when the line lacks tags for that scheme", () => {
    const crossSchemeValues = [
      ...schemeValues,
      {
        id: "region-developed",
        code: "developed",
        name: "先進国",
        sortOrder: 1,
        schemeId: "scheme-b",
        schemeCode: "region",
      },
    ];
    const crossSchemeLinks = [
      ...links,
      { parentValueId: "stock", childValueId: "region-developed", sortOrder: 3 },
    ];
    const lines = [makeHierarchyLine(500_000, "domestic")];
    const allocation = buildHierarchicalAllocationBySchemeWithLines(
      lines,
      "asset_class",
      "資産クラス",
      {
        parentValueId: "stock",
        links: crossSchemeLinks,
        schemeValues: crossSchemeValues,
        schemeId: "scheme-a",
      },
    );

    expect(allocation.slices.map((slice) => slice.valueCode)).toEqual(["domestic"]);
  });

  it("sorts child slices by name and code when sort order ties", () => {
    const tiedLeaves = [
      ...schemeValues,
      {
        id: "leaf-b",
        code: "leaf_b",
        name: "同順位",
        sortOrder: 1,
        schemeId: "scheme-a",
        schemeCode: "asset_class",
      },
      {
        id: "leaf-a",
        code: "leaf_a",
        name: "同順位",
        sortOrder: 1,
        schemeId: "scheme-a",
        schemeCode: "asset_class",
      },
    ];
    const tiedLinks = [
      { parentValueId: "stock", childValueId: "leaf-a", sortOrder: 1 },
      { parentValueId: "stock", childValueId: "leaf-b", sortOrder: 2 },
    ];
    const lines = [
      makeHierarchyLine(100_000, "leaf_a"),
      makeHierarchyLine(200_000, "leaf_b"),
    ];
    const allocation = buildHierarchicalAllocationBySchemeWithLines(
      lines,
      "asset_class",
      "資産クラス",
      {
        parentValueId: "stock",
        links: tiedLinks,
        schemeValues: tiedLeaves,
        schemeId: "scheme-a",
      },
    );

    expect(allocation.slices.map((slice) => slice.valueCode)).toEqual([
      "leaf_a",
      "leaf_b",
    ]);
  });

  it("skips lines outside the selected context parent", () => {
    const orphanValues = [
      ...schemeValues,
      {
        id: "orphan",
        code: "orphan",
        name: "未リンク",
        sortOrder: 3,
        schemeId: "scheme-a",
        schemeCode: "asset_class",
      },
    ];
    const lines = [makeHierarchyLine(500_000, "orphan")];
    const allocation = buildHierarchicalAllocationBySchemeWithLines(
      lines,
      "asset_class",
      "資産クラス",
      {
        parentValueId: "stock",
        links,
        schemeValues: orphanValues,
        schemeId: "scheme-a",
      },
    );

    expect(allocation.slices).toEqual([]);
  });

  it("keeps values without links as their own root slice", () => {
    const orphanValues = [
      ...schemeValues,
      {
        id: "orphan",
        code: "orphan",
        name: "未リンク",
        sortOrder: 3,
        schemeId: "scheme-a",
        schemeCode: "asset_class",
      },
    ];
    const lines = [
      makeHierarchyLine(600_000, "domestic"),
      makeHierarchyLine(400_000, "orphan"),
    ];
    const allocation = buildHierarchicalAllocationBySchemeWithLines(
      lines,
      "asset_class",
      "資産クラス",
      {
        links,
        schemeValues: orphanValues,
        schemeId: "scheme-a",
      },
    );

    expect(allocation.slices.map((slice) => slice.valueCode).sort()).toEqual(
      ["orphan", "stock"].sort(),
    );
  });

  it("skips lines when context scheme tags are absent", () => {
    const crossSchemeValues = [
      ...schemeValues,
      {
        id: "region-root",
        code: "region_root",
        name: "地域ルート",
        sortOrder: 1,
        schemeId: "scheme-b",
        schemeCode: "region",
      },
      {
        id: "region-developed",
        code: "developed",
        name: "先進国",
        sortOrder: 1,
        schemeId: "scheme-b",
        schemeCode: "region",
      },
    ];
    const crossSchemeLinks = [
      ...links,
      { parentValueId: "region-root", childValueId: "region-developed", sortOrder: 1 },
    ];
    const lines = [makeHierarchyLine(500_000, "domestic")];
    const allocation = buildHierarchicalAllocationBySchemeWithLines(
      lines,
      "asset_class",
      "資産クラス",
      {
        parentValueId: "region-root",
        links: crossSchemeLinks,
        schemeValues: crossSchemeValues,
        schemeId: "scheme-a",
      },
    );

    expect(allocation.slices).toEqual([]);
  });

  it("includes parent-tagged holdings in parent aggregation", () => {
    const lines = [makeHierarchyLine(700_000, "stock")];
    const allocation = buildHierarchicalAllocationBySchemeWithLines(
      lines,
      "asset_class",
      "資産クラス",
      {
        links,
        schemeValues,
        schemeId: "scheme-a",
      },
    );

    expect(allocation.slices).toHaveLength(1);
    expect(allocation.slices[0]?.valueCode).toBe("stock");
    expect(allocation.slices[0]?.marketValueMinor).toBe(700_000);
  });

  it("shows parent-tagged residual when drilling into that parent", () => {
    const lines = [
      makeHierarchyLine(400_000, "stock"),
      makeHierarchyLine(600_000, "domestic"),
    ];
    const allocation = buildHierarchicalAllocationBySchemeWithLines(
      lines,
      "asset_class",
      "資産クラス",
      {
        parentValueId: "stock",
        links,
        schemeValues,
        schemeId: "scheme-a",
      },
    );

    expect(allocation.slices.map((slice) => slice.valueCode).sort()).toEqual(
      ["domestic", "stock"].sort(),
    );

    const residual = allocation.slices.find((slice) => slice.valueCode === "stock");
    expect(residual?.marketValueMinor).toBe(400_000);
    expect(residual?.valueName).toBe(PARENT_RESIDUAL_SLICE_NAME);
    expect(residual?.isParentResidual).toBe(true);

    const child = allocation.slices.find((slice) => slice.valueCode === "domestic");
    expect(child?.valueName).toBe("国内株式");
    expect(child?.isParentResidual).toBe(false);
  });

  it("leaves no residual once the parent weight has been moved to the child", () => {
    // 修復後のデータ形（親タグは付けず、子タグだけが重みを持つ）
    const lines = [
      makeTaggedLine(1_000_000, [
        {
          schemeCode: "asset_class",
          schemeName: "資産クラス",
          valueCode: "domestic",
          valueName: "国内株式",
          allocationWeight: 1,
        },
      ]),
    ];
    const rootAllocation = buildHierarchicalAllocationBySchemeWithLines(
      lines,
      "asset_class",
      "資産クラス",
      {
        links,
        schemeValues,
        schemeId: "scheme-a",
      },
    );

    expect(rootAllocation.slices.map((slice) => slice.valueCode)).toEqual(["stock"]);
    expect(rootAllocation.slices[0]?.marketValueMinor).toBe(1_000_000);

    const drilledAllocation = buildHierarchicalAllocationBySchemeWithLines(
      lines,
      "asset_class",
      "資産クラス",
      {
        parentValueId: "stock",
        links,
        schemeValues,
        schemeId: "scheme-a",
      },
    );

    expect(drilledAllocation.slices.map((slice) => slice.valueCode)).toEqual([
      "domestic",
    ]);
    expect(drilledAllocation.slices[0]?.marketValueMinor).toBe(1_000_000);
    expect(drilledAllocation.slices[0]?.weight).toBeCloseTo(1);
  });
});
