import { describe, expect, it } from "vitest";

import { IDECO_SCHEME_CODES, isIdecoAnalysisSchemeCode } from "../src/ideco-analysis";

describe("isIdecoAnalysisSchemeCode", () => {
  it("returns false for non-ideco scheme codes", () => {
    expect(isIdecoAnalysisSchemeCode("region")).toBe(false);
  });

  it("returns false for instrument metadata scheme codes", () => {
    expect(isIdecoAnalysisSchemeCode(IDECO_SCHEME_CODES.majorCategory)).toBe(false);
    expect(isIdecoAnalysisSchemeCode(IDECO_SCHEME_CODES.productStyle)).toBe(false);
    expect(isIdecoAnalysisSchemeCode(IDECO_SCHEME_CODES.instrumentStatus)).toBe(false);
  });

  it("returns true for analysis scheme codes", () => {
    expect(isIdecoAnalysisSchemeCode(IDECO_SCHEME_CODES.region)).toBe(true);
    expect(isIdecoAnalysisSchemeCode(IDECO_SCHEME_CODES.assetClass)).toBe(true);
    expect(isIdecoAnalysisSchemeCode("ideco_axis_12345678")).toBe(true);
  });
});
