import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AppNav } from "@/components/AppNav";

describe("AppNav", () => {
  it("renders global navigation links", () => {
    render(<AppNav />);
    expect(screen.getByRole("link", { name: "ホーム" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "全口座の資産配分" })).toHaveAttribute(
      "href",
      "/analysis",
    );
  });
});
