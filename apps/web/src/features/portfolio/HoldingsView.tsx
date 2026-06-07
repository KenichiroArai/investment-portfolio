"use client";

import {
  collectHoldingsClassificationSchemes,
  type CurrentSnapshotDto,
} from "@repo/shared";
import { useEffect, useState, type ReactNode } from "react";

import { HoldingsDetailTable } from "@/features/holdings/HoldingsDetailTable";
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
        <HoldingsDetailTable
          lines={snapshot.lines}
          classificationSchemes={collectHoldingsClassificationSchemes(
            snapshot.analysisSchemes,
            snapshot.lines,
          )}
        />
      )}
    </section>
  );
  return result;
}
