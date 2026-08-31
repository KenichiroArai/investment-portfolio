import type { HoldingLineMetricInput } from "./holding-line-metrics";
import type { PortfolioSnapshotMetricDto, PortfolioSnapshotMetricInput } from "./portfolio-snapshot-metrics";
import { distributeAmountProportionally } from "./rebalance";
import type { HoldingLineInput } from "./schemas";
import {
  resolveSbiWrapProductCodeFromAccountId,
  SBI_WRAP_PRODUCT_VALUES,
  type SbiWrapProductCode,
} from "./sbi-wrap-analysis";

/** 商品ごとの購入金額を portfolio_snapshot_metrics に載せるときの code 接頭辞 */
export const SBI_WRAP_PRODUCT_COST_METRIC_PREFIX = "sbi_wrap_product_cost_";

const UNREALIZED_GAIN_MINOR_CODE = "unrealized_gain_minor";
const UNREALIZED_GAIN_RATE_CODE = "unrealized_gain_rate";

export function buildSbiWrapProductCostMetricCode(
  productCode: SbiWrapProductCode,
): string {
  let result = `${SBI_WRAP_PRODUCT_COST_METRIC_PREFIX}${productCode}`;
  return result;
}

export function listSbiWrapProductCostMetricCodes(): string[] {
  let result = SBI_WRAP_PRODUCT_VALUES.map((product) =>
    buildSbiWrapProductCostMetricCode(product.code),
  );
  return result;
}

export function parseSbiWrapProductCodeFromCostMetric(
  metricCode: string,
): SbiWrapProductCode | null {
  let result: SbiWrapProductCode | null = null;

  if (!metricCode.startsWith(SBI_WRAP_PRODUCT_COST_METRIC_PREFIX)) {
    return result;
  }

  const productCode = metricCode.slice(SBI_WRAP_PRODUCT_COST_METRIC_PREFIX.length);
  const matched = SBI_WRAP_PRODUCT_VALUES.find((item) => item.code === productCode);
  if (!matched) {
    return result;
  }

  result = matched.code;
  return result;
}

export function resolveSbiWrapProductCostMetricLabel(metricCode: string): string {
  let result = metricCode;
  const productCode = parseSbiWrapProductCodeFromCostMetric(metricCode);
  if (!productCode) {
    return result;
  }

  const product = SBI_WRAP_PRODUCT_VALUES.find((item) => item.code === productCode);
  /* v8 ignore start */
  if (!product) {
    return result;
  }
  /* v8 ignore stop */

  result = `${product.name} 購入金額`;
  return result;
}

export function readSbiWrapProductCostsFromMetrics(
  metrics: Array<PortfolioSnapshotMetricDto | PortfolioSnapshotMetricInput>,
): Partial<Record<SbiWrapProductCode, number>> {
  let result: Partial<Record<SbiWrapProductCode, number>> = {};

  for (const metric of metrics) {
    const productCode = parseSbiWrapProductCodeFromCostMetric(metric.code);
    if (!productCode) {
      continue;
    }
    if (metric.integerValue === null || metric.integerValue === undefined) {
      continue;
    }
    result[productCode] = metric.integerValue;
  }

  return result;
}

export function buildSbiWrapProductCostMetricInputs(
  productCostByCode: Partial<Record<SbiWrapProductCode, number>>,
): PortfolioSnapshotMetricInput[] {
  let result: PortfolioSnapshotMetricInput[] = [];

  for (const product of SBI_WRAP_PRODUCT_VALUES) {
    const cost = productCostByCode[product.code];
    if (cost === undefined) {
      continue;
    }
    result.push({
      code: buildSbiWrapProductCostMetricCode(product.code),
      integerValue: cost,
    });
  }

  return result;
}

function upsertHoldingLineMetrics(
  metrics: HoldingLineMetricInput[] | undefined,
  nextMetrics: HoldingLineMetricInput[],
): HoldingLineMetricInput[] {
  let result = [...(metrics ?? [])];

  for (const next of nextMetrics) {
    result = result.filter((item) => item.code !== next.code);
    result.push(next);
  }

  return result;
}

function distributeBookValuesForAccount(
  weights: Array<{ key: string; weight: number }>,
  amountMinor: number,
): Map<string, number> {
  let result = new Map<string, number>();

  /* v8 ignore start */
  if (weights.length === 0) {
    return result;
  }
  /* v8 ignore stop */

  if (amountMinor === 0) {
    for (const item of weights) {
      result.set(item.key, 0);
    }
    return result;
  }

  result = distributeAmountProportionally(weights, amountMinor);
  return result;
}

/**
 * 商品ごとの購入金額を、同一 account_id 内の評価額比率で book_value_minor と損益メトリクスへ按分する。
 * productCostByCode に無い商品の行は変更しない。
 */
export function applySbiWrapProductCostsToHoldingInputs(
  lines: HoldingLineInput[],
  productCostByCode: Partial<Record<SbiWrapProductCode, number>>,
): HoldingLineInput[] {
  let result: HoldingLineInput[] = lines.map((line) => ({
    ...line,
    metrics: line.metrics ? [...line.metrics] : undefined,
  }));

  result = applySbiWrapProductCostsToLines(result, productCostByCode);
  return result;
}

type LineWithBookAndMetrics = {
  accountId: string;
  marketValueMinor: number;
  bookValueMinor?: number | null;
  metrics?: HoldingLineMetricInput[] | null;
};

/**
 * HoldingLineDto / HoldingLineInput 共通の按分。読み取り時の表示解決にも使う。
 */
export function applySbiWrapProductCostsToLines<T extends LineWithBookAndMetrics>(
  lines: T[],
  productCostByCode: Partial<Record<SbiWrapProductCode, number>>,
): T[] {
  let result: T[] = lines.map((line) => ({
    ...line,
    metrics: line.metrics ? [...line.metrics] : line.metrics,
  }));

  const indicesByAccount = new Map<string, number[]>();
  for (let index = 0; index < result.length; index += 1) {
    const accountId = result[index]!.accountId;
    const indices = indicesByAccount.get(accountId) ?? [];
    indices.push(index);
    indicesByAccount.set(accountId, indices);
  }

  for (const [accountId, indices] of indicesByAccount) {
    const productCode = resolveSbiWrapProductCodeFromAccountId(accountId);
    if (!productCode) {
      continue;
    }

    const cost = productCostByCode[productCode];
    if (cost === undefined) {
      continue;
    }

    const weights = indices.map((index) => ({
      key: String(index),
      weight: result[index]!.marketValueMinor,
    }));
    const bookByKey = distributeBookValuesForAccount(weights, cost);

    for (const index of indices) {
      const bookValueMinor = bookByKey.get(String(index));
      if (bookValueMinor === undefined) {
        continue;
      }

      const line = result[index]!;
      const gainMinor = line.marketValueMinor - bookValueMinor;
      let gainRate: number | null = null;
      if (bookValueMinor !== 0) {
        gainRate = gainMinor / bookValueMinor;
      }

      const nextMetrics = upsertHoldingLineMetrics(
        line.metrics ?? undefined,
        [
          {
            code: UNREALIZED_GAIN_MINOR_CODE,
            integerValue: gainMinor,
          },
          {
            code: UNREALIZED_GAIN_RATE_CODE,
            realValue: gainRate,
          },
        ],
      ).map((metric) => ({
        code: metric.code,
        integerValue: metric.integerValue ?? null,
        realValue: metric.realValue ?? null,
        textValue: metric.textValue ?? null,
      }));

      result[index] = {
        ...line,
        bookValueMinor,
        metrics: nextMetrics as T["metrics"],
      };
    }
  }

  return result;
}
