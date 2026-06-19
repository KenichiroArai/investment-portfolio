import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { AnalysisSubNav } from "@/components/AnalysisSubNav";
import { SettingsSidebar } from "@/components/layout/settings-sidebar";
import { PortfolioContextBar } from "@/components/PortfolioContextBar";

const usePathname = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: vi.fn(),
    push: vi.fn(),
  }),
  usePathname: () => usePathname(),
  useSearchParams: () => new URLSearchParams(),
}));

describe("layout components", () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { assign: vi.fn() },
    });
  });

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
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
      })),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    delete process.env.NEXT_PUBLIC_DATA_SOURCE;
  });

  describe("static mode", () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_DATA_SOURCE = "static";
    });

    it("hides analysis sub navigation", () => {
      usePathname.mockReturnValue("/portfolios/ideco/analysis/");
      const { container } = render(<AnalysisSubNav portfolioCode="ideco" />);
      expect(container).toBeEmptyDOMElement();
    });

    it("hides settings link in portfolio context bar", async () => {
      usePathname.mockReturnValue("/portfolios/ideco/");
      render(<PortfolioContextBar portfolioCode="ideco" />);

      await waitFor(() => {
        expect(screen.getByRole("navigation", { name: "口座メニュー" })).toBeInTheDocument();
      });
      expect(screen.queryByRole("link", { name: "設定" })).not.toBeInTheDocument();
      expect(screen.getByRole("link", { name: "資産配分" })).toHaveAttribute(
        "href",
        "/portfolios/ideco/analysis",
      );
    });
  });

  describe("api mode", () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_DATA_SOURCE = "api";
    });

    it("renders analysis sub navigation with active view link", () => {
      usePathname.mockReturnValue("/portfolios/ideco/analysis/");
      render(<AnalysisSubNav portfolioCode="ideco" />);

      const viewLink = screen.getByRole("link", { name: "表示" });
      expect(viewLink).toHaveAttribute("href", "/portfolios/ideco/analysis");
      expect(viewLink).toHaveAttribute("aria-current", "page");
      expect(screen.getByRole("link", { name: "分類設定" })).toHaveAttribute(
        "href",
        "/portfolios/ideco/settings/classification",
      );
    });

    it("marks classification settings as active on settings route", () => {
      usePathname.mockReturnValue("/portfolios/ideco/settings/classification/");
      render(<AnalysisSubNav portfolioCode="ideco" />);

      expect(screen.getByRole("link", { name: "分類設定" })).toHaveAttribute(
        "aria-current",
        "page",
      );
    });

    it("renders portfolio context bar tabs and settings link", async () => {
      usePathname.mockReturnValue("/portfolios/ideco/");
      render(<PortfolioContextBar portfolioCode="ideco" />);

      await waitFor(() => {
        expect(screen.getByRole("navigation", { name: "口座メニュー" })).toBeInTheDocument();
      });
      expect(screen.getByRole("link", { name: "概要" })).toHaveAttribute(
        "href",
        "/portfolios/ideco",
      );
      expect(screen.getByRole("link", { name: "明細" })).toHaveAttribute(
        "href",
        "/portfolios/ideco/holdings",
      );
      expect(screen.getByRole("link", { name: "資産配分" })).toHaveAttribute(
        "href",
        "/portfolios/ideco/analysis",
      );
      expect(screen.getByRole("link", { name: "設定" })).toHaveAttribute(
        "href",
        "/portfolios/ideco/settings/data",
      );
    });

    it("hides context tabs on settings route", () => {
      usePathname.mockReturnValue("/portfolios/ideco/settings/data/");
      render(<PortfolioContextBar portfolioCode="ideco" />);

      expect(screen.queryByRole("navigation", { name: "口座メニュー" })).not.toBeInTheDocument();
      expect(screen.getByRole("link", { name: "設定" })).toBeInTheDocument();
    });

    it("renders portfolio selector when multiple portfolios exist", async () => {
      const user = userEvent.setup();
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => ({
          ok: true,
          status: 200,
          json: async () => [
            { id: "p1", code: "ideco", name: "iDeCo", kind: "ideco" },
            { id: "p2", code: "nisa", name: "NISA", kind: "generic" },
          ],
        })),
      );

      usePathname.mockReturnValue("/portfolios/ideco/analysis/");
      render(<PortfolioContextBar portfolioCode="ideco" />);

      await waitFor(() => {
        expect(screen.getByRole("combobox", { name: "口座を選択" })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("combobox", { name: "口座を選択" }));
      await user.click(screen.getByRole("option", { name: "NISA" }));
      expect(window.location.assign).toHaveBeenCalledWith("/portfolios/nisa/");
    });

    it("marks analysis and trends tabs active on nested routes", () => {
      usePathname.mockReturnValue("/portfolios/ideco/trends/");
      render(<PortfolioContextBar portfolioCode="ideco" />);

      expect(screen.getByRole("link", { name: "推移" })).toHaveAttribute(
        "aria-current",
        "page",
      );
    });

    it("renders settings sidebar navigation links", () => {
      usePathname.mockReturnValue("/portfolios/ideco/settings/data/");
      render(<SettingsSidebar portfolioCode="ideco" />);

      expect(screen.getByRole("navigation", { name: "設定メニュー" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /データ管理/ })).toHaveAttribute(
        "href",
        "/portfolios/ideco/settings/data",
      );
      expect(screen.getByRole("link", { name: /分類設定/ })).toHaveAttribute(
        "href",
        "/portfolios/ideco/settings/classification",
      );
      expect(screen.getByRole("button", { name: "設定メニュー" })).toBeInTheDocument();
    });
  });
});
