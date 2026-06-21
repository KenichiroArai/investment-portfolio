"use client";

import type { PortfolioCompositionGapRow, TargetAllocationWeightDto } from "@repo/shared";
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
import { formatAllocationPercent, formatAllocationPercentPoint } from "@/lib/format-yen";
import { cn } from "@/lib/utils";

type ImpliedAllocationTargetsCardProps = {
  gapRows: PortfolioCompositionGapRow[];
  allocationTargets: TargetAllocationWeightDto[];
  schemeName: string;
};

export function ImpliedAllocationTargetsCard({
  gapRows,
  allocationTargets,
  schemeName,
}: ImpliedAllocationTargetsCardProps) {
  const rows = useMemo(() => {
    let result: Array<
      PortfolioCompositionGapRow & {
        allocationTargetRatio: number | null;
      }
    > = [];

    const allocationByCode = new Map(
      allocationTargets.map((target) => [target.valueCode, target.targetRatio]),
    );

    for (const row of gapRows) {
      result.push({
        ...row,
        allocationTargetRatio: allocationByCode.get(row.valueCode) ?? null,
      });
    }

    return result;
  }, [allocationTargets, gapRows]);

  const hasPortfolioTargets = rows.some((row) => row.targetRatio !== null);

  let result = (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">構成比目標</CardTitle>
        <CardDescription>
          銘柄目標の合計から導出した構成比目標（{schemeName}）。現状との差分を表示します。資産配分目標は参考です。
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasPortfolioTargets ? (
          <p className="text-sm text-muted-foreground">
            銘柄目標が設定されていません。
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>分類</TableHead>
                <TableHead className="text-right">現状</TableHead>
                <TableHead className="text-right">構成比目標</TableHead>
                <TableHead className="text-right">差分</TableHead>
                <TableHead className="text-right">資産配分目標</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                let tableRow = (
                  <TableRow key={row.valueCode}>
                    <TableCell>{row.valueName}</TableCell>
                    <TableCell className="text-right">
                      {formatAllocationPercent(row.currentRatio)}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.targetRatio !== null
                        ? formatAllocationPercent(row.targetRatio)
                        : "—"}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right",
                        row.gapRatio !== null && row.gapRatio > 0 ? "text-positive" : undefined,
                        row.gapRatio !== null && row.gapRatio < 0 ? "text-negative" : undefined,
                      )}
                    >
                      {row.gapRatio !== null ? formatAllocationPercentPoint(row.gapRatio) : "—"}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {row.allocationTargetRatio !== null
                        ? formatAllocationPercent(row.allocationTargetRatio)
                        : "—"}
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
