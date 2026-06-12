import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { TrendPeriodSummary } from "@/features/trends/TrendPeriodSummary";

describe("TrendPeriodSummary", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders absolute deltas and relative rates for each metric", () => {
    render(
      <TrendPeriodSummary
        startDateLabel="2026/05/31"
        endDateLabel="2026/06/07"
        startMarketValueMinor={3_400_000}
        endMarketValueMinor={3_441_347}
        metricDeltas={[
          {
            key: "market-value",
            label: "評価額",
            start: 3_400_000,
            end: 3_441_347,
            absoluteDelta: 41_347,
            relativeRate: 41_347 / 3_400_000,
            unit: "yen",
          },
          {
            key: "unrealized-gain",
            label: "評価損益",
            start: 400_000,
            end: 459_121,
            absoluteDelta: 59_121,
            relativeRate: 59_121 / 400_000,
            unit: "yen",
          },
          {
            key: "gain-rate-book",
            label: "利益率（簿価）",
            start: 0.13,
            end: 0.15,
            absoluteDelta: 0.02,
            relativeRate: 0.02 / 0.13,
            unit: "percentPoint",
          },
        ]}
        largestShareChange={{
          key: "foreign",
          label: "海外",
          startRatio: 0.4,
          endRatio: 0.39,
          deltaRatio: -0.01,
        }}
      />,
    );

    expect(screen.getByText("評価額")).toBeInTheDocument();
    expect(screen.getByText(/\+1\.2%/)).toBeInTheDocument();
    expect(screen.getByText("評価損益")).toBeInTheDocument();
    expect(screen.getByText("利益率（簿価）")).toBeInTheDocument();
    expect(screen.getByText(/\+2\.0 pt/)).toBeInTheDocument();
    expect(screen.getByText(/\+15\.4%/)).toBeInTheDocument();
    expect(screen.getByText(/最大シェア変動/)).toBeInTheDocument();
    expect(screen.getByText(/-2\.5%/)).toBeInTheDocument();
  });
});
