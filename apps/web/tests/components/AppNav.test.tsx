import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TopBar } from "@/components/layout/top-bar";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: "light", setTheme: vi.fn() }),
}));

describe("TopBar", () => {
  it("renders global navigation links", () => {
    render(<TopBar />);
    expect(screen.getByRole("link", { name: "ホーム" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "全口座分析" })).toHaveAttribute(
      "href",
      "/analysis",
    );
  });
});
