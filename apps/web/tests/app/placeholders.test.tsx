import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ClassificationSettingsPage from "@/app/portfolios/[code]/settings/classification/page";
import DataManagePage from "@/app/portfolios/[code]/settings/data/page";

describe("settings pages", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_DATA_SOURCE = "api";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/classification-schemes")) {
          return new Response(JSON.stringify([]), { status: 200 });
        }
        if (url.includes("/instruments")) {
          return new Response(JSON.stringify([]), { status: 200 });
        }
        if (url.includes("/snapshot/current")) {
          return new Response(JSON.stringify({ error: "No current snapshot" }), {
            status: 404,
          });
        }
        return new Response(JSON.stringify([]), { status: 200 });
      }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    delete process.env.NEXT_PUBLIC_DATA_SOURCE;
  });

  it("renders classification settings page", async () => {
    const page = await ClassificationSettingsPage({
      params: Promise.resolve({ code: "ideco" }),
      searchParams: Promise.resolve({}),
    });
    render(page);
    expect(
      screen.getByRole("heading", { name: "分類設定" }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("資産配分の集計軸を追加・編集します。")).toBeInTheDocument();
    });
  });

  it("renders data manage page with manage as-of date field", async () => {
    const page = await DataManagePage({
      params: Promise.resolve({ code: "ideco" }),
    });
    render(page);
    expect(screen.getByRole("heading", { name: "データ管理" })).toBeInTheDocument();
    expect(screen.getByText("操作対象の基準日")).toBeInTheDocument();
    expect(
      screen.getByText(/閲覧画面の基準日切り替えとは別です/),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "銘柄" })).toBeInTheDocument();
    });
  });
});
