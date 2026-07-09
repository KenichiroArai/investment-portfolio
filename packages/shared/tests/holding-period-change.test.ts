import { describe, expect, it } from "vitest";

import {
  buildHoldingPeriodChangeRows,
  resolveComparisonDate,
  sortHoldingPeriodChangeRows,
  type HoldingPeriodChangeRow,
} from "../src/holding-period-change";
import { IDECO_KAKEIBO_METRIC_CODES } from "../src/holding-line-metrics";
import type { HoldingLineDto } from "../src/types";

function makeLine(
  overrides: Partial<HoldingLineDto> & Pick<HoldingLineDto, "id" | "instrumentId">,
): HoldingLineDto {
  let result: HoldingLineDto = {
    id: overrides.id,
    instrumentId: overrides.instrumentId,
    instrumentName: overrides.instrumentName ?? "テスト銘柄",
    accountId: overrides.accountId ?? "test:default",
    accountName: overrides.accountName ?? "テスト口座",
    sortOrder: overrides.sortOrder ?? 0,
    quantity: overrides.quantity ?? 100,
    marketValueMinor: overrides.marketValueMinor ?? 10000,
    bookValueMinor: overrides.bookValueMinor ?? 9000,
    metrics: overrides.metrics ?? [
      {
        code: IDECO_KAKEIBO_METRIC_CODES.unitPricePerTenThousandLots,
        integerValue: 1000,
        realValue: null,
        textValue: null,
      },
      {
        code: IDECO_KAKEIBO_METRIC_CODES.unrealizedGainMinor,
        integerValue: 1000,
        realValue: null,
        textValue: null,
      },
      {
        code: IDECO_KAKEIBO_METRIC_CODES.unrealizedGainRate,
        integerValue: null,
        realValue: 0.1,
        textValue: null,
      },
    ],
    instrumentAttributes: overrides.instrumentAttributes ?? [],
    tags: overrides.tags ?? [],
  };
  return result;
}

describe("resolveComparisonDate", () => {
  const availableDates = ["2026-06-01", "2026-06-07", "2026-06-14"];
  const rangeDates = ["2026-06-01", "2026-06-07", "2026-06-14"];

  it("returns previous snapshot date in previousSnapshot mode", () => {
    let result = resolveComparisonDate(
      "previousSnapshot",
      "2026-06-07",
      availableDates,
      rangeDates,
    );
    expect(result).toBe("2026-06-01");
  });

  it("returns null when no previous snapshot exists", () => {
    let result = resolveComparisonDate(
      "previousSnapshot",
      "2026-06-01",
      availableDates,
      rangeDates,
    );
    expect(result).toBeNull();
  });

  it("returns period start in periodStart mode", () => {
    let result = resolveComparisonDate(
      "periodStart",
      "2026-06-14",
      availableDates,
      rangeDates,
    );
    expect(result).toBe("2026-06-01");
  });

  it("returns null when selected date equals period start", () => {
    let result = resolveComparisonDate(
      "periodStart",
      "2026-06-01",
      availableDates,
      rangeDates,
    );
    expect(result).toBeNull();
  });

  it("returns null when selected date or range is missing", () => {
    expect(
      resolveComparisonDate("periodStart", null, availableDates, rangeDates),
    ).toBeNull();
    expect(
      resolveComparisonDate("periodStart", "2026-06-07", availableDates, []),
    ).toBeNull();
  });
});

describe("buildHoldingPeriodChangeRows", () => {
  it("computes deltas between start and end lines", () => {
    const endLines = [
      makeLine({
        id: "l1",
        instrumentId: "inst-1",
        instrumentName: "ファンドA",
        quantity: 120,
        marketValueMinor: 12000,
        bookValueMinor: 9000,
        metrics: [
          {
            code: IDECO_KAKEIBO_METRIC_CODES.unitPricePerTenThousandLots,
            integerValue: 1100,
            realValue: null,
            textValue: null,
          },
          {
            code: IDECO_KAKEIBO_METRIC_CODES.unrealizedGainMinor,
            integerValue: 3000,
            realValue: null,
            textValue: null,
          },
          {
            code: IDECO_KAKEIBO_METRIC_CODES.unrealizedGainRate,
            integerValue: null,
            realValue: 0.12,
            textValue: null,
          },
        ],
      }),
    ];
    const startLines = [
      makeLine({
        id: "l0",
        instrumentId: "inst-1",
        quantity: 100,
        marketValueMinor: 10000,
        bookValueMinor: 9000,
        metrics: [
          {
            code: IDECO_KAKEIBO_METRIC_CODES.unitPricePerTenThousandLots,
            integerValue: 1000,
            realValue: null,
            textValue: null,
          },
          {
            code: IDECO_KAKEIBO_METRIC_CODES.unrealizedGainMinor,
            integerValue: 1000,
            realValue: null,
            textValue: null,
          },
          {
            code: IDECO_KAKEIBO_METRIC_CODES.unrealizedGainRate,
            integerValue: null,
            realValue: 0.1,
            textValue: null,
          },
        ],
      }),
    ];

    let result = buildHoldingPeriodChangeRows(endLines, startLines);

    expect(result).toHaveLength(1);
    expect(result[0]?.hasBaseline).toBe(true);
    expect(result[0]?.delta.quantity).toBe(20);
    expect(result[0]?.delta.marketValueMinor).toBe(2000);
    expect(result[0]?.delta.unitPrice).toBe(100);
    expect(result[0]?.delta.unrealizedGainMinor).toBe(2000);
    expect(result[0]?.delta.unrealizedGainRate).toBeCloseTo(0.02);
  });

  it("matches baseline by account and instrument, not instrument alone", () => {
    const endLines = [
      makeLine({
        id: "l-general",
        instrumentId: "inst-1",
        accountId: "monex:一般:普通預り",
        accountName: "一般 / 普通預り",
        quantity: 120,
      }),
      makeLine({
        id: "l-specific",
        instrumentId: "inst-1",
        accountId: "monex:特定:普通預り",
        accountName: "特定 / 普通預り",
        quantity: 80,
      }),
    ];
    const startLines = [
      makeLine({
        id: "l0-general",
        instrumentId: "inst-1",
        accountId: "monex:一般:普通預り",
        accountName: "一般 / 普通預り",
        quantity: 100,
      }),
    ];

    let result = buildHoldingPeriodChangeRows(endLines, startLines);

    expect(result).toHaveLength(2);
    const generalRow = result.find((row) => row.accountId === "monex:一般:普通預り");
    const specificRow = result.find((row) => row.accountId === "monex:特定:普通預り");
    expect(generalRow?.hasBaseline).toBe(true);
    expect(generalRow?.delta.quantity).toBe(20);
    expect(specificRow?.hasBaseline).toBe(false);
  });

  it("returns null deltas when start lines are missing", () => {
    const endLines = [makeLine({ id: "l1", instrumentId: "inst-1" })];

    let result = buildHoldingPeriodChangeRows(endLines, null);

    expect(result[0]?.hasBaseline).toBe(false);
    expect(result[0]?.delta.marketValueMinor).toBeNull();
  });

  it("marks hasBaseline false when instrument is new in end period", () => {
    const endLines = [makeLine({ id: "l1", instrumentId: "inst-new" })];
    const startLines = [makeLine({ id: "l0", instrumentId: "inst-old" })];

    let result = buildHoldingPeriodChangeRows(endLines, startLines);

    expect(result[0]?.hasBaseline).toBe(false);
  });

  it("returns null deltas when metric values are non-finite", () => {
    const endLines = [
      makeLine({
        id: "l1",
        instrumentId: "inst-1",
        metrics: [
          {
            code: IDECO_KAKEIBO_METRIC_CODES.unitPricePerTenThousandLots,
            integerValue: Number.NaN,
            realValue: null,
            textValue: null,
          },
        ],
      }),
    ];
    const startLines = [
      makeLine({
        id: "l0",
        instrumentId: "inst-1",
        metrics: [
          {
            code: IDECO_KAKEIBO_METRIC_CODES.unitPricePerTenThousandLots,
            integerValue: 1000,
            realValue: null,
            textValue: null,
          },
        ],
      }),
    ];

    let result = buildHoldingPeriodChangeRows(endLines, startLines);

    expect(result[0]?.delta.unitPrice).toBeNull();
  });
});

describe("sortHoldingPeriodChangeRows", () => {
  const rows: HoldingPeriodChangeRow[] = [
    {
      lineId: "line-i2",
      instrumentId: "i2",
      instrumentName: "B",
      accountId: "test:b",
      accountName: "口座B",
      sortOrder: 1,
      tags: [
        {
          schemeCode: "region",
          schemeName: "地域",
          valueCode: "global",
          valueName: "海外",
        },
      ],
      end: {
        quantity: 2,
        marketValueMinor: 2000,
        bookValueMinor: 1800,
        unitPrice: 200,
        unrealizedGainMinor: 200,
        unrealizedGainRate: 0.2,
      },
      delta: {
        quantity: 1,
        marketValueMinor: 1000,
        bookValueMinor: null,
        unitPrice: null,
        unrealizedGainMinor: null,
        unrealizedGainRate: null,
      },
      hasBaseline: true,
    },
    {
      lineId: "line-i1",
      instrumentId: "i1",
      instrumentName: "A",
      accountId: "test:a",
      accountName: "口座A",
      sortOrder: 0,
      tags: [
        {
          schemeCode: "region",
          schemeName: "地域",
          valueCode: "japan",
          valueName: "日本",
        },
      ],
      end: {
        quantity: 1,
        marketValueMinor: 1000,
        bookValueMinor: 900,
        unitPrice: 100,
        unrealizedGainMinor: 100,
        unrealizedGainRate: 0.1,
      },
      delta: {
        quantity: null,
        marketValueMinor: null,
        bookValueMinor: null,
        unitPrice: null,
        unrealizedGainMinor: null,
        unrealizedGainRate: null,
      },
      hasBaseline: false,
    },
  ];

  it("sorts by end values and classification columns", () => {
    expect(sortHoldingPeriodChangeRows(rows, "sortOrder", "asc")[0]?.instrumentName).toBe(
      "A",
    );
    expect(sortHoldingPeriodChangeRows(rows, "instrumentName", "asc")[0]?.instrumentName).toBe(
      "A",
    );
    expect(sortHoldingPeriodChangeRows(rows, "quantity", "asc")[0]?.end.quantity).toBe(1);
    expect(sortHoldingPeriodChangeRows(rows, "unitPrice", "asc")[0]?.end.unitPrice).toBe(100);
    expect(
      sortHoldingPeriodChangeRows(rows, "marketValue", "asc")[0]?.end.marketValueMinor,
    ).toBe(1000);
    expect(sortHoldingPeriodChangeRows(rows, "bookValue", "asc")[0]?.end.bookValueMinor).toBe(
      900,
    );
    expect(
      sortHoldingPeriodChangeRows(rows, "unrealizedGain", "asc")[0]?.end.unrealizedGainMinor,
    ).toBe(100);
    expect(
      sortHoldingPeriodChangeRows(rows, "unrealizedGainRate", "asc")[0]?.end
        .unrealizedGainRate,
    ).toBe(0.1);
    expect(
      sortHoldingPeriodChangeRows(rows, "classification:region", "asc")[0]?.tags[0]?.valueName,
    ).toBe("海外");
  });

  it("uses instrument name as tie-breaker", () => {
    const tiedRows: HoldingPeriodChangeRow[] = [
      { ...rows[0], instrumentName: "B", end: { ...rows[0].end, quantity: 1 } },
      { ...rows[1], instrumentName: "A", end: { ...rows[1].end, quantity: 1 } },
    ];

    let result = sortHoldingPeriodChangeRows(tiedRows, "quantity", "asc");
    expect(result[0]?.instrumentName).toBe("A");
    expect(result[1]?.instrumentName).toBe("B");
  });

  it("sorts rows without classification tags using empty fallback", () => {
    const untaggedRows: HoldingPeriodChangeRow[] = [
      {
        ...rows[0],
        tags: [],
      },
      rows[1],
    ];

    let result = sortHoldingPeriodChangeRows(
      untaggedRows,
      "classification:region",
      "asc",
    );
    expect(result[0]?.tags).toHaveLength(0);
    expect(result[1]?.tags[0]?.valueName).toBe("日本");
  });

  it("treats null sortOrder as last when sorting by sortOrder", () => {
    const rowsWithNullSort: HoldingPeriodChangeRow[] = [
      { ...rows[0], sortOrder: null, instrumentName: "Later" },
      { ...rows[1], sortOrder: 0, instrumentName: "First" },
    ];

    let result = sortHoldingPeriodChangeRows(rowsWithNullSort, "sortOrder", "asc");
    expect(result[0]?.instrumentName).toBe("First");
    expect(result[1]?.instrumentName).toBe("Later");

    const reversedNullSort: HoldingPeriodChangeRow[] = [
      { ...rowsWithNullSort[1], sortOrder: 0, instrumentName: "First" },
      { ...rowsWithNullSort[0], sortOrder: null, instrumentName: "Later" },
    ];
    let reversedResult = sortHoldingPeriodChangeRows(reversedNullSort, "sortOrder", "asc");
    expect(reversedResult[0]?.instrumentName).toBe("First");
    expect(reversedResult[1]?.instrumentName).toBe("Later");
  });

  it("sorts classification columns when both rows lack tags", () => {
    const untaggedRows: HoldingPeriodChangeRow[] = [
      { ...rows[0], tags: [], instrumentName: "B" },
      { ...rows[1], tags: [], instrumentName: "A" },
    ];

    let result = sortHoldingPeriodChangeRows(
      untaggedRows,
      "classification:region",
      "asc",
    );
    expect(result[0]?.instrumentName).toBe("A");
    expect(result[1]?.instrumentName).toBe("B");
  });
});
