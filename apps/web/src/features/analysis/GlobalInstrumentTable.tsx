"use client";

import type { GlobalInstrumentRow } from "@repo/shared";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Fragment, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatAllocationPercent,
  formatPercent,
  formatYen,
} from "@/lib/format-yen";
import { cn } from "@/lib/utils";

type GlobalInstrumentTableProps = {
  rows: GlobalInstrumentRow[];
};

function formatNullableYen(value: number | null): string {
  let result = "—";

  if (value !== null && Number.isFinite(value)) {
    result = formatYen(value);
  }

  return result;
}

function formatNullableRate(value: number | null): string {
  let result = "—";

  if (value !== null && Number.isFinite(value)) {
    result = formatPercent(value);
  }

  return result;
}

export function GlobalInstrumentTable({ rows }: GlobalInstrumentTableProps) {
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);

  function handleToggle(instrumentKey: string): void {
    let result: void = undefined;
    setExpandedKeys((current) => {
      let next: string[] = [];

      if (current.includes(instrumentKey)) {
        next = current.filter((key) => key !== instrumentKey);
      } else {
        next = [...current, instrumentKey];
      }

      return next;
    });
    return result;
  }

  let result: ReactNode = (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10" />
            <TableHead>銘柄</TableHead>
            <TableHead className="text-right">評価額</TableHead>
            <TableHead className="text-right">構成比</TableHead>
            <TableHead className="text-right">含み損益</TableHead>
            <TableHead className="text-right">損益率</TableHead>
            <TableHead className="text-right">口座数</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const isExpanded = expandedKeys.includes(row.instrumentKey);
            const gainClassName =
              row.unrealizedGainMinor === null
                ? undefined
                : row.unrealizedGainMinor >= 0
                  ? "text-positive"
                  : "text-negative";

            let block = (
              <Fragment key={row.instrumentKey}>
                <TableRow>
                  <TableCell>
                    {row.portfolios.length > 0 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        aria-expanded={isExpanded}
                        aria-label={
                          isExpanded
                            ? `${row.instrumentName}の口座内訳を閉じる`
                            : `${row.instrumentName}の口座内訳を開く`
                        }
                        onClick={() => {
                          handleToggle(row.instrumentKey);
                        }}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    ) : null}
                  </TableCell>
                  <TableCell className="font-medium">{row.instrumentName}</TableCell>
                  <TableCell className="text-right">
                    {formatYen(row.marketValueMinor)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatAllocationPercent(row.weight)}
                  </TableCell>
                  <TableCell className={cn("text-right", gainClassName)}>
                    {formatNullableYen(row.unrealizedGainMinor)}
                  </TableCell>
                  <TableCell className={cn("text-right", gainClassName)}>
                    {formatNullableRate(row.unrealizedGainRate)}
                  </TableCell>
                  <TableCell className="text-right">
                    {row.portfolios.length}
                  </TableCell>
                </TableRow>
                {isExpanded
                  ? row.portfolios.map((portfolio) => {
                      let detail = (
                        <TableRow
                          key={`${row.instrumentKey}:${portfolio.portfolioCode}`}
                          className="bg-muted/40"
                        >
                          <TableCell />
                          <TableCell className="pl-8 text-muted-foreground">
                            {portfolio.portfolioName}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatYen(portfolio.marketValueMinor)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatAllocationPercent(portfolio.weightInInstrument)}
                          </TableCell>
                          <TableCell />
                          <TableCell />
                          <TableCell />
                        </TableRow>
                      );
                      return detail;
                    })
                  : null}
              </Fragment>
            );
            return block;
          })}
        </TableBody>
      </Table>
    </div>
  );
  return result;
}
