"use client";

import type { AllocationSlice } from "@repo/shared";
import type { ReactNode } from "react";

import { ClassificationValueLabel } from "@/components/classification-value-label";
import { formatAllocationPercent } from "@/lib/format-yen";
import { cn } from "@/lib/utils";

type AllocationSnapshotCompactProps = {
  slices: AllocationSlice[];
  descriptionByValueCode?: Map<string, string | null>;
  topCount?: number;
  asOfDateLabel?: string | null;
  uncoveredMinor?: number | null;
  className?: string;
};

function sortByWeight(slices: AllocationSlice[]): AllocationSlice[] {
  let result = [...slices];
  result.sort((left, right) => right.weight - left.weight);
  return result;
}

export function AllocationSnapshotCompact({
  slices,
  descriptionByValueCode,
  topCount = 3,
  asOfDateLabel = null,
  uncoveredMinor = null,
  className,
}: AllocationSnapshotCompactProps) {
  const topSlices = sortByWeight(slices).slice(0, topCount);

  let result: ReactNode = (
    <div className={cn("allocation-snapshot-compact rounded-lg border bg-card p-4", className)}>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold">期末断面サマリー</h3>
        {asOfDateLabel ? (
          <span className="text-xs text-muted-foreground">{asOfDateLabel}</span>
        ) : null}
      </div>
      {topSlices.length === 0 ? (
        <p className="text-sm text-muted-foreground">構成比データがありません。</p>
      ) : (
        <ul className="space-y-2">
          {topSlices.map((slice) => {
            let item = (
              <li key={slice.valueCode} className="space-y-1">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <ClassificationValueLabel
                    name={slice.valueName}
                    description={descriptionByValueCode?.get(slice.valueCode)}
                    nameClassName="max-w-[10rem]"
                  />
                  <span className="shrink-0 font-medium tabular-nums">
                    {formatAllocationPercent(slice.weight)}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.min(slice.weight * 100, 100)}%` }}
                  />
                </div>
              </li>
            );
            return item;
          })}
        </ul>
      )}
      {uncoveredMinor !== null && uncoveredMinor > 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">
          未分類あり（表示対象外の評価額があります）
        </p>
      ) : null}
    </div>
  );

  return result;
}
