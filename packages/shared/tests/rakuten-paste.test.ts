import { describe, expect, it } from "vitest";

import {
  buildRakutenExternalId,
  matchRakutenInstrumentId,
  parseRakutenPaste,
  RakutenPasteError,
} from "../src/index";

const samplePaste = `種別	銘柄	口座	保有数量	平均取得価額	現在値
前日比	
時価評価額 
　評価損益 
国内株式	1489	
ＮＦ日経高配当５０		
特定	1 株	3,285.00 円	
3,329.0 円
+2.0 円
3,329 円
+1.33 ％
国内株式	4826	
ＣＩＪ		決算発表日
特定	2 株	484.00 円	
503.0 円
-3.0 円
1,006 円
+3.92 ％
国内株式	4826	
ＣＩＪ		決算発表日
一般	2 株	506.50 円	
503.0 円
-3.0 円
1,006 円
-0.69 ％
投資信託	インベスコ 世界厳選株式オープン＜為替ヘッジなし＞(毎月決算型)(世界のベスト)	特定	1,629 口	9,201.96 円	
9,269 円
+55 円
1,510 円
+0.72 ％
楽天・マネーファンド	楽天・マネーファンド	特定	100,000 口	-	-
-	
100,017 円
-
外貨建
MMF	GS米ドルファンド	特定	1,101 口	16,312.44 円	
162.25 円/USD
-
1,786 円
-0.55 ％
国内債券	個人国債　変動10年　第195回	特定	20,000	100.00 円	
100.0000 %
0.0000 %
20,000 円
-
楽ラップ	
【楽ラップ専用】たわらノーロード 国内株式＜ラップ専用＞
-	131 口	39,694.66 円	
41,651 円
-
545 円
+4.92 ％
楽ラップ	
現金等
-	
313 円
`;

describe("parseRakutenPaste", () => {
  it("parses mixed rakuten holdings paste", () => {
    const parsed = parseRakutenPaste(samplePaste);

    expect(parsed.holdings).toHaveLength(9);

    const equity = parsed.holdings[0];
    expect(equity.source).toBe("domestic_equity");
    expect(equity.ticker).toBe("1489");
    expect(equity.instrumentName).toBe("ＮＦ日経高配当５０");
    expect(equity.accountId).toBe("rakuten:特定");
    expect(equity.quantity).toBe(1);
    expect(equity.avgCostMinor).toBe(3285);
    expect(equity.unitPriceMinor).toBe(3329);
    expect(equity.marketValueMinor).toBe(3329);
    expect(equity.bookValueMinor).toBe(3285);
    expect(equity.unrealizedGainMinor).toBe(44);
    expect(equity.unrealizedGainRate).toBeCloseTo(0.0133);

    const tokutei = parsed.holdings[1];
    const ippan = parsed.holdings[2];
    expect(tokutei.ticker).toBe("4826");
    expect(tokutei.accountId).toBe("rakuten:特定");
    expect(ippan.ticker).toBe("4826");
    expect(ippan.accountId).toBe("rakuten:一般");
    expect(ippan.avgCostMinor).toBe(507);

    const fund = parsed.holdings[3];
    expect(fund.source).toBe("mutual_fund");
    expect(fund.quantity).toBe(1629);
    expect(fund.avgCostMinor).toBe(9202);
    expect(fund.marketValueMinor).toBe(1510);
    expect(fund.bookValueMinor).toBe(1499);
    expect(fund.unrealizedGainRate).toBeCloseTo(0.0072);

    const money = parsed.holdings[4];
    expect(money.source).toBe("money_fund");
    expect(money.quantity).toBe(100000);
    expect(money.marketValueMinor).toBe(100017);
    expect(money.bookValueMinor).toBe(100017);

    const mmf = parsed.holdings[5];
    expect(mmf.source).toBe("fx_mmf");
    expect(mmf.instrumentName).toBe("GS米ドルファンド");
    expect(mmf.marketValueMinor).toBe(1786);

    const bond = parsed.holdings[6];
    expect(bond.source).toBe("domestic_bond");
    expect(bond.quantity).toBe(20000);
    expect(bond.marketValueMinor).toBe(20000);
    expect(bond.bookValueMinor).toBe(20000);

    const wrap = parsed.holdings[7];
    expect(wrap.source).toBe("wrap_fund");
    expect(wrap.accountId).toBe("rakuten:ラップ");
    expect(wrap.accountName).toBe("楽ラップ");
    expect(wrap.quantity).toBe(131);
    expect(wrap.marketValueMinor).toBe(545);
    expect(wrap.bookValueMinor).toBe(520);

    const cash = parsed.holdings[8];
    expect(cash.source).toBe("wrap_cash");
    expect(cash.instrumentName).toBe("現金等");
    expect(cash.marketValueMinor).toBe(313);
    expect(cash.quantity).toBe(1);
  });

  it("throws on empty paste", () => {
    expect(() => parseRakutenPaste("")).toThrow(RakutenPasteError);
  });

  it("throws when no holdings found", () => {
    expect(() => parseRakutenPaste("種別\t銘柄\n前日比")).toThrow(RakutenPasteError);
  });
});

describe("matchRakutenInstrumentId", () => {
  it("matches by ticker first", () => {
    const id = matchRakutenInstrumentId(
      [
        { id: "a", name: "Other", ticker: "1489", accountId: "rakuten:特定" },
        { id: "b", name: "ＮＦ日経高配当５０", ticker: null, accountId: "rakuten:特定" },
      ],
      "ＮＦ日経高配当５０",
      { ticker: "1489", accountId: "rakuten:特定" },
    );
    expect(id).toBe("a");
  });

  it("prefers account-scoped instrument for same ticker", () => {
    const id = matchRakutenInstrumentId(
      [
        { id: "tokutei", name: "ＣＩＪ", ticker: "4826", accountId: "rakuten:特定" },
        { id: "ippan", name: "ＣＩＪ", ticker: "4826", accountId: "rakuten:一般" },
      ],
      "ＣＩＪ",
      { ticker: "4826", accountId: "rakuten:一般" },
    );
    expect(id).toBe("ippan");
  });

  it("matches by name when ticker missing", () => {
    const id = matchRakutenInstrumentId(
      [{ id: "b", name: "現金等", ticker: null, accountId: "rakuten:ラップ" }],
      "現金等",
      { accountId: "rakuten:ラップ" },
    );
    expect(id).toBe("b");
  });

  it("does not fuzzy-match similar wrap fund names", () => {
    const id = matchRakutenInstrumentId(
      [
        {
          id: "domestic",
          name: "【楽ラップ専用】たわらノーロード 国内株式＜ラップ専用＞",
          ticker: null,
          accountId: "rakuten:ラップ",
        },
      ],
      "【楽ラップ専用】たわらノーロード 先進国株式(為替ヘッジあり)＜ラップ専用＞",
      { accountId: "rakuten:ラップ" },
    );
    expect(id).toBeNull();
  });
});

describe("buildRakutenExternalId", () => {
  it("scopes ticker by account", () => {
    expect(buildRakutenExternalId("4826", "rakuten:特定")).toBe("4826__rakuten:特定");
    expect(buildRakutenExternalId("4826", "rakuten:一般")).toBe("4826__rakuten:一般");
  });

  it("includes name digest for wrap funds without ticker", () => {
    const left = buildRakutenExternalId(
      null,
      "rakuten:ラップ",
      "【楽ラップ専用】たわらノーロード 国内株式＜ラップ専用＞",
    );
    const right = buildRakutenExternalId(
      null,
      "rakuten:ラップ",
      "【楽ラップ専用】たわらノーロード 先進国株式(為替ヘッジあり)＜ラップ専用＞",
    );
    expect(left).not.toBe(right);
    expect(left.startsWith("n:")).toBe(true);
    expect(right.endsWith("__rakuten:ラップ")).toBe(true);
  });
});
