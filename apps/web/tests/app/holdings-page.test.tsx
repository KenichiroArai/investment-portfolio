import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import HoldingsPage, {
  generateStaticParams,
} from "@/app/portfolios/[code]/holdings/page";

describe("HoldingsPage", () => {
  it("exposes static params for ideco", () => {
    expect(generateStaticParams()).toEqual([{ code: "ideco" }]);
  });

  it("renders holdings view for portfolio code", async () => {
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

    const element = await HoldingsPage({
      params: Promise.resolve({ code: "ideco" }),
    });
    render(element);

    await waitFor(() => {
      expect(screen.getByText(/保有銘柄がありません/)).toBeInTheDocument();
    });
  });
});
