import { describe, expect, it } from "vitest";

import {
  getTrendYAxisUnitLabel,
  resolveTrendYAxisUnit,
  resolveTrendYenAxisUnit,
} from "../src/trend-chart-axis";

describe("resolveTrendYenAxisUnit", () => {
  it("uses yen for smaller magnitudes", () => {
    expect(resolveTrendYenAxisUnit([null, 41_347, -1_000])).toBe("yen");
  });

  it("uses yenMan for larger magnitudes", () => {
    expect(resolveTrendYenAxisUnit([3_400_000, 3_441_347])).toBe("yenMan");
  });
});

describe("resolveTrendYAxisUnit", () => {
  it("returns percent for percent value kind", () => {
    expect(resolveTrendYAxisUnit([0.12, 0.18], "percent")).toBe("percent");
  });

  it("resolves yen units from data for yen value kind", () => {
    expect(resolveTrendYAxisUnit([3_400_000], "yen")).toBe("yenMan");
    expect(resolveTrendYAxisUnit([12_000], "yen")).toBe("yen");
  });
});

describe("getTrendYAxisUnitLabel", () => {
  it("returns labels for each unit", () => {
    expect(getTrendYAxisUnitLabel("yenMan")).toBe("万円");
    expect(getTrendYAxisUnitLabel("yen")).toBe("円");
    expect(getTrendYAxisUnitLabel("percent")).toBe("%");
  });
});
