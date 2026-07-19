import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

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
    trendDisplayUnit: "day",
    setTrendDisplayUnit: vi.fn(),
    trendBucketPick: "firstLast",
    setTrendBucketPick: vi.fn(),
    trendMinMaxField: "marketValue",
    setTrendMinMaxField: vi.fn(),
    loadingDates: false,
    isHistoricalView: false,
    emphasizeAsOf: true,
    emphasizePeriod: false,
    ...overrides,
  });
}

describe("SnapshotTimeBar", () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders on holdings route", () => {
    usePathname.mockReturnValue("/portfolios/ideco/holdings/");
    mockPortfolioTime();

    render(<SnapshotTimeBar />);

    expect(screen.getByLabelText("基準日を選択")).toBeInTheDocument();
    expect(screen.getByText("期間")).toBeInTheDocument();
  });

  it("hides on settings route", () => {
    usePathname.mockReturnValue("/portfolios/ideco/settings/data/");
    mockPortfolioTime();

    const { container } = render(<SnapshotTimeBar />);

    expect(container.firstChild).toBeNull();
  });

  it("hides while dates are loading or empty", () => {
    usePathname.mockReturnValue("/portfolios/ideco/holdings/");
    mockPortfolioTime({ loadingDates: true });
    const { container: loading } = render(<SnapshotTimeBar />);
    expect(loading.firstChild).toBeNull();

    mockPortfolioTime({ loadingDates: false, availableDates: [] });
    const { container: empty } = render(<SnapshotTimeBar />);
    expect(empty.firstChild).toBeNull();
  });

  it("navigates dates and period presets", async () => {
    const user = userEvent.setup();
    const setSelectedAsOfDate = vi.fn();
    const jumpToLatest = vi.fn();
    const setPeriodPreset = vi.fn();
    const setCustomFrom = vi.fn();
    const setCustomTo = vi.fn();
    const setTrendDisplayUnit = vi.fn();

    usePathname.mockReturnValue("/portfolios/ideco/trends/");
    mockPortfolioTime({
      availableDates: ["2026-05-31", "2026-06-07"],
      selectedAsOfDate: "2026-06-07",
      currentAsOfDate: "2026-06-07",
      isHistoricalView: false,
      emphasizeAsOf: false,
      emphasizePeriod: true,
      setSelectedAsOfDate,
      jumpToLatest,
      setPeriodPreset,
      customFrom: "",
      customTo: "",
      setCustomFrom,
      setCustomTo,
      calendarMonth: "",
      setCalendarMonth: vi.fn(),
      setTrendDisplayUnit,
    });

    render(<SnapshotTimeBar />);

    expect(screen.getByRole("button", { name: /表示の詳細設定/ })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /表示の詳細設定/ }));
    expect(screen.getByLabelText("表示単位を選択")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "前の基準日" }));
    expect(setSelectedAsOfDate).toHaveBeenCalledWith("2026-05-31");

    await user.click(screen.getByRole("button", { name: "1か月" }));
    expect(setPeriodPreset).toHaveBeenCalledWith("1m");

    fireEvent.change(screen.getByLabelText("開始日"), {
      target: { value: "2026-05-01" },
    });
    expect(setCustomFrom).toHaveBeenCalledWith("2026-05-01");

    expect(screen.getByRole("button", { name: "最新" })).toBeDisabled();
  });

  it("renders bucket pick selector and shows min/max field when needed", async () => {
    const user = userEvent.setup();
    usePathname.mockReturnValue("/portfolios/ideco/trends/");
    mockPortfolioTime({
      availableDates: ["2026-05-31", "2026-06-07"],
      trendBucketPick: "min",
      trendMinMaxField: "marketValue",
    });

    render(<SnapshotTimeBar />);

    await user.click(screen.getByRole("button", { name: /表示の詳細設定/ }));
    expect(screen.getByLabelText("代表値を選択")).toBeInTheDocument();
    expect(screen.getByLabelText("比較項目を選択")).toBeInTheDocument();
  });

  it("shows firstLast pick description on the representative value trigger", async () => {
    const user = userEvent.setup();
    usePathname.mockReturnValue("/portfolios/ideco/trends/");
    mockPortfolioTime({
      availableDates: ["2026-05-31", "2026-06-07"],
      trendBucketPick: "firstLast",
    });

    render(<SnapshotTimeBar />);

    await user.click(screen.getByRole("button", { name: /表示の詳細設定/ }));
    expect(screen.getByLabelText("代表値を選択")).toHaveAttribute(
      "title",
      "表示単位で集約するとき、最初の区間は期初、2つ目以降は期末のスナップショットを代表値にします。",
    );
  });

  it("shows historical badge when viewing past snapshot", () => {
    usePathname.mockReturnValue("/portfolios/ideco/holdings/");
    mockPortfolioTime({
      availableDates: ["2026-05-31", "2026-06-07"],
      selectedAsOfDate: "2026-05-31",
      currentAsOfDate: "2026-06-07",
      isHistoricalView: true,
    });

    render(<SnapshotTimeBar />);
    expect(screen.getByText("履歴表示中")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "次の基準日" })).not.toBeDisabled();
  });
});
