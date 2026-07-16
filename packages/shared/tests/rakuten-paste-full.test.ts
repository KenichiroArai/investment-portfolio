import { describe, expect, it } from "vitest";

import { parseRakutenPaste } from "../src/index";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const dir = dirname(fileURLToPath(import.meta.url));

describe("parseRakutenPaste full sample", () => {
  it("parses the full fixture", () => {
    const sample = readFileSync(join(dir, "fixtures/rakuten-full-paste.txt"), "utf8");
    const parsed = parseRakutenPaste(sample);
    const bySource: Record<string, number> = {};
    for (const row of parsed.holdings) {
      bySource[row.source] = (bySource[row.source] ?? 0) + 1;
    }

    expect(bySource).toEqual({
      domestic_equity: 11,
      mutual_fund: 8,
      money_fund: 1,
      fx_mmf: 2,
      domestic_bond: 2,
      wrap_fund: 23,
      wrap_cash: 1,
    });
    expect(parsed.holdings).toHaveLength(48);
  });
});
