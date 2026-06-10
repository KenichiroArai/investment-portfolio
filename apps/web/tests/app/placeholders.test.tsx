import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import AnalysisSettingsPage from "@/app/portfolios/[code]/analysis/settings/page";
import EditPage from "@/app/portfolios/[code]/edit/page";
import RegisterPage from "@/app/portfolios/[code]/register/page";

describe("manage pages", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_DATA_SOURCE = "static";
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

  it("renders analysis settings page", async () => {
    const page = await AnalysisSettingsPage({
      params: Promise.resolve({ code: "ideco" }),
    });
    render(page);
    expect(
      screen.getByRole("heading", { name: "分析設定（ideco）" }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(/読み取り専用/);
    });
  });

  it("renders register page with manage as-of date field", async () => {
    const page = await RegisterPage({
      params: Promise.resolve({ code: "ideco" }),
    });
    render(page);
    expect(screen.getByRole("heading", { name: "登録（ideco）" })).toBeInTheDocument();
    expect(screen.getByText("操作対象の基準日")).toBeInTheDocument();
    expect(
      screen.getByText(/閲覧画面の基準日切り替えとは別です/),
    ).toBeInTheDocument();
    expect(document.querySelector(".snapshot-time-bar")).toBeNull();
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(/読み取り専用/);
    });
  });

  it("renders edit page with readonly manage as-of date when snapshot exists", async () => {
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
          return new Response(
            JSON.stringify({
              id: "s1",
              portfolioCode: "ideco",
              portfolioName: "iDeCo",
              asOfDate: "2026-06-01",
              analysisSchemes: [],
              metrics: [],
              lines: [],
            }),
            { status: 200 },
          );
        }
        return new Response(JSON.stringify([]), { status: 200 });
      }),
    );

    const page = await EditPage({
      params: Promise.resolve({ code: "ideco" }),
    });
    render(page);
    expect(screen.getByRole("heading", { name: "更新（ideco）" })).toBeInTheDocument();
    expect(document.querySelector(".snapshot-time-bar")).toBeNull();
    await waitFor(() => {
      expect(screen.getByText("操作対象の基準日")).toBeInTheDocument();
      expect(screen.getByText("2026/06/01")).toBeInTheDocument();
      expect(screen.getByRole("status")).toHaveTextContent(/読み取り専用/);
    });
  });
});
