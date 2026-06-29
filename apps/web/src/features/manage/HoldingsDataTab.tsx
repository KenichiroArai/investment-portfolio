"use client";

import type { CurrentSnapshotDto, HoldingLineInput, InstrumentListItemDto, PortfolioSnapshotMetricInput } from "@repo/shared";
import { toast } from "sonner";

import {
  mergeHoldingLine,
  removeHoldingLineAtIndex,
  snapshotToHoldingInputs,
  snapshotToMetricInputs,
  updateHoldingLineAtIndex,
} from "@/features/manage/snapshot-input";

import { HoldingManualAddCard } from "./HoldingManualAddCard";
import { HoldingSavedTable } from "./HoldingSavedTable";

type HoldingsDataTabProps = {
  snapshot: CurrentSnapshotDto | null;
  instruments: InstrumentListItemDto[];
  disabled: boolean;
  onSaveSnapshot: (
    lines: HoldingLineInput[],
    metrics: PortfolioSnapshotMetricInput[],
    successMessage: string,
  ) => Promise<boolean>;
};

export function HoldingsDataTab({
  snapshot,
  instruments,
  disabled,
  onSaveSnapshot,
}: HoldingsDataTabProps) {
  async function handleAddHolding(params: {
    instrumentId: string;
    quantity: number;
    marketValueMinor: number;
  }) {
    let result = false;

    if (!Number.isFinite(params.quantity) || params.quantity <= 0) {
      toast.error("数量は正の数で入力してください。");
      return result;
    }
    if (!Number.isInteger(params.marketValueMinor) || params.marketValueMinor < 0) {
      toast.error("評価額は 0 以上の整数で入力してください。");
      return result;
    }

    const existingLines = snapshot ? snapshotToHoldingInputs(snapshot) : [];
    const existingMetrics = snapshot ? snapshotToMetricInputs(snapshot) : [];
    const lines = mergeHoldingLine(existingLines, {
      instrumentId: params.instrumentId,
      quantity: params.quantity,
      marketValueMinor: params.marketValueMinor,
    });

    result = await onSaveSnapshot(lines, existingMetrics, "保有明細を登録しました。");
    return result;
  }

  async function handleSaveLine(index: number, quantity: number, marketValueMinor: number) {
    let result = false;

    if (!snapshot) {
      return result;
    }

    const line = snapshot.lines[index];
    if (!line) {
      return result;
    }

    const lines = updateHoldingLineAtIndex(snapshotToHoldingInputs(snapshot), index, {
      instrumentId: line.instrumentId,
      quantity,
      marketValueMinor,
      bookValueMinor: line.bookValueMinor,
      sortOrder: line.sortOrder,
      metrics: line.metrics.map((metric) => ({
        code: metric.code,
        integerValue: metric.integerValue,
        realValue: metric.realValue,
        textValue: metric.textValue,
      })),
    });

    result = await onSaveSnapshot(lines, snapshotToMetricInputs(snapshot), "保有明細を更新しました。");
    return result;
  }

  async function handleDeleteLine(index: number) {
    let result = false;

    if (!snapshot) {
      return result;
    }

    const lines = removeHoldingLineAtIndex(snapshotToHoldingInputs(snapshot), index);
    result = await onSaveSnapshot(lines, snapshotToMetricInputs(snapshot), "保有明細を削除しました。");
    return result;
  }

  let result = (
    <div className="space-y-6">
      <HoldingManualAddCard instruments={instruments} disabled={disabled} onAdd={handleAddHolding} />
      <HoldingSavedTable
        snapshot={snapshot}
        disabled={disabled}
        onSaveLine={handleSaveLine}
        onDeleteLine={handleDeleteLine}
      />
    </div>
  );
  return result;
}
