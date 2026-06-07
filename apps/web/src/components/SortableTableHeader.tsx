import type { SortDirection } from "@repo/shared";

type SortableTableHeaderProps<T extends string> = {
  label: string;
  column: T;
  activeColumn: T;
  direction: SortDirection;
  onSort: (column: T) => void;
  className?: string;
};

export function SortableTableHeader<T extends string>({
  label,
  column,
  activeColumn,
  direction,
  onSort,
  className,
}: SortableTableHeaderProps<T>) {
  const isActive = column === activeColumn;
  const indicator = !isActive ? "" : direction === "asc" ? " ▲" : " ▼";

  let result = (
    <th
      className={className}
      aria-sort={
        isActive
          ? direction === "asc"
            ? "ascending"
            : "descending"
          : undefined
      }
    >
      <button
        type="button"
        className={`sortable-table-header${isActive ? " is-active" : ""}`}
        onClick={() => {
          onSort(column);
        }}
      >
        {label}
        <span className="sortable-table-header__indicator" aria-hidden="true">
          {indicator}
        </span>
      </button>
    </th>
  );
  return result;
}
