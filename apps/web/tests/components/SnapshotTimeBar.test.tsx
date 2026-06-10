import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SnapshotTimeBar } from "@/components/SnapshotTimeBar";

const usePathname = vi.fn();
const usePortfolioTime = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => usePathname(),
}));

vi.mock("@/features/portfolio/PortfolioTimeContext", () => ({
  usePortfolioTime: () => usePortfolioTime(),
}));

function mockPortfolioTime(overrides: Record<string, unknown> = {}) {
  usePortfolioTime.mockReturnValue({
    portfolioCode: "ideco",
    availableDates: ["2026-06-01"],
    selectedAsOfDate: "2026-06-01",
    setSelectedAsOfDate: vi.fn(),
    jumpToLatest: vi.fn(),
    currentAsOfDate: "2026-06-01",
    periodPreset: "all",
    setPeriodPreset: vi.fn(),
    customFrom: "",
    customTo: "",
    setCustomFrom: vi.fn(),
    setCustomTo: vi.fn(),
    calendarMonth: "",
    setCalendarMonth: vi.fn(),
    loadingDates: false,
    isHistoricalView: false,
    emphasizeAsOf: true,
    emphasizePeriod: false,
    ...overrides,
  });
}

describe("SnapshotTimeBar", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders on holdings route", () => {
    usePathname.mockReturnValue("/portfolios/ideco/holdings/");
    mockPortfolioTime();

    render(<SnapshotTimeBar />);

    expect(screen.getByLabelText("基準日を選択")).toBeInTheDocument();
    expect(screen.getByText("推移")).toBeInTheDocument();
  });

  it("hides on settings route", () => {
    usePathname.mockReturnValue("/portfolios/ideco/settings/data/");
    mockPortfolioTime();

    const { container } = render(<SnapshotTimeBar />);

    expect(container.firstChild).toBeNull();
  });
});
