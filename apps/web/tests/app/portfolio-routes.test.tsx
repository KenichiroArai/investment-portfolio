import { cleanup, render, screen, waitFor } from "@testing-library/react";
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
import { TrendsView } from "@/features/trends/TrendsView";
import {
  createPortfolioFetchMock,
  renderWithPortfolioTime,
} from "../helpers/portfolio-time-test-utils";

const mockRedirect = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: vi.fn(),
    push: vi.fn(),
  }),
  usePathname: () => "/portfolios/ideco/",
  useSearchParams: () => new URLSearchParams(),
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
    expect(generatePortfolioLayoutStaticParams()).toEqual([{ code: "ideco" }]);
    expect(generateOverviewStaticParams()).toEqual([{ code: "ideco" }]);
    expect(generateAnalysisStaticParams()).toEqual([{ code: "ideco" }]);
    expect(generateAnalysisSettingsStaticParams()).toEqual([{ code: "ideco" }]);
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

  it("renders portfolio analysis layout with sub navigation", async () => {
    const layout = await PortfolioAnalysisLayout({
      params: Promise.resolve({ code: "ideco" }),
      children: <p>analysis-body</p>,
    });
    render(layout);
    expect(screen.getByRole("navigation", { name: "分析メニュー" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "表示" })).toHaveAttribute(
      "href",
      "/portfolios/ideco/analysis",
    );
    expect(screen.getByText("analysis-body")).toBeInTheDocument();
  });

  it("renders portfolio analysis page", async () => {
    const page = await PortfolioAnalysisPage({
      params: Promise.resolve({ code: "ideco" }),
    });
    expect(page).toEqual(
      <AnalysisView portfolioCode="ideco" portfolioKind="ideco" />,
    );
    renderWithPortfolioTime(page);
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

  it("renders settings layout with sidebar", async () => {
    const layout = await SettingsLayout({
      params: Promise.resolve({ code: "ideco" }),
      children: <p>settings-body</p>,
    });
    render(layout);
    expect(screen.getByRole("navigation", { name: "設定メニュー" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /データ管理/ })).toHaveAttribute(
      "href",
      "/portfolios/ideco/settings/data",
    );
    expect(screen.getByText("settings-body")).toBeInTheDocument();
  });

  it("redirects settings index page to data settings", async () => {
    await expect(
      SettingsPage({
        params: Promise.resolve({ code: "ideco" }),
      }),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/portfolios/ideco/settings/data/");
  });

  it("renders trends page", async () => {
    const page = await TrendsPage({
      params: Promise.resolve({ code: "ideco" }),
    });
    expect(page).toEqual(<TrendsView portfolioCode="ideco" />);
    renderWithPortfolioTime(page);
    expect(screen.getByRole("heading", { name: "推移" })).toBeInTheDocument();
    expect(screen.getByText(/口座: ideco/)).toBeInTheDocument();
  });
});
