"use client";

import type { CurrentSnapshotDto } from "@repo/shared";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableCell, TableRow } from "@/components/ui/table";

type HoldingTableRowProps = {
  line: CurrentSnapshotDto["lines"][number];
  disabled: boolean;
  onSave: (quantity: number, marketValueMinor: number) => void;
  onDelete: () => void;
};

export function HoldingTableRow({ line, disabled, onSave, onDelete }: HoldingTableRowProps) {
  const [quantity, setQuantity] = useState(String(line.quantity));
  const [marketValueMinor, setMarketValueMinor] = useState(String(line.marketValueMinor));

  let result = (
    <TableRow>
      <TableCell className="font-medium">{line.instrumentName}</TableCell>
      <TableCell>
        <Input
          type="number"
          step="any"
          value={quantity}
          onChange={(event) => {
            setQuantity(event.target.value);
          }}
        />
      </TableCell>
      <TableCell>
        <Input
          type="number"
          value={marketValueMinor}
          onChange={(event) => {
            setMarketValueMinor(event.target.value);
          }}
        />
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={disabled}
            onClick={() => {
              onSave(Number.parseFloat(quantity), Number.parseInt(marketValueMinor, 10));
            }}
          >
            更新
          </Button>
          <Button type="button" size="sm" variant="destructive" disabled={disabled} onClick={onDelete}>
            削除
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
  return result;
}
