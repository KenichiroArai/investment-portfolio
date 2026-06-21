import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TargetAllocationEditCard } from "@/features/allocation/TargetAllocationEditCard";

const toastSuccess = vi.hoisted(() => vi.fn());
const toastError = vi.hoisted(() => vi.fn());

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccess,
    error: toastError,
  },
}));

const valuesFixture = [
  { id: "v1", code: "domestic", name: "国内", sortOrder: 0 },
  { id: "v2", code: "foreign", name: "海外", sortOrder: 1 },
];

describe("TargetAllocationEditCard", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_DATA_SOURCE = "api";
    toastSuccess.mockReset();
    toastError.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    delete process.env.NEXT_PUBLIC_DATA_SOURCE;
  });

  it("loads and saves target allocations", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.includes("target-allocations") && (init?.method ?? "GET") === "GET") {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            ideco_region: [{ valueCode: "domestic", targetRatio: 0.6 }],
          }),
        };
      }
      if (url.includes("target-allocations") && init?.method === "PUT") {
        return {
          ok: true,
          status: 200,
          json: async () => ({ ok: true }),
        };
      }
      return {
        ok: false,
        status: 404,
        json: async () => ({}),
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    const onSaved = vi.fn();
    render(
      <TargetAllocationEditCard
        portfolioCode="ideco"
        schemeCode="ideco_region"
        values={valuesFixture}
        disabled={false}
        onSaved={onSaved}
      />,
    );

    await waitFor(() => {
      expect(screen.getByLabelText("国内 の目標構成比")).toHaveValue(60);
    });

    await user.clear(screen.getByLabelText("海外 の目標構成比"));
    await user.type(screen.getByLabelText("海外 の目標構成比"), "40");
    await user.click(screen.getByRole("button", { name: "目標配分を保存" }));

    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith("目標配分を保存しました。");
    });
    expect(onSaved).toHaveBeenCalled();
  });

  it("shows error when total exceeds 100 percent", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("target-allocations")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({}),
          };
        }
        return {
          ok: false,
          status: 404,
          json: async () => ({}),
        };
      }),
    );

    render(
      <TargetAllocationEditCard
        portfolioCode="ideco"
        schemeCode="ideco_region"
        values={valuesFixture}
        disabled={false}
      />,
    );

    await waitFor(() => {
      expect(screen.getByLabelText("国内 の目標構成比")).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText("国内 の目標構成比"), "60");
    await user.type(screen.getByLabelText("海外 の目標構成比"), "50");
    await user.click(screen.getByRole("button", { name: "目標配分を保存" }));

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("目標構成比の合計が 100% を超えています。");
    });
  });

  it("shows link to classification settings when values are empty", () => {
    render(
      <TargetAllocationEditCard
        portfolioCode="ideco"
        schemeCode="ideco_region"
        values={[]}
        disabled={false}
      />,
    );

    expect(screen.getByRole("link", { name: "分類設定へ" })).toHaveAttribute(
      "href",
      "/portfolios/ideco/settings/classification",
    );
  });
});
