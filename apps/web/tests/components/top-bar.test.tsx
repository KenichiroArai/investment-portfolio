import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TopBar } from "@/components/layout/top-bar";

const usePathname = vi.fn();
const setTheme = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => usePathname(),
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({
    theme: "light",
    setTheme,
  }),
}));

describe("TopBar", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("highlights active navigation link", () => {
    usePathname.mockReturnValue("/analysis/");
    render(<TopBar />);

    const homeLink = screen.getByRole("link", { name: "ホーム" });
    const analysisLink = screen.getByRole("link", { name: "全口座" });
    expect(homeLink.className).toContain("text-muted-foreground");
    expect(homeLink.className).not.toContain("bg-surface text-foreground");
    expect(analysisLink.className).toContain("bg-surface text-foreground");
    expect(analysisLink.className).toContain("border-border");
  });

  it("toggles theme after mount", async () => {
    const user = userEvent.setup();
    usePathname.mockReturnValue("/");
    render(<TopBar />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "テーマ切替" })).not.toBeDisabled();
    });

    await user.click(screen.getByRole("button", { name: "テーマ切替" }));
    expect(setTheme).toHaveBeenCalledWith("dark");
  });

  it("marks home active on root path", () => {
    usePathname.mockReturnValue("/");
    render(<TopBar />);

    expect(screen.getByRole("link", { name: "ホーム" }).className).toContain(
      "bg-surface",
    );
  });
});
