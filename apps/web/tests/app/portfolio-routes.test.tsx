import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { Suspense } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import GlobalAnalysisPage from "@/app/analysis/page";
import PortfolioAnalysisLayout from "@/app/portfolios/[code]/analysis/layout";
import PortfolioAnalysisPage, {
  generateStaticParams as generateAnalysisStaticParams,
} from "@/app/portfolios/[code]/analysis/page";
import AnalysisSettingsPage, {
  generateStaticParams as generateAnalysisSettingsStaticParams,
} from "@/app/portfolios/[code]/analysis/settings/page";
import EditPage from "@/app/portfolios/[code]/edit/page";
import PortfolioLayout, {
  generateStaticParams as generatePortfolioLayoutStaticParams,
} from "@/app/portfolios/[code]/layout";
import PortfolioOverviewPage, {
  generateStaticParams as generateOverviewStaticParams,
} from "@/app/portfolios/[code]/page";
import RegisterPage from "@/app/portfolios/[code]/register/page";
import SettingsLayout from "@/app/portfolios/[code]/settings/layout";
import SettingsPage from "@/app/portfolios/[code]/settings/page";
import TrendsPage from "@/app/portfolios/[code]/trends/page";
import { AnalysisView } from "@/features/analysis/AnalysisView";
import { GlobalAnalysisView } from "@/features/analysis/GlobalAnalysisView";
import { PortfolioOverviewView } from "@/features/portfolio/PortfolioOverviewView";
import { PortfolioShell } from "@/features/portfolio/PortfolioShell";
import { LegacyPortfolioRouteRedirect } from "@/features/portfolio/LegacyPortfolioRouteRedirect";
import { generatePortfolioStaticParams } from "@/lib/portfolio-catalog";
import {
  createPortfolioFetchMock,
  renderWithPortfolioTime,
} from "../helpers/portfolio-time-test-utils";
import { createManageFetchMock } from "../helpers/manage-api-test-utils";
import { portfolioTimeNavigationState } from "../helpers/portfolio-time-navigation-state";

const mockRedirect = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: vi.fn(),
    push: vi.fn(),
  }),
  usePathname: () => portfolioTimeNavigationState.pathname,
  useSearchParams: () => portfolioTimeNavigationState.searchParams,
  redirect: (url: string) => {
    mockRedirect(url);
    throw new Error("NEXT_REDIRECT");
  },
}));

const snapshotFixture = {
  id: "s1",
  portfolioCode: "ideco",
  portfolioName: "iDeCo",
  asOfDate: "2026-06-01",
  analysisSchemes: [{ schemeCode: "ideco_region", schemeName: "地域分類" }],
  metrics: [],
  lines: [
    {
      id: "l1",
      instrumentId: "i1",
      instrumentName: "テスト銘柄",
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

describe("portfolio routes", () => {
  beforeEach(() => {
    mockRedirect.mockReset();
    process.env.NEXT_PUBLIC_DATA_SOURCE = "static";
    vi.stubGlobal("fetch", createPortfolioFetchMock({ snapshot: snapshotFixture }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    delete process.env.NEXT_PUBLIC_DATA_SOURCE;
  });

  it("exposes static params for portfolio routes", () => {
    const expected = generatePortfolioStaticParams();
    expect(generatePortfolioLayoutStaticParams()).toEqual(expected);
    expect(generateOverviewStaticParams()).toEqual(expected);
    expect(generateAnalysisStaticParams()).toEqual(expected);
    expect(generateAnalysisSettingsStaticParams()).toEqual(expected);
  });

  it("renders global analysis page", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("portfolios.json") || url.endsWith("/portfolios")) {
          return {
            ok: true,
            status: 200,
            json: async () => [
              {
                id: "p1",
                code: "ideco",
                name: "iDeCo",
                kind: "ideco",
              },
            ],
          };
        }
        if (url.includes("current.json") || url.includes("snapshot/current")) {
          return {
            ok: true,
            status: 200,
            json: async () => snapshotFixture,
          };
        }
        return {
          ok: true,
          status: 200,
          json: async () => snapshotFixture,
        };
      }),
    );

    const page = GlobalAnalysisPage();
    render(page);
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "全口座の資産配分" })).toBeInTheDocument();
    });
    expect(page).toEqual(<GlobalAnalysisView />);
  });

  it("renders portfolio layout with resolved code", async () => {
    const layout = await PortfolioLayout({
      params: Promise.resolve({ code: "ideco" }),
      children: <span>child-content</span>,
    });
    expect(layout).toEqual(
      <PortfolioShell portfolioCode="ideco">
        <span>child-content</span>
      </PortfolioShell>,
    );
    render(layout);
    await waitFor(() => {
      expect(screen.getByText("child-content")).toBeInTheDocument();
    });
  });

  it("renders portfolio overview page", async () => {
    const page = await PortfolioOverviewPage({
      params: Promise.resolve({ code: "ideco" }),
    });
    expect(page).toEqual(<PortfolioOverviewView portfolioCode="ideco" />);
    renderWithPortfolioTime(page);
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "資産状況" })).toBeInTheDocument();
    });
  });

  it("renders portfolio analysis layout with children only", async () => {
    const layout = await PortfolioAnalysisLayout({
      children: <p>analysis-body</p>,
    });
    const { container } = render(layout);
    expect(container.querySelector('[aria-label="分析メニュー"]')).toBeNull();
    expect(screen.getByText("analysis-body")).toBeInTheDocument();
  });

  it("renders portfolio analysis page", async () => {
    const page = await PortfolioAnalysisPage({
      params: Promise.resolve({ code: "ideco" }),
    });
    expect(page).toEqual(
      <AnalysisView portfolioCode="ideco" portfolioKind="ideco" />,
    );
    renderWithPortfolioTime(page, {
      pathname: "/portfolios/ideco/analysis",
      initialSearchParams: "view=allocation",
    });
    await waitFor(() => {
      expect(screen.getByText(/評価額合計/)).toBeInTheDocument();
    });
  });

  it("redirects analysis settings page to classification settings", async () => {
    await expect(
      AnalysisSettingsPage({
        params: Promise.resolve({ code: "ideco" }),
      }),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith(
      "/portfolios/ideco/settings/classification/",
    );
  });

  it("redirects edit page to data settings", async () => {
    await expect(
      EditPage({
        params: Promise.resolve({ code: "ideco" }),
      }),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/portfolios/ideco/settings/data/");
  });

  it("redirects register page to data settings", async () => {
    await expect(
      RegisterPage({
        params: Promise.resolve({ code: "ideco" }),
      }),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/portfolios/ideco/settings/data/");
  });

  it("redirects settings layout to portfolio overview in static mode", async () => {
    await expect(
      SettingsLayout({
        params: Promise.resolve({ code: "ideco" }),
        children: <p>settings-body</p>,
      }),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/portfolios/ideco/");
  });

  it("renders settings layout with sidebar in api mode", async () => {
    process.env.NEXT_PUBLIC_DATA_SOURCE = "api";
    const layout = await SettingsLayout({
      params: Promise.resolve({ code: "ideco" }),
      children: <p>settings-body</p>,
    });
    render(layout);
    expect(screen.getByRole("navigation", { name: "設定メニュー" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "銘柄 データ管理" })).toHaveAttribute(
      "href",
      "/portfolios/ideco/settings/data?tab=instrument",
    );
    expect(screen.getByText("settings-body")).toBeInTheDocument();
  });

  it("renders settings index page with data manage view", async () => {
    process.env.NEXT_PUBLIC_DATA_SOURCE = "api";
    vi.stubGlobal("fetch", createManageFetchMock());
    const page = await SettingsPage({
      params: Promise.resolve({ code: "ideco" }),
      searchParams: Promise.resolve({}),
    });
    render(page);
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "データ管理" })).toBeInTheDocument();
    });
  });

  it("renders trends redirect page", async () => {
    const page = await TrendsPage({
      params: Promise.resolve({ code: "ideco" }),
    });
    expect(page).toEqual(
      <Suspense fallback={null}>
        <LegacyPortfolioRouteRedirect portfolioCode="ideco" target="trends" />
      </Suspense>,
    );
  });
});
