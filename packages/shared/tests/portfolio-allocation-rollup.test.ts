import { describe, expect, it } from "vitest";

import {
  aggregatePortfolioTargetsByScheme,
  UNTAGGED_ALLOCATION_VALUE_CODE,
  UNTAGGED_ALLOCATION_VALUE_NAME,
} from "../src/portfolio-allocation-rollup";
import type { HoldingLineDto } from "../src/types";

function makeLine(
  marketValueMinor: number,
  tags: HoldingLineDto["tags"],
  overrides: Partial<HoldingLineDto> = {},
): HoldingLineDto {
  let result: HoldingLineDto = {
    id: overrides.id ?? "line-1",
    instrumentId: overrides.instrumentId ?? "inst-1",
    instrumentName: overrides.instrumentName ?? "銘柄1",
    sortOrder: overrides.sortOrder ?? null,
    quantity: overrides.quantity ?? 1,
    marketValueMinor,
    bookValueMinor: overrides.bookValueMinor ?? null,
    metrics: overrides.metrics ?? [],
    instrumentAttributes: overrides.instrumentAttributes ?? [],
    tags,
  };
  return result;
}

describe("aggregatePortfolioTargetsByScheme", () => {
  it("sums portfolio targets by classification value", () => {
    const lines = [
      makeLine(
        300_000,
        [
          {
            schemeCode: "asset",
            schemeName: "資産",
            valueCode: "stock",
            valueName: "株式",
          },
        ],
        { instrumentId: "a", instrumentName: "銘柄A" },
      ),
      makeLine(
        700_000,
        [
          {
            schemeCode: "asset",
            schemeName: "資産",
            valueCode: "stock",
            valueName: "株式",
          },
        ],
        { instrumentId: "b", instrumentName: "銘柄B" },
      ),
      makeLine(
        200_000,
        [
          {
            schemeCode: "asset",
            schemeName: "資産",
            valueCode: "bond",
            valueName: "債券",
          },
        ],
        { instrumentId: "c", instrumentName: "銘柄C" },
      ),
    ];

    let result = aggregatePortfolioTargetsByScheme(
      lines,
      [
        { instrumentId: "a", targetRatio: 0.3 },
        { instrumentId: "b", targetRatio: 0.2 },
        { instrumentId: "c", targetRatio: 0.1 },
      ],
      "asset",
    );

    expect(result).toHaveLength(2);
    expect(result[0]?.valueCode).toBe("stock");
    expect(result[0]?.impliedTargetRatio).toBeCloseTo(0.5);
    expect(result[1]?.valueCode).toBe("bond");
    expect(result[1]?.impliedTargetRatio).toBeCloseTo(0.1);
  });

  it("groups untagged holdings with targets into untagged row", () => {
    const lines = [
      makeLine(100_000, [], { instrumentId: "a", instrumentName: "銘柄A" }),
    ];

    let result = aggregatePortfolioTargetsByScheme(
      lines,
      [{ instrumentId: "a", targetRatio: 0.15 }],
      "asset",
    );

    expect(result).toEqual([
      {
        valueCode: UNTAGGED_ALLOCATION_VALUE_CODE,
        valueName: UNTAGGED_ALLOCATION_VALUE_NAME,
        impliedTargetRatio: 0.15,
      },
    ]);
  });

  it("skips holdings without portfolio targets", () => {
    const lines = [
      makeLine(
        100_000,
        [
          {
            schemeCode: "asset",
            schemeName: "資産",
            valueCode: "stock",
            valueName: "株式",
          },
        ],
        { instrumentId: "a" },
      ),
    ];

    let result = aggregatePortfolioTargetsByScheme(lines, [], "asset");
    expect(result).toEqual([]);
  });
});
