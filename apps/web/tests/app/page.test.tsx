import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import Home from "@/app/page";
import { HomeView } from "@/features/home/HomeView";
import { MANAGE_SNAPSHOT } from "../helpers/manage-api-test-utils";

const mockPush = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

const toastSuccess = vi.hoisted(() => vi.fn());
const toastError = vi.hoisted(() => vi.fn());

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccess,
    error: toastError,
  },
}));

function createHomeFetchMock(options: {
  portfolios?: Array<{ id: string; code: string; name: string; kind: string }>;
  portfolioOk?: boolean;
  snapshotByCode?: Record<string, { status: number; body?: unknown }>;
  failFetch?: boolean;
}) {
  const portfolios = options.portfolios ?? [
    { id: "p1", code: "ideco", name: "iDeCo", kind: "ideco" },
    { id: "p2", code: "nisa", name: "NISA", kind: "nisa" },
  ];

  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    if (options.failFetch) {
      throw new Error("network");
    }

    const url = String(input);
    const method = init?.method ?? "GET";

    if (url.endsWith("/portfolios") && method === "POST") {
      const body = JSON.parse(String(init?.body)) as {
        code: string;
        name: string;
        kind: string;
      };
      return {
        ok: true,
        status: 200,
        json: async () => ({
          id: "p-new",
          code: body.code,
          name: body.name,
          kind: body.kind,
        }),
      };
    }

    if (url.endsWith("/portfolios")) {
      if (options.portfolioOk === false) {
        return { ok: false, status: 500, json: async () => ({}) };
      }
      return { ok: true, status: 200, json: async () => portfolios };
    }

    for (const portfolio of portfolios) {
      if (url.includes(`/portfolios/${portfolio.code}/snapshot/current`)) {
        const entry = options.snapshotByCode?.[portfolio.code] ?? {
          status: 200,
          body: {
            ...MANAGE_SNAPSHOT,
            portfolioCode: portfolio.code,
            portfolioName: portfolio.name,
            metrics: [
              {
                code: "ideco_total_contributions",
                integerValue: 400_000,
                realValue: null,
                textValue: null,
              },
            ],
            lines: [
              {
                ...MANAGE_SNAPSHOT.lines[0],
                marketValueMinor:
                  portfolio.code === "ideco" ? 1_000_000 : 500_000,
                bookValueMinor:
                  portfolio.code === "ideco" ? 900_000 : 600_000,
              },
            ],
          },
        };

        if (entry.status === 404) {
          return { ok: false, status: 404, json: async () => ({}) };
        }
        if (entry.status !== 200) {
          return { ok: false, status: entry.status, json: async () => ({}) };
        }
        return { ok: true, status: 200, json: async () => entry.body };
      }
    }

    return { ok: true, status: 200, json: async () => ({}) };
  });
}

describe("Home", () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  beforeEach(() => {
    process.env.NEXT_PUBLIC_DATA_SOURCE = "api";
    mockPush.mockReset();
    toastSuccess.mockReset();
    toastError.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    delete process.env.NEXT_PUBLIC_DATA_SOURCE;
  });

  it("renders landing content", async () => {
    vi.stubGlobal("fetch", createHomeFetchMock({ portfolios: [] }));

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

  it("renders portfolio cards with snapshot stats", async () => {
    vi.stubGlobal("fetch", createHomeFetchMock({}));

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText("総資産")).toBeInTheDocument();
    });
    expect(screen.getAllByText("損益").length).toBeGreaterThan(0);
    expect(screen.getAllByText("利益率").length).toBeGreaterThan(0);
    expect(screen.getAllByText("iDeCo").length).toBeGreaterThan(0);
    expect(screen.getAllByText("NISA").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /全口座の資産配分を見る/ })).toHaveAttribute(
      "href",
      "/analysis",
    );
  });

  it("shows portfolio without snapshot as 明細未登録", async () => {
    vi.stubGlobal(
      "fetch",
      createHomeFetchMock({
        portfolios: [{ id: "p1", code: "ideco", name: "iDeCo", kind: "ideco" }],
        snapshotByCode: {
          ideco: { status: 404 },
        },
      }),
    );

    render(<HomeView />);

    await waitFor(() => {
      expect(screen.getByText("明細未登録")).toBeInTheDocument();
    });
    expect(screen.queryByText("損益")).not.toBeInTheDocument();
  });

  it("shows error when portfolio list fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      createHomeFetchMock({ portfolioOk: false }),
    );

    render(<HomeView />);

    await waitFor(() => {
      expect(screen.getByText("口座一覧の取得に失敗しました。")).toBeInTheDocument();
    });
  });

  it("shows error when snapshot fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      createHomeFetchMock({
        snapshotByCode: {
          ideco: { status: 500 },
        },
      }),
    );

    render(<HomeView />);

    await waitFor(() => {
      expect(screen.getByText("スナップショットの取得に失敗しました。")).toBeInTheDocument();
    });
  });

  it("shows network error message", async () => {
    vi.stubGlobal(
      "fetch",
      createHomeFetchMock({ failFetch: true }),
    );

    render(<HomeView />);

    await waitFor(() => {
      expect(
        screen.getByText(/API に接続できません/),
      ).toBeInTheDocument();
    });
  });

  it("reloads portfolios after account change", async () => {
    const user = userEvent.setup();
    const fetchMock = createHomeFetchMock({});
    vi.stubGlobal("fetch", fetchMock);

    render(<HomeView />);
    await waitFor(() => {
      expect(screen.getAllByText("iDeCo").length).toBeGreaterThan(0);
    });

    await user.click(screen.getByRole("button", { name: /口座を追加/ }));
    await user.type(screen.getByLabelText("口座コード"), "tax");
    await user.type(screen.getByLabelText("口座名"), "課税");
    await user.click(screen.getByRole("button", { name: "登録" }));

    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith("口座を登録しました。");
    });
    expect(fetchMock.mock.calls.length).toBeGreaterThan(2);
  });
});
