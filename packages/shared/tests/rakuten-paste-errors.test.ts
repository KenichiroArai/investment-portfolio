import { describe, expect, it } from "vitest";

import { parseRakutenPaste, RakutenPasteError } from "../src/rakuten-paste";

describe("parseRakutenPaste error paths", () => {
  it("skips unrecognized lines", () => {
    const parsed = parseRakutenPaste(`国内株式\t1489
ＮＦ日経高配当５０
特定\t1 株\t3,285.00 円
3,329 円
+2.0 円
3,329 円
+1.33 ％
未対応行`);

    expect(parsed.holdings).toHaveLength(1);
  });

  it("computes gain rate when percent line is missing", () => {
    const parsed = parseRakutenPaste(`国内株式\t1489
ＮＦ日経高配当５０
特定\t1 株\t3,000.00 円
3,100 円
+100 円
3,100 円
-`);

    expect(parsed.holdings[0].unrealizedGainRate).toBeCloseTo(100 / 3000);
  });

  it("throws for invalid domestic equity blocks", () => {
    expect(() =>
      parseRakutenPaste(`国内株式\tABCD
ＮＦ日経高配当５０
特定\t1 株\t3,285.00 円
3,329 円
+2.0 円
3,329 円
+1.33 ％`),
    ).toThrow(RakutenPasteError);

    expect(() => parseRakutenPaste("国内株式\t1489")).toThrow(RakutenPasteError);
    expect(() =>
      parseRakutenPaste(`国内株式\t1489

特定\t1 株\t3,285.00 円
3,329 円
+2.0 円
3,329 円
+1.33 ％`),
    ).toThrow(RakutenPasteError);

    expect(() =>
      parseRakutenPaste(`国内株式\t1489
ＮＦ日経高配当５０
ラップ\t1 株\t3,285.00 円
3,329 円
+2.0 円
3,329 円
+1.33 ％`),
    ).toThrow(RakutenPasteError);

    expect(() =>
      parseRakutenPaste(`国内株式\t1489
ＮＦ日経高配当５０
特定\tabc\t3,285.00 円
3,329 円
+2.0 円
3,329 円
+1.33 ％`),
    ).toThrow(RakutenPasteError);

    expect(() =>
      parseRakutenPaste(`国内株式\t1489
ＮＦ日経高配当５０
特定\t1 株\t3,285.00 円`),
    ).toThrow(RakutenPasteError);

    expect(() =>
      parseRakutenPaste(`国内株式\t1489
ＮＦ日経高配当５０
特定\t1 株\t3,285.00 円
3,329 円
+2.0 円
abc
+1.33 ％`),
    ).toThrow(RakutenPasteError);
  });

  it("throws for invalid mutual fund and money fund blocks", () => {
    expect(() =>
      parseRakutenPaste(`投資信託\t\t特定\t1,000 口\t9,000 円
9,000 円
+10 円
1,000 円
+1.00 ％`),
    ).toThrow(RakutenPasteError);

    expect(() =>
      parseRakutenPaste(`投資信託\tテストファンド\tラップ\t1,000 口\t9,000 円
9,000 円
+10 円
1,000 円
+1.00 ％`),
    ).toThrow(RakutenPasteError);

    expect(() =>
      parseRakutenPaste(`投資信託\tテストファンド\t特定\tabc\t9,000 円
9,000 円
+10 円
1,000 円
+1.00 ％`),
    ).toThrow(RakutenPasteError);

    expect(() =>
      parseRakutenPaste(`投資信託\tテストファンド\t特定\t1,000 口\t9,000 円`),
    ).toThrow(RakutenPasteError);

    expect(() =>
      parseRakutenPaste(`投資信託\tテストファンド\t特定\t1,000 口\t9,000 円
9,000 円
+10 円
abc
+1.00 ％`),
    ).toThrow(RakutenPasteError);

    expect(() =>
      parseRakutenPaste(`楽天・マネーファンド\t楽天・マネーファンド\t特定\t100,000 口\t-\t-
-
abc
-`),
    ).toThrow(RakutenPasteError);
  });

  it("throws for invalid fx mmf and domestic bond blocks", () => {
    expect(() => parseRakutenPaste("外貨建")).toThrow(RakutenPasteError);

    expect(() =>
      parseRakutenPaste(`外貨建
国内株式\t1489
ＮＦ日経高配当５０
特定\t1 株\t3,285.00 円
3,329 円
+2.0 円
3,329 円
+1.33 ％`),
    ).toThrow(RakutenPasteError);

    expect(() =>
      parseRakutenPaste(`外貨建
MMF\t\t特定\t1 口\t100 円
100 円
+1 円
100 円
+1.00 ％`),
    ).toThrow(RakutenPasteError);

    expect(() =>
      parseRakutenPaste(`外貨建
MMF\tGS米ドル\t特定\tabc\t100 円
100 円
+1 円
100 円
+1.00 ％`),
    ).toThrow(RakutenPasteError);

    expect(() =>
      parseRakutenPaste(`国内債券\t\t特定\t20,000\t100.00 円
100.0000 %
0.0000 %
abc
-`),
    ).toThrow(RakutenPasteError);

    expect(() =>
      parseRakutenPaste(`国内債券\t個人国債\t特定\tabc\t100.00 円
100.0000 %
0.0000 %
20,000 円
-`),
    ).toThrow(RakutenPasteError);

    expect(() =>
      parseRakutenPaste(`国内債券\t個人国債\t特定\t20,000\t100.00 円
100.0000 %
0.0000 %
abc
-`),
    ).toThrow(RakutenPasteError);
  });

  it("throws for invalid wrap blocks", () => {
    expect(() => parseRakutenPaste("楽ラップ")).toThrow(RakutenPasteError);

    expect(() =>
      parseRakutenPaste(`楽ラップ
wrong
-
313 円`),
    ).toThrow(RakutenPasteError);

    expect(() =>
      parseRakutenPaste(`楽ラップ
【楽ラップ専用】テスト
-
131 口\t39,694.66 円
41,651 円
-
545 円
+4.92 ％`),
    ).toThrow(RakutenPasteError);

    expect(() =>
      parseRakutenPaste(`楽ラップ
【楽ラップ専用】テスト
-
abc\t39,694.66 円
41,651 円
-
545 円
+4.92 ％`),
    ).toThrow(RakutenPasteError);

    expect(() =>
      parseRakutenPaste(`楽ラップ
【楽ラップ専用】テスト
-
131 口\t39,694.66 円
41,651 円
-
abc
+4.92 ％`),
    ).toThrow(RakutenPasteError);

    expect(() => parseRakutenPaste("楽ラップ\n【楽ラップ専用】テスト")).toThrow(
      RakutenPasteError,
    );

    expect(() =>
      parseRakutenPaste(`楽ラップ
現金等
-
abc`),
    ).toThrow(RakutenPasteError);
  });

  it("uses market value as book value when avg cost is missing for equity", () => {
    const parsed = parseRakutenPaste(`国内株式\t1489
ＮＦ日経高配当５０
特定\t1 株\t-
3,329 円
+2.0 円
3,329 円
+1.33 ％`);

    expect(parsed.holdings[0].bookValueMinor).toBe(3329);
  });

  it("defaults gain rate to zero when book value is zero", () => {
    const parsed = parseRakutenPaste(`国内株式\t1489
ＮＦ日経高配当５０
特定\t0 株\t0 円
0 円
+0 円
0 円
-`);

    expect(parsed.holdings[0].unrealizedGainRate).toBe(0);
  });

  it("omits gain rate line for domestic equity", () => {
    const parsed = parseRakutenPaste(`国内株式\t1489
ＮＦ日経高配当５０
特定\t1 株\t3,285.00 円
3,329 円
+2.0 円
3,329 円`);

    expect(parsed.holdings[0].unrealizedGainRate).toBeCloseTo(44 / 3285);
  });

  it("throws for empty domestic equity name and missing quantity line", () => {
    expect(() =>
      parseRakutenPaste(`国内株式\t1489
\t決算
特定\t1 株\t3,285.00 円
3,329 円
+2.0 円
3,329 円
+1.33 ％`),
    ).toThrow(RakutenPasteError);

    expect(() =>
      parseRakutenPaste(`国内株式\t1489
ＮＦ日経高配当５０`),
    ).toThrow(RakutenPasteError);
  });

  it("throws for truncated domestic equity, fund, bond, and wrap blocks", () => {
    expect(() =>
      parseRakutenPaste(`国内株式\t1489

特定\t1 株\t3,285.00 円
3,329 円
+2.0 円
3,329 円
+1.33 ％`),
    ).toThrow(RakutenPasteError);

    expect(() =>
      parseRakutenPaste(`国内株式\t1489
特定\t1 株\t3,285.00 円
3,329 円
+2.0 円
3,329 円
+1.33 ％`),
    ).toThrow(RakutenPasteError);

    expect(() =>
      parseRakutenPaste(`国内株式\t1489
ＮＦ日経高配当５０
特定\t1 株\t3,285.00 円
3,329 円
+2.0 円`),
    ).toThrow(RakutenPasteError);

    expect(() =>
      parseRakutenPaste(`投資信託\tテストファンド\t特定\t1,000 口\t9,000 円
9,000 円
+10 円`),
    ).toThrow(RakutenPasteError);

    expect(() =>
      parseRakutenPaste(`楽天・マネーファンド\t楽天・マネーファンド\t特定\t100,000 口\t-\t-
-
-`),
    ).toThrow(RakutenPasteError);

    expect(() =>
      parseRakutenPaste(`国内債券\t個人国債\t特定\t20,000\t100.00 円
100.0000 %
0.0000 %`),
    ).toThrow(RakutenPasteError);

    expect(() =>
      parseRakutenPaste(`楽ラップ
\tfoo
-
131 口\t39,694.66 円
41,651 円
-
545 円
+4.92 ％`),
    ).toThrow(RakutenPasteError);

    expect(() => parseRakutenPaste("楽ラップ\nwrong")).toThrow(RakutenPasteError);

    expect(() =>
      parseRakutenPaste(`楽ラップ
現金等
-`),
    ).toThrow(RakutenPasteError);
  });

  it("throws when block header lines are missing trailing cells", () => {
    // 国内株式: 銘柄コードセルなし
    expect(() => parseRakutenPaste("国内株式\n未対応行")).toThrow(
      RakutenPasteError,
    );

    // 国内株式: 口座行に数量・平均取得セルなし
    expect(() =>
      parseRakutenPaste(`国内株式\t1489
ＮＦ日経高配当５０
特定
3,329 円
+2.0 円
3,329 円
+1.33 ％`),
    ).toThrow(RakutenPasteError);

    // 投資信託: 名称以降のセルなし
    expect(() => parseRakutenPaste("投資信託\n9,000 円")).toThrow(
      RakutenPasteError,
    );

    // 外貨建MMF: 名称以降のセルなし
    expect(() =>
      parseRakutenPaste(`外貨建
MMF
100 円
+1 円
100 円
+1.00 ％`),
    ).toThrow(RakutenPasteError);

    // 国内債券: 名称以降のセルなし
    expect(() => parseRakutenPaste("国内債券\n100.0000 %")).toThrow(
      RakutenPasteError,
    );
  });

  it("falls back to zero when unit price or avg cost cells are dashes", () => {
    // 投資信託: 現在値が - のとき unitPriceMinor は 0
    const dashUnitPrice = parseRakutenPaste(`投資信託\tテストファンド\t特定\t1,000 口\t9,000 円
-
+10 円
10,000 円
+1.00 ％`);
    expect(dashUnitPrice.holdings[0].unitPriceMinor).toBe(0);

    // 外貨建MMF: 平均取得価額が - のとき avgCostMinor は 0
    const fxMmfNoAvgCost = parseRakutenPaste(`外貨建
MMF\tGS米ドル\t特定\t1 口\t-
100 円
+1 円
100 円
+1.00 ％`);
    expect(fxMmfNoAvgCost.holdings[0].avgCostMinor).toBe(0);
    expect(fxMmfNoAvgCost.holdings[0].bookValueMinor).toBe(100);

    // 国内債券: 平均取得価額が - のとき unitPriceMinor / avgCostMinor は 0
    const bondNoAvgCost = parseRakutenPaste(`国内債券\t個人国債\t特定\t20,000\t-
100.0000 %
0.0000 %
20,000 円
-`);
    expect(bondNoAvgCost.holdings[0].unitPriceMinor).toBe(0);
    expect(bondNoAvgCost.holdings[0].avgCostMinor).toBe(0);

    // 楽ラップ: 平均取得価額セルなしのとき avgCostMinor は 0
    const wrapNoAvgCost = parseRakutenPaste(`楽ラップ
【楽ラップ専用】テスト
-\t131 口
41,651 円
-
545 円
+4.92 ％`);
    expect(wrapNoAvgCost.holdings[0].avgCostMinor).toBe(0);
    expect(wrapNoAvgCost.holdings[0].bookValueMinor).toBe(545);
  });

  it("skips wrap cash account line for empty and account type labels", () => {
    const emptyFirstCell = parseRakutenPaste(`楽ラップ
現金等
\tメモ
313 円`);
    expect(emptyFirstCell.holdings[0].source).toBe("wrap_cash");
    expect(emptyFirstCell.holdings[0].marketValueMinor).toBe(313);

    const accountTypeLabel = parseRakutenPaste(`楽ラップ
現金等
特定
313 円`);
    expect(accountTypeLabel.holdings[0].source).toBe("wrap_cash");
    expect(accountTypeLabel.holdings[0].marketValueMinor).toBe(313);
  });

  it("covers account normalization and numeric fallbacks in parsed rows", () => {
    const invalidUnitPrice = parseRakutenPaste(`国内株式\t1489
ＮＦ日経高配当５０
特定\t1 株\t3,285.00 円
invalid
+2.0 円
3,329 円
+1.33 ％`);
    expect(invalidUnitPrice.holdings[0].unitPriceMinor).toBe(0);
    expect(invalidUnitPrice.holdings[0].unrealizedGainRate).toBeCloseTo(0.0133);

    const emptyAccountType = parseRakutenPaste(`楽ラップ
【楽ラップ専用】テスト
\t131 口\t39,694.66 円
41,651 円
-
545 円
+4.92 ％`);
    expect(emptyAccountType.holdings[0].accountType).toBe("ラップ");
    expect(emptyAccountType.holdings[0].accountName).toBe("楽ラップ");

    const dashedGain = parseRakutenPaste(`国内債券\t個人国債\t特定\t20,000\t100.00 円
100.0000 %
0.0000 %
20,000 円
---`);
    expect(Number.isFinite(dashedGain.holdings[0].unrealizedGainRate)).toBe(true);

    const yenOnlyGain = parseRakutenPaste(`国内株式\t1489
ＮＦ日経高配当５０
特定\t1 株\t3,285.00 円
3,329 円
+2.0 円
3,329 円
+44 円`);
    expect(yenOnlyGain.holdings[0].unrealizedGainRate).toBeCloseTo(44 / 3285);
  });
});
