import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AppNav } from "@/components/AppNav";

describe("AppNav", () => {
  it("renders enabled and disabled menu items", () => {
    render(<AppNav />);
    expect(screen.getByRole("link", { name: "ホーム" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "口座明細（iDeCo）" })).toHaveAttribute(
      "href",
      "/portfolios/ideco/holdings",
    );
    expect(screen.getByText("登録")).toHaveClass("app-nav__disabled");
    expect(screen.getByText("分析")).toHaveClass("app-nav__disabled");
  });
});
