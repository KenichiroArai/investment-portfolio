import { describe, expect, it } from "vitest";

import {
  formatPercentAxis,
  formatTrendChartCaption,
  formatTrendChartMeta,
  formatYenAxis,
  formatYenAxisLabel,
  formatYenMan,
  formatYenManAxis,
} from "@/lib/format-yen";

describe("formatYenMan", () => {
  it("formats values in 万円", () => {
    expect(formatYenMan(3_441_347)).toBe("344万円");
    expect(formatYenMan(459_121)).toBe("45.9万円");
    expect(formatYenMan(0)).toBe("0万円");
  });
});

describe("formatYenManAxis", () => {
  it("formats axis ticks without unit suffix", () => {
    expect(formatYenManAxis(3_441_347)).toBe("344");
    expect(formatYenManAxis(459_121)).toBe("45.9");
    expect(formatYenManAxis(0)).toBe("0");
  });
});

describe("formatYenAxis", () => {
  it("formats axis ticks in yen without unit suffix", () => {
    expect(formatYenAxis(41_347)).toBe("41,347");
    expect(formatYenAxis(-1_000)).toBe("-1,000");
    expect(formatYenAxis(0)).toBe("0");
  });
});

describe("formatYenAxisLabel", () => {
  it("appends yen unit to axis ticks", () => {
    expect(formatYenAxisLabel(41_347)).toBe("41,347円");
    expect(formatYenAxisLabel(-1_500)).toBe("-1,500円");
    expect(formatYenAxisLabel(0)).toBe("0円");
  });
});

describe("formatPercentAxis", () => {
  it("uses adaptive precision for percent axis ticks", () => {
    expect(formatPercentAxis(0.25)).toBe("25%");
    expect(formatPercentAxis(0.052)).toBe("5.2%");
    expect(formatPercentAxis(0.0013)).toBe("0.13%");
    expect(formatPercentAxis(-0.002)).toBe("-0.20%");
  });
});

describe("formatTrendChartMeta", () => {
  it("formats captions for each value unit", () => {
    expect(formatTrendChartMeta("日次表示", "yenMan")).toBe("日次表示・金額単位: 万円");
    expect(formatTrendChartMeta("日次表示", "yen")).toBe("日次表示・金額単位: 円");
    expect(formatTrendChartMeta("日次表示", "percent")).toBe("日次表示・単位: %");
  });
});

describe("formatTrendChartCaption", () => {
  it("combines display unit label with 万円 unit note", () => {
    expect(formatTrendChartCaption("月次表示（各月の最終基準日）")).toBe(
      "月次表示（各月の最終基準日）・金額単位: 万円",
    );
  });
});
