import { IDECO_KAKEIBO_METRIC_CODES, type HoldingLineMetricDto } from "@repo/shared";
import { describe, expect, it } from "vitest";

import {
  formatBookValue,
  formatLineMetric,
  formatMetricLabel,
  formatMetricValue,
} from "@/lib/format-holding-line";
import { formatYen } from "@/lib/format-yen";

describe("formatMetricLabel", () => {
  it("returns known metric labels", () => {
    expect(
      formatMetricLabel(IDECO_KAKEIBO_METRIC_CODES.unitPricePerTenThousandLots),
    ).toBe("時価単価(1万口)");
    expect(
      formatMetricLabel(IDECO_KAKEIBO_METRIC_CODES.unrealizedGainMinor),
    ).toBe("損益");
    expect(
      formatMetricLabel(IDECO_KAKEIBO_METRIC_CODES.unrealizedGainRate),
    ).toBe("損益率");
  });

  it("returns code when label is unknown", () => {
    expect(formatMetricLabel("custom_metric")).toBe("custom_metric");
  });
});

describe("formatMetricValue", () => {
  it("formats unrealized gain in yen", () => {
    const metric: HoldingLineMetricDto = {
      code: IDECO_KAKEIBO_METRIC_CODES.unrealizedGainMinor,
      integerValue: 12345,
      realValue: null,
      textValue: null,
    };
    expect(formatMetricValue(metric)).toBe(formatYen(12345));
  });

  it("returns dash when unrealized gain is null", () => {
    const metric: HoldingLineMetricDto = {
      code: IDECO_KAKEIBO_METRIC_CODES.unrealizedGainMinor,
      integerValue: null,
      realValue: null,
      textValue: null,
    };
    expect(formatMetricValue(metric)).toBe("—");
  });

  it("formats unrealized gain rate as percent", () => {
    const metric: HoldingLineMetricDto = {
      code: IDECO_KAKEIBO_METRIC_CODES.unrealizedGainRate,
      integerValue: null,
      realValue: 0.052,
      textValue: null,
    };
    expect(formatMetricValue(metric)).toBe("5.2%");
  });

  it("returns dash when unrealized gain rate is null", () => {
    const metric: HoldingLineMetricDto = {
      code: IDECO_KAKEIBO_METRIC_CODES.unrealizedGainRate,
      integerValue: null,
      realValue: null,
      textValue: null,
    };
    expect(formatMetricValue(metric)).toBe("—");
  });

  it("formats generic integer metrics", () => {
    const metric: HoldingLineMetricDto = {
      code: IDECO_KAKEIBO_METRIC_CODES.unitPricePerTenThousandLots,
      integerValue: 15000,
      realValue: null,
      textValue: null,
    };
    expect(formatMetricValue(metric)).toBe("15,000");
  });

  it("formats generic real metrics", () => {
    const metric: HoldingLineMetricDto = {
      code: "ratio",
      integerValue: null,
      realValue: 1.25,
      textValue: null,
    };
    expect(formatMetricValue(metric)).toBe("1.25");
  });

  it("formats text metrics", () => {
    const metric: HoldingLineMetricDto = {
      code: "note",
      integerValue: null,
      realValue: null,
      textValue: "備考",
    };
    expect(formatMetricValue(metric)).toBe("備考");
  });

  it("returns dash when all values are null", () => {
    const metric: HoldingLineMetricDto = {
      code: "empty",
      integerValue: null,
      realValue: null,
      textValue: null,
    };
    expect(formatMetricValue(metric)).toBe("—");
  });
});

describe("formatLineMetric", () => {
  it("formats matching metric by code", () => {
    const metrics: HoldingLineMetricDto[] = [
      {
        code: IDECO_KAKEIBO_METRIC_CODES.unrealizedGainMinor,
        integerValue: 1000,
        realValue: null,
        textValue: null,
      },
    ];
    expect(
      formatLineMetric(metrics, IDECO_KAKEIBO_METRIC_CODES.unrealizedGainMinor),
    ).toBe(formatYen(1000));
  });

  it("returns dash when metric code is missing", () => {
    expect(formatLineMetric([], IDECO_KAKEIBO_METRIC_CODES.unrealizedGainMinor)).toBe(
      "—",
    );
  });
});

describe("formatBookValue", () => {
  it("formats book value in yen", () => {
    expect(formatBookValue(50000)).toBe(formatYen(50000));
  });

  it("returns dash when book value is null", () => {
    expect(formatBookValue(null)).toBe("—");
  });
});
