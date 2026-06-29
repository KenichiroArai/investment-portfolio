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
  updateDraftRowAtIndex,
} from "./holding-draft";
import type { IdecoHoldingDraftRow, PasteInstrumentDto } from "./types";

type IdecoBulkImportDraftTableProps = {
  drafts: IdecoHoldingDraftRow[];
  instruments: PasteInstrumentDto[];
  disabled: boolean;
  onChange: (drafts: IdecoHoldingDraftRow[]) => void;
};

function parseDraftNumber(value: string): number {
  let result = Number.parseFloat(value.replace(/,/g, ""));
  return result;
}

function parseDraftInteger(value: string): number {
  let result = Number.parseInt(value.replace(/,/g, ""), 10);
  return result;
}

export function IdecoBulkImportDraftTable({
  drafts,
  instruments,
  disabled,
  onChange,
}: IdecoBulkImportDraftTableProps) {
  let result = (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>商品タイプ</TableHead>
          <TableHead>銘柄</TableHead>
          <TableHead>時価単価</TableHead>
          <TableHead>数量</TableHead>
          <TableHead>評価額</TableHead>
          <TableHead>購入金額</TableHead>
          <TableHead>損益</TableHead>
          <TableHead>損益率</TableHead>
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
              <TableCell className="text-sm">{draft.productType}</TableCell>
              <TableCell className="min-w-[240px]">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {draft.instrumentName}
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
                            {instrument.name}
                          </SelectItem>
                        );
                        return item;
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  className="w-24"
                  disabled={disabled}
                  value={draft.unitPricePerTenThousandLots}
                  onChange={(event) => {
                    onChange(
                      updateDraftRowAtIndex(drafts, index, {
                        ...draft,
                        unitPricePerTenThousandLots: parseDraftInteger(event.target.value),
                      }),
                    );
                  }}
                />
              </TableCell>
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
              <TableCell>
                <Input
                  type="number"
                  className="w-24"
                  disabled={disabled}
                  value={draft.unrealizedGainMinor}
                  onChange={(event) => {
                    onChange(
                      updateDraftRowAtIndex(drafts, index, {
                        ...draft,
                        unrealizedGainMinor: parseDraftInteger(event.target.value),
                      }),
                    );
                  }}
                />
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  step="any"
                  className="w-20"
                  disabled={disabled}
                  value={draft.unrealizedGainRate}
                  onChange={(event) => {
                    onChange(
                      updateDraftRowAtIndex(drafts, index, {
                        ...draft,
                        unrealizedGainRate: parseDraftNumber(event.target.value),
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
