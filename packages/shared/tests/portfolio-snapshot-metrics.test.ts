import { describe, expect, it } from "vitest";

import {
  PORTFOLIO_METRIC_CLEARED_TEXT,
  resolveEffectivePortfolioMetrics,
} from "../src/portfolio-snapshot-metrics";

describe("resolveEffectivePortfolioMetrics", () => {
  it("keeps values until the next update for the same code", () => {
    const effective = resolveEffectivePortfolioMetrics(
      [
        {
          asOfDate: "2026-07-01",
          metrics: [{ code: "cost", integerValue: 10_000 }],
        },
        {
          asOfDate: "2026-07-15",
          metrics: [{ code: "cost", integerValue: 11_000 }],
        },
        {
          asOfDate: "2026-08-01",
          metrics: [{ code: "cost", integerValue: 10_500 }],
        },
      ],
      "2026-07-14",
    );

    expect(effective).toEqual([{ code: "cost", integerValue: 10_000, realValue: null, textValue: null }]);

    expect(
      resolveEffectivePortfolioMetrics(
        [
          {
            asOfDate: "2026-07-01",
            metrics: [{ code: "cost", integerValue: 10_000 }],
          },
          {
            asOfDate: "2026-07-15",
            metrics: [{ code: "cost", integerValue: 11_000 }],
          },
          {
            asOfDate: "2026-08-01",
            metrics: [{ code: "cost", integerValue: 10_500 }],
          },
        ],
        "2026-07-31",
      ),
    ).toEqual([{ code: "cost", integerValue: 11_000, realValue: null, textValue: null }]);

    expect(
      resolveEffectivePortfolioMetrics(
        [
          {
            asOfDate: "2026-07-01",
            metrics: [{ code: "cost", integerValue: 10_000 }],
          },
          {
            asOfDate: "2026-07-15",
            metrics: [{ code: "cost", integerValue: 11_000 }],
          },
          {
            asOfDate: "2026-08-01",
            metrics: [{ code: "cost", integerValue: 10_500 }],
          },
        ],
        "2026-08-10",
      ),
    ).toEqual([{ code: "cost", integerValue: 10_500, realValue: null, textValue: null }]);
  });

  it("carries other codes forward and honors clears", () => {
    const dated = [
      {
        asOfDate: "2026-07-01",
        metrics: [
          { code: "a", integerValue: 1 },
          { code: "b", integerValue: 2 },
        ],
      },
      {
        asOfDate: "2026-07-15",
        metrics: [
          { code: "a", integerValue: 10 },
          {
            code: "b",
            integerValue: null,
            realValue: null,
            textValue: PORTFOLIO_METRIC_CLEARED_TEXT,
          },
        ],
      },
    ];

    expect(resolveEffectivePortfolioMetrics(dated, "2026-07-10")).toEqual([
      { code: "a", integerValue: 1, realValue: null, textValue: null },
      { code: "b", integerValue: 2, realValue: null, textValue: null },
    ]);
    expect(resolveEffectivePortfolioMetrics(dated, "2026-07-20")).toEqual([
      { code: "a", integerValue: 10, realValue: null, textValue: null },
    ]);
  });
});
