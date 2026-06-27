"use client";

import type { HoldingLineDto } from "@repo/shared";
import { sumSnapshotMarketValue } from "@repo/shared";
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

export function TargetPortfolioSettingsCard({
  portfolioCode,
  lines,
  disabled,
}: TargetPortfolioSettingsCardProps) {
  const { weights, loading } = useTargetPortfolioWeights(portfolioCode);
  const [targetInputs, setTargetInputs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const sortedLines = useMemo(() => {
    let result = [...lines].sort((left, right) => {
      const leftOrder = left.sortOrder ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = right.sortOrder ?? Number.MAX_SAFE_INTEGER;
      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }
      return left.instrumentName.localeCompare(right.instrumentName, "ja");
    });
    return result;
  }, [lines]);

  useEffect(() => {
    let result: () => void = () => {};
    let cancelled = false;

    async function syncInputs() {
      let syncResult: void = undefined;

      if (cancelled || loading) {
        return syncResult;
      }

      const nextInputs: Record<string, string> = {};
      for (const line of sortedLines) {
        const weight = weights.find((item) => item.instrumentId === line.instrumentId);
        nextInputs[line.instrumentId] =
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
  }, [loading, sortedLines, weights]);

  const assetTotalMinor = useMemo(() => {
    let result = sumSnapshotMarketValue(lines);
    return result;
  }, [lines]);

  const currentRatioByInstrumentId = useMemo(() => {
    let result = new Map<string, number>();

    for (const line of sortedLines) {
      const currentRatio =
        assetTotalMinor > 0 ? line.marketValueMinor / assetTotalMinor : 0;
      result.set(line.instrumentId, currentRatio);
    }

    return result;
  }, [assetTotalMinor, sortedLines]);

  const handleSave = async (): Promise<void> => {
    let result: void = undefined;

    const targetWeights = sortedLines
      .map((line) => {
        const raw = targetInputs[line.instrumentId]?.trim() ?? "";
        if (raw === "") {
          return null;
        }
        const percent = Number.parseFloat(raw);
        if (!Number.isFinite(percent) || percent < 0) {
          return null;
        }
        return {
          instrumentId: line.instrumentId,
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

  const totalPercent = sortedLines.reduce((sum, line) => {
    const raw = targetInputs[line.instrumentId]?.trim() ?? "";
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
        {sortedLines.length === 0 ? (
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
                {sortedLines.map((line) => {
                  const currentRatio = currentRatioByInstrumentId.get(line.instrumentId) ?? 0;
                  let row = (
                    <TableRow key={line.instrumentId}>
                      <TableCell>{line.instrumentName}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {formatAllocationPercent(currentRatio)}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step={0.1}
                          value={targetInputs[line.instrumentId] ?? ""}
                          disabled={disabled || saving}
                          onChange={(event) => {
                            setTargetInputs((current) => ({
                              ...current,
                              [line.instrumentId]: event.target.value,
                            }));
                          }}
                          aria-label={`${line.instrumentName} の目標構成比`}
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
