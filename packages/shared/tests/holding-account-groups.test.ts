import { describe, expect, it } from "vitest";

import {
  buildMonexAccountId,
  buildMonexAccountName,
  groupRowsByAccount,
} from "../src/index";

describe("holding account groups", () => {
  it("builds monex account id from account type and custody type", () => {
    expect(buildMonexAccountId("一般", "普通預り")).toBe("monex:一般:普通預り");
    expect(buildMonexAccountName("一般", "普通預り")).toBe("一般 / 普通預り");
    expect(buildMonexAccountId("", "")).toBe("monex:unknown");
    expect(buildMonexAccountName("", "")).toBe("不明口座");
  });

  it("groups rows by account id", () => {
    const groups = groupRowsByAccount([
      {
        accountId: "monex:一般:普通預り",
        accountName: "一般 / 普通預り",
        instrumentName: "A",
      },
      {
        accountId: "monex:NISA:普通預り",
        accountName: "NISA / 普通預り",
        instrumentName: "B",
      },
      {
        accountId: "monex:一般:普通預り",
        accountName: "一般 / 普通預り",
        instrumentName: "C",
      },
    ]);

    expect(groups).toHaveLength(2);
    const generalGroup = groups.find(
      (group) => group.accountId === "monex:一般:普通預り",
    );
    const nisaGroup = groups.find(
      (group) => group.accountId === "monex:NISA:普通預り",
    );
    expect(generalGroup?.rows).toHaveLength(2);
    expect(nisaGroup?.rows).toHaveLength(1);
  });
});
