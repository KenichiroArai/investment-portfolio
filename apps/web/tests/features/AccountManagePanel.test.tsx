import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { AccountManagePanel } from "@/features/manage/AccountManagePanel";
import { createManageFetchMock } from "../helpers/manage-api-test-utils";

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

const portfolios = [
  { id: "p1", code: "ideco", name: "iDeCo", kind: "ideco" },
  { id: "p2", code: "nisa", name: "NISA", kind: "nisa" },
];

describe("AccountManagePanel", () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  beforeEach(() => {
    process.env.NEXT_PUBLIC_DATA_SOURCE = "api";
    mockPush.mockReset();
    toastSuccess.mockReset();
    toastError.mockReset();
    vi.stubGlobal("fetch", createManageFetchMock());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    delete process.env.NEXT_PUBLIC_DATA_SOURCE;
  });

  it("creates a portfolio and navigates to it", async () => {
    const user = userEvent.setup();
    const onChanged = vi.fn();

    render(<AccountManagePanel portfolios={portfolios} onChanged={onChanged} />);

    await user.click(screen.getByRole("button", { name: /口座を追加/ }));
    await user.type(screen.getByLabelText("口座コード"), "tax");
    await user.type(screen.getByLabelText("口座名"), "課税口座");
    await user.click(screen.getByRole("button", { name: "登録" }));

    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith("口座を登録しました。");
    });
    expect(onChanged).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/portfolios/tax/");
  });

  it("shows error when create fails", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      createManageFetchMock({
        mutate: {
          createPortfolio: { ok: false, message: "重複しています" },
        },
      }),
    );

    render(<AccountManagePanel portfolios={portfolios} onChanged={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: /口座を追加/ }));
    await user.type(screen.getByLabelText("口座コード"), "ideco");
    await user.type(screen.getByLabelText("口座名"), "重複");
    await user.click(screen.getByRole("button", { name: "登録" }));

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("重複しています");
    });
  });

  it("updates and deletes a portfolio", async () => {
    const user = userEvent.setup();
    const onChanged = vi.fn();

    render(<AccountManagePanel portfolios={portfolios} onChanged={onChanged} />);

    await user.click(screen.getByRole("button", { name: "iDeCo" }));
    const dialog = await screen.findByRole("dialog", { name: /口座設定/ });
    const nameInput = within(dialog).getByLabelText("口座名");
    await user.clear(nameInput);
    await user.type(nameInput, "更新 iDeCo");
    await user.click(within(dialog).getByRole("button", { name: "更新" }));

    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith("口座を更新しました。");
    });
    expect(onChanged).toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "NISA" }));
    const editDialog = await screen.findByRole("dialog", { name: /口座設定/ });
    await user.click(within(editDialog).getByRole("button", { name: "削除" }));
    const alert = await screen.findByRole("alertdialog");
    await user.click(within(alert).getByRole("button", { name: "削除" }));

    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith("口座を削除しました。");
    });
  });

  it("shows error when update and delete fail", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      createManageFetchMock({
        mutate: {
          updatePortfolio: { ok: false, message: "更新失敗" },
          deletePortfolio: { ok: false, message: "削除失敗" },
        },
      }),
    );

    render(<AccountManagePanel portfolios={portfolios} onChanged={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "iDeCo" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "更新" }));
    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("更新失敗");
    });

    await user.click(within(dialog).getByRole("button", { name: "削除" }));
    const alert = await screen.findByRole("alertdialog");
    await user.click(within(alert).getByRole("button", { name: "削除" }));
    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("削除失敗");
    });
  });

  it("cancels edit dialog", async () => {
    const user = userEvent.setup();
    render(<AccountManagePanel portfolios={portfolios} onChanged={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "iDeCo" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "キャンセル" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});
