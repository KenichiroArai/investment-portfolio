import { describe, expect, it, vi } from "vitest";

import {
  formatAsOfDateJa,
  formatPercent,
  formatPercentAxis,
  formatPercentDeltaTooltip,
  formatPercentPoint,
  formatPercentPointAxis,
  formatPercentRelativeChange,
  formatTrendChartCaption,
  formatTrendChartMeta,
  formatYen,
  formatYenAxis,
  formatYenAxisLabel,
  formatYenMan,
  formatYenManAxis,
} from "@/lib/format-yen";

describe("formatYen", () => {
  it("formats yen amounts without decimals", () => {
    expect(formatYen(12345)).toMatch(/12,345/);
    expect(formatYen(0)).toMatch(/^[^\d]*0$/);
  });
});

describe("formatAsOfDateJa", () => {
  it("formats ISO dates as yyyy/mm/dd", () => {
    expect(formatAsOfDateJa("2026-06-01")).toBe("2026/06/01");
  });

  it("returns input unchanged when not ISO date", () => {
    expect(formatAsOfDateJa("invalid")).toBe("invalid");
  });
});

describe("formatPercent", () => {
  it("formats finite ratios as percent", () => {
    expect(formatPercent(0.052)).toBe("5.2%");
  });

  it("returns dash for non-finite ratios", () => {
    expect(formatPercent(Number.NaN)).toBe("—");
    expect(formatPercent(Number.POSITIVE_INFINITY)).toBe("—");
  });
});

describe("formatYenMan", () => {
  it("formats values in 万円", () => {
    expect(formatYenMan(3_441_347)).toBe("344万円");
    expect(formatYenMan(459_121)).toBe("45.9万円");
    expect(formatYenMan(0)).toBe("0万円");
    expect(formatYenMan(10_000_000)).toBe("1000万円");
  });

  it("returns dash for non-finite values", () => {
    expect(formatYenMan(Number.NaN)).toBe("—");
  });

  it("falls back when internal man calculation is non-finite", () => {
    const originalIsFinite = Number.isFinite;
    let callCount = 0;
    const isFiniteSpy = vi.spyOn(Number, "isFinite").mockImplementation((value) => {
      callCount += 1;
      if (callCount === 1 && Object.is(value, Number.NaN)) {
        return true;
      }
      return originalIsFinite(value);
    });

    try {
      expect(formatYenMan(Number.NaN)).toBe("0万円");
    } finally {
      isFiniteSpy.mockRestore();
    }
  });
});

describe("formatYenManAxis", () => {
  it("formats axis ticks without unit suffix", () => {
    expect(formatYenManAxis(3_441_347)).toBe("344");
    expect(formatYenManAxis(459_121)).toBe("45.9");
    expect(formatYenManAxis(0)).toBe("0");
  });

  it("returns zero for non-finite values", () => {
    expect(formatYenManAxis(Number.NaN)).toBe("0");
  });
});

describe("formatYenAxis", () => {
  it("formats axis ticks in yen without unit suffix", () => {
    expect(formatYenAxis(41_347)).toBe("41,347");
    expect(formatYenAxis(-1_000)).toBe("-1,000");
    expect(formatYenAxis(0)).toBe("0");
  });

  it("returns zero for non-finite values", () => {
    expect(formatYenAxis(Number.NaN)).toBe("0");
  });
});

describe("formatYenAxisLabel", () => {
  it("appends yen unit to axis ticks", () => {
    expect(formatYenAxisLabel(41_347)).toBe("41,347円");
    expect(formatYenAxisLabel(-1_500)).toBe("-1,500円");
    expect(formatYenAxisLabel(0)).toBe("0円");
  });

  it("returns zero yen for non-finite values", () => {
    expect(formatYenAxisLabel(Number.NaN)).toBe("0円");
  });
});

describe("formatPercentAxis", () => {
  it("uses adaptive precision for percent axis ticks", () => {
    expect(formatPercentAxis(0.25)).toBe("25%");
    expect(formatPercentAxis(0.052)).toBe("5.2%");
    expect(formatPercentAxis(0.0013)).toBe("0.13%");
    expect(formatPercentAxis(-0.002)).toBe("-0.20%");
  });

  it("returns zero percent for non-finite ratios", () => {
    expect(formatPercentAxis(Number.NaN)).toBe("0%");
  });
});

describe("formatPercentPoint", () => {
  it("formats ratio deltas as signed points", () => {
    expect(formatPercentPoint(0.003)).toBe("+0.30 pt");
    expect(formatPercentPoint(-0.021)).toBe("-2.1 pt");
    expect(formatPercentPoint(-0.0004)).toBe("-0.04 pt");
  });

  it("returns dash for non-finite ratios", () => {
    expect(formatPercentPoint(Number.NaN)).toBe("—");
  });
});

describe("formatPercentPointAxis", () => {
  it("formats axis ticks without explicit sign", () => {
    expect(formatPercentPointAxis(0.003)).toBe("0.30 pt");
    expect(formatPercentPointAxis(-0.021)).toBe("-2.1 pt");
  });
});

describe("formatPercentRelativeChange", () => {
  it("formats relative change with sign", () => {
    expect(formatPercentRelativeChange(0.01)).toBe("+1.0%");
    expect(formatPercentRelativeChange(-0.14)).toBe("-14.0%");
  });
});

describe("formatPercentDeltaTooltip", () => {
  it("combines level transition, points, and relative change", () => {
    expect(formatPercentDeltaTooltip(0.288, 0.291)).toBe(
      "28.8% → 29.1% (+0.30 pt / +1.0%)",
    );
  });

  it("returns dash when values are missing", () => {
    expect(formatPercentDeltaTooltip(null, 0.291)).toBe("—");
  });
});

describe("formatTrendChartMeta", () => {
  it("formats captions for each value unit", () => {
    expect(formatTrendChartMeta("日次表示", "yenMan")).toBe("日次表示・金額単位: 万円");
    expect(formatTrendChartMeta("日次表示", "yen")).toBe("日次表示・金額単位: 円");
    expect(formatTrendChartMeta("日次表示", "percent")).toBe("日次表示・単位: %");
    expect(formatTrendChartMeta("日次表示", "percentPoint")).toBe(
      "日次表示・単位: ポイント",
    );
  });
});

describe("formatTrendChartCaption", () => {
  it("combines display unit label with 万円 unit note", () => {
    expect(formatTrendChartCaption("月次表示（各月の最終基準日）")).toBe(
      "月次表示（各月の最終基準日）・金額単位: 万円",
    );
  });
});
