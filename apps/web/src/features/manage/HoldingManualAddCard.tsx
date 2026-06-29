"use client";

import type { InstrumentListItemDto } from "@repo/shared";
import { useEffect, useState } from "react";

import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type HoldingManualAddCardProps = {
  instruments: InstrumentListItemDto[];
  disabled: boolean;
  onAdd: (params: {
    instrumentId: string;
    quantity: number;
    marketValueMinor: number;
  }) => Promise<boolean>;
};

export function HoldingManualAddCard({
  instruments,
  disabled,
  onAdd,
}: HoldingManualAddCardProps) {
  const [instrumentId, setInstrumentId] = useState(instruments[0]?.id ?? "");
  const [quantity, setQuantity] = useState("");
  const [marketValueMinor, setMarketValueMinor] = useState("");

  useEffect(() => {
    let result: void = undefined;
    if (instrumentId !== "" || instruments.length === 0) {
      return result;
    }
    setInstrumentId(instruments[0].id);
    return result;
  }, [instrumentId, instruments]);

  let result = (
    <Card>
      <CardHeader>
        <CardTitle>保有明細を登録</CardTitle>
        <CardDescription>銘柄ごとの数量と評価額を追加します。</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="grid max-w-lg gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void (async () => {
              let result: void = undefined;
              const parsedQuantity = Number.parseFloat(quantity);
              const parsedMarketValueMinor = Number.parseInt(marketValueMinor, 10);
              const saved = await onAdd({
                instrumentId,
                quantity: parsedQuantity,
                marketValueMinor: parsedMarketValueMinor,
              });
              if (saved) {
                setQuantity("");
                setMarketValueMinor("");
              }
              return result;
            })();
          }}
        >
          <FormField label="銘柄" htmlFor="holding-instrument">
            <Select value={instrumentId} disabled={disabled} onValueChange={setInstrumentId}>
              <SelectTrigger id="holding-instrument">
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
          </FormField>
          <FormField label="数量" htmlFor="holding-quantity">
            <Input
              id="holding-quantity"
              type="number"
              step="any"
              value={quantity}
              disabled={disabled}
              onChange={(event) => {
                setQuantity(event.target.value);
              }}
              required
            />
          </FormField>
          <FormField label="評価額（円）" htmlFor="holding-value">
            <Input
              id="holding-value"
              type="number"
              value={marketValueMinor}
              disabled={disabled}
              onChange={(event) => {
                setMarketValueMinor(event.target.value);
              }}
              required
            />
          </FormField>
          <Button type="submit" disabled={disabled || !instrumentId}>
            明細行を追加
          </Button>
        </form>
      </CardContent>
    </Card>
  );
  return result;
}
