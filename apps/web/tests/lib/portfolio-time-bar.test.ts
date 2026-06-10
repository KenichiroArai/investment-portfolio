import { describe, expect, it } from "vitest";

import { shouldShowSnapshotTimeBar } from "@/lib/portfolio-time-bar";

describe("shouldShowSnapshotTimeBar", () => {
  const code = "ideco";

  it("shows on overview, holdings, analysis, and trends", () => {
    expect(shouldShowSnapshotTimeBar(`/portfolios/${code}/`, code)).toBe(true);
    expect(shouldShowSnapshotTimeBar(`/portfolios/${code}`, code)).toBe(true);
    expect(shouldShowSnapshotTimeBar(`/portfolios/${code}/holdings/`, code)).toBe(true);
    expect(shouldShowSnapshotTimeBar(`/portfolios/${code}/analysis/`, code)).toBe(true);
    expect(shouldShowSnapshotTimeBar(`/portfolios/${code}/trends/`, code)).toBe(true);
  });

  it("hides on settings, register, edit, and analysis settings", () => {
    expect(shouldShowSnapshotTimeBar(`/portfolios/${code}/settings/data/`, code)).toBe(
      false,
    );
    expect(shouldShowSnapshotTimeBar(`/portfolios/${code}/register/`, code)).toBe(false);
    expect(shouldShowSnapshotTimeBar(`/portfolios/${code}/edit/`, code)).toBe(false);
    expect(
      shouldShowSnapshotTimeBar(`/portfolios/${code}/analysis/settings/`, code),
    ).toBe(false);
  });
});
