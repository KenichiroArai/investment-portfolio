"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type IdecoHoldingsPasteCardProps = {
  disabled: boolean;
  onImport: (pasteText: string) => void;
};

export function IdecoHoldingsPasteCard({ disabled, onImport }: IdecoHoldingsPasteCardProps) {
  const [pasteText, setPasteText] = useState("");

  let result = (
    <Card>
      <CardHeader>
        <CardTitle>運用サイトから一括取り込み</CardTitle>
        <CardDescription>
          iDeCo 運用サイトの保有明細表をコピーして貼り付け、「取り込み」で下書きに反映します。登録時は登録済み明細をすべて置き換えます。
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
          placeholder="運用サイトの保有明細表をここに貼り付けてください"
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
