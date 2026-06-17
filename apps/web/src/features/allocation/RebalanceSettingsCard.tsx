"use client";

import type { RebalanceMode } from "@repo/shared";

import { FormField } from "@/components/form-field";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type RebalanceSettingsCardProps = {
  depositInput: string;
  depositMinor: number;
  mode: RebalanceMode;
  onDepositInputChange: (value: string) => void;
  depositInputId?: string;
};

export function RebalanceSettingsCard({
  depositInput,
  depositMinor,
  mode,
  onDepositInputChange,
  depositInputId = "rebalance-deposit",
}: RebalanceSettingsCardProps) {
  const depositHintId = `${depositInputId}-hint`;

  let result = (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">リバランス設定</CardTitle>
        <CardDescription>
          目標配分との差に基づき、売買金額の目安を計算します（口数の丸めは行いません）。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <FormField label="入金額（円）" htmlFor={depositInputId}>
          <Input
            id={depositInputId}
            type="number"
            min={0}
            step={1000}
            value={depositInput}
            onChange={(event) => {
              onDepositInputChange(event.target.value);
            }}
            aria-describedby={depositHintId}
          />
          <p id={depositHintId} className="text-sm text-muted-foreground">
            0 のときは総額を変えずフルリバランス（売買あり）を計算します。
          </p>
        </FormField>

        <FormField label="方式" htmlFor={`${depositInputId}-mode-full`}>
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
            <div className="flex items-center gap-2">
              <input
                id={`${depositInputId}-mode-full`}
                type="radio"
                name={`${depositInputId}-mode`}
                value="full"
                checked={mode === "full"}
                disabled={depositMinor > 0}
                readOnly
                aria-label="フルリバランス（売買あり）"
              />
              <Label htmlFor={`${depositInputId}-mode-full`}>フルリバランス（売買あり）</Label>
            </div>
            <div className="flex items-center gap-2">
              <input
                id={`${depositInputId}-mode-deposit-only`}
                type="radio"
                name={`${depositInputId}-mode`}
                value="deposit_only"
                checked={mode === "deposit_only"}
                disabled={depositMinor <= 0}
                readOnly
                aria-label="入金のみ（買い増しのみ）"
              />
              <Label htmlFor={`${depositInputId}-mode-deposit-only`}>入金のみ（買い増しのみ）</Label>
            </div>
          </div>
        </FormField>
      </CardContent>
    </Card>
  );
  return result;
}
