import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GlobalAnalysisView } from "@/features/analysis/GlobalAnalysisView";

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

describe("GlobalAnalysisView", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_DATA_SOURCE = "static";
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    delete process.env.NEXT_PUBLIC_DATA_SOURCE;
  });

  it("shows loading skeleton initially", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
    const { container } = render(<GlobalAnalysisView />);
    expect(container.querySelector(".animate-pulse")).toBeTruthy();
  });

  it("renders merged allocation table", async () => {
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
        return {
          ok: true,
          status: 200,
          json: async () => snapshotFixture,
        };
      }),
    );
    render(<GlobalAnalysisView />);
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "全口座の資産配分" })).toBeInTheDocument();
    });
    expect(screen.getByText("口座別内訳")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "iDeCo" })).toHaveAttribute(
      "href",
      "/portfolios/ideco",
    );
    expect(screen.getByRole("tab", { name: "地域分類" })).toBeInTheDocument();
  });

  it("switches scheme tabs and expands allocation with portfolio column", async () => {
    const user = userEvent.setup();
    const multiSchemeSnapshot = {
      ...snapshotFixture,
      analysisSchemes: [
        { schemeCode: "ideco_region", schemeName: "地域分類" },
        { schemeCode: "ideco_asset_class", schemeName: "資産分類" },
      ],
      lines: [
        {
          ...snapshotFixture.lines[0],
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
        return {
          ok: true,
          status: 200,
          json: async () => multiSchemeSnapshot,
        };
      }),
    );

    render(<GlobalAnalysisView />);
    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "資産分類" })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("tab", { name: "資産分類" }));
    await user.click(
      screen.getByRole("button", { name: "株式 の内訳を開く" }),
    );
    expect(screen.getAllByRole("columnheader", { name: "口座" }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("テスト銘柄")).toBeInTheDocument();
  });

  it("shows message when no classification axes are available", async () => {
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
                code: "generic",
                name: "一般口座",
                kind: "generic",
              },
            ],
          };
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({
            ...snapshotFixture,
            portfolioCode: "generic",
            portfolioName: "一般口座",
            analysisSchemes: [],
            lines: [],
          }),
        };
      }),
    );

    render(<GlobalAnalysisView />);
    await waitFor(() => {
      expect(
        screen.getByText("横断分析に利用できる分類軸がありません。"),
      ).toBeInTheDocument();
    });
  });

  it("shows error when portfolio list fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 500,
        json: async () => ({}),
      })),
    );
    render(<GlobalAnalysisView />);
    await waitFor(() => {
      expect(screen.getByText("口座一覧の取得に失敗しました。")).toBeInTheDocument();
    });
  });

  it("shows empty message when no snapshots load", async () => {
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
        return {
          ok: false,
          status: 404,
          json: async () => ({}),
        };
      }),
    );
    render(<GlobalAnalysisView />);
    await waitFor(() => {
      expect(
        screen.getByText("資産配分の対象となる明細がありません。"),
      ).toBeInTheDocument();
    });
  });
});
