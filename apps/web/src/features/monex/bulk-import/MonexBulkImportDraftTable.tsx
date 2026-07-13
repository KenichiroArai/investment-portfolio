"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

import {
  removeDraftRowAtIndex,
  sourceLabel,
  updateDraftRowAtIndex,
} from "./holding-draft";
import type { MonexHoldingDraftRow, PasteInstrumentDto } from "./types";

type MonexBulkImportDraftTableProps = {
  drafts: MonexHoldingDraftRow[];
  instruments: PasteInstrumentDto[];
  disabled: boolean;
  onChange: (drafts: MonexHoldingDraftRow[]) => void;
};

function parseDraftInteger(value: string): number {
  let result = Number.parseInt(value.replace(/,/g, ""), 10);
  return result;
}

export function MonexBulkImportDraftTable({
  drafts,
  instruments,
  disabled,
  onChange,
}: MonexBulkImportDraftTableProps) {
  let result = (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>区分</TableHead>
          <TableHead>銘柄</TableHead>
          <TableHead>口座</TableHead>
          <TableHead>数量</TableHead>
          <TableHead>評価額</TableHead>
          <TableHead>簿価</TableHead>
          <TableHead className="text-right">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {drafts.map((draft, index) => {
          const isUnmatched = !draft.instrumentId;
          let row = (
            <TableRow
              key={draft.draftId}
              className={cn(isUnmatched && "bg-destructive/5")}
            >
              <TableCell className="text-sm whitespace-nowrap">
                {sourceLabel(draft.source)}
              </TableCell>
              <TableCell className="min-w-[240px]">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {draft.source === "us"
                      ? `${draft.ticker} / ${draft.instrumentName}`
                      : draft.instrumentName}
                  </p>
                  <Select
                    value={draft.instrumentId ?? ""}
                    disabled={disabled}
                    onValueChange={(instrumentId) => {
                      onChange(
                        updateDraftRowAtIndex(drafts, index, {
                          ...draft,
                          instrumentId,
                        }),
                      );
                    }}
                  >
                    <SelectTrigger className={cn(isUnmatched && "border-destructive")}>
                      <SelectValue placeholder="銘柄を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {instruments.map((instrument) => {
                        let item = (
                          <SelectItem key={instrument.id} value={instrument.id}>
                            {instrument.ticker
                              ? `${instrument.ticker} / ${instrument.name}`
                              : instrument.name}
                          </SelectItem>
                        );
                        return item;
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </TableCell>
              <TableCell className="text-sm whitespace-nowrap">{draft.accountName}</TableCell>
              <TableCell>
                <Input
                  type="number"
                  className="w-24"
                  disabled={disabled}
                  value={draft.quantity}
                  onChange={(event) => {
                    onChange(
                      updateDraftRowAtIndex(drafts, index, {
                        ...draft,
                        quantity: parseDraftInteger(event.target.value),
                      }),
                    );
                  }}
                />
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  className="w-28"
                  disabled={disabled}
                  value={draft.marketValueMinor}
                  onChange={(event) => {
                    onChange(
                      updateDraftRowAtIndex(drafts, index, {
                        ...draft,
                        marketValueMinor: parseDraftInteger(event.target.value),
                      }),
                    );
                  }}
                />
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  className="w-28"
                  disabled={disabled}
                  value={draft.bookValueMinor}
                  onChange={(event) => {
                    onChange(
                      updateDraftRowAtIndex(drafts, index, {
                        ...draft,
                        bookValueMinor: parseDraftInteger(event.target.value),
                      }),
                    );
                  }}
                />
              </TableCell>
              <TableCell className="text-right">
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  disabled={disabled}
                  onClick={() => {
                    onChange(removeDraftRowAtIndex(drafts, index));
                  }}
                >
                  削除
                </Button>
              </TableCell>
            </TableRow>
          );
          return row;
        })}
      </TableBody>
    </Table>
  );
  return result;
}
