"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  GroupedRebalanceTable,
  RebalanceTable,
  type RebalanceDisplayRow,
} from "@/features/allocation/RebalanceTable";
import { formatYen } from "@/lib/format-yen";

type RebalanceTradesSummaryProps = {
  title?: string;
  description?: string;
  rows: RebalanceDisplayRow[];
  totalBuyMinor: number;
  totalSellMinor: number;
  unallocatedDepositMinor: number;
  grouped?: boolean;
};

export function RebalanceTradesSummary({
  title = "売買提案",
  description,
  rows,
  totalBuyMinor,
  totalSellMinor,
  unallocatedDepositMinor,
  grouped = false,
}: RebalanceTradesSummaryProps) {
  let result = (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {grouped ? <GroupedRebalanceTable rows={rows} /> : <RebalanceTable rows={rows} />}
        <div className="flex flex-wrap gap-4 text-sm">
          <span>合計買い: {formatYen(totalBuyMinor)}</span>
          <span>合計売り: {formatYen(totalSellMinor)}</span>
          {unallocatedDepositMinor > 0 ? (
            <span className="text-muted-foreground">
              未配分入金: {formatYen(unallocatedDepositMinor)}
            </span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
  return result;
}
