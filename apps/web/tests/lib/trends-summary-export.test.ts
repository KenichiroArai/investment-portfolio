import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  PORTFOLIO_INSTRUMENT_SCHEME_CODE,
  type SnapshotTrendsDto,
} from "@repo/shared";

const repoRoot = resolve(import.meta.dirname, "../../../..");

function readTrendsSummary(portfolioCode: string): SnapshotTrendsDto {
  let result: SnapshotTrendsDto = {
    portfolioCode,
    from: "",
    to: "",
    points: [],
  };

  const filePath = resolve(
    repoRoot,
    `docs/data/portfolios/${portfolioCode}/trends-summary.json`,
  );
  const raw = readFileSync(filePath, "utf8");
  result = JSON.parse(raw) as SnapshotTrendsDto;
  return result;
}

describe("exported trends-summary.json", () => {
  it("includes portfolio instrument allocation on every point for ideco", () => {
    const trends = readTrendsSummary("ideco");

    expect(trends.points.length).toBeGreaterThan(0);
    for (const point of trends.points) {
      const instrumentSlices =
        point.allocationsByScheme[PORTFOLIO_INSTRUMENT_SCHEME_CODE];
      expect(instrumentSlices).toBeDefined();
      expect(instrumentSlices.length).toBeGreaterThan(0);
      expect(instrumentSlices.reduce((sum, slice) => sum + slice.ratio, 0)).toBeCloseTo(
        1,
      );
    }
  });
});
