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
});

describe("filterHoldingDetailRows", () => {
  const rows: HoldingDetailRow[] = [
    {
      asOfDate: "2026-06-01",
      instrumentId: "i1",
      instrumentName: "国内株式",
      sortOrder: 0,
      quantity: 1,
      marketValueMinor: 1000,
      bookValueMinor: 900,
      unitPrice: null,
      unrealizedGainMinor: null,
      unrealizedGainRate: null,
      tags: [
        {
          schemeCode: "region",
          schemeName: "地域",
          valueCode: "japan",
          valueName: "日本",
        },
      ],
    },
    {
      asOfDate: "2026-06-07",
      instrumentId: "i2",
      instrumentName: "外国債券",
      sortOrder: 1,
      quantity: 2,
      marketValueMinor: 2000,
      bookValueMinor: 1800,
      unitPrice: null,
      unrealizedGainMinor: null,
      unrealizedGainRate: null,
      tags: [
        {
          schemeCode: "region",
          schemeName: "地域",
          valueCode: "global",
          valueName: "海外",
        },
      ],
    },
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

  it("matches instrument names regardless of half-width and full-width characters", () => {
    const wideCharRows: HoldingDetailRow[] = [
      {
        asOfDate: "2026-06-01",
        instrumentId: "i1",
        instrumentName: "ｅＭＡＸＩＳ Ｓｌｉｍ 国内株式",
        sortOrder: 0,
        quantity: 1,
        marketValueMinor: 1000,
        bookValueMinor: 900,
        unitPrice: null,
        unrealizedGainMinor: null,
        unrealizedGainRate: null,
        tags: [],
      },
      {
        asOfDate: "2026-06-01",
        instrumentId: "i2",
        instrumentName: "ＳＢＩ・全世界株式",
        sortOrder: 1,
        quantity: 2,
        marketValueMinor: 2000,
        bookValueMinor: 1800,
        unitPrice: null,
        unrealizedGainMinor: null,
        unrealizedGainRate: null,
        tags: [],
      },
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
    {
      asOfDate: "2026-06-01",
      instrumentId: "i2",
      instrumentName: "B",
      sortOrder: 1,
      quantity: 1,
      marketValueMinor: 1000,
      bookValueMinor: null,
      unitPrice: null,
      unrealizedGainMinor: null,
      unrealizedGainRate: null,
      tags: [],
    },
    {
      asOfDate: "2026-06-07",
      instrumentId: "i1",
      instrumentName: "A",
      sortOrder: 0,
      quantity: 2,
      marketValueMinor: 2000,
      bookValueMinor: null,
      unitPrice: null,
      unrealizedGainMinor: null,
      unrealizedGainRate: null,
      tags: [],
    },
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
});
