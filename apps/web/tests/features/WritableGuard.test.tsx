import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { WritableGuard } from "@/features/manage/WritableGuard";

describe("WritableGuard", () => {
  const original = process.env.NEXT_PUBLIC_DATA_SOURCE;

  afterEach(() => {
    cleanup();
    if (original === undefined) {
      delete process.env.NEXT_PUBLIC_DATA_SOURCE;
    } else {
      process.env.NEXT_PUBLIC_DATA_SOURCE = original;
    }
  });

  it("shows readonly banner in static mode", () => {
    process.env.NEXT_PUBLIC_DATA_SOURCE = "static";
    render(
      <WritableGuard>
        <p>編集フォーム</p>
      </WritableGuard>,
    );
    expect(screen.getByRole("status")).toHaveTextContent(/読み取り専用/);
    expect(screen.queryByText("編集フォーム")).not.toBeInTheDocument();
  });

  it("renders children in api mode", () => {
    process.env.NEXT_PUBLIC_DATA_SOURCE = "api";
    render(
      <WritableGuard>
        <p>編集フォーム</p>
      </WritableGuard>,
    );
    expect(screen.getByText("編集フォーム")).toBeInTheDocument();
  });
});
