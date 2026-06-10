import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { EmptyState } from "@/components/empty-state";
import { FormField } from "@/components/form-field";
import { Input } from "@/components/ui/input";

describe("form field and empty state", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders form field with label, hint, and error", () => {
    render(
      <FormField
        label="基準日"
        htmlFor="as-of"
        hint="YYYY-MM-DD 形式"
        error="必須項目です"
        className="custom-field"
      >
        <Input id="as-of" />
      </FormField>,
    );

    expect(screen.getByLabelText("基準日")).toBeInTheDocument();
    expect(screen.getByText("YYYY-MM-DD 形式")).toBeInTheDocument();
    expect(screen.getByText("必須項目です")).toBeInTheDocument();
    expect(document.querySelector(".custom-field")).toBeTruthy();
  });

  it("renders form field without optional hint and error", () => {
    render(
      <FormField label="銘柄名">
        <Input />
      </FormField>,
    );

    expect(screen.getByText("銘柄名")).toBeInTheDocument();
    expect(screen.queryByText("必須項目です")).not.toBeInTheDocument();
  });

  it("renders empty state with optional description and action", () => {
    render(
      <EmptyState
        title="データがありません"
        description="CSV をインポートしてください"
        action={<button type="button">インポート</button>}
        className="custom-empty"
      />,
    );

    expect(screen.getByText("データがありません")).toBeInTheDocument();
    expect(screen.getByText("CSV をインポートしてください")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "インポート" })).toBeInTheDocument();
    expect(document.querySelector(".custom-empty")).toBeTruthy();
  });

  it("renders empty state with title only", () => {
    render(<EmptyState title="該当なし" />);

    expect(screen.getByText("該当なし")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
