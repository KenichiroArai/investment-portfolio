import { describe, expect, it } from "vitest";

import {
  formatTrendChartCaption,
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

describe("formatTrendChartCaption", () => {
  it("combines display unit label with 万円 unit note", () => {
    expect(formatTrendChartCaption("月次表示（各月の最終基準日）")).toBe(
      "月次表示（各月の最終基準日）・金額単位: 万円",
    );
  });
});
