import { describe, expect, it } from "vitest";

import {
  filterHoldingDetailRows,
  flattenHoldingsInRange,
  paginateRows,
  sortHoldingDetailRows,
  type HoldingDetailRow,
} from "../src/holding-detail-rows";
import { IDECO_KAKEIBO_METRIC_CODES } from "../src/holding-line-metrics";
import type { CurrentSnapshotDto, HoldingLineDto } from "../src/types";

function makeLine(
  overrides: Partial<HoldingLineDto> & Pick<HoldingLineDto, "id" | "instrumentId">,
): HoldingLineDto {
  let result: HoldingLineDto = {
    id: overrides.id,
    instrumentId: overrides.instrumentId,
    instrumentName: overrides.instrumentName ?? "テスト銘柄",
    sortOrder: overrides.sortOrder ?? 0,
    quantity: overrides.quantity ?? 100,
    marketValueMinor: overrides.marketValueMinor ?? 10000,
    bookValueMinor: overrides.bookValueMinor ?? 9000,
    metrics: overrides.metrics ?? [],
    instrumentAttributes: overrides.instrumentAttributes ?? [],
    tags: overrides.tags ?? [],
  };
  return result;
}

function makeDetailRow(
  overrides: Partial<HoldingDetailRow> & Pick<HoldingDetailRow, "asOfDate" | "instrumentId">,
): HoldingDetailRow {
  let result: HoldingDetailRow = {
    lineId: overrides.lineId ?? `line-${overrides.instrumentId}`,
    asOfDate: overrides.asOfDate,
    instrumentId: overrides.instrumentId,
    instrumentName: overrides.instrumentName ?? "テスト銘柄",
    sortOrder: overrides.sortOrder ?? 0,
    quantity: overrides.quantity ?? 100,
    marketValueMinor: overrides.marketValueMinor ?? 10000,
    bookValueMinor: overrides.bookValueMinor ?? 9000,
    unitPrice: overrides.unitPrice ?? null,
    unrealizedGainMinor: overrides.unrealizedGainMinor ?? null,
    unrealizedGainRate: overrides.unrealizedGainRate ?? null,
    tags: overrides.tags ?? [],
    portfolioWeight: overrides.portfolioWeight ?? null,
  };
  return result;
}

function makeSnapshot(
  asOfDate: string,
  lines: HoldingLineDto[],
): CurrentSnapshotDto {
  let result: CurrentSnapshotDto = {
    id: `s-${asOfDate}`,
    portfolioCode: "ideco",
    portfolioName: "iDeCo",
    asOfDate,
    analysisSchemes: [],
    metrics: [],
    lines,
  };
  return result;
}

describe("flattenHoldingsInRange", () => {
  it("flattens snapshots into rows sorted by date then line order", () => {
    let result = flattenHoldingsInRange([
      makeSnapshot("2026-06-07", [
        makeLine({ id: "l2", instrumentId: "i1", instrumentName: "B" }),
      ]),
      makeSnapshot("2026-06-01", [
        makeLine({ id: "l1", instrumentId: "i1", instrumentName: "A" }),
      ]),
    ]);

    expect(result).toHaveLength(2);
    expect(result[0]?.asOfDate).toBe("2026-06-01");
    expect(result[0]?.instrumentName).toBe("A");
    expect(result[1]?.asOfDate).toBe("2026-06-07");
    expect(result[1]?.instrumentName).toBe("B");
  });

  it("computes portfolio weight per snapshot date", () => {
    let result = flattenHoldingsInRange([
      makeSnapshot("2026-06-01", [
        makeLine({ id: "l1", instrumentId: "i1", marketValueMinor: 3000 }),
        makeLine({ id: "l2", instrumentId: "i2", marketValueMinor: 7000 }),
      ]),
    ]);

    expect(result[0]?.portfolioWeight).toBeCloseTo(0.3);
    expect(result[1]?.portfolioWeight).toBeCloseTo(0.7);
  });

  it("returns null portfolio weight when total market value is zero", () => {
    let result = flattenHoldingsInRange([
      makeSnapshot("2026-06-01", [
        makeLine({ id: "l1", instrumentId: "i1", marketValueMinor: 0 }),
      ]),
    ]);

    expect(result[0]?.portfolioWeight).toBeNull();
  });

  it("extracts metric values from holding lines", () => {
    let result = flattenHoldingsInRange([
      makeSnapshot("2026-06-01", [
        makeLine({
          id: "l1",
          instrumentId: "i1",
          metrics: [
            {
              code: IDECO_KAKEIBO_METRIC_CODES.unitPricePerTenThousandLots,
              integerValue: 12345,
              realValue: null,
              textValue: null,
            },
            {
              code: IDECO_KAKEIBO_METRIC_CODES.unrealizedGainMinor,
              integerValue: 500,
              realValue: null,
              textValue: null,
            },
            {
              code: IDECO_KAKEIBO_METRIC_CODES.unrealizedGainRate,
              integerValue: null,
              realValue: 0.05,
              textValue: null,
            },
          ],
        }),
      ]),
    ]);

    expect(result[0]?.unitPrice).toBe(12345);
    expect(result[0]?.unrealizedGainMinor).toBe(500);
    expect(result[0]?.unrealizedGainRate).toBe(0.05);
  });

  it("keeps separate rows when the same instrument appears multiple times on one date", () => {
    let result = flattenHoldingsInRange([
      makeSnapshot("2026-06-13", [
        makeLine({
          id: "line-a",
          instrumentId: "inst-1",
          instrumentName: "セレブライフ・ストーリー2045",
          sortOrder: 10,
        }),
        makeLine({
          id: "line-b",
          instrumentId: "inst-1",
          instrumentName: "セレブライフ・ストーリー2045",
          sortOrder: 20,
        }),
      ]),
    ]);

    expect(result).toHaveLength(2);
    expect(result.map((row) => row.lineId)).toEqual(["line-a", "line-b"]);
  });
});

describe("filterHoldingDetailRows", () => {
  const rows: HoldingDetailRow[] = [
    makeDetailRow({
      lineId: "line-1",
      asOfDate: "2026-06-01",
      instrumentId: "i1",
      instrumentName: "国内株式",
      tags: [
        {
          schemeCode: "region",
          schemeName: "地域",
          valueCode: "japan",
          valueName: "日本",
        },
      ],
    }),
    makeDetailRow({
      lineId: "line-2",
      asOfDate: "2026-06-07",
      instrumentId: "i2",
      instrumentName: "外国債券",
      sortOrder: 1,
      quantity: 2,
      marketValueMinor: 2000,
      bookValueMinor: 1800,
      tags: [
        {
          schemeCode: "region",
          schemeName: "地域",
          valueCode: "global",
          valueName: "海外",
        },
      ],
    }),
  ];

  it("filters by query, date, and classification", () => {
    let result = filterHoldingDetailRows(rows, {
      query: "株式",
      asOfDate: "2026-06-01",
      classificationSchemeCode: "region",
      classificationValue: "日本",
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.instrumentName).toBe("国内株式");
  });

  it("returns all rows when filters are empty", () => {
    let result = filterHoldingDetailRows(rows, {});
    expect(result).toHaveLength(2);
  });

  it("matches classification by valueCode and skips __all__", () => {
    let byCode = filterHoldingDetailRows(rows, {
      classificationSchemeCode: "region",
      classificationValue: "japan",
    });
    expect(byCode).toHaveLength(1);
    expect(byCode[0]?.instrumentName).toBe("国内株式");

    let allClassification = filterHoldingDetailRows(rows, {
      classificationSchemeCode: "region",
      classificationValue: "__all__",
    });
    expect(allClassification).toHaveLength(2);

    let noTag = filterHoldingDetailRows(rows, {
      classificationSchemeCode: "missing",
      classificationValue: "x",
    });
    expect(noTag).toHaveLength(0);
  });

  it("matches instrument names regardless of half-width and full-width characters", () => {
    const wideCharRows: HoldingDetailRow[] = [
      makeDetailRow({
        asOfDate: "2026-06-01",
        instrumentId: "i1",
        instrumentName: "ｅＭＡＸＩＳ Ｓｌｉｍ 国内株式",
        quantity: 1,
        marketValueMinor: 1000,
        bookValueMinor: 900,
      }),
      makeDetailRow({
        asOfDate: "2026-06-01",
        instrumentId: "i2",
        instrumentName: "ＳＢＩ・全世界株式",
        sortOrder: 1,
        quantity: 2,
        marketValueMinor: 2000,
        bookValueMinor: 1800,
      }),
    ];

    let emaxisResult = filterHoldingDetailRows(wideCharRows, { query: "emaxis" });
    expect(emaxisResult).toHaveLength(1);
    expect(emaxisResult[0]?.instrumentName).toBe("ｅＭＡＸＩＳ Ｓｌｉｍ 国内株式");

    let fullWidthEmaxisResult = filterHoldingDetailRows(wideCharRows, {
      query: "ＥＭＡＸＩＳ",
    });
    expect(fullWidthEmaxisResult).toHaveLength(1);
    expect(fullWidthEmaxisResult[0]?.instrumentName).toBe("ｅＭＡＸＩＳ Ｓｌｉｍ 国内株式");

    let sbiResult = filterHoldingDetailRows(wideCharRows, { query: "sbi" });
    expect(sbiResult).toHaveLength(1);
    expect(sbiResult[0]?.instrumentName).toBe("ＳＢＩ・全世界株式");

    let kanjiResult = filterHoldingDetailRows(wideCharRows, { query: "株式" });
    expect(kanjiResult).toHaveLength(2);
  });
});

describe("sortHoldingDetailRows", () => {
  const rows: HoldingDetailRow[] = [
    makeDetailRow({
      asOfDate: "2026-06-01",
      instrumentId: "i2",
      instrumentName: "B",
      sortOrder: 1,
      quantity: 1,
      marketValueMinor: 1000,
      bookValueMinor: null,
    }),
    makeDetailRow({
      asOfDate: "2026-06-07",
      instrumentId: "i1",
      instrumentName: "A",
      quantity: 2,
      marketValueMinor: 2000,
      bookValueMinor: null,
    }),
  ];

  it("sorts by asOfDate descending by default column", () => {
    let result = sortHoldingDetailRows(rows, "asOfDate", "desc");
    expect(result[0]?.asOfDate).toBe("2026-06-07");
    expect(result[1]?.asOfDate).toBe("2026-06-01");
  });

  it("sorts by market value ascending", () => {
    let result = sortHoldingDetailRows(rows, "marketValue", "asc");
    expect(result[0]?.marketValueMinor).toBe(1000);
    expect(result[1]?.marketValueMinor).toBe(2000);
  });

  it("sorts by numeric and classification columns", () => {
    const detailedRows: HoldingDetailRow[] = [
      makeDetailRow({
        asOfDate: "2026-06-01",
        instrumentId: "i1",
        instrumentName: "B",
        sortOrder: 1,
        quantity: 2,
        marketValueMinor: 2000,
        bookValueMinor: 1800,
        unitPrice: 200,
        unrealizedGainMinor: 200,
        unrealizedGainRate: 0.2,
        portfolioWeight: 0.6,
        tags: [
          {
            schemeCode: "region",
            schemeName: "地域",
            valueCode: "global",
            valueName: "海外",
          },
        ],
      }),
      makeDetailRow({
        asOfDate: "2026-06-01",
        instrumentId: "i2",
        instrumentName: "A",
        quantity: 1,
        marketValueMinor: 1000,
        bookValueMinor: 900,
        unitPrice: 100,
        unrealizedGainMinor: 100,
        unrealizedGainRate: 0.1,
        portfolioWeight: 0.4,
        tags: [
          {
            schemeCode: "region",
            schemeName: "地域",
            valueCode: "japan",
            valueName: "日本",
          },
        ],
      }),
    ];

    expect(sortHoldingDetailRows(detailedRows, "quantity", "asc")[0]?.quantity).toBe(1);
    expect(sortHoldingDetailRows(detailedRows, "sortOrder", "asc")[0]?.sortOrder).toBe(0);
    expect(
      sortHoldingDetailRows(detailedRows, "instrumentName", "asc")[0]?.instrumentName,
    ).toBe("A");
    expect(sortHoldingDetailRows(detailedRows, "unitPrice", "asc")[0]?.unitPrice).toBe(100);
    expect(sortHoldingDetailRows(detailedRows, "bookValue", "asc")[0]?.bookValueMinor).toBe(900);
    expect(
      sortHoldingDetailRows(detailedRows, "unrealizedGain", "asc")[0]?.unrealizedGainMinor,
    ).toBe(100);
    expect(
      sortHoldingDetailRows(detailedRows, "unrealizedGainRate", "asc")[0]
        ?.unrealizedGainRate,
    ).toBe(0.1);
    expect(
      sortHoldingDetailRows(detailedRows, "portfolioWeight", "asc")[0]?.portfolioWeight,
    ).toBe(0.4);
    expect(
      sortHoldingDetailRows(detailedRows, "classification:region", "asc")[0]?.tags[0]
        ?.valueName,
    ).toBe("海外");
  });

  it("uses tie-breakers when primary sort column is equal", () => {
    const tiedRows: HoldingDetailRow[] = [
      makeDetailRow({
        asOfDate: "2026-06-01",
        instrumentId: "i1",
        instrumentName: "B",
        sortOrder: 1,
        quantity: 1,
        marketValueMinor: 1000,
        bookValueMinor: null,
      }),
      makeDetailRow({
        asOfDate: "2026-06-07",
        instrumentId: "i2",
        instrumentName: "A",
        quantity: 1,
        marketValueMinor: 1000,
        bookValueMinor: null,
      }),
    ];

    let result = sortHoldingDetailRows(tiedRows, "quantity", "asc");
    expect(result[0]?.asOfDate).toBe("2026-06-07");
    expect(result[1]?.asOfDate).toBe("2026-06-01");
  });

  it("treats null sortOrder as last when sorting by sortOrder", () => {
    const rowsWithNullSort: HoldingDetailRow[] = [
      makeDetailRow({
        asOfDate: "2026-06-01",
        instrumentId: "i1",
        instrumentName: "Later",
        sortOrder: null,
        quantity: 1,
        marketValueMinor: 1000,
        bookValueMinor: null,
      }),
      makeDetailRow({
        asOfDate: "2026-06-01",
        instrumentId: "i2",
        instrumentName: "First",
        quantity: 1,
        marketValueMinor: 1000,
        bookValueMinor: null,
      }),
    ];

    let result = sortHoldingDetailRows(rowsWithNullSort, "sortOrder", "asc");
    expect(result[0]?.instrumentName).toBe("First");
    expect(result[1]?.instrumentName).toBe("Later");

    const reversedNullSort: HoldingDetailRow[] = [
      {
        ...rowsWithNullSort[1],
        instrumentName: "First",
        sortOrder: 0,
      },
      {
        ...rowsWithNullSort[0],
        instrumentName: "Later",
        sortOrder: null,
      },
    ];
    let reversedResult = sortHoldingDetailRows(reversedNullSort, "sortOrder", "asc");
    expect(reversedResult[0]?.instrumentName).toBe("First");
    expect(reversedResult[1]?.instrumentName).toBe("Later");
  });

  it("sorts classification columns when both rows lack tags", () => {
    const untaggedRows: HoldingDetailRow[] = [
      makeDetailRow({
        asOfDate: "2026-06-01",
        instrumentId: "i1",
        instrumentName: "B",
        quantity: 1,
        marketValueMinor: 1000,
        bookValueMinor: null,
      }),
      makeDetailRow({
        asOfDate: "2026-06-01",
        instrumentId: "i2",
        instrumentName: "A",
        quantity: 1,
        marketValueMinor: 1000,
        bookValueMinor: null,
      }),
    ];

    let result = sortHoldingDetailRows(untaggedRows, "classification:region", "asc");
    expect(result[0]?.instrumentName).toBe("A");
    expect(result[1]?.instrumentName).toBe("B");
  });
});

describe("paginateRows", () => {
  const rows = ["a", "b", "c", "d", "e"];

  it("returns page slices and range label", () => {
    let result = paginateRows(rows, 2, 2);
    expect(result.pageRows).toEqual(["c", "d"]);
    expect(result.totalPages).toBe(3);
    expect(result.rangeLabel).toBe("全 5 件中 3–4 件");
  });

  it("clamps page to valid range", () => {
    let result = paginateRows(rows, 99, 2);
    expect(result.page).toBe(3);
    expect(result.pageRows).toEqual(["e"]);
  });

  it("handles empty rows", () => {
    let result = paginateRows([], 1, 50);
    expect(result.pageRows).toEqual([]);
    expect(result.rangeLabel).toBe("0 件");
    expect(result.totalPages).toBe(0);
  });

  it("returns empty result when pageSize is zero or negative", () => {
    let zero = paginateRows(rows, 1, 0);
    expect(zero.pageRows).toEqual([]);
    expect(zero.totalPages).toBe(0);

    let negative = paginateRows(rows, 1, -1);
    expect(negative.pageRows).toEqual([]);
    expect(negative.totalPages).toBe(0);
  });
});
