import { describe, expect, it } from "vitest";

import {
  buildReplaceSnapshotInput,
  mergeHoldingLine,
  removeHoldingLineAtIndex,
  removeMetricByCode,
  snapshotToHoldingInputs,
  snapshotToMetricInputs,
  updateHoldingLineAtIndex,
  upsertMetric,
} from "@/features/manage/snapshot-input";
import { MANAGE_SNAPSHOT } from "../helpers/manage-api-test-utils";

describe("snapshot-input", () => {
  it("builds replace snapshot input", () => {
    const lines = [
      {
        instrumentId: "i1",
        quantity: 1,
        marketValueMinor: 1000,
      },
    ];
    const metrics = [{ code: "ideco_total_contributions", integerValue: 100 }];
    const result = buildReplaceSnapshotInput(MANAGE_SNAPSHOT, {
      asOfDate: "2026-06-02",
      lines,
      metrics,
    });
    expect(result).toEqual({
      asOfDate: "2026-06-02",
      lines,
      metrics,
    });
  });

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

  it("updates holding line at index", () => {
    const lines = [
      {
        instrumentId: "i1",
        quantity: 1,
        marketValueMinor: 1000,
      },
      {
        instrumentId: "i2",
        quantity: 2,
        marketValueMinor: 2000,
      },
    ];
    const updated = updateHoldingLineAtIndex(lines, 1, {
      instrumentId: "i2",
      quantity: 3,
      marketValueMinor: 3000,
    });
    expect(updated[1]).toEqual({
      instrumentId: "i2",
      quantity: 3,
      marketValueMinor: 3000,
    });
  });

  it("converts snapshot dto to inputs", () => {
    const holdingInputs = snapshotToHoldingInputs({
      ...MANAGE_SNAPSHOT,
      lines: [
        {
          ...MANAGE_SNAPSHOT.lines[0]!,
          metrics: [
            {
              code: "line_metric",
              integerValue: 10,
              realValue: 1.5,
              textValue: "note",
            },
          ],
        },
      ],
    });
    expect(holdingInputs).toHaveLength(1);
    expect(holdingInputs[0]).toMatchObject({
      instrumentId: "i1",
      quantity: 10,
      marketValueMinor: 100_000,
      bookValueMinor: 80_000,
      sortOrder: 0,
      metrics: [
        {
          code: "line_metric",
          integerValue: 10,
          realValue: 1.5,
          textValue: "note",
        },
      ],
    });

    const metricInputs = snapshotToMetricInputs(MANAGE_SNAPSHOT);
    expect(metricInputs).toEqual([
      {
        code: "ideco_total_contributions",
        integerValue: 500_000,
        realValue: null,
        textValue: null,
      },
    ]);
  });
});
