import { cleanup, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PortfolioAllocationView } from "@/features/portfolio-allocation/PortfolioAllocationView";
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
  analysisSchemes: [{ schemeCode: "ideco_region", schemeName: "地域分類" }],
  metrics: [],
  lines: [
    {
      id: "line-1",
      instrumentId: "inst-1",
      instrumentName: "テスト銘柄",
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
      ],
    },
  ],
};

describe("PortfolioAllocationView", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders allocation panel and composition target card", async () => {
    vi.stubGlobal(
      "fetch",
      createPortfolioFetchMock({
        snapshot: snapshotFixture,
        targetPortfolioWeights: [{ instrumentId: "inst-1", targetRatio: 0.5 }],
        targetAllocations: {
          ideco_region: [{ valueCode: "domestic", targetRatio: 0.4 }],
        },
      }),
    );

    renderWithPortfolioTime(
      <PortfolioAllocationView portfolioCode="ideco" portfolioKind="ideco" />,
      {
        pathname: "/portfolios/ideco/portfolio-allocation",
        initialSearchParams: "view=allocation",
      },
    );

    await waitFor(() => {
      expect(screen.getByText("銘柄別構成比")).toBeInTheDocument();
    });

    expect(screen.getByText("リバランス設定")).toBeInTheDocument();
    expect(screen.getByText("売買提案")).toBeInTheDocument();
    expect(screen.getByText(/合計買い/)).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "資産配分目標" })).toBeInTheDocument();
    expect(screen.getByText("国内")).toBeInTheDocument();
  });

  it("excludes untagged holdings from composition targets and normalizes tagged targets", async () => {
    const multiLineSnapshot = {
      ...snapshotFixture,
      analysisSchemes: [{ schemeCode: "other", schemeName: "その他" }],
      lines: [
        {
          id: "line-1",
          instrumentId: "inst-1",
          instrumentName: "国内銘柄",
          sortOrder: 0,
          quantity: 1,
          marketValueMinor: 500_000,
          bookValueMinor: null,
          metrics: [],
          instrumentAttributes: [],
          tags: [
            {
              schemeCode: "other",
              schemeName: "その他",
              valueCode: "domestic_other",
              valueName: "国内その他資産",
            },
          ],
        },
        {
          id: "line-2",
          instrumentId: "inst-2",
          instrumentName: "複合銘柄",
          sortOrder: 1,
          quantity: 1,
          marketValueMinor: 400_000,
          bookValueMinor: null,
          metrics: [],
          instrumentAttributes: [],
          tags: [
            {
              schemeCode: "other",
              schemeName: "その他",
              valueCode: "composite",
              valueName: "内外資産複合",
            },
          ],
        },
        {
          id: "line-3",
          instrumentId: "inst-3",
          instrumentName: "タグなし銘柄",
          sortOrder: 2,
          quantity: 1,
          marketValueMinor: 100_000,
          bookValueMinor: null,
          metrics: [],
          instrumentAttributes: [],
          tags: [],
        },
      ],
    };

    vi.stubGlobal(
      "fetch",
      createPortfolioFetchMock({
        snapshot: multiLineSnapshot,
        targetPortfolioWeights: [
          { instrumentId: "inst-1", targetRatio: 0.29 },
          { instrumentId: "inst-2", targetRatio: 0.21 },
          { instrumentId: "inst-3", targetRatio: 0.5 },
        ],
        targetAllocations: {
          other: [
            { valueCode: "domestic_other", targetRatio: 0.6 },
            { valueCode: "composite", targetRatio: 0.4 },
          ],
        },
      }),
    );

    renderWithPortfolioTime(
      <PortfolioAllocationView portfolioCode="ideco" portfolioKind="ideco" />,
      {
        pathname: "/portfolios/ideco/portfolio-allocation",
        initialSearchParams: "view=allocation",
      },
    );

    await waitFor(() => {
      expect(screen.getByText("国内その他資産")).toBeInTheDocument();
    });
    expect(screen.getByText("内外資産複合")).toBeInTheDocument();
    expect(screen.queryByText("未分類")).not.toBeInTheDocument();
    expect(screen.getByText("58.00%")).toBeInTheDocument();
    expect(screen.getByText("42.00%")).toBeInTheDocument();
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
      <PortfolioAllocationView portfolioCode="ideco" portfolioKind="ideco" />,
      {
        pathname: "/portfolios/ideco/portfolio-allocation",
        initialSearchParams: "view=allocation",
      },
    );

    await waitFor(() => {
      expect(screen.getByText("銘柄別構成比")).toBeInTheDocument();
    });

    expect(screen.getByText("リバランス設定")).toBeInTheDocument();
    expect(screen.getByText("売買提案")).toBeInTheDocument();
    expect(screen.getByText(/合計買い/)).toBeInTheDocument();
  });

  it("shows empty message when snapshot is missing", async () => {
    vi.stubGlobal(
      "fetch",
      createPortfolioFetchMock({
        snapshot: null,
      }),
    );

    renderWithPortfolioTime(
      <PortfolioAllocationView portfolioCode="ideco" portfolioKind="ideco" />,
      {
        pathname: "/portfolios/ideco/portfolio-allocation",
        initialSearchParams: "view=allocation",
      },
    );

    await waitFor(() => {
      expect(
        screen.getByText("ポートフォリオ配分の対象となる明細がありません。"),
      ).toBeInTheDocument();
    });
  });
});
