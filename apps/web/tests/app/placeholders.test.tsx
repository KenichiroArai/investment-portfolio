import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import AnalysisPlaceholderPage from "@/app/analysis/page";
import EditPlaceholderPage from "@/app/portfolios/ideco/edit/page";
import RegisterPlaceholderPage from "@/app/portfolios/ideco/register/page";

describe("placeholder pages", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders analysis placeholder", () => {
    render(<AnalysisPlaceholderPage />);
    expect(screen.getByRole("heading", { name: "分析" })).toBeInTheDocument();
    expect(screen.getByText(/準備中です/)).toBeInTheDocument();
  });

  it("renders register placeholder", () => {
    render(<RegisterPlaceholderPage />);
    expect(screen.getByRole("heading", { name: "登録" })).toBeInTheDocument();
  });

  it("renders edit placeholder", () => {
    render(<EditPlaceholderPage />);
    expect(screen.getByRole("heading", { name: "更新" })).toBeInTheDocument();
  });
});
