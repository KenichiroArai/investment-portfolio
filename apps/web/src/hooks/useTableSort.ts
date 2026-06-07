import { useState } from "react";

import type { SortDirection } from "@repo/shared";

export function useTableSort<T extends string>(
  initialColumn: T,
  initialDirection: SortDirection = "asc",
) {
  const [sortColumn, setSortColumn] = useState<T>(initialColumn);
  const [sortDirection, setSortDirection] =
    useState<SortDirection>(initialDirection);

  function toggleSort(column: T): void {
    let result: void = undefined;

    if (sortColumn === column) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return result;
    }

    setSortColumn(column);
    setSortDirection("asc");
    return result;
  }

  let result = {
    sortColumn,
    sortDirection,
    toggleSort,
  };
  return result;
}
