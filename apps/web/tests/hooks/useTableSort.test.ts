import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useTableSort } from "@/hooks/useTableSort";

describe("useTableSort", () => {
  it("toggles direction on the same column", () => {
    const { result } = renderHook(() =>
      useTableSort<"name" | "value">("name", "asc"),
    );

    expect(result.current.sortColumn).toBe("name");
    expect(result.current.sortDirection).toBe("asc");

    act(() => {
      result.current.toggleSort("name");
    });
    expect(result.current.sortDirection).toBe("desc");

    act(() => {
      result.current.toggleSort("name");
    });
    expect(result.current.sortDirection).toBe("asc");
  });

  it("resets to asc when switching columns", () => {
    const { result } = renderHook(() =>
      useTableSort<"name" | "value">("name", "desc"),
    );

    act(() => {
      result.current.toggleSort("value");
    });

    expect(result.current.sortColumn).toBe("value");
    expect(result.current.sortDirection).toBe("asc");
  });
});
