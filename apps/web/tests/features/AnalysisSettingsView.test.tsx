import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { AnalysisSettingsView } from "@/features/manage/AnalysisSettingsView";
import {
  createManageFetchMock,
  MANAGE_INSTRUMENT,
  MANAGE_SCHEME,
} from "../helpers/manage-api-test-utils";

const toastSuccess = vi.hoisted(() => vi.fn());
const toastError = vi.hoisted(() => vi.fn());

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccess,
    error: toastError,
  },
}));

describe("AnalysisSettingsView", () => {
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
      expect(screen.getByRole("heading", { name: "分類設定" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "軸を追加" })).toBeInTheDocument();
    });
  }

  it("shows loading then analysis settings content", async () => {
    render(<AnalysisSettingsView portfolioCode="ideco" />);
    expect(document.querySelector(".animate-pulse")).toBeTruthy();
    await waitForLoaded();
    expect(screen.getAllByText("地域").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "資産配分へ" })).toHaveAttribute(
      "href",
      "/portfolios/ideco/analysis",
    );
  });

  it("shows toast when scheme load fails", async () => {
    vi.stubGlobal(
      "fetch",
      createManageFetchMock({ schemesGetStatus: 500 }),
    );
    render(<AnalysisSettingsView portfolioCode="ideco" />);
    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("scheme error");
    });
  });

  it("creates analysis scheme", async () => {
    const user = userEvent.setup();
    render(<AnalysisSettingsView portfolioCode="ideco" />);
    await waitForLoaded();

    await user.type(screen.getByLabelText("軸コード"), "asset");
    await user.type(screen.getByLabelText("軸名"), "資産クラス");
    await user.click(screen.getByRole("button", { name: "軸を追加" }));

    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith("分析軸を追加しました。");
    });
  });

  it("shows error when scheme create fails", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      createManageFetchMock({
        mutate: { createScheme: { ok: false, message: "軸追加失敗" } },
      }),
    );
    render(<AnalysisSettingsView portfolioCode="ideco" />);
    await waitForLoaded();
    await user.type(screen.getByLabelText("軸コード"), "dup");
    await user.type(screen.getByLabelText("軸名"), "重複");
    await user.click(screen.getByRole("button", { name: "軸を追加" }));
    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("軸追加失敗");
    });
  });

  it("updates and deletes analysis scheme", async () => {
    const user = userEvent.setup();
    render(<AnalysisSettingsView portfolioCode="ideco" />);
    await waitForLoaded();

    const nameInput = screen.getAllByDisplayValue("地域")[0]!;
    await user.clear(nameInput);
    await user.type(nameInput, "地域区分");
    await user.click(screen.getAllByRole("button", { name: "更新" })[0]!);
    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith("分析軸を更新しました。");
    });

    await user.click(screen.getAllByRole("button", { name: "削除" })[0]!);
    const alert = await screen.findByRole("alertdialog", { name: "分析軸を削除" });
    await user.click(within(alert).getByRole("button", { name: "削除" }));
    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith("分析軸を削除しました。");
    });
  });

  it("shows empty scheme state", async () => {
    vi.stubGlobal(
      "fetch",
      createManageFetchMock({ schemes: [] }),
    );
    render(<AnalysisSettingsView portfolioCode="ideco" />);
    await waitFor(() => {
      expect(screen.getByText("分析軸が未登録です")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "値を追加" })).toBeDisabled();
  });

  it("creates category value", async () => {
    const user = userEvent.setup();
    render(<AnalysisSettingsView portfolioCode="ideco" />);
    await waitForLoaded();

    await user.type(screen.getByLabelText("値コード"), "us");
    await user.type(screen.getByLabelText("値名"), "米国");
    await user.clear(screen.getByLabelText("表示順"));
    await user.type(screen.getByLabelText("表示順"), "2");
    await user.click(screen.getByRole("button", { name: "値を追加" }));

    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith("カテゴリ値を追加しました。");
    });
  });

  it("updates and deletes category value", async () => {
    const user = userEvent.setup();
    render(<AnalysisSettingsView portfolioCode="ideco" />);
    await waitForLoaded();

    const valueName = screen.getByDisplayValue("日本");
    await user.clear(valueName);
    await user.type(valueName, "日本株");
    await user.click(screen.getAllByRole("button", { name: "更新" })[1]!);
    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith("カテゴリ値を更新しました。");
    });

    await user.click(screen.getAllByRole("button", { name: "削除" })[1]!);
    const alert = await screen.findByRole("alertdialog", { name: "カテゴリ値を削除" });
    await user.click(within(alert).getByRole("button", { name: "削除" }));
    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith("カテゴリ値を削除しました。");
    });
  });

  it("shows empty values block for scheme without values", async () => {
    vi.stubGlobal(
      "fetch",
      createManageFetchMock({
        schemes: [{ ...MANAGE_SCHEME, values: [] }],
      }),
    );
    render(<AnalysisSettingsView portfolioCode="ideco" />);
    await waitFor(() => {
      expect(screen.getByText("値がありません")).toBeInTheDocument();
    });
  });

  it("loads and saves instrument tags", async () => {
    const user = userEvent.setup();
    render(<AnalysisSettingsView portfolioCode="ideco" />);
    await waitForLoaded();

    await waitFor(() => {
      expect(screen.getByRole("checkbox", { name: "日本" })).toBeChecked();
    });

    await user.click(screen.getByRole("checkbox", { name: "日本" }));
    await user.click(screen.getByRole("button", { name: "タグを保存" }));
    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith("銘柄タグを保存しました。");
    });
  });

  it("shows error when instrument tags load fails", async () => {
    vi.stubGlobal(
      "fetch",
      createManageFetchMock({
        mutate: {
          instrumentClassifications: { ok: false, message: "タグ取得失敗" },
        },
      }),
    );
    render(<AnalysisSettingsView portfolioCode="ideco" />);
    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("タグ取得失敗");
    });
  });

  it("shows error when instrument tags save fails", async () => {
    vi.stubGlobal(
      "fetch",
      createManageFetchMock({
        mutate: {
          setInstrumentTags: { ok: false, message: "タグ保存失敗" },
        },
      }),
    );
    const user = userEvent.setup();
    render(<AnalysisSettingsView portfolioCode="ideco" />);
    await waitForLoaded();
    await user.click(screen.getByRole("button", { name: "タグを保存" }));
    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("タグ保存失敗");
    });
  });

  it("shows errors for scheme and value mutations", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      createManageFetchMock({
        mutate: {
          updateScheme: { ok: false, message: "軸更新失敗" },
          deleteScheme: { ok: false, message: "軸削除失敗" },
          createValue: { ok: false, message: "値追加失敗" },
          updateValue: { ok: false, message: "値更新失敗" },
          deleteValue: { ok: false, message: "値削除失敗" },
        },
      }),
    );
    render(<AnalysisSettingsView portfolioCode="ideco" />);
    await waitForLoaded();

    await user.click(screen.getAllByRole("button", { name: "更新" })[0]!);
    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("軸更新失敗");
    });

    await user.click(screen.getAllByRole("button", { name: "削除" })[0]!);
    let alert = await screen.findByRole("alertdialog");
    await user.click(within(alert).getByRole("button", { name: "削除" }));
    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("軸削除失敗");
    });

    await user.type(screen.getByLabelText("値コード"), "x");
    await user.type(screen.getByLabelText("値名"), "X");
    await user.click(screen.getByRole("button", { name: "値を追加" }));
    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("値追加失敗");
    });

    await user.click(screen.getAllByRole("button", { name: "更新" })[1]!);
    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("値更新失敗");
    });

    await user.click(screen.getAllByRole("button", { name: "削除" })[1]!);
    alert = await screen.findByRole("alertdialog");
    await user.click(within(alert).getByRole("button", { name: "削除" }));
    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("値削除失敗");
    });
  });

  it("handles no instruments for tag section", async () => {
    vi.stubGlobal(
      "fetch",
      createManageFetchMock({ instruments: [] }),
    );
    render(<AnalysisSettingsView portfolioCode="ideco" />);
    await waitForLoaded();
    expect(screen.getByRole("button", { name: "タグを保存" })).toBeDisabled();
  });
});
