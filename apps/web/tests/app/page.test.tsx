import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import Home from "@/app/page";

describe("Home", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders landing content", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [],
      }),
    );

    render(<Home />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "investment-portfolio",
    );
    expect(
      screen.getByText(/投資ポートフォリオの管理・分析を行うためのツールです/),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/登録済みの口座がありません/)).toBeInTheDocument();
    });
  });
});
