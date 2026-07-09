import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AnalysisView } from "@/features/analysis/AnalysisView";
import {
  createPortfolioFetchMock,
  renderWithPortfolioTime,
} from "../helpers/portfolio-time-test-utils";
import { portfolioTimeNavigationState } from "../helpers/portfolio-time-navigation-state";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: vi.fn(),
    push: vi.fn(),
  }),
  usePathname: () => portfolioTimeNavigationState.pathname,
  useSearchParams: () => portfolioTimeNavigationState.searchParams,
}));

const snapshotFixture = {
  id: "snap-1",
  portfolioCode: "ideco",
  portfolioName: "iDeCo",
  asOfDate: "2026-06-01",
  analysisSchemes: [
    { schemeCode: "ideco_region", schemeName: "地域分類" },
    { schemeCode: "ideco_asset_class", schemeName: "資産分類" },
  ],
  metrics: [],
  lines: [
    {
      id: "line-1",
      instrumentId: "inst-1",
      instrumentName: "テスト銘柄",
      accountId: "ideco:unknown",
      accountName: "不明口座",
      sortOrder: 0,
      quantity: 1,
      marketValueMinor: 100_000,
      bookValueMinor: null,
      metrics: [],
      instrumentAttributes: [],
      tags: [
        {
          schemeCode: "ideco_region",
          schemeName: "地域分類",
          valueCode: "domestic",
          valueName: "国内",
        },
        {
          schemeCode: "ideco_asset_class",
          schemeName: "資産分類",
          valueCode: "equity",
          valueName: "株式",
        },
      ],
    },
  ],
};

const classificationSchemesFixture = [
  {
    id: "sch-region",
    code: "ideco_region",
    name: "地域分類",
    values: [
      { id: "v-domestic", code: "domestic", name: "国内", sortOrder: 0 },
      { id: "v-foreign", code: "foreign", name: "海外", sortOrder: 1 },
    ],
  },
  {
    id: "sch-asset",
    code: "ideco_asset_class",
    name: "資産分類",
    values: [{ id: "v-equity", code: "equity", name: "株式", sortOrder: 0 }],
  },
];

describe("AnalysisView", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    delete process.env.NEXT_PUBLIC_DATA_SOURCE;
  });

  it("renders four main tabs", async () => {
    vi.stubGlobal(
      "fetch",
      createPortfolioFetchMock({
        snapshot: snapshotFixture,
      }),
    );

    renderWithPortfolioTime(
      <AnalysisView portfolioCode="ideco" portfolioKind="ideco" />,
      {
        pathname: "/portfolios/ideco/analysis",
      },
    );

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "明細" })).toBeInTheDocument();
    });

    expect(screen.getByRole("tab", { name: "構成比" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "推移" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "リバランス" })).toBeInTheDocument();

    const mainTablist = screen.getByRole("tablist", { name: "資産配分の表示" });
    const mainTabs = within(mainTablist).getAllByRole("tab");
    expect(mainTabs.map((tab) => tab.textContent)).toEqual([
      "明細",
      "構成比",
      "推移",
      "リバランス",
    ]);
  });

  it("renders analysis axis above main tabs", async () => {
    vi.stubGlobal(
      "fetch",
      createPortfolioFetchMock({
        snapshot: snapshotFixture,
      }),
    );

    renderWithPortfolioTime(
      <AnalysisView portfolioCode="ideco" portfolioKind="ideco" />,
      {
        pathname: "/portfolios/ideco/analysis",
      },
    );

    await waitFor(() => {
      expect(screen.getByRole("tablist", { name: "分析軸" })).toBeInTheDocument();
    });

    const axisTablist = screen.getByRole("tablist", { name: "分析軸" });
    const mainTablist = screen.getByRole("tablist", { name: "資産配分の表示" });
    expect(
      axisTablist.compareDocumentPosition(mainTablist) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("renders section labels for axis and view controls", async () => {
    vi.stubGlobal(
      "fetch",
      createPortfolioFetchMock({
        snapshot: snapshotFixture,
      }),
    );

    renderWithPortfolioTime(
      <AnalysisView portfolioCode="ideco" portfolioKind="ideco" />,
      {
        pathname: "/portfolios/ideco/analysis",
      },
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "分析軸" })).toBeInTheDocument();
    });

    expect(screen.getByRole("heading", { name: "表示" })).toBeInTheDocument();
  });

  it("highlights active main tab with primary styles", async () => {
    vi.stubGlobal(
      "fetch",
      createPortfolioFetchMock({
        snapshot: snapshotFixture,
      }),
    );

    renderWithPortfolioTime(
      <AnalysisView portfolioCode="ideco" portfolioKind="ideco" />,
      {
        pathname: "/portfolios/ideco/analysis",
      },
    );

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "明細" })).toHaveAttribute(
        "data-state",
        "active",
      );
    });

    expect(screen.getByRole("tab", { name: "明細" }).className).toContain("data-[state=active]:bg-primary");
  });

  it("activates holdings tab when view=holdings", async () => {
    vi.stubGlobal(
      "fetch",
      createPortfolioFetchMock({
        snapshot: snapshotFixture,
      }),
    );

    renderWithPortfolioTime(
      <AnalysisView portfolioCode="ideco" portfolioKind="ideco" />,
      {
        pathname: "/portfolios/ideco/analysis",
        initialSearchParams: "view=holdings",
      },
    );

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "明細" })).toHaveAttribute(
        "data-state",
        "active",
      );
    });
  });

  it("renders holdings detail rows for active scheme", async () => {
    vi.stubGlobal(
      "fetch",
      createPortfolioFetchMock({
        snapshot: snapshotFixture,
      }),
    );

    renderWithPortfolioTime(
      <AnalysisView portfolioCode="ideco" portfolioKind="ideco" />,
      {
        pathname: "/portfolios/ideco/analysis",
        initialSearchParams: "view=holdings",
      },
    );

    await waitFor(() => {
      expect(screen.getByText("国内")).toBeInTheDocument();
    });

    expect(screen.getByRole("columnheader", { name: "基準日" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "分類" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "損益" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "損益率" })).toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: "資産全体比" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("テスト銘柄")).not.toBeInTheDocument();
    expect(screen.getByText(/分析軸: 地域分類/)).toBeInTheDocument();
  });

  it("updates holdings detail classification values when scheme changes", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      createPortfolioFetchMock({
        snapshot: snapshotFixture,
      }),
    );

    renderWithPortfolioTime(
      <AnalysisView portfolioCode="ideco" portfolioKind="ideco" />,
      {
        pathname: "/portfolios/ideco/analysis",
        initialSearchParams: "view=holdings",
      },
    );

    await waitFor(() => {
      expect(screen.getByText("国内")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("tab", { name: "資産分類" }));

    await waitFor(() => {
      expect(screen.getByText("株式")).toBeInTheDocument();
    });

    expect(screen.queryByText("国内")).not.toBeInTheDocument();
    expect(screen.getByText(/分析軸: 資産分類/)).toBeInTheDocument();
  });

  it("updates snapshot content immediately when scheme changes", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      createPortfolioFetchMock({
        snapshot: snapshotFixture,
      }),
    );

    renderWithPortfolioTime(
      <AnalysisView portfolioCode="ideco" portfolioKind="ideco" />,
      {
        pathname: "/portfolios/ideco/analysis",
        initialSearchParams: "view=snapshot",
      },
    );

    await waitFor(() => {
      expect(screen.getAllByText("国内").length).toBeGreaterThanOrEqual(1);
    });

    await user.click(screen.getByRole("tab", { name: "資産分類" }));
    expect(screen.getByRole("tab", { name: "資産分類" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getAllByText("株式").length).toBeGreaterThanOrEqual(1);
  });

  it("renders snapshot by active scheme", async () => {
    vi.stubGlobal(
      "fetch",
      createPortfolioFetchMock({
        snapshot: snapshotFixture,
      }),
    );

    renderWithPortfolioTime(
      <AnalysisView portfolioCode="ideco" portfolioKind="ideco" />,
      {
        pathname: "/portfolios/ideco/analysis",
        initialSearchParams: "view=snapshot",
      },
    );

    await waitFor(() => {
      expect(screen.getByText(/分類対象額/)).toBeInTheDocument();
    });

    expect(screen.queryByText(/未分類/)).not.toBeInTheDocument();

    expect(screen.getByRole("tab", { name: "地域分類" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "資産分類" })).toBeInTheDocument();
    expect(screen.getAllByText("国内").length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByRole("button", { name: "国内 の内訳を開く" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "損益" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "損益率" })).toBeInTheDocument();
  });

  it("shows uncovered amount when lines lack tags for the active scheme", async () => {
    vi.stubGlobal(
      "fetch",
      createPortfolioFetchMock({
        snapshot: {
          ...snapshotFixture,
          lines: [
            ...snapshotFixture.lines,
            {
              id: "line-2",
              instrumentId: "inst-2",
              instrumentName: "未分類銘柄",
              accountId: "ideco:unknown",
              accountName: "不明口座",
              sortOrder: 1,
              quantity: 1,
              marketValueMinor: 50_000,
              bookValueMinor: null,
              metrics: [],
              instrumentAttributes: [],
              tags: [],
            },
          ],
        },
        targetAllocations: {
          ideco_region: [
            { valueCode: "domestic", targetRatio: 0.4 },
            { valueCode: "foreign", targetRatio: 0.59 },
          ],
        },
      }),
    );

    renderWithPortfolioTime(
      <AnalysisView portfolioCode="ideco" portfolioKind="ideco" />,
      {
        pathname: "/portfolios/ideco/analysis",
        initialSearchParams: "view=snapshot",
      },
    );

    await waitFor(() => {
      expect(screen.getByText(/分類対象額/)).toBeInTheDocument();
    });

    expect(screen.getByText(/資産全体の 66\.67%/)).toBeInTheDocument();
    expect(screen.getByText(/未分類:.*50,000/)).toBeInTheDocument();
    expect(
      screen.getByText(/差分はタグ付き銘柄内で目標を100%に正規化して比較/),
    ).toBeInTheDocument();
  });

  it("shows rebalance uncovered note on allocation tab", async () => {
    vi.stubGlobal(
      "fetch",
      createPortfolioFetchMock({
        snapshot: {
          ...snapshotFixture,
          lines: [
            ...snapshotFixture.lines,
            {
              id: "line-2",
              instrumentId: "inst-2",
              instrumentName: "未分類銘柄",
              accountId: "ideco:unknown",
              accountName: "不明口座",
              sortOrder: 1,
              quantity: 1,
              marketValueMinor: 50_000,
              bookValueMinor: null,
              metrics: [],
              instrumentAttributes: [],
              tags: [],
            },
          ],
        },
        targetAllocations: {
          ideco_region: [
            { valueCode: "domestic", targetRatio: 0.4 },
            { valueCode: "foreign", targetRatio: 0.59 },
          ],
        },
      }),
    );

    renderWithPortfolioTime(
      <AnalysisView portfolioCode="ideco" portfolioKind="ideco" />,
      {
        pathname: "/portfolios/ideco/analysis",
        initialSearchParams: "view=allocation",
      },
    );

    await waitFor(() => {
      expect(screen.getByText(/評価額合計/)).toBeInTheDocument();
    });

    expect(
      screen.getByText(/未分類の銘柄は売買対象外です/),
    ).toBeInTheDocument();
  });

  it("switches scheme tabs and expands allocation breakdown", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      createPortfolioFetchMock({
        snapshot: snapshotFixture,
      }),
    );

    renderWithPortfolioTime(
      <AnalysisView portfolioCode="ideco" portfolioKind="ideco" />,
      {
        pathname: "/portfolios/ideco/analysis",
        initialSearchParams: "view=snapshot",
      },
    );

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "資産分類" })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("tab", { name: "資産分類" }));
    expect(screen.getByRole("tab", { name: "資産分類" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getAllByText("株式").length).toBeGreaterThanOrEqual(1);

    await user.click(
      screen.getByRole("button", { name: "株式 の内訳を開く" }),
    );
    expect(screen.getByText("テスト銘柄")).toBeInTheDocument();
  });

  it("shows rebalance trades summary for active scheme in api mode", async () => {
    process.env.NEXT_PUBLIC_DATA_SOURCE = "api";
    vi.stubGlobal(
      "fetch",
      createPortfolioFetchMock({
        snapshot: snapshotFixture,
      }),
    );

    renderWithPortfolioTime(
      <AnalysisView portfolioCode="ideco" portfolioKind="ideco" />,
      {
        pathname: "/portfolios/ideco/analysis",
        initialSearchParams: "view=allocation",
      },
    );

    await waitFor(() => {
      expect(screen.getByText("リバランス設定")).toBeInTheDocument();
    });

    expect(screen.getByText("売買提案")).toBeInTheDocument();
    expect(screen.getByText(/合計買い/)).toBeInTheDocument();
    expect(screen.getByText(/合計売り/)).toBeInTheDocument();
  });

  it("shows rebalance section in static mode", async () => {
    process.env.NEXT_PUBLIC_DATA_SOURCE = "static";
    vi.stubGlobal(
      "fetch",
      createPortfolioFetchMock({
        snapshot: snapshotFixture,
      }),
    );

    renderWithPortfolioTime(
      <AnalysisView portfolioCode="ideco" portfolioKind="ideco" />,
      {
        pathname: "/portfolios/ideco/analysis",
        initialSearchParams: "view=allocation",
      },
    );

    await waitFor(() => {
      expect(screen.getByText(/評価額合計/)).toBeInTheDocument();
    });

    expect(screen.getByText("リバランス設定")).toBeInTheDocument();
    expect(screen.getByText("売買提案")).toBeInTheDocument();
    expect(screen.getByText(/合計買い/)).toBeInTheDocument();
  });

  it("shows target allocation edit card in api mode", async () => {
    process.env.NEXT_PUBLIC_DATA_SOURCE = "api";
    vi.stubGlobal(
      "fetch",
      createPortfolioFetchMock({
        snapshot: snapshotFixture,
        classificationSchemes: classificationSchemesFixture,
      }),
    );

    renderWithPortfolioTime(
      <AnalysisView portfolioCode="ideco" portfolioKind="ideco" />,
      {
        pathname: "/portfolios/ideco/analysis",
        initialSearchParams: "view=allocation",
      },
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "目標配分を保存" })).toBeInTheDocument();
    });

    expect(screen.getAllByText("目標設定済み: 0 / 2 分類").length).toBeGreaterThanOrEqual(1);
  });

  it("hides target allocation edit card in static mode", async () => {
    process.env.NEXT_PUBLIC_DATA_SOURCE = "static";
    vi.stubGlobal(
      "fetch",
      createPortfolioFetchMock({
        snapshot: snapshotFixture,
        classificationSchemes: classificationSchemesFixture,
      }),
    );

    renderWithPortfolioTime(
      <AnalysisView portfolioCode="ideco" portfolioKind="ideco" />,
      {
        pathname: "/portfolios/ideco/analysis",
        initialSearchParams: "view=allocation",
      },
    );

    await waitFor(() => {
      expect(screen.getByText(/評価額合計/)).toBeInTheDocument();
    });

    expect(screen.queryByText("目標配分")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "目標配分を保存" })).not.toBeInTheDocument();
  });

  it("shows loading skeleton while snapshot loads", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
    const { container } = renderWithPortfolioTime(
      <AnalysisView portfolioCode="ideco" portfolioKind="ideco" />,
    );
    expect(container.querySelector(".animate-pulse")).toBeTruthy();
  });

  it("shows error when fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      createPortfolioFetchMock({
        failFetch: true,
      }),
    );

    renderWithPortfolioTime(
      <AnalysisView portfolioCode="ideco" portfolioKind="ideco" />,
      {
        pathname: "/portfolios/ideco/analysis",
        initialSearchParams: "view=allocation",
      },
    );

    await waitFor(() => {
      expect(screen.getByText(/接続できません/)).toBeInTheDocument();
    });
  });

  it("shows empty message when snapshot is missing", async () => {
    vi.stubGlobal(
      "fetch",
      createPortfolioFetchMock({
        snapshot: null,
      }),
    );

    renderWithPortfolioTime(
      <AnalysisView portfolioCode="ideco" portfolioKind="ideco" />,
      {
        pathname: "/portfolios/ideco/analysis",
        initialSearchParams: "view=allocation",
      },
    );

    await waitFor(() => {
      expect(
        screen.getByText("資産配分の対象となる明細がありません。"),
      ).toBeInTheDocument();
    });
  });
});
