export type SnapshotPeriodPreset = "1w" | "1m" | "3m" | "6m" | "12m" | "all";

export type SnapshotDateEntry = {
  asOfDate: string;
  isCurrent: boolean;
};

export type ResolveDateRangeParams = {
  availableDates: string[];
  preset: SnapshotPeriodPreset;
  customFrom?: string | null;
  customTo?: string | null;
  calendarMonth?: string | null;
};

export const SNAPSHOT_PERIOD_PRESET_LABELS: Record<SnapshotPeriodPreset, string> = {
  "1w": "1週間",
  "1m": "1か月",
  "3m": "3か月",
  "6m": "6か月",
  "12m": "12か月",
  all: "すべて",
};

function parseIsoDate(value: string): Date | null {
  let result: Date | null = null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return result;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return result;
  }
  result = date;
  return result;
}

function formatIsoDate(date: Date): string {
  let result = "";
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  result = `${year}-${month}-${day}`;
  return result;
}

function addDays(date: Date, days: number): Date {
  let result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function addMonths(date: Date, months: number): Date {
  let result = new Date(date.getTime());
  result.setUTCMonth(result.getUTCMonth() + months);
  return result;
}

function resolveCalendarMonthRange(
  calendarMonth: string,
): { from: string; to: string } | null {
  let result: { from: string; to: string } | null = null;
  const match = /^(\d{4})-(\d{2})$/.exec(calendarMonth);
  if (!match) {
    return result;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) {
    return result;
  }
  const fromDate = new Date(Date.UTC(year, month - 1, 1));
  const toDate = new Date(Date.UTC(year, month, 0));
  result = {
    from: formatIsoDate(fromDate),
    to: formatIsoDate(toDate),
  };
  return result;
}

function resolvePresetBounds(
  preset: SnapshotPeriodPreset,
  anchorDate: string,
): { from: string; to: string } {
  let result = { from: anchorDate, to: anchorDate };
  const anchor = parseIsoDate(anchorDate);
  if (!anchor) {
    return result;
  }

  if (preset === "all") {
    return result;
  }

  if (preset === "1w") {
    result = {
      from: formatIsoDate(addDays(anchor, -6)),
      to: anchorDate,
    };
    return result;
  }

  const monthOffsets: Record<Exclude<SnapshotPeriodPreset, "1w" | "all">, number> = {
    "1m": -1,
    "3m": -3,
    "6m": -6,
    "12m": -12,
  };
  const months = monthOffsets[preset as Exclude<SnapshotPeriodPreset, "1w" | "all">];
  result = {
    from: formatIsoDate(addMonths(anchor, months)),
    to: anchorDate,
  };
  return result;
}

export function filterDatesInRange(
  availableDates: string[],
  from: string,
  to: string,
): string[] {
  let result: string[] = [];
  const sorted = [...availableDates].sort((left, right) => left.localeCompare(right));
  result = sorted.filter((date) => date >= from && date <= to);
  return result;
}

export function resolveDateRange(params: ResolveDateRangeParams): string[] {
  let result: string[] = [];

  const sorted = [...params.availableDates].sort((left, right) =>
    left.localeCompare(right),
  );
  if (sorted.length === 0) {
    return result;
  }

  const latestDate = sorted[sorted.length - 1];

  if (params.calendarMonth) {
    const monthRange = resolveCalendarMonthRange(params.calendarMonth);
    if (monthRange) {
      result = filterDatesInRange(sorted, monthRange.from, monthRange.to);
      return result;
    }
  }

  if (params.customFrom || params.customTo) {
    const from = params.customFrom ?? sorted[0];
    const to = params.customTo ?? latestDate;
    result = filterDatesInRange(sorted, from, to);
    return result;
  }

  if (params.preset === "all") {
    result = sorted;
    return result;
  }

  const bounds = resolvePresetBounds(params.preset, latestDate);
  result = filterDatesInRange(sorted, bounds.from, bounds.to);
  return result;
}

export function findAdjacentSnapshotDate(
  availableDates: string[],
  currentDate: string,
  direction: "prev" | "next",
): string | null {
  let result: string | null = null;
  const sorted = [...availableDates].sort((left, right) => left.localeCompare(right));
  const index = sorted.indexOf(currentDate);
  if (index < 0) {
    return result;
  }
  if (direction === "prev" && index > 0) {
    result = sorted[index - 1];
    return result;
  }
  if (direction === "next" && index < sorted.length - 1) {
    result = sorted[index + 1];
    return result;
  }
  return result;
}

export function resolveLatestSnapshotDate(availableDates: string[]): string | null {
  let result: string | null = null;
  const sorted = [...availableDates].sort((left, right) => left.localeCompare(right));
  if (sorted.length === 0) {
    return result;
  }
  result = sorted[sorted.length - 1];
  return result;
}

export function listCalendarMonthOptions(availableDates: string[]): string[] {
  let result: string[] = [];
  const months = new Set<string>();
  for (const date of availableDates) {
    const match = /^(\d{4})-(\d{2})-\d{2}$/.exec(date);
    if (match) {
      months.add(`${match[1]}-${match[2]}`);
    }
  }
  result = [...months].sort((left, right) => left.localeCompare(right));
  return result;
}
