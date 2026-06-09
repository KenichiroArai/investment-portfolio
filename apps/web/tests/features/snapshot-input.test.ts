import { describe, expect, it } from "vitest";

import {
  mergeHoldingLine,
  removeHoldingLineAtIndex,
  removeMetricByCode,
  upsertMetric,
} from "@/features/manage/snapshot-input";

describe("snapshot-input", () => {
  it("merges holding lines and metrics", () => {
    const lines = mergeHoldingLine([], {
      instrumentId: "550e8400-e29b-41d4-a716-446655440000",
      quantity: 1,
      marketValueMinor: 1000,
    });
    expect(lines).toHaveLength(1);

    const removed = removeHoldingLineAtIndex(lines, 0);
    expect(removed).toHaveLength(0);

    const metrics = upsertMetric([], {
      code: "ideco_total_contributions",
      integerValue: 100,
    });
    expect(metrics).toHaveLength(1);

    const updated = upsertMetric(metrics, {
      code: "ideco_total_contributions",
      integerValue: 200,
    });
    expect(updated).toHaveLength(1);
    expect(updated[0]?.integerValue).toBe(200);

    const cleared = removeMetricByCode(updated, "ideco_total_contributions");
    expect(cleared).toHaveLength(0);
  });
});
