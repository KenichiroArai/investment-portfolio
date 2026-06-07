import { IDECO_KAKEIBO_METRIC_CODES } from "@repo/shared";
import { describe, expect, it } from "vitest";

import {
  classificationSortColumnKey,
  sortAllocationSlices,
  sortHoldingLineDetailRows,
  sortHoldingsDetailLines,
} from "../src/table-sort";
import type { AllocationSliceWithLines } from "../src/snapshot-allocation";
import type { HoldingLineDto } from "../src/types";

function makeLine(
  overrides: Partial<HoldingLineDto> & Pick<HoldingLineDto, "id">,
): HoldingLineDto {
  let result: HoldingLineDto = {
    id: overrides.id,
    instrumentId: overrides.instrumentId ?? "inst-1",
    instrumentName: overrides.instrumentName ?? "テスト銘柄",
    sortOrder: overrides.sortOrder ?? 0,
    quantity: overrides.quantity ?? 1,
    marketValueMinor: overrides.marketValueMinor ?? 1000,
    bookValueMinor: overrides.bookValueMinor ?? null,
    metrics: overrides.metrics ?? [],
    instrumentAttributes: overrides.instrumentAttributes ?? [],
    tags: overrides.tags ?? [],
  };
  return result;
}

describe("sortHoldingsDetailLines", () => {
  it("sorts by sortOrder by default", () => {
    const lines = [
      makeLine({ id: "b", instrumentName: "B", sortOrder: 2 }),
      makeLine({ id: "a", instrumentName: "A", sortOrder: 1 }),
    ];

    const sorted = sortHoldingsDetailLines(lines, "sortOrder", "asc");

    expect(sorted.map((line) => line.id)).toEqual(["a", "b"]);
  });

  it("sorts by market value descending", () => {
    const lines = [
      makeLine({ id: "low", marketValueMinor: 100 }),
      makeLine({ id: "high", marketValueMinor: 500 }),
    ];

    const sorted = sortHoldingsDetailLines(lines, "marketValue", "desc");

    expect(sorted.map((line) => line.id)).toEqual(["high", "low"]);
  });

  it("sorts by classification tag value", () => {
    const column = classificationSortColumnKey("region");
    const lines = [
      makeLine({
        id: "b",
        instrumentName: "B",
        tags: [
          {
            schemeCode: "region",
            schemeName: "地域",
            valueCode: "foreign",
            valueName: "海外",
          },
        ],
      }),
      makeLine({
        id: "a",
        instrumentName: "A",
        tags: [
          {
            schemeCode: "region",
            schemeName: "地域",
            valueCode: "domestic",
            valueName: "国内",
          },
        ],
      }),
    ];

    const sorted = sortHoldingsDetailLines(lines, column, "asc");

    expect(sorted.map((line) => line.id)).toEqual(["b", "a"]);
  });

  it("sorts by metric values", () => {
    const lines = [
      makeLine({
        id: "low",
        metrics: [
          {
            code: IDECO_KAKEIBO_METRIC_CODES.unrealizedGainMinor,
            integerValue: 100,
            realValue: null,
            textValue: null,
          },
        ],
      }),
      makeLine({
        id: "high",
        metrics: [
          {
            code: IDECO_KAKEIBO_METRIC_CODES.unrealizedGainMinor,
            integerValue: 500,
            realValue: null,
            textValue: null,
          },
        ],
      }),
    ];

    const sorted = sortHoldingsDetailLines(lines, "unrealizedGain", "desc");

    expect(sorted.map((line) => line.id)).toEqual(["high", "low"]);
  });
});

describe("sortAllocationSlices", () => {
  it("sorts slices by value name", () => {
    const slices: AllocationSliceWithLines[] = [
      {
        valueCode: "b",
        valueName: "株式",
        marketValueMinor: 100,
        weight: 0.5,
        lines: [],
      },
      {
        valueCode: "a",
        valueName: "債券",
        marketValueMinor: 200,
        weight: 0.5,
        lines: [],
      },
    ];

    const sorted = sortAllocationSlices(slices, "valueName", "asc");

    expect(sorted.map((slice) => slice.valueCode)).toEqual(["b", "a"]);
  });
});

describe("sortHoldingLineDetailRows", () => {
  it("sorts rows by weight descending", () => {
    const rows = [
      {
        id: "low",
        instrumentName: "A",
        quantity: 1,
        marketValueMinor: 100,
        weight: 0.2,
        metrics: [],
      },
      {
        id: "high",
        instrumentName: "B",
        quantity: 1,
        marketValueMinor: 400,
        weight: 0.8,
        metrics: [],
      },
    ];

    const sorted = sortHoldingLineDetailRows(rows, "weight", "desc");

    expect(sorted.map((row) => row.id)).toEqual(["high", "low"]);
  });
});
