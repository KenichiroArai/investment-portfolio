"use client";

import type { HoldingLineDto } from "@repo/shared";
import { sortHoldingLinesByPortfolioInstrumentOrder, sumSnapshotMarketValue } from "@repo/shared";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTargetPortfolioWeights } from "@/features/portfolio-allocation/useTargetPortfolioWeights";
import { replaceTargetPortfolioWeights } from "@/lib/api-client";
import { formatAllocationPercent } from "@/lib/format-yen";

type TargetPortfolioSettingsCardProps = {
  portfolioCode: string;
  lines: HoldingLineDto[];
  disabled: boolean;
};

type TargetInstrumentRow = {
  instrumentId: string;
  instrumentName: string;
  marketValueMinor: number;
};

export function TargetPortfolioSettingsCard({
  portfolioCode,
  lines,
  disabled,
}: TargetPortfolioSettingsCardProps) {
  const { weights, loading } = useTargetPortfolioWeights(portfolioCode);
  const [targetInputs, setTargetInputs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const sortedLines = useMemo(() => {
    let result = sortHoldingLinesByPortfolioInstrumentOrder(lines);
    return result;
  }, [lines]);

  const instrumentRows = useMemo(() => {
    let result: TargetInstrumentRow[] = [];

    const rowsByInstrumentId = new Map<string, TargetInstrumentRow>();
    for (const line of sortedLines) {
      const existing = rowsByInstrumentId.get(line.instrumentId);
      if (!existing) {
        rowsByInstrumentId.set(line.instrumentId, {
          instrumentId: line.instrumentId,
          instrumentName: line.instrumentName,
          marketValueMinor: line.marketValueMinor,
        });
        continue;
      }

      existing.marketValueMinor += line.marketValueMinor;
    }

    result = [...rowsByInstrumentId.values()];
    return result;
  }, [sortedLines]);

  useEffect(() => {
    let result: () => void = () => {};
    let cancelled = false;

    async function syncInputs() {
      let syncResult: void = undefined;

      if (cancelled || loading) {
        return syncResult;
      }

      const nextInputs: Record<string, string> = {};
      for (const instrumentRow of instrumentRows) {
        const weight = weights.find(
          (item) => item.instrumentId === instrumentRow.instrumentId,
        );
        nextInputs[instrumentRow.instrumentId] =
          weight !== undefined ? String(Math.round(weight.targetRatio * 1000) / 10) : "";
      }
      setTargetInputs(nextInputs);
      return syncResult;
    }

    void syncInputs();
    result = () => {
      cancelled = true;
    };
    return result;
  }, [instrumentRows, loading, weights]);

  const assetTotalMinor = useMemo(() => {
    let result = sumSnapshotMarketValue(lines);
    return result;
  }, [lines]);

  const currentRatioByInstrumentId = useMemo(() => {
    let result = new Map<string, number>();

    for (const line of instrumentRows) {
      const currentRatio =
        assetTotalMinor > 0 ? line.marketValueMinor / assetTotalMinor : 0;
      result.set(line.instrumentId, currentRatio);
    }

    return result;
  }, [assetTotalMinor, instrumentRows]);

  const handleSave = async (): Promise<void> => {
    let result: void = undefined;

    const targetWeights = instrumentRows
      .map((instrumentRow) => {
        const raw = targetInputs[instrumentRow.instrumentId]?.trim() ?? "";
        if (raw === "") {
          return null;
        }
        const percent = Number.parseFloat(raw);
        if (!Number.isFinite(percent) || percent < 0) {
          return null;
        }
        return {
          instrumentId: instrumentRow.instrumentId,
          targetRatio: percent / 100,
        };
      })
      .filter(
        (item): item is { instrumentId: string; targetRatio: number } => item !== null,
      );

    const total = targetWeights.reduce((sum, item) => sum + item.targetRatio, 0);
    if (total > 1.0001) {
      toast.error("目標構成比の合計が 100% を超えています。");
      return result;
    }

    setSaving(true);
    const response = await replaceTargetPortfolioWeights(portfolioCode, targetWeights);
    setSaving(false);

    if (!response.ok) {
      toast.error(response.message);
      return result;
    }

    toast.success("銘柄目標配分を保存しました。");
    return result;
  };

  const totalPercent = instrumentRows.reduce((sum, instrumentRow) => {
    const raw = targetInputs[instrumentRow.instrumentId]?.trim() ?? "";
    const percent = Number.parseFloat(raw);
    if (!Number.isFinite(percent) || percent < 0) {
      return sum;
    }
    return sum + percent;
  }, 0);

  let result = (
    <Card>
      <CardHeader>
        <CardTitle>銘柄目標配分</CardTitle>
        <CardDescription>
          保有銘柄ごとの目標構成比（%）を設定します。ポートフォリオ配分画面のギャップ表示と売買試算に使います。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {instrumentRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">保有明細がありません。</p>
        ) : loading ? (
          <p className="text-sm text-muted-foreground">読み込み中…</p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>銘柄</TableHead>
                  <TableHead className="w-[6rem] text-right">現状（%）</TableHead>
                  <TableHead className="w-[8rem]">目標（%）</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {instrumentRows.map((instrumentRow) => {
                  const currentRatio =
                    currentRatioByInstrumentId.get(instrumentRow.instrumentId) ?? 0;
                  let row = (
                    <TableRow key={instrumentRow.instrumentId}>
                      <TableCell>{instrumentRow.instrumentName}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {formatAllocationPercent(currentRatio)}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step={0.1}
                          value={targetInputs[instrumentRow.instrumentId] ?? ""}
                          disabled={disabled || saving}
                          onChange={(event) => {
                            setTargetInputs((current) => ({
                              ...current,
                              [instrumentRow.instrumentId]: event.target.value,
                            }));
                          }}
                          aria-label={`${instrumentRow.instrumentName} の目標構成比`}
                        />
                      </TableCell>
                    </TableRow>
                  );
                  return row;
                })}
              </TableBody>
            </Table>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                合計: {formatAllocationPercent(totalPercent / 100)}
                {totalPercent > 100 ? "（100% を超えています）" : null}
              </p>
              <Button
                type="button"
                disabled={disabled || saving}
                onClick={() => {
                  void handleSave();
                }}
              >
                目標配分を保存
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
  return result;
}
