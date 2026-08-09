import { describe, expect, it } from "vitest";

import {
  buildMonexInstrumentNameAliasMap,
  listMonexInstrumentAliasLookupNames,
  resolveMonexCanonicalInstrumentName,
} from "../src/monex-instrument-aliases";

describe("monex-instrument-aliases", () => {
  it("maps MSV asset-class name to compass holding canonical name", () => {
    const aliasMap = buildMonexInstrumentNameAliasMap();
    expect(
      resolveMonexCanonicalInstrumentName(
        "ＭＳＶ内外ＥＴＦ資産配分ファンド（Ｇコース）",
        aliasMap,
      ),
    ).toBe("ＭＳＶ内外ＥＴＦ資産配分Ｆ・Ｇ");
    expect(
      resolveMonexCanonicalInstrumentName("ＭＳＶ内外ＥＴＦ資産配分Ｆ・Ｇ", aliasMap),
    ).toBe("ＭＳＶ内外ＥＴＦ資産配分Ｆ・Ｇ");
  });

  it("lists lookup names including aliases", () => {
    const names = listMonexInstrumentAliasLookupNames("ＭＳＶ内外ＥＴＦ資産配分Ｆ・Ｇ");
    expect(names).toContain("ＭＳＶ内外ＥＴＦ資産配分Ｆ・Ｇ");
    expect(names).toContain("ＭＳＶ内外ＥＴＦ資産配分ファンド（Ｇコース）");
  });

  it("returns the input when no alias is registered", () => {
    expect(resolveMonexCanonicalInstrumentName("未知の銘柄")).toBe("未知の銘柄");
  });
});
