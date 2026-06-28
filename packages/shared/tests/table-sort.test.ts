import { IDECO_KAKEIBO_METRIC_CODES } from "@repo/shared";
import { describe, expect, it } from "vitest";

import {
  classificationSortColumnKey,
  compareHoldingLineDetailRows,
  compareHoldingsDetailLines,
  compareNullableNumbers,
  compareStrings,
  getMetricIntegerValue,
  getMetricRealValue,
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

describe("compareNullableNumbers", () => {
  it("handles missing values and sort direction", () => {
    expect(compareNullableNumbers(null, null, "asc")).toBe(0);
    expect(compareNullableNumbers(null, 1, "asc")).toBe(1);
    expect(compareNullableNumbers(null, 1, "desc")).toBe(-1);
    expect(compareNullableNumbers(1, null, "asc")).toBe(-1);
    expect(compareNullableNumbers(1, 2, "asc")).toBe(-1);
    expect(compareNullableNumbers(2, 1, "desc")).toBe(-1);
    expect(compareNullableNumbers(Number.NaN, 1, "asc")).toBe(1);
  });
});

describe("compareStrings", () => {
  it("sorts strings with direction", () => {
    expect(compareStrings("あ", "い", "asc")).toBeLessThan(0);
    expect(compareStrings("あ", "い", "desc")).toBeGreaterThan(0);
  });
});

describe("metric helpers", () => {
  it("returns null when metric is missing", () => {
    expect(getMetricIntegerValue([], "missing")).toBeNull();
    expect(
      getMetricIntegerValue(
        [{ code: "x", integerValue: null, realValue: null, textValue: null }],
        "x",
      ),
    ).toBeNull();
    expect(getMetricRealValue([], "missing")).toBeNull();
  });
});

describe("classificationSortColumnKey", () => {
  it("builds classification column key", () => {
    expect(classificationSortColumnKey("region")).toBe("classification:region");
  });
});

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

  it("sorts by instrument name, quantity, book value, unit price, and gain rate", () => {
    const metricLine = (code: string, integerValue: number | null, realValue: number | null) =>
      makeLine({
        id: code,
        instrumentName: code,
        quantity: code === "qty-high" ? 10 : 1,
        bookValueMinor: code === "book-high" ? 500 : 100,
        marketValueMinor: 1000,
        metrics: [
          {
            code: IDECO_KAKEIBO_METRIC_CODES.unitPricePerTenThousandLots,
            integerValue: code === "unit-high" ? 500 : 100,
            realValue: null,
            textValue: null,
          },
          {
            code: IDECO_KAKEIBO_METRIC_CODES.unrealizedGainRate,
            integerValue: null,
            realValue: code === "rate-high" ? 0.2 : 0.1,
            textValue: null,
          },
        ],
      });

    expect(
      sortHoldingsDetailLines(
        [makeLine({ id: "b", instrumentName: "B" }), makeLine({ id: "a", instrumentName: "A" })],
        "instrumentName",
        "asc",
      ).map((line) => line.id),
    ).toEqual(["a", "b"]);

    expect(
      sortHoldingsDetailLines([metricLine("qty-low"), metricLine("qty-high")], "quantity", "desc")
        .map((line) => line.id),
    ).toEqual(["qty-high", "qty-low"]);

    expect(
      sortHoldingsDetailLines([metricLine("book-low"), metricLine("book-high")], "bookValue", "desc")
        .map((line) => line.id),
    ).toEqual(["book-high", "book-low"]);

    expect(
      sortHoldingsDetailLines([metricLine("unit-low"), metricLine("unit-high")], "unitPrice", "desc")
        .map((line) => line.id),
    ).toEqual(["unit-high", "unit-low"]);

    expect(
      sortHoldingsDetailLines([metricLine("rate-low"), metricLine("rate-high")], "unrealizedGainRate", "desc")
        .map((line) => line.id),
    ).toEqual(["rate-high", "rate-low"]);
  });

  it("uses instrument name as tie breaker", () => {
    const left = makeLine({ id: "a", instrumentName: "A", marketValueMinor: 100 });
    const right = makeLine({ id: "b", instrumentName: "B", marketValueMinor: 100 });
    expect(compareHoldingsDetailLines(left, right, "marketValue", "asc")).toBeLessThan(0);
  });

  it("compares classification tags and defined sort orders directly", () => {
    const tagged = makeLine({
      id: "tagged",
      instrumentName: "Tagged",
      sortOrder: 2,
      tags: [
        {
          schemeCode: "region",
          schemeName: "地域",
          valueCode: "domestic",
          valueName: "国内",
        },
      ],
    });
    const untagged = makeLine({
      id: "untagged",
      instrumentName: "Untagged",
      sortOrder: 1,
      tags: [],
    });

    expect(
      compareHoldingsDetailLines(
        tagged,
        untagged,
        classificationSortColumnKey("region"),
        "asc",
      ),
    ).toBeGreaterThan(0);
    expect(
      compareHoldingsDetailLines(
        untagged,
        tagged,
        classificationSortColumnKey("region"),
        "asc",
      ),
    ).toBeLessThan(0);

    const nullRight = makeLine({ id: "defined", instrumentName: "Defined", sortOrder: 1 });
    const nullLeft = makeLine({ id: "nullish", instrumentName: "Nullish" });
    nullLeft.sortOrder = null as unknown as number;
    expect(
      compareHoldingsDetailLines(nullRight, nullLeft, "sortOrder", "asc"),
    ).toBeLessThan(0);
  });

  it("handles unknown columns and null sortOrder", () => {
    const left = makeLine({ id: "a", instrumentName: "A" });
    left.sortOrder = null as unknown as number;
    const right = makeLine({ id: "b", instrumentName: "B", sortOrder: 1 });
    expect(
      sortHoldingsDetailLines([right, left], "sortOrder", "asc").map((line) => line.id),
    ).toEqual(["b", "a"]);
    expect(
      sortHoldingsDetailLines(
        [
          makeLine({ id: "a", instrumentName: "A", sortOrder: 1 }),
          makeLine({ id: "b", instrumentName: "B", sortOrder: 2 }),
        ],
        "sortOrder",
        "asc",
      ).map((line) => line.id),
    ).toEqual(["a", "b"]);
    expect(
      sortHoldingsDetailLines(
        [
          makeLine({
            id: "a",
            instrumentName: "A",
            tags: [],
          }),
          makeLine({
            id: "b",
            instrumentName: "B",
            tags: [
              {
                schemeCode: "region",
                schemeName: "地域",
                valueCode: "domestic",
                valueName: "国内",
              },
            ],
          }),
        ],
        classificationSortColumnKey("region"),
        "asc",
      ).map((line) => line.id),
    ).toEqual(["a", "b"]);
    expect(
      sortHoldingsDetailLines(
        [
          makeLine({ id: "a", instrumentName: "A", bookValueMinor: 100 }),
          makeLine({ id: "b", instrumentName: "B", bookValueMinor: 200 }),
        ],
        "bookValue",
        "desc",
      ).map((line) => line.id),
    ).toEqual(["b", "a"]);
    expect(
      sortHoldingsDetailLines(
        [makeLine({ id: "a", instrumentName: "A" }), makeLine({ id: "b", instrumentName: "B" })],
        "unknown-column",
        "asc",
      ),
    ).toHaveLength(2);
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

  it("sorts slices by market value and weight", () => {
    const slices: AllocationSliceWithLines[] = [
      {
        valueCode: "low",
        valueName: "低",
        marketValueMinor: 100,
        weight: 0.2,
        lines: [],
      },
      {
        valueCode: "high",
        valueName: "高",
        marketValueMinor: 400,
        weight: 0.8,
        lines: [],
      },
    ];

    expect(sortAllocationSlices(slices, "marketValue", "desc")[0]?.valueCode).toBe("high");
    expect(sortAllocationSlices(slices, "weight", "desc")[0]?.valueCode).toBe("high");
    expect(
      sortAllocationSlices(
        [
          { valueCode: "a", valueName: "同値", marketValueMinor: 100, weight: 0.5, lines: [] },
          { valueCode: "b", valueName: "同値", marketValueMinor: 100, weight: 0.5, lines: [] },
        ],
        "marketValue",
        "asc",
      ).map((slice) => slice.valueCode),
    ).toEqual(["a", "b"]);
  });

  it("sorts slices by target ratio and gap ratio", () => {
    const slices: (AllocationSliceWithLines & {
      targetRatio?: number | null;
      gapRatio?: number | null;
    })[] = [
      {
        valueCode: "low",
        valueName: "低",
        marketValueMinor: 100,
        weight: 0.2,
        targetRatio: 0.2,
        gapRatio: -0.05,
        lines: [],
      },
      {
        valueCode: "high",
        valueName: "高",
        marketValueMinor: 400,
        weight: 0.8,
        targetRatio: 0.5,
        gapRatio: 0.1,
        lines: [],
      },
    ];

    expect(sortAllocationSlices(slices, "targetRatio", "desc")[0]?.valueCode).toBe("high");
    expect(sortAllocationSlices(slices, "gapRatio", "desc")[0]?.valueCode).toBe("high");
  });

  it("sorts slices by unrealized gain metrics", () => {
    const slices: AllocationSliceWithLines[] = [
      {
        valueCode: "low",
        valueName: "低",
        marketValueMinor: 100,
        weight: 0.2,
        unrealizedGainMinor: 10,
        unrealizedGainRate: 0.1,
        lines: [],
      },
      {
        valueCode: "high",
        valueName: "高",
        marketValueMinor: 400,
        weight: 0.8,
        unrealizedGainMinor: 40,
        unrealizedGainRate: 0.4,
        lines: [],
      },
    ];

    expect(sortAllocationSlices(slices, "unrealizedGain", "desc")[0]?.valueCode).toBe("high");
    expect(sortAllocationSlices(slices, "unrealizedGainRate", "desc")[0]?.valueCode).toBe(
      "high",
    );
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

  it("sorts rows by portfolio name and gain metrics", () => {
    const rows = [
      {
        id: "b",
        instrumentName: "B",
        portfolioName: "B口座",
        quantity: 1,
        marketValueMinor: 100,
        weight: 0.5,
        metrics: [
          {
            code: IDECO_KAKEIBO_METRIC_CODES.unrealizedGainMinor,
            integerValue: 100,
            realValue: null,
            textValue: null,
          },
        ],
      },
      {
        id: "a",
        instrumentName: "A",
        portfolioName: "A口座",
        quantity: 1,
        marketValueMinor: 100,
        weight: 0.5,
        metrics: [
          {
            code: IDECO_KAKEIBO_METRIC_CODES.unrealizedGainRate,
            integerValue: null,
            realValue: 0.2,
            textValue: null,
          },
        ],
      },
    ];

    expect(sortHoldingLineDetailRows(rows, "portfolioName", "asc")[0]?.id).toBe("a");
    expect(sortHoldingLineDetailRows(rows, "instrumentName", "asc")[0]?.id).toBe("a");
    expect(sortHoldingLineDetailRows(rows, "unrealizedGain", "desc")[0]?.id).toBe("a");
    expect(sortHoldingLineDetailRows(rows, "unrealizedGainRate", "desc")[0]?.id).toBe("b");
    expect(sortHoldingLineDetailRows(rows, "marketValue", "desc")[0]?.id).toBe("a");
    expect(sortHoldingLineDetailRows(rows, "quantity", "asc")[0]?.id).toBe("a");

    expect(
      sortHoldingLineDetailRows(
        [
          {
            id: "a",
            instrumentName: "A",
            portfolioName: undefined,
            quantity: 1,
            marketValueMinor: 100,
            weight: 0.5,
            metrics: [],
          },
          {
            id: "b",
            instrumentName: "B",
            portfolioName: "B口座",
            quantity: 1,
            marketValueMinor: 100,
            weight: 0.5,
            metrics: [],
          },
        ],
        "portfolioName",
        "asc",
      ).map((row) => row.id),
    ).toEqual(["a", "b"]);

    const noPortfolio = sortHoldingLineDetailRows(
      [
        {
          id: "solo",
          instrumentName: "Solo",
          quantity: 1,
          marketValueMinor: 100,
          weight: 1,
          metrics: [],
        },
      ],
      "portfolioName",
      "asc",
    );
    expect(noPortfolio[0]?.id).toBe("solo");
  });

  it("compares rows with defined portfolio names directly", () => {
    expect(
      compareHoldingLineDetailRows(
        {
          id: "a",
          instrumentName: "A",
          portfolioName: undefined,
          quantity: 1,
          marketValueMinor: 100,
          weight: 0.5,
          metrics: [],
        },
        {
          id: "b",
          instrumentName: "B",
          portfolioName: "B口座",
          quantity: 1,
          marketValueMinor: 100,
          weight: 0.5,
          metrics: [],
        },
        "portfolioName",
        "asc",
      ),
    ).toBeLessThan(0);
  });
});
