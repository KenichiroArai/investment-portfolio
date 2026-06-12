"use client";

import type { ReactNode } from "react";

type CompositionSelectionToolbarProps = {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  className?: string;
};

export function CompositionSelectionToolbar({
  selectedCount,
  totalCount,
  onSelectAll,
  onClearSelection,
  className,
}: CompositionSelectionToolbarProps) {
  let result: ReactNode = (
    <div
      className={
        className
          ? `composition-selection-toolbar ${className}`
          : "composition-selection-toolbar"
      }
      role="toolbar"
      aria-label="構成の選択"
    >
      <span className="composition-selection-toolbar__count" aria-live="polite">
        {selectedCount} / {totalCount} 件を表示
      </span>
      <div className="composition-selection-toolbar__actions">
        <button
          type="button"
          className="composition-selection-toolbar__button"
          onClick={onSelectAll}
          disabled={totalCount === 0 || selectedCount === totalCount}
        >
          すべて選択
        </button>
        <button
          type="button"
          className="composition-selection-toolbar__button"
          onClick={onClearSelection}
          disabled={selectedCount === 0}
        >
          選択解除
        </button>
      </div>
    </div>
  );
  return result;
}
