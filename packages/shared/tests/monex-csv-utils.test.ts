import { describe, expect, it } from "vitest";

import {
  buildMonexAccountId,
  buildMonexAccountName,
  getMonexCsvCell,
  MonexCsvError,
  parseMonexCsv,
  parseMonexDate,
  parseMonexDecimalRate,
  parseMonexInteger,
  parseMonexQuotedCsvLine,
  requireMonexHeader,
} from "../src/monex-csv-utils";

describe("monex-csv-utils", () => {
  it("parses escaped quotes in csv lines", () => {
    expect(parseMonexQuotedCsvLine('"a""b",c')).toEqual(["a\"b", "c"]);
  });

  it("normalizes CRLF and CR line endings", () => {
    expect(parseMonexCsv('"a"\r\n"b"\r"c"')).toEqual([["a"], ["b"], ["c"]]);
  });

  it("returns empty string for invalid monex dates", () => {
    expect(parseMonexDate("2026-07-05")).toBe("");
    expect(parseMonexDate("2026/07/05")).toBe("2026-07-05");
  });

  it("returns NaN for empty integer placeholders", () => {
    expect(Number.isNaN(parseMonexInteger(""))).toBe(true);
    expect(Number.isNaN(parseMonexInteger("-"))).toBe(true);
    expect(parseMonexInteger("1,000")).toBe(1000);
  });

  it("returns NaN for empty decimal rate placeholders", () => {
    expect(Number.isNaN(parseMonexDecimalRate(""))).toBe(true);
    expect(Number.isNaN(parseMonexDecimalRate("-"))).toBe(true);
    expect(Number.isNaN(parseMonexDecimalRate("---"))).toBe(true);
    expect(parseMonexDecimalRate("0.5")).toBe(0.5);
  });

  it("throws when required header is missing", () => {
    expect(() => requireMonexHeader(new Map([["日付", 0]]), "銘柄")).toThrow(MonexCsvError);
  });

  it("returns empty string for missing csv cells", () => {
    expect(getMonexCsvCell([" value "], 0)).toBe("value");
    expect(getMonexCsvCell([" value "], 1)).toBe("");
  });

  it("builds account id and name with account type only", () => {
    expect(buildMonexAccountId("NISA", "")).toBe("monex:NISA");
    expect(buildMonexAccountName("NISA", "")).toBe("NISA");
  });
});
