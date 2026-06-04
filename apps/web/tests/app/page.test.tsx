import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "@/app/page";

describe("Home", () => {
  it("renders landing content", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "investment-portfolio",
    );
    expect(
      screen.getByText(/投資ポートフォリオの管理・分析を行うためのツールです/),
    ).toBeInTheDocument();
    expect(screen.getByText(/v0.1.0/)).toBeInTheDocument();
  });
});
