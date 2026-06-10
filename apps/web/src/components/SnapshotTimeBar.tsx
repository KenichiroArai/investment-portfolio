"use client";

import {
  findAdjacentSnapshotDate,
  listCalendarMonthOptions,
  SNAPSHOT_PERIOD_PRESET_LABELS,
  type SnapshotPeriodPreset,
} from "@repo/shared";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { formatAsOfDateJa } from "@/lib/format-yen";
import { shouldShowSnapshotTimeBar } from "@/lib/portfolio-time-bar";
import { usePortfolioTime } from "@/features/portfolio/PortfolioTimeContext";

const PERIOD_PRESETS: SnapshotPeriodPreset[] = [
  "1w",
  "1m",
  "3m",
  "6m",
  "12m",
  "all",
];

function formatCalendarMonthLabel(value: string): string {
  let result = value;
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (match) {
    result = `${Number(match[1])}年${Number(match[2])}月`;
  }
  return result;
}

export function SnapshotTimeBar() {
  const pathname = usePathname();
  const {
    portfolioCode,
    availableDates,
    selectedAsOfDate,
    setSelectedAsOfDate,
    jumpToLatest,
    currentAsOfDate,
    periodPreset,
    setPeriodPreset,
    customFrom,
    customTo,
    setCustomFrom,
    setCustomTo,
    calendarMonth,
    setCalendarMonth,
    loadingDates,
    isHistoricalView,
    emphasizeAsOf,
    emphasizePeriod,
  } = usePortfolioTime();

  let result: ReactNode = null;

  if (!shouldShowSnapshotTimeBar(pathname, portfolioCode)) {
    return result;
  }

  if (loadingDates || availableDates.length === 0) {
    result = null;
    return result;
  }

  const previousDate =
    selectedAsOfDate !== null
      ? findAdjacentSnapshotDate(availableDates, selectedAsOfDate, "prev")
      : null;
  const nextDate =
    selectedAsOfDate !== null
      ? findAdjacentSnapshotDate(availableDates, selectedAsOfDate, "next")
      : null;
  const monthOptions = listCalendarMonthOptions(availableDates);

  result = (
    <div className="snapshot-time-bar">
      <div
        className={`snapshot-time-bar__row${emphasizeAsOf ? " is-primary" : ""}`}
      >
        <span className="snapshot-time-bar__label">基準日</span>
        <div className="snapshot-time-bar__controls">
          <button
            type="button"
            className="snapshot-time-bar__nav"
            aria-label="前の基準日"
            disabled={previousDate === null}
            onClick={() => {
              if (previousDate) {
                setSelectedAsOfDate(previousDate);
              }
            }}
          >
            ◀
          </button>
          <select
            className="snapshot-time-bar__select"
            aria-label="基準日を選択"
            value={selectedAsOfDate ?? ""}
            onChange={(event) => {
              setSelectedAsOfDate(event.target.value);
            }}
          >
            {[...availableDates]
              .sort((left, right) => right.localeCompare(left))
              .map((date) => {
                let option = (
                  <option key={date} value={date}>
                    {formatAsOfDateJa(date)}
                  </option>
                );
                return option;
              })}
          </select>
          <button
            type="button"
            className="snapshot-time-bar__nav"
            aria-label="次の基準日"
            disabled={nextDate === null}
            onClick={() => {
              if (nextDate) {
                setSelectedAsOfDate(nextDate);
              }
            }}
          >
            ▶
          </button>
          <button
            type="button"
            className="snapshot-time-bar__latest"
            disabled={selectedAsOfDate === currentAsOfDate}
            onClick={() => {
              jumpToLatest();
            }}
          >
            最新
          </button>
          {isHistoricalView ? (
            <span className="snapshot-time-bar__badge">履歴表示中</span>
          ) : null}
        </div>
      </div>

      <div
        className={`snapshot-time-bar__row${emphasizePeriod ? " is-primary" : ""}`}
      >
        <span className="snapshot-time-bar__label">推移</span>
        <div className="snapshot-time-bar__period">
          {PERIOD_PRESETS.map((preset) => {
            let button = (
              <button
                key={preset}
                type="button"
                className={periodPreset === preset ? "is-active" : undefined}
                onClick={() => {
                  setPeriodPreset(preset);
                }}
              >
                {SNAPSHOT_PERIOD_PRESET_LABELS[preset]}
              </button>
            );
            return button;
          })}
        </div>
        <div className="snapshot-time-bar__range">
          <label>
            <span className="visually-hidden">開始日</span>
            <input
              type="date"
              value={customFrom}
              onChange={(event) => {
                setCustomFrom(event.target.value);
              }}
            />
          </label>
          <span className="snapshot-time-bar__range-sep">〜</span>
          <label>
            <span className="visually-hidden">終了日</span>
            <input
              type="date"
              value={customTo}
              onChange={(event) => {
                setCustomTo(event.target.value);
              }}
            />
          </label>
          {monthOptions.length > 0 ? (
            <select
              className="snapshot-time-bar__month"
              aria-label="月を選択"
              value={calendarMonth}
              onChange={(event) => {
                setCalendarMonth(event.target.value);
              }}
            >
              <option value="">月を選択</option>
              {monthOptions.map((month) => {
                let option = (
                  <option key={month} value={month}>
                    {formatCalendarMonthLabel(month)}
                  </option>
                );
                return option;
              })}
            </select>
          ) : null}
        </div>
      </div>
    </div>
  );
  return result;
}
