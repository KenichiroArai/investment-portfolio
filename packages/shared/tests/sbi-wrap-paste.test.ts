import { describe, expect, it } from "vitest";

import {
  buildSbiWrapAccountId,
  buildSbiWrapExternalId,
  matchSbiWrapInstrumentId,
  parseSbiWrapPaste,
  SbiWrapPasteError,
} from "../src/index";

const samplePaste = `資産残高
2026/07/17 時点
10,100円
通算損益
+100円
+1.00%
評価損益
+24円
+0.24%
前日比
+27円
+0.26%
前月比
-2円
-0.01%
購入
積立
資産推移
資産推移情報を読み込む
資産構成
資産構成比率
内訳
（ラップ専用）ＳＢＩ・米国株式
評価額
1,617円
比率
16.0%
（ラップ専用）ＳＢＩ・先進国株式
評価額
2,527円
比率
25.0%
（ラップ専用）ＳＢＩ・新興国株式
評価額
298円
比率
3.0%
（ラップ専用）ＳＢＩ・米国債券
評価額
1,416円
比率
14.0%
（ラップ専用）ＳＢＩ・米国ハイイールド債券
評価額
286円
比率
2.8%
（ラップ専用）ＳＢＩ・新興国債券
評価額
679円
比率
6.7%
（ラップ専用）ＳＢＩ・米国不動産
評価額
1,601円
比率
15.9%
（ラップ専用）ＳＢＩ・ゴールド
評価額
1,468円
比率
14.5%
現金
208円
比率
2.1%

資産残高
2026/07/17 時点
10,095円
通算損益
+95円
+0.95%
評価損益
+93円
+0.93%
前日比
-39円
-0.38%
前月比
+54円
+0.53%
購入
積立
資産推移
資産推移情報を読み込む
資産構成
資産構成比率
内訳
ラップ専用・世界株式アクティブ（グローバル・マルチテーマ）
評価額
2,979円
比率
29.5%
ラップ専用・世界株式アクティブ（グローバル・バリュー）
評価額
2,768円
比率
27.4%
ラップ専用・日本株式アクティブ（セレクト・オポチュニティ）
評価額
783円
比率
7.8%
ラップ専用・外国債券アクティブ
評価額
501円
比率
5.0%
ラップ専用・外国国債アクティブ（為替ヘッジあり）
評価額
798円
比率
7.9%
ラップ専用・米国ハイ・イールド債券アクティブ
評価額
501円
比率
5.0%
ラップ専用・日本債券アクティブ（クレジット戦略型）
評価額
501円
比率
5.0%
ラップ専用・グローバルＲＥＩＴアクティブ
評価額
655円
比率
6.5%
ラップ専用・Ｊ−ＲＥＩＴアクティブ
評価額
502円
比率
5.0%
現金
107円
比率
1.1%

資産残高
2026/07/17 時点
10,188円
通算損益
+188円
+1.88%
評価損益
+208円
+2.10%
前日比
+67円
+0.66%
前月比
+74円
+0.73%
購入
積立
資産推移
資産推移情報を読み込む
資産構成
資産構成比率
内訳
マルチアセット戦略ファンド・トリプル（ラップ専用）
評価額
1,914円
比率
18.8%
マルチアセット戦略ファンド・シングル（ラップ専用）
評価額
8,171円
比率
80.2%
マネーファンド（ラップ専用）
評価額
0円
比率
--%
現金
103円
比率
1.0%

資産残高
2026/07/17 時点
10,415円
通算損益
+415円
+4.15%
評価損益
+419円
+4.23%
前日比
+136円
+1.32%
前月比
+153円
+1.49%
購入
積立
資産推移
資産推移情報を読み込む
資産構成
資産構成比率
内訳
マルチアセット戦略ファンド・トリプル（ラップ専用）
評価額
9,440円
比率
90.6%
マルチアセット戦略ファンド・シングル（ラップ専用）
評価額
869円
比率
8.3%
マネーファンド（ラップ専用）
評価額
0円
比率
--%
現金
106円
比率
1.0%

資産残高
2026/07/17 時点
10,059円
通算損益
+59円
+0.59%
評価損益
+80円
+0.81%
前日比
-11円
-0.10%
前月比
-18円
-0.17%
購入
積立
資産推移
資産推移情報を読み込む
資産構成
資産構成比率
内訳
ラップ専用・三井住友ＤＳ・米国株式セクター戦略ファンド
評価額
2,806円
比率
27.9%
ラップ専用・三井住友ＤＳ・米国株式ファクター戦略ファンド
評価額
4,160円
比率
41.4%
ラップ専用・三井住友ＤＳ・グローバル株式（除く米国）戦略ファンド
評価額
2,988円
比率
29.7%
現金
105円
比率
1.0%
`;

describe("parseSbiWrapPaste", () => {
  it("parses five product blocks and skips zero money funds", () => {
    const parsed = parseSbiWrapPaste(samplePaste);

    expect(parsed.asOfDate).toBe("2026-07-17");
    expect(parsed.holdings).toHaveLength(9 + 10 + 3 + 3 + 4);

    const products = [...new Set(parsed.holdings.map((row) => row.productName))];
    expect(products).toEqual([
      "AI投資",
      "匠の運用",
      "レバナビ",
      "レバチョイス",
      "ALL株式",
    ]);

    const aiUs = parsed.holdings.find(
      (row) => row.instrumentName === "（ラップ専用）ＳＢＩ・米国株式",
    );
    expect(aiUs?.accountId).toBe("sbi-wrap:AI投資");
    expect(aiUs?.marketValueMinor).toBe(1617);
    expect(aiUs?.quantity).toBe(1);
    expect(aiUs?.bookValueMinor).toBeNull();

    const rebanaviTriple = parsed.holdings.find(
      (row) =>
        row.productName === "レバナビ" &&
        row.instrumentName.includes("トリプル"),
    );
    expect(rebanaviTriple?.marketValueMinor).toBe(1914);
    expect(rebanaviTriple?.accountId).toBe("sbi-wrap:レバナビ");

    const rebaChoiceTriple = parsed.holdings.find(
      (row) =>
        row.productName === "レバチョイス" &&
        row.instrumentName.includes("トリプル"),
    );
    expect(rebaChoiceTriple?.marketValueMinor).toBe(9440);

    const moneyFunds = parsed.holdings.filter((row) =>
      row.instrumentName.includes("マネーファンド"),
    );
    expect(moneyFunds).toHaveLength(0);

    const cashRows = parsed.holdings.filter((row) => row.source === "wrap_cash");
    expect(cashRows).toHaveLength(5);
  });

  it("throws on empty paste", () => {
    expect(() => parseSbiWrapPaste("")).toThrow(SbiWrapPasteError);
  });

  it("builds distinct external ids per account", () => {
    const left = buildSbiWrapExternalId(
      buildSbiWrapAccountId("レバナビ"),
      "マルチアセット戦略ファンド・トリプル（ラップ専用）",
    );
    const right = buildSbiWrapExternalId(
      buildSbiWrapAccountId("レバチョイス"),
      "マルチアセット戦略ファンド・トリプル（ラップ専用）",
    );
    expect(left).not.toBe(right);
  });

  it("matches instruments by name and accountId", () => {
    const matched = matchSbiWrapInstrumentId(
      [
        {
          id: "1",
          name: "現金",
          accountId: "sbi-wrap:AI投資",
        },
        {
          id: "2",
          name: "現金",
          accountId: "sbi-wrap:匠の運用",
        },
      ],
      "現金",
      { accountId: "sbi-wrap:匠の運用" },
    );
    expect(matched).toBe("2");
  });

  it("does not fall back to cash in another product", () => {
    const matched = matchSbiWrapInstrumentId(
      [
        {
          id: "1",
          name: "現金",
          accountId: "sbi-wrap:AI投資",
        },
      ],
      "現金",
      { accountId: "sbi-wrap:レバナビ" },
    );
    expect(matched).toBeNull();
  });
});
