import { describe, expect, it } from "vitest";

import {
  buildHoldingPeriodChangeRows,
  resolveComparisonDate,
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
});
