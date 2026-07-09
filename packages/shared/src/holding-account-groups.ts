import { compareStrings, type SortDirection } from "./table-sort";

export type HoldingAccountGroup<T extends { accountId: string; accountName: string }> = {
  accountId: string;
  accountName: string;
  rows: T[];
};

export function groupRowsByAccount<T extends { accountId: string; accountName: string }>(
  rows: T[],
): HoldingAccountGroup<T>[] {
  let result: HoldingAccountGroup<T>[] = [];
  const groups = new Map<string, HoldingAccountGroup<T>>();

  for (const row of rows) {
    const existing = groups.get(row.accountId);
    if (existing) {
      existing.rows.push(row);
      continue;
    }

    groups.set(row.accountId, {
      accountId: row.accountId,
      accountName: row.accountName,
      rows: [row],
    });
  }

  result = [...groups.values()].sort((left, right) =>
    left.accountName.localeCompare(right.accountName, "ja"),
  );
  return result;
}

export function sortHoldingAccountGroups<T extends { accountId: string; accountName: string }>(
  groups: HoldingAccountGroup<T>[],
  sortRows: (rows: T[]) => T[],
  sortColumn: string,
  direction: SortDirection,
): HoldingAccountGroup<T>[] {
  let result = groups.map((group) => {
    let nextGroup: HoldingAccountGroup<T> = {
      accountId: group.accountId,
      accountName: group.accountName,
      rows: sortRows(group.rows),
    };
    return nextGroup;
  });

  if (sortColumn === "accountName") {
    result.sort((left, right) =>
      compareStrings(left.accountName, right.accountName, direction),
    );
  }

  return result;
}
