"use client";

import {
  findAdjacentSnapshotDate,
  listCalendarMonthOptions,
  SNAPSHOT_PERIOD_PRESET_LABELS,
  TREND_BUCKET_PICK_LABELS,
  TREND_BUCKET_PICKS,
  TREND_DISPLAY_UNIT_LABELS,
  TREND_DISPLAY_UNITS,
  TREND_MIN_MAX_FIELD_LABELS,
  TREND_MIN_MAX_FIELDS,
  type SnapshotPeriodPreset,
  type TrendBucketPick,
  type TrendDisplayUnit,
  type TrendMinMaxField,
} from "@repo/shared";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { usePortfolioTime } from "@/features/portfolio/PortfolioTimeContext";
import { formatAsOfDateJa } from "@/lib/format-yen";
import { shouldShowSnapshotTimeBar } from "@/lib/portfolio-time-bar";

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
    trendDisplayUnit,
    setTrendDisplayUnit,
    trendBucketPick,
    setTrendBucketPick,
    trendMinMaxField,
    setTrendMinMaxField,
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
    <div className="border-b bg-muted/30">
      <div className="mx-auto max-w-6xl space-y-3 px-4 py-3 md:px-6">
        <div
          className={cn(
            "flex flex-wrap items-center gap-2",
            emphasizeAsOf && "rounded-lg border bg-background p-2 shadow-sm",
          )}
        >
          <span className="min-w-12 text-xs font-semibold text-muted-foreground">基準日</span>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              aria-label="前の基準日"
              disabled={previousDate === null}
              onClick={() => {
                if (previousDate) {
                  setSelectedAsOfDate(previousDate);
                }
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Select
              value={selectedAsOfDate ?? ""}
              onValueChange={setSelectedAsOfDate}
            >
              <SelectTrigger className="w-[10rem]" aria-label="基準日を選択">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[...availableDates]
                  .sort((left, right) => right.localeCompare(left))
                  .map((date) => {
                    let item = (
                      <SelectItem key={date} value={date}>
                        {formatAsOfDateJa(date)}
                      </SelectItem>
                    );
                    return item;
                  })}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              aria-label="次の基準日"
              disabled={nextDate === null}
              onClick={() => {
                if (nextDate) {
                  setSelectedAsOfDate(nextDate);
                }
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={selectedAsOfDate === currentAsOfDate}
              onClick={() => {
                jumpToLatest();
              }}
            >
              最新
            </Button>
            {isHistoricalView ? (
              <Badge variant="secondary">履歴表示中</Badge>
            ) : null}
          </div>
        </div>

        <div
          className={cn(
            "space-y-2",
            emphasizePeriod && "rounded-lg border bg-background p-2 shadow-sm",
          )}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="min-w-12 text-xs font-semibold text-muted-foreground">推移</span>
            <div className="flex flex-wrap gap-1">
              {PERIOD_PRESETS.map((preset) => {
                let button = (
                  <Button
                    key={preset}
                    type="button"
                    size="sm"
                    variant={periodPreset === preset ? "default" : "outline"}
                    onClick={() => {
                      setPeriodPreset(preset);
                    }}
                  >
                    {SNAPSHOT_PERIOD_PRESET_LABELS[preset]}
                  </Button>
                );
                return button;
              })}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 pl-0 sm:pl-14">
            <Input
              type="date"
              className="w-auto"
              aria-label="開始日"
              value={customFrom}
              onChange={(event) => {
                setCustomFrom(event.target.value);
              }}
            />
            <span className="text-sm text-muted-foreground">〜</span>
            <Input
              type="date"
              className="w-auto"
              aria-label="終了日"
              value={customTo}
              onChange={(event) => {
                setCustomTo(event.target.value);
              }}
            />
            {monthOptions.length > 0 ? (
              <Select
                value={calendarMonth || undefined}
                onValueChange={setCalendarMonth}
              >
                <SelectTrigger className="w-[9rem]" aria-label="月を選択">
                  <SelectValue placeholder="月を選択" />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((month) => {
                    let item = (
                      <SelectItem key={month} value={month}>
                        {formatCalendarMonthLabel(month)}
                      </SelectItem>
                    );
                    return item;
                  })}
                </SelectContent>
              </Select>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2 pl-0 sm:pl-14">
            <span className="min-w-12 text-xs font-semibold text-muted-foreground">表示単位</span>
            <Select
              value={trendDisplayUnit}
              onValueChange={(value) => {
                setTrendDisplayUnit(value as TrendDisplayUnit);
              }}
            >
              <SelectTrigger className="w-[9rem]" aria-label="表示単位を選択">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TREND_DISPLAY_UNITS.map((unit) => {
                  let item = (
                    <SelectItem key={unit} value={unit}>
                      {TREND_DISPLAY_UNIT_LABELS[unit]}
                    </SelectItem>
                  );
                  return item;
                })}
              </SelectContent>
            </Select>
            <span className="min-w-12 text-xs font-semibold text-muted-foreground">代表値</span>
            <Select
              value={trendBucketPick}
              onValueChange={(value) => {
                setTrendBucketPick(value as TrendBucketPick);
              }}
            >
              <SelectTrigger className="w-[9rem]" aria-label="代表値を選択">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TREND_BUCKET_PICKS.map((pick) => {
                  let item = (
                    <SelectItem key={pick} value={pick}>
                      {TREND_BUCKET_PICK_LABELS[pick]}
                    </SelectItem>
                  );
                  return item;
                })}
              </SelectContent>
            </Select>
            {trendBucketPick === "min" || trendBucketPick === "max" ? (
              <>
                <span className="min-w-12 text-xs font-semibold text-muted-foreground">
                  比較項目
                </span>
                <Select
                  value={trendMinMaxField}
                  onValueChange={(value) => {
                    setTrendMinMaxField(value as TrendMinMaxField);
                  }}
                >
                  <SelectTrigger className="w-[9rem]" aria-label="比較項目を選択">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TREND_MIN_MAX_FIELDS.map((field) => {
                      let item = (
                        <SelectItem key={field} value={field}>
                          {TREND_MIN_MAX_FIELD_LABELS[field]}
                        </SelectItem>
                      );
                      return item;
                    })}
                  </SelectContent>
                </Select>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
  return result;
}
