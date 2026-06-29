"use client";

import type { CurrentSnapshotDto } from "@repo/shared";
import { useState } from "react";

import { EmptyState } from "@/components/empty-state";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { HoldingTableRow } from "@/features/manage/HoldingTableRow";

type IdecoHoldingSavedTableProps = {
  snapshot: CurrentSnapshotDto | null;
  disabled: boolean;
  onSaveLine: (
    index: number,
    quantity: number,
    marketValueMinor: number,
  ) => Promise<boolean>;
  onDeleteLine: (index: number) => Promise<boolean>;
};

export function IdecoHoldingSavedTable({
  snapshot,
  disabled,
  onSaveLine,
  onDeleteLine,
}: IdecoHoldingSavedTableProps) {
  const [deleteLineIndex, setDeleteLineIndex] = useState<number | null>(null);

  let result = (
    <>
      <Card>
        <CardHeader>
          <CardTitle>登録済み保有明細</CardTitle>
        </CardHeader>
        <CardContent>
          {!snapshot || snapshot.lines.length === 0 ? (
            <EmptyState
              title="保有明細がありません"
              description="コピペ取り込みまたは個別登録で明細を追加してください。"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>銘柄</TableHead>
                  <TableHead>数量</TableHead>
                  <TableHead>評価額</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snapshot.lines.map((line, index) => {
                  let row = (
                    <HoldingTableRow
                      key={line.id}
                      line={line}
                      disabled={disabled}
                      onSave={async (quantity, marketValueMinor) => {
                        await onSaveLine(index, quantity, marketValueMinor);
                      }}
                      onDelete={() => {
                        setDeleteLineIndex(index);
                      }}
                    />
                  );
                  return row;
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={deleteLineIndex !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteLineIndex(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>明細行を削除</AlertDialogTitle>
            <AlertDialogDescription>この保有明細行を削除します。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                void (async () => {
                  let result: void = undefined;
                  if (deleteLineIndex === null) {
                    return result;
                  }
                  const saved = await onDeleteLine(deleteLineIndex);
                  if (saved) {
                    setDeleteLineIndex(null);
                  }
                  return result;
                })();
              }}
            >
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
  return result;
}
