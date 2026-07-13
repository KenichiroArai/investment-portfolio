"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type MonexBulkImportPasteCardProps = {
  disabled: boolean;
  onImport: (pasteText: string) => void;
};

export function MonexBulkImportPasteCard({ disabled, onImport }: MonexBulkImportPasteCardProps) {
  const [pasteText, setPasteText] = useState("");

  let result = (
    <Card>
      <CardHeader>
        <CardTitle>マネックス証券から一括取り込み</CardTitle>
        <CardDescription>
          国内株等・米国株・ON COMPASS・資産クラス画面をまとめてコピーして貼り付け、「取り込み」で下書きに反映します。一括登録時は保有明細をすべて置き換え、資産クラス按分も更新します。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <textarea
          className={cn(
            "flex min-h-[160px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          )}
          value={pasteText}
          disabled={disabled}
          rows={8}
          placeholder="マネックス証券の保有明細・資産クラスをここに貼り付けてください"
          onChange={(event) => {
            setPasteText(event.target.value);
          }}
        />
        <Button
          type="button"
          disabled={disabled || pasteText.trim() === ""}
          onClick={() => {
            onImport(pasteText);
          }}
        >
          取り込み
        </Button>
      </CardContent>
    </Card>
  );
  return result;
}
