import { cleanup, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TrendsView } from "@/features/trends/TrendsView";
import {
  createPortfolioFetchMock,
  renderWithPortfolioTime,
} from "../helpers/portfolio-time-test-utils";

describe("TrendsView", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders page header and detail panel", async () => {
    vi.stubGlobal(
      "fetch",
      createPortfolioFetchMock({
        snapshot: {
          id: "s1",
          portfolioCode: "ideco",
          portfolioName: "iDeCo",
          asOfDate: "2026-06-01",
          analysisSchemes: [],
          metrics: [],
          lines: [],
        },
      }),
    );
    renderWithPortfolioTime(<TrendsView portfolioCode="ideco" />);
    expect(screen.getByRole("heading", { name: "推移" })).toBeInTheDocument();
    expect(screen.getByText(/口座: ideco/)).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.getByText(/選択した期間に推移データがありません/),
      ).toBeInTheDocument();
    });
  });
});
