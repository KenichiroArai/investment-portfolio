"use client";

import type { AllocationShareChange } from "@repo/shared";
import type { ReactNode } from "react";

import { formatPercentPoint } from "@/lib/format-yen";

type AllocationPeriodShareSummaryProps = {
  largestShareChange: AllocationShareChange | null;
  loading?: boolean;
};

export function AllocationPeriodShareSummary({
  largestShareChange,
  loading = false,
}: AllocationPeriodShareSummaryProps) {
  let result: ReactNode = null;

  if (loading) {
    result = (
      <p className="text-sm text-muted-foreground">期間内の構成変化を読み込み中…</p>
    );
    return result;
  }

  if (!largestShareChange) {
    return result;
  }

  const signedDelta = formatPercentPoint(largestShareChange.deltaRatio);

  result = (
    <p className="text-sm text-muted-foreground">
      期間内の最大シェア変動:{" "}
      <span className="font-medium text-foreground">
        {largestShareChange.label} {signedDelta}
      </span>
    </p>
  );
  return result;
}
