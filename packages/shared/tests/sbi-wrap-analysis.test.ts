import { describe, expect, it } from "vitest";

import {
  buildSbiWrapAccountId,
  buildSbiWrapAccountName,
  findSbiWrapProductByCode,
  findSbiWrapProductByName,
  isSbiWrapAnalysisSchemeCode,
  resolveSbiWrapProductCodeFromAccountId,
} from "../src/sbi-wrap-analysis";

describe("sbi-wrap-analysis", () => {
  it("detects sbi wrap analysis scheme code", () => {
    expect(isSbiWrapAnalysisSchemeCode("sbi_wrap_product")).toBe(true);
    expect(isSbiWrapAnalysisSchemeCode("other")).toBe(false);
  });

  it("finds products by code and name", () => {
    expect(findSbiWrapProductByCode("ai_investment")?.name).toBe("AI投資");
    expect(findSbiWrapProductByCode("unknown")).toBeNull();
    expect(findSbiWrapProductByName("  レバナビ  ")?.code).toBe("rebanavi");
    expect(findSbiWrapProductByName("unknown")).toBeNull();
  });

  it("builds account id and name for known and unknown products", () => {
    expect(buildSbiWrapAccountId("AI投資")).toBe("sbi-wrap:AI投資");
    expect(buildSbiWrapAccountId("")).toBe("sbi-wrap:unknown");
    expect(buildSbiWrapAccountId("カスタム")).toBe("sbi-wrap:カスタム");
    expect(buildSbiWrapAccountName("AI投資")).toBe("AI投資");
    expect(buildSbiWrapAccountName("")).toBe("不明");
    expect(buildSbiWrapAccountName("カスタム")).toBe("カスタム");
  });

  it("resolves product code from account id", () => {
    expect(resolveSbiWrapProductCodeFromAccountId("sbi-wrap:レバナビ")).toBe("rebanavi");
    expect(resolveSbiWrapProductCodeFromAccountId("other:レバナビ")).toBeNull();
    expect(resolveSbiWrapProductCodeFromAccountId("sbi-wrap:unknown")).toBeNull();
  });
});
