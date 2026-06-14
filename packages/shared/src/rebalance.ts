export type RebalanceRowInput = {
  key: string;
  marketValueMinor: number;
  targetRatio: number | null;
};

export type RebalanceMode = "full" | "deposit_only";

export type RebalanceInput = {
  rows: RebalanceRowInput[];
  depositMinor: number;
  mode: RebalanceMode;
  /** When set, ratios and target values use this as the portfolio denominator instead of row sum. */
  portfolioTotalMinor?: number;
};

export type RebalanceTradeRow = {
  key: string;
  currentRatio: number;
  targetRatio: number | null;
  gapRatio: number | null;
  targetMarketValueMinor: number | null;
  buyMinor: number;
  sellMinor: number;
};

export type RebalanceResult = {
  rows: RebalanceTradeRow[];
  totalBuyMinor: number;
  totalSellMinor: number;
  unallocatedDepositMinor: number;
};

function sumMarketValue(rows: RebalanceRowInput[]): number {
  let result = 0;
  for (const row of rows) {
    result += row.marketValueMinor;
  }
  return result;
}

function computeCurrentRatio(marketValueMinor: number, totalMinor: number): number {
  let result = 0;
  if (totalMinor > 0) {
    result = marketValueMinor / totalMinor;
  }
  return result;
}

export function distributeAmountProportionally(
  weights: Array<{ key: string; weight: number }>,
  amountMinor: number,
): Map<string, number> {
  let result = new Map<string, number>();

  if (amountMinor === 0 || weights.length === 0) {
    return result;
  }

  const totalWeight = weights.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight <= 0) {
    return result;
  }

  const absoluteAmount = Math.abs(amountMinor);
  const sign = amountMinor > 0 ? 1 : -1;
  let allocated = 0;

  for (let index = 0; index < weights.length; index += 1) {
    const item = weights[index]!;

    if (index === weights.length - 1) {
      result.set(item.key, sign * (absoluteAmount - allocated));
      continue;
    }

    const share = Math.round((item.weight / totalWeight) * absoluteAmount);
    result.set(item.key, sign * share);
    allocated += share;
  }

  return result;
}

export function distributeDepositProportionally(
  deficits: Array<{ key: string; deficitMinor: number }>,
  depositMinor: number,
): Map<string, number> {
  let result = new Map<string, number>();

  const totalDeficit = deficits.reduce((sum, item) => sum + item.deficitMinor, 0);
  if (totalDeficit <= 0 || depositMinor <= 0) {
    return result;
  }

  if (depositMinor >= totalDeficit) {
    for (const item of deficits) {
      result.set(item.key, item.deficitMinor);
    }
    return result;
  }

  let allocated = 0;
  for (let index = 0; index < deficits.length; index += 1) {
    const item = deficits[index]!;

    if (index === deficits.length - 1) {
      result.set(item.key, depositMinor - allocated);
      continue;
    }

    const share = Math.round((item.deficitMinor / totalDeficit) * depositMinor);
    result.set(item.key, share);
    allocated += share;
  }

  return result;
}

export function computeRebalanceTrades(input: RebalanceInput): RebalanceResult {
  let result: RebalanceResult = {
    rows: [],
    totalBuyMinor: 0,
    totalSellMinor: 0,
    unallocatedDepositMinor: 0,
  };

  const currentTotalMinor = sumMarketValue(input.rows);
  const ratioTotalMinor =
    input.portfolioTotalMinor !== undefined && input.portfolioTotalMinor > 0
      ? input.portfolioTotalMinor
      : currentTotalMinor;

  if (ratioTotalMinor <= 0 && input.depositMinor <= 0) {
    return result;
  }

  const effectiveTotalMinor = ratioTotalMinor + Math.max(0, input.depositMinor);
  const tradeRows: RebalanceTradeRow[] = [];

  if (input.mode === "deposit_only" && input.depositMinor > 0) {
    const deficits: Array<{ key: string; deficitMinor: number }> = [];

    for (const row of input.rows) {
      const currentRatio = computeCurrentRatio(row.marketValueMinor, ratioTotalMinor);
      let targetMarketValueMinor: number | null = null;
      let gapRatio: number | null = null;

      if (row.targetRatio !== null && Number.isFinite(row.targetRatio)) {
        targetMarketValueMinor = Math.round(effectiveTotalMinor * row.targetRatio);
        gapRatio = currentRatio - row.targetRatio;
        const deficitMinor = Math.max(0, targetMarketValueMinor - row.marketValueMinor);
        if (deficitMinor > 0) {
          deficits.push({ key: row.key, deficitMinor });
        }
      }

      tradeRows.push({
        key: row.key,
        currentRatio,
        targetRatio: row.targetRatio,
        gapRatio,
        targetMarketValueMinor,
        buyMinor: 0,
        sellMinor: 0,
      });
    }

    const buyByKey = distributeDepositProportionally(deficits, input.depositMinor);
    let totalBuyMinor = 0;

    for (const tradeRow of tradeRows) {
      const buyMinor = buyByKey.get(tradeRow.key) ?? 0;
      tradeRow.buyMinor = buyMinor;
      totalBuyMinor += buyMinor;
    }

    result = {
      rows: tradeRows,
      totalBuyMinor,
      totalSellMinor: 0,
      unallocatedDepositMinor: Math.max(0, input.depositMinor - totalBuyMinor),
    };
    return result;
  }

  let totalBuyMinor = 0;
  let totalSellMinor = 0;

  for (const row of input.rows) {
    const currentRatio = computeCurrentRatio(row.marketValueMinor, ratioTotalMinor);
    let targetMarketValueMinor: number | null = null;
    let gapRatio: number | null = null;
    let buyMinor = 0;
    let sellMinor = 0;

    if (row.targetRatio !== null && Number.isFinite(row.targetRatio)) {
      const rebalanceTotalMinor =
        input.depositMinor > 0 ? effectiveTotalMinor : ratioTotalMinor;
      targetMarketValueMinor = Math.round(rebalanceTotalMinor * row.targetRatio);
      gapRatio = currentRatio - row.targetRatio;
      const tradeMinor = targetMarketValueMinor - row.marketValueMinor;

      if (tradeMinor > 0) {
        buyMinor = tradeMinor;
        totalBuyMinor += buyMinor;
      } else if (tradeMinor < 0) {
        sellMinor = -tradeMinor;
        totalSellMinor += sellMinor;
      }
    }

    tradeRows.push({
      key: row.key,
      currentRatio,
      targetRatio: row.targetRatio,
      gapRatio,
      targetMarketValueMinor,
      buyMinor,
      sellMinor,
    });
  }

  result = {
    rows: tradeRows,
    totalBuyMinor,
    totalSellMinor,
    unallocatedDepositMinor: 0,
  };
  return result;
}
