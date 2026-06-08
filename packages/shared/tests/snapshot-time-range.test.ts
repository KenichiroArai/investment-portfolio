import { describe, expect, it } from "vitest";

import {
  filterDatesInRange,
  findAdjacentSnapshotDate,
  listCalendarMonthOptions,
  resolveDateRange,
  resolveLatestSnapshotDate,
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
});
