"use client";

import type { CurrentSnapshotDto } from "@repo/shared";
import { useEffect, useState, type ReactNode } from "react";

import {
  getSnapshotFetchUrl,
  getSnapshotLoadErrorMessage,
} from "@/lib/data-source";

type HoldingsViewProps = {
  portfolioCode: string;
};

export function noopEffectCleanup(): void {
  let result: void = undefined;
  return result;
}

function formatYen(minor: number): string {
  let result = new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(minor);
  return result;
}

function formatTags(
  tags: CurrentSnapshotDto["lines"][number]["tags"],
): string {
  let result = "";

  if (tags.length === 0) {
    result = "—";
    return result;
  }

  result = tags
    .map((tag) => {
      let result = `${tag.schemeName}: ${tag.valueName}`;
      return result;
    })
    .join(" / ");
  return result;
}

export function HoldingsView({ portfolioCode }: HoldingsViewProps) {
  const [snapshot, setSnapshot] = useState<CurrentSnapshotDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let result: () => void = noopEffectCleanup;
    let cancelled = false;

    async function load() {
      let result: void = undefined;

      setLoading(true);
      setError(null);
      const url = getSnapshotFetchUrl(portfolioCode);
      try {
        const response = await fetch(url);
        if (cancelled) {
          return result;
        }
        if (response.status === 404) {
          setSnapshot(null);
          setError("明細がまだ登録されていません。");
          return result;
        }
        if (!response.ok) {
          setError("データの取得に失敗しました。");
          return result;
        }
        const data = (await response.json()) as CurrentSnapshotDto;
        setSnapshot(data);
      } catch {
        if (!cancelled) {
          setError(getSnapshotLoadErrorMessage());
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }

      return result;
    }

    void load();

    result = () => {
      cancelled = true;
    };
    return result;
  }, [portfolioCode]);

  let result: ReactNode = null;

  if (loading) {
    result = <p>読み込み中…</p>;
    return result;
  }

  if (error) {
    result = <p className="holdings-error">{error}</p>;
    return result;
  }

  if (!snapshot) {
    result = <p className="holdings-error">明細がありません。</p>;
    return result;
  }

  result = (
    <section className="holdings">
      <h1>
        {snapshot.portfolioName}（{snapshot.portfolioCode}）
      </h1>
      <p className="holdings-meta">基準日: {snapshot.asOfDate}</p>
      {snapshot.lines.length === 0 ? (
        <p>保有銘柄がありません。</p>
      ) : (
        <table className="holdings-table">
          <thead>
            <tr>
              <th>銘柄</th>
              <th>口数</th>
              <th>評価額</th>
              <th>分類タグ</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.lines.map((line) => {
              let result = (
                <tr key={line.id}>
                  <td>{line.instrumentName}</td>
                  <td>{line.quantity}</td>
                  <td>{formatYen(line.marketValueMinor)}</td>
                  <td>{formatTags(line.tags)}</td>
                </tr>
              );
              return result;
            })}
          </tbody>
        </table>
      )}
    </section>
  );
  return result;
}
