import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { DataManageView } from "@/features/manage/DataManageView";
import { ManageAsOfDateField } from "@/features/manage/ManageAsOfDateField";
import {
  createManageFetchMock,
  MANAGE_INSTRUMENT,
  MANAGE_SCHEME,
  MANAGE_SNAPSHOT,
} from "../helpers/manage-api-test-utils";

const toastSuccess = vi.hoisted(() => vi.fn());
const toastError = vi.hoisted(() => vi.fn());

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccess,
    error: toastError,
  },
}));

describe("DataManageView", () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  beforeEach(() => {
    process.env.NEXT_PUBLIC_DATA_SOURCE = "api";
    toastSuccess.mockReset();
    toastError.mockReset();
    vi.stubGlobal("fetch", createManageFetchMock());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    delete process.env.NEXT_PUBLIC_DATA_SOURCE;
  });

  async function waitForLoaded() {
    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "銘柄" })).toBeInTheDocument();
    });
  }

  it("shows loading skeleton then instrument tab", async () => {
    render(<DataManageView portfolioCode="ideco" />);
    expect(document.querySelector(".animate-pulse")).toBeTruthy();
    await waitForLoaded();
    expect(screen.getByRole("heading", { name: "データ管理" })).toBeInTheDocument();
    expect(screen.getByLabelText("基準日")).toHaveValue("2026-06-01");
    expect(screen.getByDisplayValue("テスト銘柄")).toBeInTheDocument();
  });

  it("handles snapshot 404 on load", async () => {
    vi.stubGlobal(
      "fetch",
      createManageFetchMock({ snapshot: null }),
    );
    render(<DataManageView portfolioCode="ideco" />);
    await waitForLoaded();
    await userEvent.setup().click(screen.getByRole("tab", { name: "保有明細" }));
    expect(screen.getByText("保有明細がありません")).toBeInTheDocument();
  });

  it("shows toast when snapshot load fails", async () => {
    vi.stubGlobal(
      "fetch",
      createManageFetchMock({ snapshotGetStatus: 500 }),
    );
    render(<DataManageView portfolioCode="ideco" />);
    await waitForLoaded();
    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("snapshot error");
    });
  });

  it("creates instrument with classification tags", async () => {
    const user = userEvent.setup();
    render(<DataManageView portfolioCode="ideco" />);
    await waitForLoaded();

    await user.type(screen.getByLabelText("銘柄名"), "新規銘柄");
    await user.click(screen.getByRole("checkbox", { name: "日本" }));
    await user.click(screen.getByRole("button", { name: "銘柄を登録" }));

    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith("銘柄を登録しました。");
    });
  });

  it("shows error when instrument create fails", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      createManageFetchMock({
        mutate: {
          createInstrument: { ok: false, message: "登録失敗" },
        },
      }),
    );
    render(<DataManageView portfolioCode="ideco" />);
    await waitForLoaded();
    await user.type(screen.getByLabelText("銘柄名"), "失敗銘柄");
    await user.click(screen.getByRole("button", { name: "銘柄を登録" }));
    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("登録失敗");
    });
  });

  it("shows error when tag save fails", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      createManageFetchMock({
        mutate: {
          setClassifications: { ok: false, message: "タグ失敗" },
        },
      }),
    );
    render(<DataManageView portfolioCode="ideco" />);
    await waitForLoaded();
    await user.type(screen.getByLabelText("銘柄名"), "タグ失敗");
    await user.click(screen.getByRole("checkbox", { name: "日本" }));
    await user.click(screen.getByRole("button", { name: "銘柄を登録" }));
    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("タグ失敗");
    });
  });

  it("updates and deletes instruments", async () => {
    const user = userEvent.setup();
    render(<DataManageView portfolioCode="ideco" />);
    await waitForLoaded();

    const row = screen.getByDisplayValue("テスト銘柄");
    await user.clear(row);
    await user.type(row, "更新銘柄");
    await user.click(screen.getByRole("button", { name: "更新" }));
    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith("銘柄を更新しました。");
    });

    await user.click(screen.getAllByRole("button", { name: "削除" })[0]!);
    const alert = await screen.findByRole("alertdialog", { name: "銘柄を削除" });
    await user.click(within(alert).getByRole("button", { name: "削除" }));
    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith("銘柄を削除しました。");
    });
  });

  it("shows empty instruments state", async () => {
    vi.stubGlobal(
      "fetch",
      createManageFetchMock({ instruments: [] }),
    );
    render(<DataManageView portfolioCode="ideco" />);
    await waitForLoaded();
    expect(screen.getByText("銘柄がありません")).toBeInTheDocument();
  });

  it("adds holding with validation and success", async () => {
    const user = userEvent.setup();
    render(<DataManageView portfolioCode="ideco" />);
    await waitForLoaded();
    await user.click(screen.getByRole("tab", { name: "保有明細" }));

    await user.type(screen.getByLabelText("数量"), "0");
    await user.type(screen.getByLabelText("評価額（円）"), "1000");
    await user.click(screen.getByRole("button", { name: "明細行を追加" }));
    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("数量は正の数で入力してください。");
    });

    toastError.mockReset();
    await user.clear(screen.getByLabelText("数量"));
    await user.type(screen.getByLabelText("数量"), "2");
    await user.clear(screen.getByLabelText("評価額（円）"));
    await user.type(screen.getByLabelText("評価額（円）"), "-1");
    await user.click(screen.getByRole("button", { name: "明細行を追加" }));
    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("評価額は 0 以上の整数で入力してください。");
    });

    toastSuccess.mockReset();
    await user.clear(screen.getByLabelText("評価額（円）"));
    await user.type(screen.getByLabelText("評価額（円）"), "50000");
    await user.click(screen.getByRole("button", { name: "明細行を追加" }));
    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith("保有明細を登録しました。");
    });
  });

  it("rejects invalid as-of date on save", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      createManageFetchMock({ snapshot: null }),
    );
    render(<DataManageView portfolioCode="ideco" />);
    await waitForLoaded();
    await user.click(screen.getByRole("tab", { name: "汎用指標" }));
    const metricForm = screen
      .getByRole("button", { name: "汎用指標を登録" })
      .closest("form")!;
    fireEvent.change(screen.getByLabelText(/値（/i), {
      target: { value: "100" },
    });
    fireEvent.submit(metricForm);
    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith(
        "操作対象の基準日を YYYY-MM-DD 形式で入力してください。",
      );
    });
  });

  it("updates and deletes holdings", async () => {
    const user = userEvent.setup();
    render(<DataManageView portfolioCode="ideco" />);
    await waitForLoaded();
    await user.click(screen.getByRole("tab", { name: "保有明細" }));

    const quantityInput = screen.getAllByRole("spinbutton")[0]!;
    await user.clear(quantityInput);
    await user.type(quantityInput, "20");
    await user.click(screen.getAllByRole("button", { name: "更新" })[0]!);
    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith("保有明細を更新しました。");
    });

    await user.click(screen.getAllByRole("button", { name: "削除" })[0]!);
    const alert = await screen.findByRole("alertdialog", { name: "明細行を削除" });
    await user.click(within(alert).getByRole("button", { name: "削除" }));
    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith("保有明細を削除しました。");
    });
  });

  it("manages generic metrics", async () => {
    const user = userEvent.setup();
    render(<DataManageView portfolioCode="ideco" />);
    await waitForLoaded();
    await user.click(screen.getByRole("tab", { name: "汎用指標" }));

    const metricForm = screen
      .getByRole("button", { name: "汎用指標を登録" })
      .closest("form")!;
    fireEvent.change(screen.getByLabelText(/値（/i), {
      target: { value: "abc" },
    });
    fireEvent.submit(metricForm);
    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("汎用値は整数で入力してください。");
    });

    toastSuccess.mockReset();
    fireEvent.change(screen.getByLabelText(/値（/i), {
      target: { value: "600000" },
    });
    await user.click(screen.getByRole("button", { name: "汎用指標を登録" }));
    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith("汎用指標を登録しました。");
    });

    const metricInput = screen.getAllByRole("spinbutton").find(
      (element) => element.closest("td")?.textContent?.includes("現在:"),
    );
    expect(metricInput).toBeTruthy();
    await user.clear(metricInput!);
    await user.type(metricInput!, "700000");
    await user.click(screen.getAllByRole("button", { name: "更新" })[0]!);
    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith("汎用指標を更新しました。");
    });

    await user.click(screen.getAllByRole("button", { name: "削除" })[0]!);
    const alert = await screen.findByRole("alertdialog", { name: "汎用指標を削除" });
    await user.click(within(alert).getByRole("button", { name: "削除" }));
    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith("汎用指標を削除しました。");
    });
  });

  it("shows empty generic metrics when snapshot has none", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      createManageFetchMock({
        snapshot: { ...MANAGE_SNAPSHOT, metrics: [] },
      }),
    );
    render(<DataManageView portfolioCode="ideco" />);
    await waitForLoaded();
    await user.click(screen.getByRole("tab", { name: "汎用指標" }));
    expect(screen.getByText("汎用指標がありません")).toBeInTheDocument();
  });

  it("shows error when snapshot save fails", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      createManageFetchMock({
        mutate: {
          replaceSnapshot: { ok: false, message: "保存失敗" },
        },
      }),
    );
    render(<DataManageView portfolioCode="ideco" />);
    await waitForLoaded();
    await user.click(screen.getByRole("tab", { name: "汎用指標" }));
    await user.type(screen.getByLabelText(/値（/i), "100");
    await user.click(screen.getByRole("button", { name: "汎用指標を登録" }));
    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("保存失敗");
    });
  });

  it("renders without scheme options when schemes are empty", async () => {
    vi.stubGlobal(
      "fetch",
      createManageFetchMock({ schemes: [] }),
    );
    render(<DataManageView portfolioCode="ideco" />);
    await waitForLoaded();
    expect(screen.queryByText("分類タグ（任意）")).not.toBeInTheDocument();
  });
});

describe("ManageAsOfDateField", () => {
  it("renders editable and readonly modes", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    const { rerender } = render(
      <ManageAsOfDateField mode="editable" value="2026-06-01" onChange={onChange} />,
    );
    expect(screen.getByLabelText("基準日")).toHaveValue("2026-06-01");
    await user.clear(screen.getByLabelText("基準日"));
    await user.type(screen.getByLabelText("基準日"), "2026-06-02");
    expect(onChange).toHaveBeenCalled();

    rerender(<ManageAsOfDateField mode="readonly" value="2026-06-01" />);
    expect(screen.getByText("2026/06/01")).toBeInTheDocument();
    expect(screen.queryByLabelText("基準日")).not.toBeInTheDocument();
  });
});
