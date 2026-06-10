"use client";

import { Info } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatAsOfDateJa } from "@/lib/format-yen";

type ManageAsOfDateFieldProps =
  | {
      mode: "editable";
      value: string;
      onChange: (value: string) => void;
      disabled?: boolean;
    }
  | {
      mode: "readonly";
      value: string;
    };

const HELP_TEXT =
  "登録・更新・削除の対象となるスナップショットの日付です。閲覧画面の基準日切り替えとは別です。";

export function ManageAsOfDateField(props: ManageAsOfDateFieldProps) {
  let result = (
    <Alert>
      <Info className="h-4 w-4" />
      <AlertTitle>操作対象の基準日</AlertTitle>
      <AlertDescription className="space-y-3">
        {props.mode === "editable" ? (
          <div className="grid max-w-xs gap-2">
            <Label htmlFor="manage-as-of-date">基準日</Label>
            <Input
              id="manage-as-of-date"
              type="date"
              value={props.value}
              disabled={props.disabled}
              onChange={(event) => {
                props.onChange(event.target.value);
              }}
              required
            />
          </div>
        ) : (
          <p className="font-medium text-foreground">{formatAsOfDateJa(props.value)}</p>
        )}
        <p>{HELP_TEXT}</p>
      </AlertDescription>
    </Alert>
  );
  return result;
}
