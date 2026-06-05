import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  IdecoKakeiboCsvError,
  parseIdecoKakeiboCsv,
  parseIdecoKakeiboDate,
  parseJapaneseInteger,
  parseJapanesePercentRate,
  resolveIdecoProductType,
  stripUtf8Bom,
  thousandsYenToYen,
} from "../src/ideco-kakeibo-csv";

const SAMPLE_CSV = `番号,日付,商品タイプ,運用商品名,時価単価(1万口当り),残高数量,資産残高,購入金額,損益,損益率
1,2026/6/2,国内株式,eMAXIS Slim 国内株式(TOPIX),"31,351","41,773","130,962","128,324","2,638",2.10%
2,2026/6/2,海外株式,eMAXIS Slim 全世界株式(除く日本),"38,275","104,130","398,557","385,705","12,852",3.30%
`;

describe("ideco-kakeibo-csv", () => {
  it("parses integers, dates, and yen conversion helpers", () => {
    expect(parseJapaneseInteger("31,351")).toBe(31351);
    expect(parseJapaneseInteger("-")).toBeNaN();
    expect(thousandsYenToYen(130962)).toBe(130962000);
    expect(parseIdecoKakeiboDate("2026/6/2")).toBe("2026-06-02");
    expect(parseJapanesePercentRate("2.10%")).toBe(0.021);
    expect(parseJapanesePercentRate("-2.50%")).toBe(-0.025);
    expect(parseJapanesePercentRate("bad")).toBeNaN();
    expect(parseJapanesePercentRate("%")).toBeNaN();
    expect(parseJapanesePercentRate("-%")).toBeNaN();
    expect(parseJapanesePercentRate("abc%")).toBeNaN();
    expect(resolveIdecoProductType("国内株式").code).toBe("domestic_equity");
    expect(stripUtf8Bom("\uFEFFhello")).toBe("hello");
  });

  it("parses a valid iDeCo kakeibo CSV", () => {
    const parsed = parseIdecoKakeiboCsv(SAMPLE_CSV);
    expect(parsed.asOfDate).toBe("2026-06-02");
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows[0]).toMatchObject({
      rowNumber: 1,
      instrumentName: "eMAXIS Slim 国内株式(TOPIX)",
      quantity: 41773,
      marketValueMinor: 130962000,
      bookValueMinor: 128324000,
      unrealizedGainMinor: 2638000,
      unrealizedGainRate: 0.021,
      unitPricePerTenThousandLots: 31351,
      productTypeCode: "domestic_equity",
    });
    expect(parsed.rows[1].productTypeCode).toBe("foreign_equity");
  });

  it("rejects invalid CSV content", () => {
    expect(() => parseIdecoKakeiboCsv("")).toThrow(IdecoKakeiboCsvError);
    expect(() => parseIdecoKakeiboCsv("a,b\n1,2")).toThrow(/ヘッダー/);
    expect(() =>
      parseIdecoKakeiboCsv(
        "日付,日付,商品タイプ,運用商品名,時価単価(1万口当り),残高数量,資産残高,購入金額,損益,損益率\n1,2026/6/2,国内株式,テスト,\"1\",\"1\",\"1\",\"1\",\"0\",0%",
      ),
    ).toThrow(/列 1:/);
    expect(() => parseIdecoKakeiboCsv("番号,日付\n1,2026/6/2")).toThrow(
      /ヘッダー列数が不正/,
    );
    expect(() =>
      parseIdecoKakeiboCsv(
        "番号,日付,商品タイプ,運用商品名,時価単価(1万口当り),残高数量,資産残高,購入金額,損益,損益率",
      ),
    ).toThrow(/データ行がありません/);
    expect(() => parseIdecoKakeiboDate("bad")).toThrow(IdecoKakeiboCsvError);
    expect(() =>
      parseIdecoKakeiboCsv(
        `番号,日付,商品タイプ,運用商品名,時価単価(1万口当り),残高数量,資産残高,購入金額,損益,損益率
1,2026/6/2,未知タイプ,テスト,"1","1","1","1","0",0%
`,
      ),
    ).toThrow(/未対応の商品タイプ/);
    expect(() =>
      parseIdecoKakeiboCsv(
        `番号,日付,商品タイプ,運用商品名,時価単価(1万口当り),残高数量,資産残高,購入金額,損益,損益率
1,2026/6/2,国内株式,テスト,"1","1","1","1","0",0%
2,2026/6/3,国内株式,テスト2,"1","1","1","1","0",0%
`,
      ),
    ).toThrow(/日付が他行と一致しません/);
    expect(() =>
      parseIdecoKakeiboCsv(
        `番号,日付,商品タイプ,運用商品名,時価単価(1万口当り),残高数量,資産残高,購入金額,損益,損益率
0,2026/6/2,国内株式,テスト,"1","1","1","1","0",0%
`,
      ),
    ).toThrow(/番号が不正/);
    expect(() =>
      parseIdecoKakeiboCsv(
        `番号,日付,商品タイプ,運用商品名,時価単価(1万口当り),残高数量,資産残高,購入金額,損益,損益率
1,2026/6/2,国内株式, ,"1","1","1","1","0",0%
`,
      ),
    ).toThrow(/運用商品名が空/);
    expect(() =>
      parseIdecoKakeiboCsv(
        `番号,日付,商品タイプ,運用商品名,時価単価(1万口当り),残高数量,資産残高,購入金額,損益,損益率
1,2026/6/2,国内株式,テスト,"x","1","1","1","0",0%
`,
      ),
    ).toThrow(/数値が不正/);
    expect(() =>
      parseIdecoKakeiboCsv(
        `番号,日付,商品タイプ,運用商品名,時価単価(1万口当り),残高数量,資産残高,購入金額,損益,損益率
1,2026/6/2,国内株式,テスト,"1","1","1","1","0",bad
`,
      ),
    ).toThrow(/数値が不正/);
    expect(() =>
      parseIdecoKakeiboCsv(
        `番号,日付,商品タイプ,運用商品名,時価単価(1万口当り),残高数量,資産残高,購入金額,損益,損益率
1,2026/6/2,国内株式,テスト,"1","0","1","1","0",0%
`,
      ),
    ).toThrow(/残高数量が不正/);
    expect(() =>
      parseIdecoKakeiboCsv(
        `番号,日付,商品タイプ,運用商品名,時価単価(1万口当り),残高数量,資産残高,購入金額,損益,損益率
1,2026/6/2,国内株式,テスト,"1","1","1"
`,
      ),
    ).toThrow(/列数が不正/);
  });

  it("parses escaped quotes and CRLF line endings", () => {
    const parsed = parseIdecoKakeiboCsv(
      "番号,日付,商品タイプ,運用商品名,時価単価(1万口当り),残高数量,資産残高,購入金額,損益,損益率\r\n" +
        '1,2026/6/2,国内株式,"愛称:""ファインゴールド""","1","1","1","1","0",0%\r\n',
    );
    expect(parsed.rows[0].instrumentName).toBe('愛称:"ファインゴールド"');
  });

  it("parses rows without a trailing newline", () => {
    const parsed = parseIdecoKakeiboCsv(
      "番号,日付,商品タイプ,運用商品名,時価単価(1万口当り),残高数量,資産残高,購入金額,損益,損益率\n" +
        '1,2026/6/2,国内株式,テスト,"1","1","1","1","0",0%',
    );
    expect(parsed.rows).toHaveLength(1);
  });

  it("parses a single-cell file for csv record finalization", () => {
    expect(() => parseIdecoKakeiboCsv("only-header-cell")).toThrow(
      /データ行がありません/,
    );
  });

  it("rejects rows with missing percent rate", () => {
    expect(() =>
      parseIdecoKakeiboCsv(
        "番号,日付,商品タイプ,運用商品名,時価単価(1万口当り),残高数量,資産残高,購入金額,損益,損益率\n" +
          '1,2026/6/2,国内株式,テスト,"1","1","1","1","0",',
      ),
    ).toThrow(/数値が不正/);
  });

  it("parses the ideco holdings CSV fixture when present", () => {
    const fixturePath = resolve(
      import.meta.dirname,
      "../../../data/imports/ideco/holdings.csv",
    );

    let content = "";
    try {
      content = readFileSync(fixturePath, "utf8");
    } catch {
      return;
    }

    const parsed = parseIdecoKakeiboCsv(content);
    expect(parsed.asOfDate).toBe("2026-06-02");
    expect(parsed.rows).toHaveLength(15);
    expect(parsed.rows[0].instrumentName).toBe(
      "eMAXIS Slim 国内株式(TOPIX)",
    );
    expect(parsed.rows[14].instrumentName).toBe("セレブライフ・ストーリー2045");
  });
});
