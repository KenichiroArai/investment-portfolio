"use client";

import Link from "next/link";
import {
  computeSnapshotGainRate,
  computeSnapshotPortfolioGainMinor,
  resolveSnapshotTotalContributions,
  sumSnapshotMarketValue,
} from "@repo/shared";
import type { ReactNode } from "react";

import { OverviewTrendChart } from "@/features/trends/OverviewTrendChart";
import { usePortfolioTime } from "@/features/portfolio/PortfolioTimeContext";
import {
  formatAsOfDateJa,
  formatPercent,
  formatYen,
} from "@/lib/format-yen";

type PortfolioOverviewViewProps = {
  portfolioCode: string;
};

const GAIN_RATE_ON_CONTRIBUTIONS_HINT = "損益 ÷ 拠出金累計";
const GAIN_RATE_ON_ASSET_BALANCE_HINT = "損益 ÷ 資産残高";

type AssetStatusFieldProps = {
  label: string;
  value: string;
  labelHint?: string;
};

function AssetStatusField({ label, value, labelHint }: AssetStatusFieldProps) {
  let labelNode: ReactNode = label;

  if (labelHint) {
    labelNode = (
      <span className="asset-status__label-hint" tabIndex={0}>
        {label}
        <span className="asset-status__hint-popup" role="tooltip">
          {labelHint}
        </span>
      </span>
    );
  }

  let result = (
    <div className="asset-status__field">
      <div className="asset-status__label">{labelNode}</div>
      <div className="asset-status__value">{value}</div>
    </div>
  );
  return result;
}

export function PortfolioOverviewView({
  portfolioCode,
}: PortfolioOverviewViewProps) {
  const {
    snapshot,
    loadingSnapshot,
    loadingDates,
    error,
    selectedAsOfDate,
    isHistoricalView,
    currentAsOfDate,
    trends,
  } = usePortfolioTime();

  let result: ReactNode = null;

  if (loadingDates || loadingSnapshot) {
    result = (
      <main>
        <p>読み込み中…</p>
      </main>
    );
    return result;
  }

  if (error) {
    result = (
      <main>
        <h1>{portfolioCode}</h1>
        <p className="holdings-error">{error}</p>
      </main>
    );
    return result;
  }

  if (!snapshot) {
    result = (
      <main>
        <h1>{portfolioCode}</h1>
        <p className="holdings-error">明細がありません。</p>
      </main>
    );
    return result;
  }

  const assetBalance = sumSnapshotMarketValue(snapshot.lines);
  const totalContributions = resolveSnapshotTotalContributions(snapshot);
  const portfolioGain = computeSnapshotPortfolioGainMinor(
    assetBalance,
    totalContributions,
  );
  const gainRateOnContributions = computeSnapshotGainRate(
    portfolioGain,
    totalContributions,
  );
  const gainRateOnAssetBalance = computeSnapshotGainRate(
    portfolioGain,
    assetBalance,
  );
  const gainRateOnContributionsLabel =
    gainRateOnContributions === null
      ? "—"
      : formatPercent(gainRateOnContributions);
  const gainRateOnAssetBalanceLabel =
    gainRateOnAssetBalance === null
      ? "—"
      : formatPercent(gainRateOnAssetBalance);

  const latestPoint =
    trends?.points.find((point) => point.asOfDate === currentAsOfDate) ??
    trends?.points[trends.points.length - 1];
  const deltaHint =
    isHistoricalView && latestPoint
      ? `最新比 評価額 ${formatYen(latestPoint.totalMarketValueMinor - assetBalance)}`
      : null;

  result = (
    <main className="portfolio-overview">
      <h1 className="asset-status__title">資産状況</h1>
      <div className="asset-status__banner">
        資産状況 {formatAsOfDateJa(selectedAsOfDate ?? snapshot.asOfDate)}
        {isHistoricalView ? "（履歴）" : " 現在"}
      </div>
      {deltaHint ? <p className="overview-delta-hint">{deltaHint}</p> : null}
      <section className="asset-status__panel" aria-label="資産状況サマリー">
        <div className="asset-status__row">
          <AssetStatusField
            label="資産残高"
            value={formatYen(assetBalance)}
          />
          <AssetStatusField
            label="拠出金累計"
            value={formatYen(totalContributions)}
          />
        </div>
        <div className="asset-status__row">
          <AssetStatusField label="損益" value={formatYen(portfolioGain)} />
          <AssetStatusField
            label="損益率"
            value={gainRateOnContributionsLabel}
            labelHint={GAIN_RATE_ON_CONTRIBUTIONS_HINT}
          />
        </div>
        <div className="asset-status__row">
          <AssetStatusField
            label="利益率"
            value={gainRateOnAssetBalanceLabel}
            labelHint={GAIN_RATE_ON_ASSET_BALANCE_HINT}
          />
        </div>
      </section>
      <OverviewTrendChart />
      <nav className="overview-links" aria-label="クイックリンク">
        <ul>
          <li>
            <Link href={`/portfolios/${portfolioCode}/holdings/`}>明細を見る</Link>
          </li>
          <li>
            <Link href={`/portfolios/${portfolioCode}/analysis/`}>資産配分を見る</Link>
          </li>
          <li>
            <Link href={`/portfolios/${portfolioCode}/trends/`}>推移を見る</Link>
          </li>
        </ul>
      </nav>
    </main>
  );
  return result;
}
