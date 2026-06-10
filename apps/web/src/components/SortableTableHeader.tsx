import type { SortDirection } from "@repo/shared";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";

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

  let result = (
    <TableHead
      className={cn(className)}
      aria-sort={
        isActive ? (direction === "asc" ? "ascending" : "descending") : undefined
      }
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="-ml-2 h-8 font-semibold"
        onClick={() => {
          onSort(column);
        }}
      >
        {label}
        {isActive ? (
          direction === "asc" ? (
            <ArrowUp className="h-3.5 w-3.5" />
          ) : (
            <ArrowDown className="h-3.5 w-3.5" />
          )
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
        )}
      </Button>
    </TableHead>
  );
  return result;
}
