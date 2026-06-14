"use client";

import type { ClassificationSchemeWithValuesDto } from "@repo/shared";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

type TargetAllocationSettingsCardProps = {
  portfolioCode: string;
  schemes: ClassificationSchemeWithValuesDto[];
  disabled: boolean;
};

export function TargetAllocationSettingsCard({
  portfolioCode,
  schemes,
  disabled,
}: TargetAllocationSettingsCardProps) {
  const [targetSchemeId, setTargetSchemeId] = useState("");
  const [targetInputs, setTargetInputs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const effectiveSchemeId =
    targetSchemeId !== "" ? targetSchemeId : (schemes[0]?.id ?? "");
  const selectedScheme =
    schemes.find((scheme) => scheme.id === effectiveSchemeId) ?? null;

  useEffect(() => {
    let result: () => void = () => {};
    let cancelled = false;

    async function load() {
      let loadResult: void = undefined;

      if (!selectedScheme) {
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

      const weights = response.data[selectedScheme.code] ?? [];
      const nextInputs: Record<string, string> = {};
      for (const value of selectedScheme.values) {
        const weight = weights.find((item) => item.valueCode === value.code);
        nextInputs[value.code] =
          weight !== undefined ? String(Math.round(weight.targetRatio * 1000) / 10) : "";
      }
      setTargetInputs(nextInputs);
      return loadResult;
    }

    void load();
    result = () => {
      cancelled = true;
    };
    return result;
  }, [portfolioCode, selectedScheme]);

  const handleSave = async (): Promise<void> => {
    let result: void = undefined;

    if (!selectedScheme) {
      return result;
    }

    const weights = selectedScheme.values
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
    const response = await replaceTargetAllocations(
      portfolioCode,
      selectedScheme.code,
      weights,
    );
    setSaving(false);

    if (!response.ok) {
      toast.error(response.message);
      return result;
    }

    toast.success("目標配分を保存しました。");
    return result;
  };

  const totalPercent = selectedScheme
    ? selectedScheme.values.reduce((sum, value) => {
        const raw = targetInputs[value.code]?.trim() ?? "";
        const percent = Number.parseFloat(raw);
        if (!Number.isFinite(percent) || percent < 0) {
          return sum;
        }
        return sum + percent;
      }, 0)
    : 0;

  let result = (
    <Card>
      <CardHeader>
        <CardTitle>目標配分</CardTitle>
        <CardDescription>
          分析軸ごとに分類値の目標構成比（%）を設定します。資産配分画面で現状との差分を表示します。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {schemes.length === 0 ? (
          <p className="text-sm text-muted-foreground">分析軸を登録してから目標配分を設定できます。</p>
        ) : (
          <>
            <FormField label="分析軸" htmlFor="target-scheme">
              <Select
                value={selectedScheme?.id ?? ""}
                onValueChange={(value) => {
                  setTargetSchemeId(value);
                }}
              >
                <SelectTrigger id="target-scheme">
                  <SelectValue placeholder="分析軸を選択" />
                </SelectTrigger>
                <SelectContent>
                  {schemes.map((scheme) => {
                    let item = (
                      <SelectItem key={scheme.id} value={scheme.id}>
                        {scheme.name}
                      </SelectItem>
                    );
                    return item;
                  })}
                </SelectContent>
              </Select>
            </FormField>
            {loading ? (
              <p className="text-sm text-muted-foreground">読み込み中…</p>
            ) : selectedScheme ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>分類</TableHead>
                    <TableHead className="w-[8rem]">目標（%）</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedScheme.values.map((value) => {
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
            ) : null}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                合計: {formatAllocationPercent(totalPercent / 100)}
                {totalPercent > 100 ? "（100% を超えています）" : null}
              </p>
              <Button
                type="button"
                disabled={disabled || saving || !selectedScheme}
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
