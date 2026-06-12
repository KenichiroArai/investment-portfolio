import { describe, expect, it } from "vitest";

import {
  detectMatchingPreset,
  filterDatesInRange,
  findAdjacentSnapshotDate,
  getCalendarMonthDateRange,
  listCalendarMonthOptions,
  resolveDateRange,
  resolveLatestSnapshotDate,
  resolvePeriodBounds,
  resolvePeriodBoundsForPreset,
  __snapshotTimeRangeTesting,
} from "../src/snapshot-time-range";

describe("snapshot-time-range", () => {
  const dates = ["2026-01-15", "2026-02-10", "2026-06-02", "2026-06-07"];

  it("resolves preset and custom ranges", () => {
    expect(resolveDateRange({ availableDates: dates, preset: "all" })).toEqual(
      dates,
    );
    expect(
      resolveDateRange({
        availableDates: dates,
        preset: "1w",
      }),
    ).toEqual(["2026-06-02", "2026-06-07"]);
    expect(
      resolveDateRange({
        availableDates: dates,
        preset: "all",
        customFrom: "2026-02-01",
        customTo: "2026-06-07",
      }),
    ).toEqual(["2026-02-10", "2026-06-02", "2026-06-07"]);
    expect(
      resolveDateRange({
        availableDates: dates,
        preset: "all",
        calendarMonth: "2026-06",
      }),
    ).toEqual(["2026-06-02", "2026-06-07"]);
  });

  it("filters dates and finds adjacent snapshots", () => {
    expect(filterDatesInRange(dates, "2026-02-01", "2026-06-02")).toEqual([
      "2026-02-10",
      "2026-06-02",
    ]);
    expect(resolveLatestSnapshotDate(dates)).toBe("2026-06-07");
    expect(findAdjacentSnapshotDate(dates, "2026-06-02", "next")).toBe(
      "2026-06-07",
    );
    expect(findAdjacentSnapshotDate(dates, "2026-06-02", "prev")).toBe(
      "2026-02-10",
    );
    expect(listCalendarMonthOptions(dates)).toEqual([
      "2026-01",
      "2026-02",
      "2026-06",
    ]);
  });

  it("handles empty dates and boundary navigation", () => {
    expect(resolveDateRange({ availableDates: [], preset: "all" })).toEqual([]);
    expect(resolveLatestSnapshotDate([])).toBeNull();
    expect(findAdjacentSnapshotDate([], "2026-06-02", "next")).toBeNull();
    expect(findAdjacentSnapshotDate(dates, "missing", "next")).toBeNull();
    expect(findAdjacentSnapshotDate(dates, "2026-01-15", "prev")).toBeNull();
    expect(findAdjacentSnapshotDate(dates, "2026-06-07", "next")).toBeNull();
  });

  it("resolves month-based presets and ignores invalid calendar month", () => {
    expect(
      resolveDateRange({
        availableDates: dates,
        preset: "1m",
      }),
    ).toEqual(["2026-06-02", "2026-06-07"]);
    expect(
      resolveDateRange({
        availableDates: dates,
        preset: "3m",
      }),
    ).toEqual(["2026-06-02", "2026-06-07"]);
    expect(
      resolveDateRange({
        availableDates: dates,
        preset: "6m",
      }),
    ).toEqual(dates);
    expect(
      resolveDateRange({
        availableDates: dates,
        preset: "12m",
      }),
    ).toEqual(dates);
    expect(
      resolveDateRange({
        availableDates: dates,
        preset: "all",
        calendarMonth: "invalid",
      }),
    ).toEqual(dates);
    expect(
      resolveDateRange({
        availableDates: dates,
        preset: "all",
        calendarMonth: "2026-13",
      }),
    ).toEqual(dates);
  });

  it("resolves period bounds and detects matching preset from custom range", () => {
    expect(resolvePeriodBoundsForPreset("1w", dates)).toEqual({
      from: "2026-06-01",
      to: "2026-06-07",
    });
    expect(resolvePeriodBoundsForPreset("all", dates)).toEqual({
      from: "2026-01-15",
      to: "2026-06-07",
    });
    expect(
      detectMatchingPreset(dates, "2026-06-01", "2026-06-07"),
    ).toBe("1w");
    expect(detectMatchingPreset(dates, "2026-01-01", "2026-06-07")).toBeNull();
  });

  it("covers internal date parsing and preset bounds", () => {
    expect(__snapshotTimeRangeTesting.parseIsoDate("bad")).toBeNull();
    expect(__snapshotTimeRangeTesting.parseIsoDate("2026-02-30")).toBeNull();
    expect(__snapshotTimeRangeTesting.resolveCalendarMonthRange("2026-13")).toBeNull();
    expect(__snapshotTimeRangeTesting.resolvePresetBounds("all", "2026-06-02")).toEqual({
      from: "2026-06-02",
      to: "2026-06-02",
    });
    expect(__snapshotTimeRangeTesting.resolvePresetBounds("1m", "invalid")).toEqual({
      from: "invalid",
      to: "invalid",
    });
    expect(
      resolveDateRange({
        availableDates: ["2026-02-30"],
        preset: "1m",
      }),
    ).toEqual(["2026-02-30"]);
    expect(
      resolveDateRange({
        availableDates: dates,
        preset: "1m",
        customFrom: "2026-06-02",
        customTo: "2026-06-07",
      }),
    ).toEqual(["2026-06-02", "2026-06-07"]);
    expect(
      resolveDateRange({
        availableDates: dates,
        preset: "all",
        customTo: "2026-06-02",
      }),
    ).toEqual(["2026-01-15", "2026-02-10", "2026-06-02"]);
    expect(
      resolveDateRange({
        availableDates: dates,
        preset: "all",
        customFrom: "2026-06-02",
      }),
    ).toEqual(["2026-06-02", "2026-06-07"]);
  });

  it("resolves period bounds and calendar month helpers", () => {
    expect(getCalendarMonthDateRange("2026-06")).toEqual({
      from: "2026-06-01",
      to: "2026-06-30",
    });
    expect(getCalendarMonthDateRange("invalid")).toBeNull();
    expect(resolvePeriodBounds({ availableDates: [], preset: "all" })).toBeNull();
    expect(resolvePeriodBounds({ availableDates: dates, preset: "1w" })).toEqual({
      from: "2026-06-01",
      to: "2026-06-07",
    });
    expect(
      resolvePeriodBounds({
        availableDates: dates,
        preset: "all",
        calendarMonth: "2026-02",
      }),
    ).toEqual({
      from: "2026-02-01",
      to: "2026-02-28",
    });
    expect(
      resolvePeriodBounds({
        availableDates: dates,
        preset: "3m",
        customFrom: "2026-02-01",
        customTo: "2026-06-07",
      }),
    ).toEqual({
      from: "2026-02-01",
      to: "2026-06-07",
    });
    expect(resolvePeriodBoundsForPreset("3m", dates)).toEqual({
      from: "2026-03-07",
      to: "2026-06-07",
    });
    expect(detectMatchingPreset(dates, null, "2026-06-07")).toBeNull();
    expect(detectMatchingPreset(dates, "2026-01-15", "2026-06-07")).toBe("all");
    expect(resolvePeriodBoundsForPreset("all", [""])).toBeNull();
    expect(resolvePeriodBounds({ availableDates: [""], preset: "all" })).toBeNull();
    expect(
      resolvePeriodBounds({
        availableDates: dates,
        preset: "all",
        customFrom: "2026-02-01",
        customTo: "2026-06-07",
      }),
    ).toEqual({
      from: "2026-02-01",
      to: "2026-06-07",
    });
    expect(
      resolvePeriodBounds({
        availableDates: dates,
        preset: "all",
        customFrom: null,
        customTo: "2026-06-07",
      }),
    ).toEqual({
      from: "2026-01-15",
      to: "2026-06-07",
    });
    expect(
      resolveDateRange({
        availableDates: dates,
        preset: "all",
        customFrom: "2026-02-01",
        customTo: null,
      }),
    ).toEqual(["2026-02-10", "2026-06-02", "2026-06-07"]);
    expect(
      resolvePeriodBounds({
        availableDates: dates,
        preset: "all",
        customFrom: "2026-02-01",
        customTo: null,
      }),
    ).toEqual({
      from: "2026-02-01",
      to: "2026-06-07",
    });
  });
});
