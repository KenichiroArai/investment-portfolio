import { describe, expect, it } from "vitest";

import {
  buildMonexAccountId,
  buildMonexAccountName,
  MonexCsvError,
  normalizeMonexAccountLabel,
} from "../src/monex-csv-utils";

describe("monex-csv-utils", () => {
  it("creates a named error", () => {
    const error = new MonexCsvError("必須列が見つかりません");
    expect(error.name).toBe("MonexCsvError");
    expect(error.message).toBe("必須列が見つかりません");
  });

  it("normalizes account labels", () => {
    expect(normalizeMonexAccountLabel(" ＮＩＳＡ 口座 ")).toBe("NISA口座");
  });

  it("builds unknown account id and name when both labels are empty", () => {
    expect(buildMonexAccountId("", " ")).toBe("monex:unknown");
    expect(buildMonexAccountName("", " ")).toBe("不明口座");
  });

  it("builds account id and name with account type only", () => {
    expect(buildMonexAccountId("NISA", "")).toBe("monex:NISA");
    expect(buildMonexAccountName("NISA", "")).toBe("NISA");
  });

  it("builds account id and name with account and custody types", () => {
    expect(buildMonexAccountId("一般", "普通預り")).toBe("monex:一般:普通預り");
    expect(buildMonexAccountName("一般", "普通預り")).toBe("一般 / 普通預り");
  });
});
