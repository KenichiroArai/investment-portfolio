import { describe, expect, it } from "vitest";

import {
  filterAllocationDetailRows,
  flattenAllocationInRange,
  sortAllocationDetailRows,
  type AllocationDetailRow,
} from "../src/allocation-detail-rows";
import { IDECO_KAKEIBO_METRIC_CODES } from "../src/holding-line-metrics";
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

function makeSnapshot(
  asOfDate: string,
  lines: HoldingLineDto[],
): CurrentSnapshotDto {
  let result: CurrentSnapshotDto = {
    id: `snap-${asOfDate}`,
    portfolioCode: "ideco",
    portfolioName: "iDeCo",
    asOfDate,
    analysisSchemes: [{ schemeCode: "ideco_region", schemeName: "地域分類" }],
    metrics: [],
    lines,
  };
  return result;
}

describe("allocation-detail-rows", () => {
  it("flattens classification rows per snapshot date", () => {
    const snapshots = [
      makeSnapshot("2026-05-01", [
        makeLine(60_000, [
          {
            schemeCode: "ideco_region",
            schemeName: "地域分類",
            valueCode: "domestic",
            valueName: "国内",
          },
        ]),
        makeLine(40_000, [
          {
            schemeCode: "ideco_region",
            schemeName: "地域分類",
            valueCode: "foreign",
            valueName: "海外",
          },
        ]),
      ]),
      makeSnapshot("2026-06-01", [
        makeLine(100_000, [
          {
            schemeCode: "ideco_region",
            schemeName: "地域分類",
            valueCode: "domestic",
            valueName: "国内",
          },
        ]),
      ]),
    ];

    const rows = flattenAllocationInRange(snapshots, "ideco_region", "地域分類");

    expect(rows).toHaveLength(3);
    expect(rows.map((row) => `${row.asOfDate}:${row.valueName}`)).toEqual([
      "2026-05-01:国内",
      "2026-05-01:海外",
      "2026-06-01:国内",
    ]);
    expect(rows[0]?.weight).toBeCloseTo(0.6);
    expect(rows[2]?.marketValueMinor).toBe(100_000);
  });

  it("filters rows by classification value and query", () => {
    const rows = flattenAllocationInRange(
      [
        makeSnapshot("2026-06-01", [
          makeLine(100_000, [
            {
              schemeCode: "ideco_region",
              schemeName: "地域分類",
              valueCode: "domestic",
              valueName: "国内",
            },
          ]),
        ]),
      ],
      "ideco_region",
      "地域分類",
    );

    const filtered = filterAllocationDetailRows(rows, {
      query: "国内",
      classificationValue: "国内",
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.valueName).toBe("国内");
  });

  it("sorts rows by market value", () => {
    const rows = flattenAllocationInRange(
      [
        makeSnapshot("2026-06-01", [
          makeLine(40_000, [
            {
              schemeCode: "ideco_region",
              schemeName: "地域分類",
              valueCode: "foreign",
              valueName: "海外",
            },
          ]),
          makeLine(60_000, [
            {
              schemeCode: "ideco_region",
              schemeName: "地域分類",
              valueCode: "domestic",
              valueName: "国内",
            },
          ]),
        ]),
      ],
      "ideco_region",
      "地域分類",
    );

    const sorted = sortAllocationDetailRows(rows, "marketValue", "desc");

    expect(sorted.map((row) => row.valueName)).toEqual(["国内", "海外"]);
  });

  it("includes unrealized gain fields aggregated per classification slice", () => {
    const rows = flattenAllocationInRange(
      [
        makeSnapshot("2026-06-01", [
          makeLine(60_000, [
            {
              schemeCode: "ideco_region",
              schemeName: "地域分類",
              valueCode: "domestic",
              valueName: "国内",
            },
          ], {
            bookValueMinor: 50_000,
            metrics: [
              {
                code: IDECO_KAKEIBO_METRIC_CODES.unrealizedGainMinor,
                integerValue: 10_000,
                realValue: null,
                textValue: null,
              },
            ],
          }),
          makeLine(40_000, [
            {
              schemeCode: "ideco_region",
              schemeName: "地域分類",
              valueCode: "foreign",
              valueName: "海外",
            },
          ], {
            bookValueMinor: 30_000,
            metrics: [
              {
                code: IDECO_KAKEIBO_METRIC_CODES.unrealizedGainMinor,
                integerValue: 5_000,
                realValue: null,
                textValue: null,
              },
            ],
          }),
        ]),
      ],
      "ideco_region",
      "地域分類",
    );

    const domestic = rows.find((row) => row.valueName === "国内");
    const foreign = rows.find((row) => row.valueName === "海外");

    expect(domestic?.unrealizedGainMinor).toBe(10_000);
    expect(domestic?.unrealizedGainRate).toBeCloseTo(10_000 / 50_000);
    expect(foreign?.unrealizedGainMinor).toBe(5_000);
    expect(foreign?.unrealizedGainRate).toBeCloseTo(5_000 / 30_000);
  });

  it("sorts rows by unrealized gain", () => {
    const rows = flattenAllocationInRange(
      [
        makeSnapshot("2026-06-01", [
          makeLine(40_000, [
            {
              schemeCode: "ideco_region",
              schemeName: "地域分類",
              valueCode: "foreign",
              valueName: "海外",
            },
          ], {
            bookValueMinor: 30_000,
            metrics: [
              {
                code: IDECO_KAKEIBO_METRIC_CODES.unrealizedGainMinor,
                integerValue: 5_000,
                realValue: null,
                textValue: null,
              },
            ],
          }),
          makeLine(60_000, [
            {
              schemeCode: "ideco_region",
              schemeName: "地域分類",
              valueCode: "domestic",
              valueName: "国内",
            },
          ], {
            bookValueMinor: 50_000,
            metrics: [
              {
                code: IDECO_KAKEIBO_METRIC_CODES.unrealizedGainMinor,
                integerValue: 10_000,
                realValue: null,
                textValue: null,
              },
            ],
          }),
        ]),
      ],
      "ideco_region",
      "地域分類",
    );

    const sorted = sortAllocationDetailRows(rows, "unrealizedGain", "desc");

    expect(sorted.map((row) => row.valueName)).toEqual(["国内", "海外"]);
  });

  it("filters rows by asOfDate, empty query, and classification sentinels", () => {
    const rows: AllocationDetailRow[] = [
      {
        rowId: "2026-05-01:ideco_region:domestic",
        asOfDate: "2026-05-01",
        schemeCode: "ideco_region",
        schemeName: "地域分類",
        valueCode: "domestic",
        valueName: "国内",
        marketValueMinor: 60_000,
        weight: 0.6,
        unrealizedGainMinor: null,
        unrealizedGainRate: null,
      },
      {
        rowId: "2026-06-01:ideco_region:foreign",
        asOfDate: "2026-06-01",
        schemeCode: "ideco_region",
        schemeName: "地域分類",
        valueCode: "foreign",
        valueName: "海外",
        marketValueMinor: 40_000,
        weight: 0.4,
        unrealizedGainMinor: null,
        unrealizedGainRate: null,
      },
    ];

    expect(filterAllocationDetailRows(rows, { asOfDate: "2026-05-01" })).toHaveLength(1);
    expect(filterAllocationDetailRows(rows, { asOfDate: "__all__" })).toHaveLength(2);
    expect(filterAllocationDetailRows(rows, { query: "" })).toHaveLength(2);
    expect(
      filterAllocationDetailRows(rows, { classificationValue: "__all__" }),
    ).toHaveLength(2);
    expect(
      filterAllocationDetailRows(rows, { classificationValue: "foreign" }),
    ).toEqual([rows[1]]);
    expect(
      filterAllocationDetailRows(rows, { query: "海外", classificationValue: null }),
    ).toEqual([rows[1]]);
  });

  it("sorts rows by all columns and uses tie-breakers", () => {
    const rowA: AllocationDetailRow = {
      rowId: "2026-06-01:ideco_region:domestic",
      asOfDate: "2026-06-01",
      schemeCode: "ideco_region",
      schemeName: "地域分類",
      valueCode: "domestic",
      valueName: "国内",
      marketValueMinor: 100,
      weight: 0.6,
      unrealizedGainMinor: 10,
      unrealizedGainRate: 0.1,
    };
    const rowB: AllocationDetailRow = {
      rowId: "2026-05-01:ideco_region:foreign",
      asOfDate: "2026-05-01",
      schemeCode: "ideco_region",
      schemeName: "地域分類",
      valueCode: "foreign",
      valueName: "海外",
      marketValueMinor: 100,
      weight: 0.4,
      unrealizedGainMinor: 20,
      unrealizedGainRate: 0.2,
    };

    expect(sortAllocationDetailRows([rowA, rowB], "asOfDate", "asc")[0]?.valueName).toBe(
      "海外",
    );
    expect(sortAllocationDetailRows([rowA, rowB], "valueName", "asc")[0]?.valueName).toBe(
      "海外",
    );
    expect(sortAllocationDetailRows([rowA, rowB], "weight", "desc")[0]?.valueName).toBe(
      "国内",
    );
    expect(
      sortAllocationDetailRows([rowA, rowB], "unrealizedGainRate", "desc")[0]?.valueName,
    ).toBe("海外");
    expect(sortAllocationDetailRows([rowA, rowB], "marketValue", "asc")).toEqual([
      rowA,
      rowB,
    ]);

    const tieRowA: AllocationDetailRow = {
      ...rowA,
      rowId: "2026-06-01:ideco_region:domestic-a",
    };
    const tieRowB: AllocationDetailRow = {
      ...rowA,
      rowId: "2026-06-01:ideco_region:domestic-b",
    };
    expect(sortAllocationDetailRows([tieRowB, tieRowA], "marketValue", "asc")).toEqual([
      tieRowA,
      tieRowB,
    ]);

    const sameDateA: AllocationDetailRow = {
      ...rowA,
      valueName: "国内",
      valueCode: "domestic",
    };
    const sameDateB: AllocationDetailRow = {
      ...rowA,
      valueName: "海外",
      valueCode: "foreign",
      rowId: "2026-06-01:ideco_region:foreign",
    };
    expect(sortAllocationDetailRows([sameDateB, sameDateA], "marketValue", "asc")).toEqual([
      sameDateB,
      sameDateA,
    ]);
  });
});
