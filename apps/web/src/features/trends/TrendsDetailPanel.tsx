"use client";

import { useState, type ReactNode } from "react";

import { getAllocationChartColor } from "@/features/analysis/chart-colors";
import { TrendLineChart } from "@/features/trends/TrendLineChart";
import { formatAsOfDateJa, formatPercent, formatYen } from "@/lib/format-yen";
import { usePortfolioTime } from "@/features/portfolio/PortfolioTimeContext";

export function TrendsDetailPanel() {
  const { trends, loadingTrends, snapshot } = usePortfolioTime();
  const [selectedSchemeCode, setSelectedSchemeCode] = useState("");

  let result: ReactNode = null;

  if (loadingTrends) {
    result = <p className="trend-chart__loading">推移を読み込み中…</p>;
    return result;
  }

  if (!trends || trends.points.length === 0) {
    result = (
      <p className="trend-chart__empty">
        選択した期間に推移データがありません。期間を広げてください。
      </p>
    );
    return result;
  }

  const labels = trends.points.map((point) => formatAsOfDateJa(point.asOfDate));
  const schemeCodes = snapshot?.analysisSchemes ?? [];
  const activeSchemeCode =
    selectedSchemeCode !== ""
      ? selectedSchemeCode
      : (schemeCodes[0]?.schemeCode ?? "");
  const activeScheme = schemeCodes.find(
    (scheme) => scheme.schemeCode === activeSchemeCode,
  );

  const allocationSeries = (() => {
    let seriesResult: Array<{
      key: string;
      label: string;
      color: string;
      values: Array<number | null>;
      formatValue?: (value: number) => string;
    }> = [];
    const valueCodes = new Set<string>();
    for (const point of trends.points) {
      const slices = point.allocationsByScheme[activeSchemeCode] ?? [];
      for (const slice of slices) {
        valueCodes.add(slice.valueCode);
      }
    }
    let colorIndex = 0;
    for (const valueCode of valueCodes) {
      const firstSlice = trends.points
        .flatMap((point) => point.allocationsByScheme[activeSchemeCode] ?? [])
        .find((slice) => slice.valueCode === valueCode);
      if (!firstSlice) {
        continue;
      }
      seriesResult.push({
        key: valueCode,
        label: firstSlice.valueName,
        color: getAllocationChartColor(colorIndex),
        values: trends.points.map((point) => {
          const slice = (point.allocationsByScheme[activeSchemeCode] ?? []).find(
            (item) => item.valueCode === valueCode,
          );
          return slice ? slice.ratio : null;
        }),
        formatValue: (value) => formatPercent(value),
      });
      colorIndex += 1;
    }
    return seriesResult;
  })();

  result = (
    <div className="trends-detail">
      <section className="trends-detail__section">
        <h2>総資産・損益</h2>
        <TrendLineChart
          labels={labels}
          series={[
            {
              key: "market-value",
              label: "評価額",
              color: "#2563eb",
              values: trends.points.map((point) => point.totalMarketValueMinor),
              formatValue: (value) => formatYen(value),
            },
            {
              key: "gain",
              label: "評価損益",
              color: "#16a34a",
              values: trends.points.map((point) => point.unrealizedGainMinor),
              formatValue: (value) => formatYen(value),
            },
          ]}
        />
      </section>

      <section className="trends-detail__section">
        <h2>利益率</h2>
        <TrendLineChart
          labels={labels}
          series={[
            {
              key: "gain-rate-book",
              label: "簿価ベース利益率",
              color: "#7c3aed",
              values: trends.points.map((point) => point.gainRateOnBook),
              formatValue: (value) => formatPercent(value),
            },
            {
              key: "gain-rate-contributions",
              label: "拠出金ベース利益率",
              color: "#ea580c",
              values: trends.points.map((point) => point.gainRateOnContributions),
              formatValue: (value) => formatPercent(value),
            },
          ]}
        />
      </section>

      {schemeCodes.length > 0 ? (
        <section className="trends-detail__section">
          <h2>分析軸別構成比</h2>
          <div className="analysis-axis-tabs" role="tablist" aria-label="分析軸">
            {schemeCodes.map((scheme) => {
              let tab = (
                <button
                  key={scheme.schemeCode}
                  type="button"
                  role="tab"
                  aria-selected={scheme.schemeCode === activeSchemeCode}
                  className={
                    scheme.schemeCode === activeSchemeCode ? "is-active" : undefined
                  }
                  onClick={() => {
                    setSelectedSchemeCode(scheme.schemeCode);
                  }}
                >
                  {scheme.schemeName}
                </button>
              );
              return tab;
            })}
          </div>
          {activeScheme ? (
            <p className="trends-detail__scheme-label">{activeScheme.schemeName}</p>
          ) : null}
          <TrendLineChart labels={labels} series={allocationSeries} height={240} />
        </section>
      ) : null}
    </div>
  );
  return result;
}
