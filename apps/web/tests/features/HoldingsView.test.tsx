import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HoldingsView } from "@/features/portfolio/HoldingsView";

describe("HoldingsView", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows loading state initially", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
    render(<HoldingsView portfolioCode="ideco" />);
    expect(screen.getByText("読み込み中…")).toBeInTheDocument();
  });

  it("shows API connection error when fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network")),
    );
    render(<HoldingsView portfolioCode="ideco" />);
    await waitFor(() => {
      expect(screen.getByText(/API に接続できません/)).toBeInTheDocument();
    });
  });

  it("renders snapshot table", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          id: "s1",
          portfolioCode: "ideco",
          portfolioName: "iDeCo",
          asOfDate: "2026-06-01",
          lines: [
            {
              id: "l1",
              instrumentId: "i1",
              instrumentName: "テストファンド",
              quantity: 10,
              marketValueMinor: 10000,
              bookValueMinor: null,
              tags: [
                {
                  schemeCode: "region",
                  schemeName: "地域",
                  valueCode: "japan",
                  valueName: "日本",
                },
              ],
            },
          ],
        }),
      }),
    );
    render(<HoldingsView portfolioCode="ideco" />);
    await waitFor(() => {
      expect(screen.getByText("テストファンド")).toBeInTheDocument();
      expect(screen.getByText(/地域: 日本/)).toBeInTheDocument();
    });
  });

  it("shows fetch error when response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({}),
      }),
    );
    render(<HoldingsView portfolioCode="ideco" />);
    await waitFor(() => {
      expect(screen.getByText(/データの取得に失敗しました/)).toBeInTheDocument();
    });
  });

  it("shows messages for 404 and empty tags", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({}),
      }),
    );
    render(<HoldingsView portfolioCode="ideco" />);
    await waitFor(() => {
      expect(screen.getByText(/明細がまだ登録されていません/)).toBeInTheDocument();
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          id: "s1",
          portfolioCode: "ideco",
          portfolioName: "iDeCo",
          asOfDate: "2026-06-01",
          lines: [
            {
              id: "l1",
              instrumentId: "i1",
              instrumentName: "無タグ",
              quantity: 1,
              marketValueMinor: 100,
              bookValueMinor: null,
              tags: [],
            },
          ],
        }),
      }),
    );
    render(<HoldingsView portfolioCode="ideco" />);
    await waitFor(() => {
      expect(screen.getByText("—")).toBeInTheDocument();
    });
  });

  it("ignores fetch result after unmount", async () => {
    let resolveFetch: (value: unknown) => void = () => {};
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise((resolve) => {
            resolveFetch = resolve;
          }),
      ),
    );
    const { unmount } = render(<HoldingsView portfolioCode="ideco" />);
    unmount();
    resolveFetch({
      ok: true,
      status: 200,
      json: async () => ({
        id: "s1",
        portfolioCode: "ideco",
        portfolioName: "iDeCo",
        asOfDate: "2026-06-01",
        lines: [],
      }),
    });
    await new Promise((r) => setTimeout(r, 10));
    expect(screen.queryByText(/保有銘柄がありません/)).not.toBeInTheDocument();
  });

  it("shows fallback when snapshot is missing without error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => null,
      }),
    );
    render(<HoldingsView portfolioCode="ideco" />);
    await waitFor(() => {
      expect(screen.getByText("明細がありません。")).toBeInTheDocument();
    });
  });

  it("shows empty holdings message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          id: "s1",
          portfolioCode: "ideco",
          portfolioName: "iDeCo",
          asOfDate: "2026-06-01",
          lines: [],
        }),
      }),
    );
    render(<HoldingsView portfolioCode="ideco" />);
    await waitFor(() => {
      expect(screen.getByText(/保有銘柄がありません/)).toBeInTheDocument();
    });
  });
});
