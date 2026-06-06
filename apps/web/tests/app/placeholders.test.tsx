import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import AnalysisSettingsPlaceholderPage from "@/app/portfolios/[code]/analysis/settings/page";
import EditPlaceholderPage from "@/app/portfolios/[code]/edit/page";
import RegisterPlaceholderPage from "@/app/portfolios/[code]/register/page";

describe("placeholder pages", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders analysis settings placeholder", async () => {
    const page = await AnalysisSettingsPlaceholderPage({
      params: Promise.resolve({ code: "ideco" }),
    });
    render(page);
    expect(screen.getByRole("heading", { name: "分析設定（ideco）" })).toBeInTheDocument();
    expect(screen.getByText(/準備中です/)).toBeInTheDocument();
  });

  it("renders register placeholder", async () => {
    const page = await RegisterPlaceholderPage({
      params: Promise.resolve({ code: "ideco" }),
    });
    render(page);
    expect(screen.getByRole("heading", { name: "登録（ideco）" })).toBeInTheDocument();
  });

  it("renders edit placeholder", async () => {
    const page = await EditPlaceholderPage({
      params: Promise.resolve({ code: "ideco" }),
    });
    render(page);
    expect(screen.getByRole("heading", { name: "更新（ideco）" })).toBeInTheDocument();
  });
});
