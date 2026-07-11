"use client";

import type { ClassificationValueDto } from "@repo/shared";
import Link from "next/link";
import { useEffect, useState } from "react";
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
import { fetchTargetAllocations, replaceTargetAllocations } from "@/lib/api-client";
import { formatAllocationPercent } from "@/lib/format-yen";
import { buildPortfolioPath } from "@/lib/portfolio-path";

type TargetAllocationEditCardProps = {
  portfolioCode: string;
  schemeCode: string;
  values: ClassificationValueDto[];
  disabled: boolean;
  onSaved?: () => void;
};

export function TargetAllocationEditCard({
  portfolioCode,
  schemeCode,
  values,
  disabled,
  onSaved,
}: TargetAllocationEditCardProps) {
  const [targetInputs, setTargetInputs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let result: () => void = () => {};
    let cancelled = false;

    async function load() {
      let loadResult: void = undefined;

      if (schemeCode === "" || values.length === 0) {
        setTargetInputs({});
        return loadResult;
      }

      setLoading(true);
      const response = await fetchTargetAllocations(portfolioCode);

      if (cancelled) {
        return loadResult;
      }

      setLoading(false);

      if (!response.ok) {
        setTargetInputs({});
        return loadResult;
      }

      const weights = response.data[schemeCode] ?? [];
      const nextInputs: Record<string, string> = {};
      for (const value of values) {
        const weight = weights.find((item) => item.valueCode === value.code);
        nextInputs[value.code] =
          weight !== undefined ? String(Math.round(weight.targetRatio * 10000) / 100) : "";
      }
      setTargetInputs(nextInputs);
      return loadResult;
    }

    void load();
    result = () => {
      cancelled = true;
    };
    return result;
  }, [portfolioCode, schemeCode, values]);

  const handleSave = async (): Promise<void> => {
    let result: void = undefined;

    if (schemeCode === "" || values.length === 0) {
      return result;
    }

    const weights = values
      .map((value) => {
        const raw = targetInputs[value.code]?.trim() ?? "";
        if (raw === "") {
          return null;
        }
        const percent = Number.parseFloat(raw);
        if (!Number.isFinite(percent) || percent < 0) {
          return null;
        }
        return {
          valueCode: value.code,
          targetRatio: percent / 100,
        };
      })
      .filter((item): item is { valueCode: string; targetRatio: number } => item !== null);

    const total = weights.reduce((sum, item) => sum + item.targetRatio, 0);
    if (total > 1.0001) {
      toast.error("目標構成比の合計が 100% を超えています。");
      return result;
    }

    setSaving(true);
    const response = await replaceTargetAllocations(portfolioCode, schemeCode, weights);
    setSaving(false);

    if (!response.ok) {
      toast.error(response.message);
      return result;
    }

    toast.success("目標配分を保存しました。");
    onSaved?.();
    return result;
  };

  const totalPercent = values.reduce((sum, value) => {
    const raw = targetInputs[value.code]?.trim() ?? "";
    const percent = Number.parseFloat(raw);
    if (!Number.isFinite(percent) || percent < 0) {
      return sum;
    }
    return sum + percent;
  }, 0);

  let result = (
    <Card>
      <CardHeader>
        <CardTitle>目標配分</CardTitle>
        <CardDescription>
          分類値の目標構成比（%）を設定します。上の構成比チャートで現状との差分を確認できます。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {values.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            カテゴリ値を登録してから目標配分を設定できます。{" "}
            <Link
              href={buildPortfolioPath(portfolioCode, "settings", "classification")}
              className="underline underline-offset-4"
            >
              分類設定へ
            </Link>
          </p>
        ) : loading ? (
          <p className="text-sm text-muted-foreground">読み込み中…</p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>分類</TableHead>
                  <TableHead className="w-[8rem]">目標（%）</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {values.map((value) => {
                  let row = (
                    <TableRow key={value.id}>
                      <TableCell>{value.name}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step={0.1}
                          value={targetInputs[value.code] ?? ""}
                          disabled={disabled || saving}
                          onChange={(event) => {
                            setTargetInputs((current) => ({
                              ...current,
                              [value.code]: event.target.value,
                            }));
                          }}
                          aria-label={`${value.name} の目標構成比`}
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
