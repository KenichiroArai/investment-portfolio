"use client";

import type { ImpliedAllocationTargetRow, TargetAllocationWeightDto } from "@repo/shared";
import { useMemo } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPercent, formatPercentPoint } from "@/lib/format-yen";
import { cn } from "@/lib/utils";

type ImpliedAllocationTargetsCardProps = {
  impliedRows: ImpliedAllocationTargetRow[];
  allocationTargets: TargetAllocationWeightDto[];
  schemeName: string;
};

export function ImpliedAllocationTargetsCard({
  impliedRows,
  allocationTargets,
  schemeName,
}: ImpliedAllocationTargetsCardProps) {
  const rows = useMemo(() => {
    let result: Array<{
      valueCode: string;
      valueName: string;
      impliedTargetRatio: number;
      allocationTargetRatio: number | null;
      gapRatio: number | null;
    }> = [];

    const impliedByCode = new Map(impliedRows.map((row) => [row.valueCode, row]));
    const allocationByCode = new Map(
      allocationTargets.map((target) => [target.valueCode, target.targetRatio]),
    );
    const allCodes = new Set([...impliedByCode.keys(), ...allocationByCode.keys()]);

    for (const valueCode of allCodes) {
      const implied = impliedByCode.get(valueCode);
      const allocationTargetRatio = allocationByCode.get(valueCode) ?? null;
      const impliedTargetRatio = implied?.impliedTargetRatio ?? 0;
      let gapRatio: number | null = null;

      if (allocationTargetRatio !== null) {
        gapRatio = impliedTargetRatio - allocationTargetRatio;
      }

      result.push({
        valueCode,
        valueName: implied?.valueName ?? valueCode,
        impliedTargetRatio,
        allocationTargetRatio,
        gapRatio,
      });
    }

    result.sort((left, right) => right.impliedTargetRatio - left.impliedTargetRatio);
    return result;
  }, [allocationTargets, impliedRows]);

  let result = (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">構成目標（銘柄合計）</CardTitle>
        <CardDescription>
          銘柄目標の合計から算出した構成比（{schemeName}）。保存済みの構成目標との差分も表示します。
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            銘柄目標が設定されていません。
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>分類</TableHead>
                <TableHead className="text-right">銘柄合計目標</TableHead>
                <TableHead className="text-right">構成目標</TableHead>
                <TableHead className="text-right">差分</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                let tableRow = (
                  <TableRow key={row.valueCode}>
                    <TableCell>{row.valueName}</TableCell>
                    <TableCell className="text-right">
                      {row.impliedTargetRatio > 0
                        ? formatPercent(row.impliedTargetRatio)
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.allocationTargetRatio !== null
                        ? formatPercent(row.allocationTargetRatio)
                        : "—"}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right",
                        row.gapRatio !== null && row.gapRatio > 0 ? "text-positive" : undefined,
                        row.gapRatio !== null && row.gapRatio < 0 ? "text-negative" : undefined,
                      )}
                    >
                      {row.gapRatio !== null ? formatPercentPoint(row.gapRatio) : "—"}
                    </TableCell>
                  </TableRow>
                );
                return tableRow;
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
  return result;
}
