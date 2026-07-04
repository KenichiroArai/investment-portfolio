import { describe, expect, it } from "vitest";

import {
  IdecoCsvError,
  parseDecimalRate,
  parseGainRate,
  parseJapanesePercentRate,
  stripUtf8Bom,
} from "../src/ideco-csv-utils";

describe("ideco-csv-utils", () => {
  it("creates IdecoCsvError with name", () => {
    const error = new IdecoCsvError("test");
    expect(error.name).toBe("IdecoCsvError");
    expect(error.message).toBe("test");
  });

  it("strips UTF-8 BOM", () => {
    expect(stripUtf8Bom("\uFEFFhello")).toBe("hello");
    expect(stripUtf8Bom("plain")).toBe("plain");
  });

  it("parses percent and decimal gain rates", () => {
    expect(parseJapanesePercentRate("2.10%")).toBe(0.021);
    expect(parseJapanesePercentRate("2.10％")).toBe(0.021);
    expect(parseGainRate("0.021")).toBe(0.021);
    expect(parseGainRate("2.10%")).toBe(0.021);
    expect(parseDecimalRate("0.021")).toBe(0.021);
  });

  it("returns NaN for invalid numeric inputs", () => {
    expect(parseJapanesePercentRate("1.5")).toBeNaN();
    expect(parseJapanesePercentRate("-")).toBeNaN();
    expect(parseJapanesePercentRate("bad%")).toBeNaN();
    expect(parseJapanesePercentRate("-%")).toBeNaN();
    expect(parseDecimalRate("-")).toBeNaN();
    expect(parseGainRate("bad")).toBeNaN();
  });
});
